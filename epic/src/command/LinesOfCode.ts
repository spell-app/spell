import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, extname, join, posix } from "node:path"

import { localDate } from "spell/util/time"
import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import {
  EXIT,
  EpicCommandError,
  LOC_COLUMNS,
  LOC_DEFAULTS,
  LOC_TABLE,
  parseVerbArgs,
  type LocCounts,
  type LocRepo,
  type LocScan,
  type LocSettings,
  type LocSettingsFile,
  type LocSkipped
} from "./command.types"
import { EpicCheckout } from "./EpicCheckout"
import { EpicTools } from "./EpicTools"
import { LocPage } from "./LocPage"

/****************
 * ### `LinesOfCode`
 * `epic loc [--print] [--json]`:  how big each repo of a checkout is, in lines and characters of code, tests and docs,
 * per repo and per folder (epic `epic-engine` I122).
 * - The repos:  the checkout the command runs in, plus, in a multi-repo top (the kit), every child repo cloned in it
 *   (`EpicConfig.top`, `repos`);  a single repo alone.
 * - Counts the files git TRACKS, by extension, as `guides/loc/loc.json5` in the epic folder says
 *   (`LocSettingsFile`):  which folders are rows, which files are tests, which extensions count, what's left out.
 *   - missing:  written with the defaults (`LOC_DEFAULTS`), and said, so it can be tweaked
 * - Left out besides:  files a person didn't write (`skipOf()`)
 *   - `linguist-generated`, by git's attribute
 *   - a `GENERATED` marker on the FIRST line (never further down:  `StyleGenerator.ts` only talks about generated
 *     files, and the first scan dropped it)
 *   - bundles:  lines over 400 characters on average
 * - Default:  rescans, rewrites the LOC guide (`LocPage`), prints its links and the totals;
 *   `--print`:  the by-repo table only;  `--json`:  the numbers.
 * - Node built-ins and `git` only, plus linkedom for the page.
 ****************/
export class LinesOfCode {
  /** the folder the command runs in:  its checkout is scanned */
  readonly cwd: string

  /** the day it runs, `YYYY-MM-DD` */
  readonly today: string

  /**
   * - `cwd`:  default the current folder
   * - `today`:  default today, local time
   */
  constructor({ cwd = process.cwd(), today = localDate() }: { cwd?: string; today?: string } = {}) {
    this.cwd = cwd
    this.today = today
  }

  /** The LOC guide, from the epic folder. */
  static readonly PAGE = "guides/loc/loc.html"

  /** Its settings, beside it. */
  static readonly SETTINGS = "guides/loc/loc.json5"

  /** Run `epic loc <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["print", "json"])
    if (positional.length)
      throw new EpicCommandError(`epic loc:  takes no ${positional[0]};  epic loc [--print] [--json]`)
    const { file: settingsFile, written } = this.ensureSettings()
    if (written) process.stderr.write(`wrote ${settingsFile} with the defaults:  tweak it, then epic loc again\n`)
    const scan = this.scan()
    if (flags.json) {
      CLI.out(JSON.stringify(scan, null, 2))
      return EXIT.OK
    }
    if (flags.print) {
      CLI.out(LinesOfCode.table(scan))
      return EXIT.OK
    }
    const page = join(this.content, LinesOfCode.PAGE)
    const { created } = await new LocPage({ file: page, scan, root: this.root }).write()
    if (created) process.stderr.write(`made ${page} from the guide template\n`)
    await EpicTools.run("pages link", [page], { cwd: this.root })
    CLI.out(LinesOfCode.totals(scan))
    return EXIT.OK
  }

  ////////////////
  // ## Which repos
  ////////////////

  /**
   * The checkout scanned:  the top repo's, from any folder of it.
   * - a child repo of a multi-repo top (`spell-epic` in the kit, or in an epic's worktree of it):  the folder above
   */
  get root(): string {
    const nearest = EpicCheckout.nearest({ marker: ".git", from: this.cwd })
    const config = EpicConfig.of(nearest)
    const top = config.top
    if (top && top !== config && existsSync(join(dirname(nearest), ".git"))) return dirname(nearest)
    return nearest
  }

