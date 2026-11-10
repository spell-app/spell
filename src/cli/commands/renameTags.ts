import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * `spell rename tags [--dry-run] [--json] [checkouts...]`:  Spell's tags written short (epic `language` P41, r12;
 * Owen, 2026-11-09), kept so a branch open when it landed can rerun it over its own files before merging `main`.
 * - A template's tag loses its language's prefix:  `<spell-page>` => `<page>`, `<encanto-vista>` => `<vista>`.
 * - Adding to a type another file declares is `<extend>`:  `<spell-more-of>` => `<extend>`, `<encanto-más-de>` =>
 *   `<extender>`.
 * - Every note is `<note>`:  `<spell-description>` and `<spell-comment>` => `<note>`, Spanish's => `<nota>`;
 *   a property editor and a page's stories lose the prefix, `<property-editor>`, `<stories>`.
 * - Openers and closers alike, wherever they're written:  a file's tags, and the prose and Markdown that name them.
 * - Plain node runs it as is (types stripped):  node's own modules only.
 *   So it knows the words itself (`TAG_WORDS`), from the language packs' spellx words;  the kit can't import spell.
 *
 * What it leaves:
 * - every other word after the prefix, `<spell-viewer>`, `<spell-code>`:  the web's own elements, not Spell's tags
 * - `<spell>`, the block of code, which keeps its name:  it's the language's name, not a prefix
 * - the old spellings where they're read on purpose (`KEPT`):  the tests of the old spellings, the frozen test projects,
 *   and the code that reads them;  and the record, the changelog and the logs
 */
export class SpellTagRenamer {
  /**
   * Rename in `checkout` (a git checkout):  each of its text files `isRenamed()` names, unless `dryRun`.
   * - NEVER throws for a file it can't read:  it's skipped.
   */
  renameCheckout(checkout: string, dryRun: boolean): TagReport {
    const report: TagReport = { checkout, files: [], tags: 0 }
    for (const file of trackedFiles(checkout)) {
      if (!isRenamed(file)) continue
      const path = join(checkout, file)
      const before = readText(path)
      if (before === undefined || !PREFIXED.test(before)) continue
      const { text, count } = this.renameText(before)
      if (!count) continue
      if (!dryRun) writeFileSync(path, text)
      report.files.push({ file, count })
      report.tags += count
    }
    return report
  }

  /** `text` with each old tag written short:  `<spell-page "x">` => `<page "x">`, `</spell-more-of>` => `</extend>`. */
  renameText(text: string): { text: string; count: number } {
    let count = 0
    const renamed = text.replace(TAG, (tag: string, slash: string, prefixed: string) => {
      const short = TAG_WORDS[prefixed.toLowerCase()]
      if (!short) return tag
      count++
      return `<${slash}${short}`
    })
    return { text: renamed, count }
  }
}

////////////////
// ## The command
////////////////

/** Run the rename over `checkouts` (default:  `kit`);  prints each file it changed, and the sums. */
export function renameTagsCommand(kit: string, options: RenameTagsOptions = {}): TagReport[] {
  const renamer = new SpellTagRenamer()
  const checkouts = options.checkouts?.length ? options.checkouts : [kit]
  const reports = checkouts.map((checkout) => renamer.renameCheckout(checkout, options.dryRun ?? false))
  if (options.json) {
    console.log(JSON.stringify(reports, null, 2))
    return reports
  }
  for (const report of reports) {
    for (const { file, count } of report.files) console.log(`${String(count).padStart(5)}  ${file}`)
  }
  const files = reports.reduce((sum, report) => sum + report.files.length, 0)
  const tags = reports.reduce((sum, report) => sum + report.tags, 0)
  console.log(`${options.dryRun ? "would write" : "wrote"} ${tags} tags short in ${files} files`)
  return reports
}

////////////////
// ## The rules
////////////////

/**
 * Each old tag word, lowercase, and the short word it becomes:  the language packs' spellx `templates` and `notes`
 * (English's `spell-`, Spanish's `encanto-`), with their accents and without.
 */
const TAG_WORDS: Record<string, string> = {
  // English's templates
  "spell-view": "view",
  "spell-thing": "thing",
  "spell-page": "page",
  "spell-app": "app",
  "spell-page-template": "page-template",
  "spell-app-template": "app-template",
  "spell-notebook": "notebook",
  "spell-site": "site",
  "spell-more-of": "extend",
  // English's notes
  "spell-description": "note",
  "spell-comment": "note",
  "spell-property-editor": "property-editor",
  "spell-stories": "stories",
  // Spanish's templates
  "encanto-vista": "vista",
  "encanto-cosa": "cosa",
  "encanto-página": "página",
  "encanto-pagina": "pagina",
  "encanto-aplicación": "aplicación",
  "encanto-aplicacion": "aplicacion",
  "encanto-plantilla-de-página": "plantilla-de-página",
  "encanto-plantilla-de-pagina": "plantilla-de-pagina",
  "encanto-plantilla-de-aplicación": "plantilla-de-aplicación",
  "encanto-plantilla-de-aplicacion": "plantilla-de-aplicacion",
  "encanto-cuaderno": "cuaderno",
  "encanto-sitio": "sitio",
  "encanto-más-de": "extender",
  "encanto-mas-de": "extender",
  // Spanish's notes
  "encanto-descripción": "nota",
  "encanto-descripcion": "nota",
  "encanto-comentario": "nota",
  "encanto-editor-de-propiedades": "editor-de-propiedades",
  "encanto-historias": "historias"
}

/** A tag's start, `<spell-page` or `</encanto-vista`, its word whole:  never `<spell-viewer>`'s `spell-view`. */
const TAG = /<(\/?)((?:spell|encanto)-[\p{L}-]+)(?![\p{L}\p{N}_-])/gu

/** Does a text hold any tag with a prefix at all?  A quick look before the rename's. */
const PREFIXED = /<\/?(?:spell|encanto)-/

/** The files it renames in:  Spell's files and the Markdown about them, but not `KEPT`. */
function isRenamed(file: string): boolean {
  return RENAMED.test(file) && !KEPT.test(file)
}

/** Spell's files (`.spell`, and the old `.spellml` and `.spellx`) and Markdown. */
const RENAMED = /\.(?:spell(?:ml|x)?|md)$/

/**
 * Files never rewritten:  the old spellings are read there on purpose, or they're the record.
 * - the frozen test projects, and the tests' own files of the old spellings
 * - the changelog, the commit maps, the logs (links into the epic repo), and the drafts in `docs/drafts/`
 */
const KEPT =
  /(^|\/)CHANGELOG\.md$|^tools\/one-repo\/|^agents\/(PAPERCUTS|SUSPECTED-BUGS|CODE-DEBT)\.md$|^docs\/drafts\/|^app\/spaces\/@spell\/test\/|^(parser|app)\/tests\//

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

/** `spell rename tags`'s flags. */
export type RenameTagsOptions = {
  /** report only:  change nothing */
  dryRun?: boolean
  /** print each checkout's report as JSON */
  json?: boolean
  /** the checkouts to rename in;  none:  the kit */
  checkouts?: string[]
}

/** What the rename did in one checkout. */
export type TagReport = {
  /** the checkout's folder */
  checkout: string
  /** each file changed, and how many of its tags */
  files: Array<{ file: string; count: number }>
  /** how many tags, in all */
  tags: number
}
