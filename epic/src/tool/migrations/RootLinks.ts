import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, sep } from "node:path"

import { SRV } from "spell/server"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `RootLinks`
 * The migration `root-links` (epic `epic-engine` P46;  Owen, 2026-10-25:  "links should NEVER be `../`", and "Root
 * paths.  Opening files is a no-go for many reasons."):  every local link a ROOT PATH, as the page server serves it.
 * - `../../spell-ui/x.ts` from `epics/seo/` => `/spell-ui/x.ts`;  `details/x.html` => `/epics/seo/details/x.html`;
 *   the same text from any folder, a part file or a template
 * - what's rewritten, and what stays:  the linker's rules (`SRV.Linker.rootLinks()`):  a link to the page's own folder
 *   stays (Owen's Q1), a load below it stays, `<spell-site-header root>` goes (Q5)
 * - a link a move broke goes to its file's ONE new home (Q3:  `spell-lang/` is `spell-parser/`, `packages/<name>/` its
 *   repo's folder);  anything else is written as the browser reads it today, and LISTED for a person
 * - two ways in, one rewrite:
 *   - the CONTENT FOLDER's pass (`run()`), by `epic migrate` (`MigrateCommands`):  every HTML and Markdown file of
 *     its areas, the part files with their pages, one plain-text pass, every other byte kept (as `ContentRelink`);
 *     each file under its page's lock;  its census is the dry run's report (`report()`)
 *   - a STEP of every page kind, so a page restored from an old backup is mended on its next run:  this class for the
 *     epic pages (`Migrations`), the docs tools' `STEPS` for the rest (`migrate.js`, through `rewrite()`)
 *     - the epic page's step only FINDS what's left (`context.rootLinks`):  the write it triggers links the page,
 *       which writes them (`PlanDocFiles.writeDoc()`, `SRV.Linker.link()`)
 * - the areas:  `epics`, `guides`, `pages`, `sagas`, `goals` (parked) and `brand` (Q4);  never `ui` (leaving), nor the
 *   content repo's old-path links (`packages/`)
 * - IDEMPOTENT:  a second run finds nothing
 * - Node only, plain text
 ****************/
export class RootLinks implements Migration {
  readonly name = "root-links"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = false
  readonly description =
    "every local link a root path (/spell-ui/x.ts), as the page server serves it;  broken ones mended where a move left one home"

  /**
   * Does `document` (an epic page, assembled) hold a link to write as a root path?  Notes what it would do;  the write
   * the runner then makes does it (see the class's banner).
   * - nothing to tell it by (`context.rootLinks`):  no
   */
  run(document: Document, context: MigrationContext): boolean {
    // one that climbs above the root is left as it is, every run:  nothing to write for it
    const changes = (context.rootLinks?.(document.documentElement.outerHTML) ?? []).filter(
      (change) => change.kind !== "outside"
    )
    if (!changes.length) return false
    context.notes?.push(`${this.name}:  ${RootLinks.counted(changes)}`)
    for (const change of changes.filter((each) => each.kind === "broken"))
      context.notes?.push(`${this.name}:  BROKEN, for a person:  ${change.from} -> ${change.to}`)
    return true
  }

  /**
   * `text`, the file at `file`, its links root paths (`SRV.Linker.rootLinks()`, mending), as `linker` serves it;
   * Markdown by its extension.
   * - a part file reads from its own folder, `parts/`, as the page loads it
   */
  static rewrite(text: string, file: string, linker: SRV.Linker): SRV.RootLinksResult {
    return linker.rootLinks(text, dirname(file), { mend: true, markdown: extname(file) === ".md" })
  }

  /**
   * The content folder's pass:  every file of `content`'s areas (`AREAS`), or of `folders` (from `content`:
   * `epics/seo`), but those in `skip`;  each rewritten (`rewrite()`) and written back when it changed, unless `dryRun`.
   * - each under its page's lock:  a part's skeleton's, else its own
   * - returns the census (`report()` prints it)
   */
  static run(
    content: string,
    linker: SRV.Linker,
    { dryRun = false, folders = AREAS, skip = [] }: RootLinksRun = {}
  ): RootLinksCensus {
    const census: RootLinksCensus = { files: 0, changed: 0, links: 0, byFolder: {}, byTarget: {}, mended: [], broken: [], outside: [] }
    const skipped = skip.map((folder) => join(content, folder))
    for (const folder of folders) {
      const dir = join(content, folder)
      if (!existsSync(dir)) continue
      for (const file of RootLinks.files(dir)) {
        if (skipped.some((each) => file === each || file.startsWith(`${each}${sep}`))) continue
        census.files++
        const path = relative(content, file).split(sep).join("/")
        const write = (): boolean => {
          const before = readFileSync(file, "utf8")
          const { text, changes } = RootLinks.rewrite(before, file, linker)
          RootLinks.count(census, path, changes)
          if (text === before) return false
          if (!dryRun) writeFileSync(file, text)
          return true
        }
        const changed = dryRun ? write() : SRV.FileLock.run(RootLinks.lockOf(file), write, LOCK)
        if (changed) census.changed++
      }
    }
    return census
  }

  /**
   * The census's lines:  totals, by folder, by target, then every link mended, broken and left above the root;  one
   * line when there's nothing to write
   */
  static report(census: RootLinksCensus, { dryRun = false } = {}): string[] {
    const verb = dryRun ? "would write" : "wrote"
    const sorted = (counts: Record<string, number>) =>
      Object.entries(counts)
        .sort(([one, n], [other, m]) => m - n || one.localeCompare(other))
        .map(([name, n]) => `${name} ${n}`)
        .join(", ")
    if (!census.links && !census.outside.length) return [`root links:  none to write in ${census.files} files`]
    return [
      `root links:  ${census.links} in ${census.changed} of ${census.files} files ${verb} as root paths`,
      `  by folder:  ${sorted(census.byFolder)}`,
      `  by target:  ${sorted(census.byTarget)}`,
      `  mended ${census.mended.length}, broken ${census.broken.length} (written as the browser reads them), above the root ${census.outside.length}`,
      ...census.mended.map((line) => `  mended:  ${line}`),
      ...census.broken.map((line) => `  BROKEN, for a person:  ${line}`),
      ...census.outside.map((line) => `  LEFT, above the root:  ${line}`)
    ]
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `changes` (one file's, at `path`) added to `census`. */
  private static count(census: RootLinksCensus, path: string, changes: readonly SRV.RootLinkChange[]): void {
    const folder = RootLinks.folderOf(path)
    for (const change of changes) {
      if (change.kind === "outside") {
        census.outside.push(`${path}:  ${change.from}`)
        continue
      }
      census.links++
      census.byFolder[folder] = (census.byFolder[folder] ?? 0) + 1
      const target = change.kind === "dropped" ? "(site header root)" : (/^\/([^/?#]+)/.exec(change.to)?.[1] ?? "(other)")
      census.byTarget[target] = (census.byTarget[target] ?? 0) + 1
      const line = `${path}:  ${change.from} -> ${change.to}`
      if (change.kind === "mended") census.mended.push(line)
      else if (change.kind === "broken") census.broken.push(line)
    }
  }

  /**
   * The census's folder for page path `path`:  its area, an epic's parts, details pages and other files told apart
   * (`epics (parts)`, `epics (details)`, `epics (pages)`, `guides`).
   */
  private static folderOf(path: string): string {
    const [area] = path.split("/")
    if (area !== "epics" && area !== "sagas") return area!
    if (/\/parts\//.test(path)) return `${area} (parts)`
    if (/\/details\//.test(path)) return `${area} (details)`
    if (/^(epics|sagas)\/([^/]+)\/\2\.(plan|saga)\.html$/.test(path)) return `${area} (pages)`
    return `${area} (other)`
  }

  /** The lock a write of `file` takes:  a part's page's (`epics/seo/parts/p1.html` => `epics/seo/seo.plan.html`), else its own. */
  private static lockOf(file: string): string {
    const parts = dirname(file)
    if (basename(parts) !== "parts") return file
    const folder = dirname(parts)
    const name = basename(folder)
    return [join(folder, `${name}.plan.html`), join(folder, `${name}.saga.html`)].find(existsSync) ?? file
  }

  /** Every HTML and Markdown file under `dir`, sorted, but in `.git`, `node_modules` and dot folders. */
  private static *files(dir: string): Generator<string> {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((one, other) => one.name.localeCompare(other.name))
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) yield* RootLinks.files(path)
      else if (entry.isFile() && TEXT_FILE.test(entry.name)) yield path
    }
  }

  /** `changes` in words, for a page's note:  `12 links as root paths (2 mended, 1 broken)`. */
  private static counted(changes: readonly SRV.RootLinkChange[]): string {
    const of = (kind: SRV.RootLinkChange["kind"]) => changes.filter((change) => change.kind === kind).length
    const extra = [
      of("mended") && `${of("mended")} mended`,
      of("broken") && `${of("broken")} broken`,
      of("dropped") && `site header root dropped`
    ].filter(Boolean)
    return `${changes.length} links as root paths${extra.length ? ` (${extra.join(", ")})` : ""}`
  }
}

/** The content folder's areas the pass rewrites (Q4:  `goals` and `brand` too, never `ui`). */
export const AREAS = ["epics", "guides", "pages", "sagas", "goals", "brand"]

/** The files a link may be in:  pages, part files, Markdown. */
const TEXT_FILE = /\.(html|md)$/

/** How long a file's lock is waited for, and when a holder counts as crashed (`migrate.js` `withLocks()`'s). */
const LOCK = { wait: 30_000, stale: 60_000 }

/**
 * `RootLinks.run()` options.
 * - `dryRun`:  count, write nothing
 * - `folders`:  from the content folder;  default every area (`AREAS`)
 * - `skip`:  folders left alone (an epic whose session runs:  `epic migrate --notify`)
 */
export type RootLinksRun = { dryRun?: boolean; folders?: readonly string[]; skip?: readonly string[] }

/**
 * What `RootLinks.run()` found:  files looked at and changed, links rewritten, by folder (`epics (parts)`) and by
 * target (the root path's first folder:  `spell-ui`), and each link mended, broken or left above the root, one line
 * each (`epics/seo/parts/p1.html:  ../../../spell-lang/x -> /spell-parser/x`).
 */
export type RootLinksCensus = {
  files: number
  changed: number
  links: number
  byFolder: Record<string, number>
  byTarget: Record<string, number>
  mended: string[]
  broken: string[]
  outside: string[]
}