  /** The repos scanned, the top first:  `{ name, folder }`, each child repo only when it's cloned (it has `.git`). */
  checkouts(): { name: string; folder: string }[] {
    const root = this.root
    const config = EpicConfig.of(root)
    const head = config.top ?? config
    return [
      { name: head.repoName, folder: root },
      ...head.repos
        .map((name) => ({ name, folder: join(root, name) }))
        .filter(({ folder }) => existsSync(join(folder, ".git")))
    ]
  }

  /** The epic folder the page and its settings are in (`EpicConfig.contentOf()`). */
  get content(): string {
    return EpicConfig.contentOf(this.root)
  }

  ////////////////
  // ## Settings
  ////////////////

  /**
   * The settings file, written with the defaults when it's missing:  `{ file, written }`.
   * - SIDE EFFECT:  may write `guides/loc/loc.json5`, its comments saying what each key does
   */
  ensureSettings(): { file: string; written: boolean } {
    const file = join(this.content, LinesOfCode.SETTINGS)
    if (DataFile.exists(file)) return { file, written: false }
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, DataFile.textFor(SETTINGS_SOURCE, { repos: { "*": LOC_DEFAULTS } }))
    return { file, written: true }
  }

  /**
   * Repo `name`'s settings:  the file's `"*"`, then its own entry, laid over `LOC_DEFAULTS` key by key.
   * - a repo's own key replaces `"*"`'s, but for `leaveOut`, which adds to it:  a repo leaves out a generated file of
   *   its own without copying every other glob
   * - throws `SyntaxError` for a file that won't read
   */
  settingsFor(name: string): LocSettings {
    const file = DataFile.read<LocSettingsFile>(join(this.content, LinesOfCode.SETTINGS))
    const all = { ...LOC_DEFAULTS, ...file?.repos?.["*"] }
    const own = file?.repos?.[name] ?? {}
    return { ...all, ...own, leaveOut: [...all.leaveOut, ...(own.leaveOut ?? [])] }
  }

  ////////////////
  // ## Counting
  ////////////////

  /** Scan every repo (`checkouts()`). */
  scan(): LocScan {
    const scan: LocScan = { scanned: this.today, root: this.root, repos: [], skipped: [], generatedByAttribute: 0 }
    for (const checkout of this.checkouts()) scan.repos.push(this.scanRepo(checkout, scan))
    return scan
  }

  /**
   * One repo's counts, its files left out added to `scan`.
   * - throws `EpicCommandError` when git can't list its files
   */
  scanRepo({ name, folder }: { name: string; folder: string }, scan: LocScan): LocRepo {
    const settings = this.settingsFor(name)
    const files = LinesOfCode.trackedFiles(folder)
    const generated = LinesOfCode.generatedFiles(folder, files)
    const hasSrc = files.some((file) => file.startsWith("src/"))
    const rows = hasSrc ? settings.rows : settings.rowsWithoutSrc
    const repo: LocRepo = { name, folder, code: LinesOfCode.zero(), tests: LinesOfCode.zero(), rows: {} }
    for (const file of files) {
      const ext = extname(file)
      const kind = settings.code.includes(ext) ? "code" : settings.docs.includes(ext) ? "docs" : undefined
      if (!kind || matchesAny(file, settings.leaveOut)) continue
      if (generated.has(file)) {
        scan.generatedByAttribute++
        continue
      }
      let text: string
      try {
        text = readFileSync(join(folder, file), "utf8")
      } catch {
        continue // tracked, but deleted here
      }
      const why = LinesOfCode.skipOf(text)
      if (why) {
        scan.skipped.push({ file: `${name}/${file}`, why })
        continue
      }
      const counts = LinesOfCode.countsOf(text, ext, kind)
      if (matchesAny(file, settings.tests)) LinesOfCode.add(repo.tests, counts)
      else {
        LinesOfCode.add(repo.code, counts)
        const row = LinesOfCode.rowOf(file, rows)
        LinesOfCode.add((repo.rows[row] ??= LinesOfCode.zero()), counts)
      }
    }
    return repo
  }

  /**
   * Why `text` is left out though its extension counts:  `generated` for a `GENERATED` (or `@generated`) marker on
   * its FIRST line, `bundled` for lines over 400 characters on average;  else `undefined`.
   */
  static skipOf(text: string): LocSkipped["why"] | undefined {
    const firstLine = text.slice(0, text.indexOf("\n") >>> 0)
    if (/\bGENERATED\b|@generated\b/.test(firstLine)) return "generated"
    if (text.length / text.split("\n").length > BUNDLE_LINE_LENGTH) return "bundled"
    return undefined
  }

  /**
   * File `file`'s row, by the first of `rows` that matches the folder it's in or one above it:
   * - `src/*` matching `src/cli`:  `src/cli/`
   * - a file right in a `<folder>/*` pattern's folder:  `<folder>/ (top files)` (`src/ (top files)`;  `(top files)`
   *   for `*`)
   * - none:  `other`
   */
  static rowOf(file: string, rows: string[]): string {
    const folders = file.split("/").slice(0, -1)
    for (const pattern of rows) {
      for (let depth = 1; depth <= folders.length; depth++) {
        const folder = folders.slice(0, depth).join("/")
        if (posix.matchesGlob(folder, pattern)) return `${folder}/`
      }
      if (pattern.endsWith("*") && !pattern.endsWith("**")) {
        const parent = pattern.slice(0, -1).replace(/\/$/, "")
        if (folders.join("/") === parent) return parent ? `${parent}/ (top files)` : "(top files)"
      }
    }
    return "other"
  }

  /**
   * `text`'s counts, as a code file or a doc file.
   * - code lines:  non-blank lines left after taking out comments -- a quick pass, not a parser:  `#` lines in
   *   Python;  `/* ... *\/` blocks, and `//` to the line's end (not in CSS), elsewhere.  A `//` in a string counts too.
   */
  static countsOf(text: string, ext: string, kind: "code" | "docs"): LocCounts {
    const counts = LinesOfCode.zero()
    const lines = text.split("\n").length
    if (kind === "docs") {
      counts.docFiles = 1
      counts.docLines = lines
      counts.docChars = text.length
      return counts
    }
    let code = text
    if (ext === ".py") code = code.replace(/^\s*#.*$/gm, "")
    else {
      code = code.replace(/\/\*[\s\S]*?\*\//g, "")
      if (ext !== ".css") code = code.replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
    }
    const kept = code.split("\n").filter((line) => line.trim())
    counts.files = 1
    counts.codeLines = kept.length
    counts.codeChars = kept.reduce((sum, line) => sum + line.trim().length, 0)
    counts.allLines = lines
    counts.allChars = text.length
    return counts
  }

  ////////////////
  // ## Git
  ////////////////

  /** Every file git tracks in checkout `folder`, from its root.  Throws `EpicCommandError` when git can't say. */
  static trackedFiles(folder: string): string[] {
    const run = Git.run(["ls-files", "-z"], folder, { trim: false })
    if (!run.ok) throw new EpicCommandError(`epic loc:  git can't list ${folder}'s files:  ${run.err}`, 1)
    return run.out.split("\0").filter(Boolean)
  }

  /** Which of `files` git's `linguist-generated` attribute marks (`.gitattributes`). */
  static generatedFiles(folder: string, files: string[]): Set<string> {
    const run = Git.run(["check-attr", "-z", "--stdin", "linguist-generated"], folder, {
      input: files.join("\0"),
      trim: false
    })
    const found = new Set<string>()
    // `-z`:  path, attribute, value, each ended by a NUL
    const parts = run.out.split("\0")
    for (let at = 0; at + 2 < parts.length; at += 3) {
      if (parts[at + 2] === "set" || parts[at + 2] === "true") found.add(parts[at]!)
    }
    return found
  }

  ////////////////
  // ## Numbers
  ////////////////

  /** A row with nothing in it. */
  static zero(): LocCounts {
    return Object.fromEntries(LOC_COLUMNS.map((key) => [key, 0])) as LocCounts
  }

  /** Add `counts` into `total`.  SIDE EFFECT:  changes `total`;  returns it. */
  static add(total: LocCounts, counts: LocCounts): LocCounts {
    for (const key of LOC_COLUMNS) total[key] += counts[key]
    return total
  }

  /** `a` and `b` added up, a new row. */
  static sum(...rows: LocCounts[]): LocCounts {
    return rows.reduce((total, row) => LinesOfCode.add(total, row), LinesOfCode.zero())
  }

  /** Every repo's code, and every repo's tests:  `{ code, tests }`. */
  static allOf(scan: LocScan): { code: LocCounts; tests: LocCounts } {
    return {
      code: LinesOfCode.sum(...scan.repos.map((repo) => repo.code)),
      tests: LinesOfCode.sum(...scan.repos.map((repo) => repo.tests))
    }
  }

  /** `n` short:  `999`, `12.3k`, `1.4M`. */
  static short(n: number): string {
    return n < 1000 ? String(n) : n < 1e6 ? `${(n / 1e3).toFixed(1)}k` : `${(n / 1e6).toFixed(1)}M`
  }

  ////////////////
  // ## Printing
  ////////////////

  /** The by-repo table, as text:  a code line and a tests line per repo, then All code, Tests and Both. */
  static table(scan: LocScan): string {
    const all = LinesOfCode.allOf(scan)
    const lines: [string, LocCounts][] = [
      ...scan.repos.flatMap((repo): [string, LocCounts][] => [
        [repo.name, repo.code],
        [`${repo.name} tests`, repo.tests]
      ]),
      ["All code", all.code],
      ["Tests", all.tests],
      ["Both", LinesOfCode.sum(all.code, all.tests)]
    ]
    const width = Math.max(4, ...lines.map(([name]) => name.length))
    const columns = LOC_TABLE.flatMap(({ group, columns }) =>
      columns.map((column, at) => ({ ...column, head: at ? `: ${column.name}` : `${group}: ${column.name}` }))
    )
    const head = ["repo".padEnd(width), ...columns.map((column) => column.head.padStart(11))].join(" ")
    const body = lines.map(([name, counts]) =>
      [name.padEnd(width), ...columns.map(({ key }) => LinesOfCode.short(counts[key]).padStart(11))].join(" ")
    )
    return [head, ...body].join("\n")
  }

  /** The totals, on one line:  `All code:  274.2k lines in 2,576 files · tests 132.8k lines · docs 186.6k lines`. */
  static totals(scan: LocScan): string {
    const { code, tests } = LinesOfCode.allOf(scan)
    const files = code.files.toLocaleString("en-US")
    const docs = code.docLines + tests.docLines
    return (
      `All code:  ${LinesOfCode.short(code.codeLines)} lines in ${files} files · ` +
      `tests ${LinesOfCode.short(tests.codeLines)} lines · docs ${LinesOfCode.short(docs)} lines · ` +
      `${scan.repos.length} repos, ${scan.skipped.length + scan.generatedByAttribute} files left out`
    )
  }
}

/** Lines longer than this on average:  a bundle, left out. */
const BUNDLE_LINE_LENGTH = 400

/** A new settings file's comments;  its values are `LOC_DEFAULTS`, laid over it (`DataFile.textFor()`). */
const SETTINGS_SOURCE = `// epic loc's settings:  what counts, and what's a row of the LOC guide (guides/loc/loc.html).
// - "repos":  per repo, by its folder name;  "*" for every repo.
//   A repo's own key replaces "*"'s, but "leaveOut", which adds to it.
// - "rows":  the folders that are rows, as globs from the repo's root ("src/*":  each folder of src/);
//   the files right in src/ are "src/ (top files)";  the rest roll up into "other"
// - "rowsWithoutSrc":  "rows" for a repo with no src/
// - "tests":  globs of test files:  in no row, but a line of their own
// - "code", "docs":  the extensions counted
// - "leaveOut":  globs of files never counted (a generated file whose GENERATED isn't on its first line);
//   files marked linguist-generated, GENERATED on their first line, and bundles are left out besides
{
  "repos": {}
}
`

/** Whether `file` matches one of `globs`. */
function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((glob) => posix.matchesGlob(file, glob))
}
