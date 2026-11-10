import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * `spell rename spellml [--dry-run] [--json] [checkouts...]`:  Spell's tag-shaped files renamed from `.spellml` and
 * `.spellx` to `.spell` (epic `language` P40;  Owen, 2026-11-09;  `.spellx` to `.spellml` in epic `repo-split` P21),
 * kept so a branch open when it landed can rerun it over its own files and lines before merging `main`.
 * - Each tracked `*.spellml` and `*.spellx` file is moved to `*.spell` with `git mv`, so its history follows.
 * - Each tracked text file's mentions of the ending follow:  `Card.spellml` => `Card.spell`, `*.spellml`,
 *   `` `.spellml` ``, `/Card.spellml` in a project file's imports.
 * - Plain node runs it as is (types stripped):  node's own modules only.
 *
 * What it leaves:
 * - the old endings where code still reads them on purpose:  a line that names `.spell` too, as
 *   `.spell` and `.spellml` (it would read `.spell` and `.spell`, so it's for a person to reword), and the files in `KEPT`
 * - a regular expression's `\.spellx?`, which matches `.spell` and `.spellx` both;  a plain `\.spellml` follows
 * - every name that isn't the ending:  the form `spellx`, `SpellxTwin`, `spell/parser/spellx`, the language id
 * - the record (`KEPT`):  the changelog, the commit maps, the logs;  and the epic repo, whose pages keep their history
 */
export class SpellmlRenamer {
  /**
   * Rename in `checkout` (a git checkout):  move its old-ending files, then rewrite the ending in its text files,
   * unless `dryRun`.
   * - NEVER throws for a file it can't read:  it's skipped.
   */
  renameCheckout(checkout: string, dryRun: boolean): SpellmlReport {
    const report: SpellmlReport = { checkout, moved: [], files: [], names: 0 }
    for (const file of trackedFiles(checkout)) {
      const old = OLD_SUFFIXES.find((suffix) => file.endsWith(suffix))
      if (!old || KEPT.test(file)) continue
      const to = file.slice(0, -old.length) + NEW_SUFFIX
      if (!dryRun) execFileSync("git", ["mv", file, to], { cwd: checkout })
      report.moved.push({ from: file, to })
    }
    // after the moves, so each file is read at its new path
    for (const file of trackedFiles(checkout)) {
      if (KEPT.test(file)) continue
      const path = join(checkout, file)
      const before = readText(path)
      if (before === undefined || !OLD_SUFFIXES.some((suffix) => before.includes(suffix))) continue
      const { text, count } = this.renameText(before)
      if (!count) continue
      if (!dryRun) writeFileSync(path, text)
      report.files.push({ file, count })
      report.names += count
    }
    return report
  }

  /** `text` with each mention of an old ending made `.spell`, but on a line that names `.spell` too. */
  renameText(text: string): { text: string; count: number } {
    let count = 0
    const lines = text.split("\n").map((line) => {
      if (NEW_MENTION.test(line)) return line
      return line.replace(MENTION, (_mention, backslash: string) => {
        count++
        return backslash + NEW_SUFFIX
      })
    })
    return { text: lines.join("\n"), count }
  }
}

////////////////
// ## The command
////////////////

/** Run the rename over `checkouts` (default:  `kit`);  prints each file it moved or changed, and the sums. */
export function renameSpellmlCommand(kit: string, options: RenameSpellmlOptions = {}): SpellmlReport[] {
  const renamer = new SpellmlRenamer()
  const checkouts = options.checkouts?.length ? options.checkouts : [kit]
  const reports = checkouts.map((checkout) => renamer.renameCheckout(checkout, options.dryRun ?? false))
  if (options.json) {
    console.log(JSON.stringify(reports, null, 2))
    return reports
  }
  for (const report of reports) {
    for (const { file, count } of report.files) console.log(`${String(count).padStart(5)}  ${file}`)
  }
  const moved = reports.reduce((sum, report) => sum + report.moved.length, 0)
  const files = reports.reduce((sum, report) => sum + report.files.length, 0)
  const names = reports.reduce((sum, report) => sum + report.names, 0)
  const verb = options.dryRun ? "would move" : "moved"
  console.log(`${verb} ${moved} .spellml and .spellx files to .spell;  ${names} mentions in ${files} files`)
  return reports
}

////////////////
// ## The rules
////////////////

/** The tag-shaped files' old endings (`SP.SPELLML_SUFFIXES`;  the kit can't import spell). */
const OLD_SUFFIXES = [".spellml", ".spellx"]
/** Every Spell file's ending (`SP.SPELL_SUFFIX`). */
const NEW_SUFFIX = ".spell"
/** A mention of `.spell` itself, not an old ending or a built file's `Card.spell.js`. */
const NEW_MENTION = /\.spell(?![\w.-])/

/**
 * A mention of an old ending, `Card.spellml`, `*.spellx`, `` `.spellml` ``, a regular expression's `Card\.spellml`;  but not
 * - a regular expression's `\.spellx?`, `.spell` or `.spellx`
 * - a property, `words.spellx`, `this.spellx`
 * - part of a longer word (`.spellxTab`)
 */
const MENTION = /(?<!\b(?:this|words))(\\?)\.spell(?:ml|x)(?![\w?-])/g

/**
 * Files never moved or rewritten:  the record, and the code that names the old ending on purpose.
 * - the changelog, the commit maps (`tools/one-repo/`), the logs (links into the epic repo)
 * - this file and its test
 * - the files that list each ending:  the page server's content types (the kit's `mime.ts`), the VS Code extension's
 *   file associations, and spell's own (`SP.SPELLML_SUFFIXES`, in `spell.types.ts`)
 * - the tests of the old endings, whose pairs (`Card.spellml` beside `Card.spell`) can only keep them, and the frozen test projects
 */
const KEPT =
  /(^|\/)CHANGELOG\.md$|^tools\/one-repo\/|^agents\/(PAPERCUTS|SUSPECTED-BUGS|CODE-DEBT)\.md$|(^|\/)renameSpellml(\.test)?\.ts$|^src\/server\/mime\.ts$|^parser\/src\/spell\/spell\.types\.ts$|^app\/vscode\/package\.json$|^parser\/tests\/spell\/(spellmlNames\.test\.ts|SpellxTwin\.test\.ts|SourceMaps\.test\.ts|spellx\/)|^parser\/tests\/spellx\/(CodeSpellWriter|SpellxWriter)\.test\.ts$|^app\/tests\/lsp\/SpellLanguageService\.spellx\.test\.ts$|^app\/spaces\/@spell\/test\//

/** `checkout`'s tracked files, paths from its root. */
function trackedFiles(checkout: string): string[] {
  const listed = execFileSync("git", ["ls-files", "-z"], { cwd: checkout, encoding: "utf8", maxBuffer: 1 << 28 })
  return listed.split("\0").filter(Boolean)
}

/** A regular file's text, or `undefined`:  gone, a link, a folder, binary (a NUL byte). */
function readText(path: string): string | undefined {
  try {
    if (!lstatSync(path).isFile()) return undefined
    const text = readFileSync(path, "utf8")
    return text.includes("\0") ? undefined : text
  } catch {
    return undefined
  }
}

////////////////
// ## Types
////////////////

/** `spell rename spellml`'s flags. */
export type RenameSpellmlOptions = {
  /** report, change nothing */
  dryRun?: boolean
  /** print the reports as JSON */
  json?: boolean
  /** the checkouts to rename in;  default the kit's */
  checkouts?: string[]
}

/** What the rename did in one checkout. */
export type SpellmlReport = {
  /** the checkout's folder */
  checkout: string
  /** each file moved, paths from its root */
  moved: { from: string; to: string }[]
  /** each file whose text changed (a moved one by its new path, but in a dry run), and how many mentions */
  files: { file: string; count: number }[]
  /** mentions changed in all */
  names: number
}
