import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * `spell rename spellml [--dry-run] [--json] [checkouts...]`:  Spell's markup files renamed from `.spellx` to
 * `.spellml` (epic `repo-split` P21;  Owen, 2026-10-27), kept so a branch open when it landed can rerun it over its
 * own files and lines before merging `main`.
 * - Each tracked `*.spellx` file is moved to `*.spellml` with `git mv`, so its history follows.
 * - Each tracked text file's mentions of the ending follow:  `Card.spellx` => `Card.spellml`, `*.spellx`,
 *   `` `.spellx` ``, `/Card.spellx` in a project file's imports.
 * - Plain node runs it as is (types stripped):  node's own modules only.
 *
 * What it leaves:
 * - the old ending where code still reads it on purpose ("support both for now"):  a line that already says
 *   `.spellml` (`".spellml", ".spellx"`), and the files in `KEPT`
 * - a regular expression's `\.spellx`, which the code that matches both ends writes itself
 * - every name that isn't the ending:  the form `spellx`, `SpellxTwin`, `spell/parser/spellx`, the language id
 * - the record (`KEPT`):  the changelog, the commit maps, the logs;  and the content repo, whose pages keep their history
 */
export class SpellmlRenamer {
  /**
   * Rename in `checkout` (a git checkout):  move its `.spellx` files, then rewrite the ending in its text files,
   * unless `dryRun`.
   * - NEVER throws for a file it can't read:  it's skipped.
   */
  renameCheckout(checkout: string, dryRun: boolean): SpellmlReport {
    const report: SpellmlReport = { checkout, moved: [], files: [], names: 0 }
    for (const file of trackedFiles(checkout)) {
      if (!file.endsWith(OLD_SUFFIX) || KEPT.test(file)) continue
      const to = file.slice(0, -OLD_SUFFIX.length) + NEW_SUFFIX
      if (!dryRun) execFileSync("git", ["mv", file, to], { cwd: checkout })
      report.moved.push({ from: file, to })
    }
    // after the moves, so each file is read at its new path
    for (const file of trackedFiles(checkout)) {
      if (KEPT.test(file)) continue
      const path = join(checkout, file)
      const before = readText(path)
      if (before === undefined || !before.includes(OLD_SUFFIX)) continue
      const { text, count } = this.renameText(before)
      if (!count) continue
      if (!dryRun) writeFileSync(path, text)
      report.files.push({ file, count })
      report.names += count
    }
    return report
  }

  /** `text` with each mention of the `.spellx` ending made `.spellml`, but on a line that already says `.spellml`. */
  renameText(text: string): { text: string; count: number } {
    let count = 0
    const lines = text.split("\n").map((line) => {
      if (line.includes(NEW_SUFFIX)) return line
      return line.replace(MENTION, () => {
        count++
        return NEW_SUFFIX
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
  console.log(`${verb} ${moved} .spellx files to .spellml;  ${names} mentions in ${files} files`)
  return reports
}

////////////////
// ## The rules
////////////////

/** The markup files' old ending, and their new one (`SP.OLD_SPELLML_SUFFIX`, `SP.SPELLML_SUFFIX`;  the kit can't import spell). */
const OLD_SUFFIX = ".spellx"
const NEW_SUFFIX = ".spellml"

/**
 * A mention of the old ending, `Card.spellx`, `*.spellx`, `` `.spellx` ``;  but not
 * - a regular expression's `\.spellx`
 * - a property, `words.spellx`, `this.spellx`
 * - part of a longer word (`.spellxTab`)
 */
const MENTION = /(?<!\\)(?<!\b(?:this|words))\.spellx(?![\w-])/g

/**
 * Files never moved or rewritten:  the record, and the code that names the old ending on purpose.
 * - the changelog, the commit maps (`tools/one-repo/`), the logs (links into the content repo)
 * - this file and its test
 * - the files that list each ending:  the page server's content types (the kit's `mime.ts`), the VS Code extension's
 *   file associations, and spell's own (`SP.SPELLML_SUFFIXES`, in `spell.types.ts`)
 * - the VS Code grammar for markup, whose scope names end in `.spellx` (`source.spellx`)
 */
const KEPT =
  /(^|\/)CHANGELOG\.md$|^tools\/one-repo\/|^agents\/(PAPERCUTS|SUSPECTED-BUGS|CODE-DEBT)\.md$|(^|\/)renameSpellml(\.test)?\.ts$|^src\/server\/mime\.ts$|^parser\/src\/spell\/spell\.types\.ts$|^app\/vscode\/package\.json$|^app\/vscode\/syntaxes\/spellx\.tmLanguage\.json$/

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
