import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { SRV } from "spell/server"
import { PlanDocError } from "./planDoc.types"

/****************
 * ### `CommitRemap`
 * Points the commits epic pages list (`<epic-commit>`) at the repo their history was merged into:
 * each listed commit of an old repo gets its NEW id and the new repo's address.
 * - Why:  repo-split's P20 · One Repo merged spell-parser, spell-ui, spell-epic and spell-app into the kit's repo,
 *   `spell-app/spell`, rewriting their history (`git filter-repo`), so every commit has a new id there;
 *   the old repos get deleted, and their commit links would 404 (epic-engine's P49, Q46 A).
 * - The map:  `git filter-repo`'s commit map, one `<old id> <new id>` per line under a header line (`old new`);
 *   P20 kept one per repo, `tools/one-repo/commit-map-<folder>.txt`.
 * - How a commit names its repo:  its own `repo` attribute, else its page's (`<epic-page repo>`, which a part file
 *   under `epics/<epic>/parts/` takes from its epic's page);  either address goes through `renamed`
 *   (the kit's `renamedRepos`) first, so `spell-app/spell-kit` reads as `spell-app/spell`.
 * - What it writes, for each commit of the old repo found in the map:
 *   - its `sha`:  the FULL new id, even where it listed a short one:
 *     a short id could be ambiguous among the merged repo's many more commits
 *   - its `repo`:  the new repo's address, added when the commit had none of its own
 * - A page whose own `repo` is the old repo takes the new one too;
 *   its commits that the map lacks get the OLD address written onto them, so their links don't silently change.
 * - Running it again changes nothing:  a remapped commit's repo is the new one, which is never the old one.
 * - Edits the markup as text, the start tags only:  the rest of each file is left byte for byte.
 * - Node only:  NOT in the `spell-epic` barrel;  `PlanDocCommands` runs it (`epic commits remap`).
 ****************/
export class CommitRemap {
  /** old full id -> new full id:  STATIC for the object's life */
  readonly ids: Map<string, string>

  /** the old repos' addresses (`https://github.com/spell-app/spell-parser`), after `renamed` */
  readonly from: string[]

  /** the address the commits move to:  `https://github.com/spell-app/spell` */
  readonly to: string

  /** old GitHub addresses, each to the one it was renamed to (`EpicConfig.renamedRepos`) */
  readonly renamed: Record<string, string>

  /** the old ids, sorted:  short ids are found by prefix */
  private readonly sorted: string[]

  /**
   * - `ids`:  the map, old full id -> new full id (`CommitRemap.readMap()`)
   * - `from`:  the old repos, each a name (`spell-parser`), `owner/name` or an address;
   *   a bare name is `to`'s owner's
   * - `to`:  the new repo's GitHub address
   * - `renamed`:  `EpicConfig.renamedRepos`
   */
  constructor({
    ids,
    from,
    to,
    renamed = {}
  }: {
    ids: Map<string, string>
    from: string[]
    to: string
    renamed?: Record<string, string>
  }) {
    this.ids = ids
    this.renamed = renamed
    this.to = this.canonical(to)
    this.from = from.map((repo) => this.canonical(CommitRemap.addressOf(repo, this.to)))
    if (this.from.includes(this.to)) throw new PlanDocError(`commits remap:  --repo names ${this.to}, the new repo`)
    this.sorted = [...ids.keys()].sort()
  }

  ////////////////
  // ## Maps
  ////////////////

  /**
   * A commit map's pairs, old id -> new id, from its text:  `git filter-repo`'s `commit-map`.
   * - skips the header line (`old new`), blank lines, and a commit the rewrite dropped (its new id all zeros)
   * - throws `PlanDocError` for a line that isn't two ids
   */
  static parseMap(text: string, ids = new Map<string, string>()): Map<string, string> {
    for (const line of text.split("\n")) {
      const words = line.trim().split(/\s+/)
      if (!words[0] || (words[0] === "old" && words[1] === "new")) continue
      const [old, now] = words
      if (words.length !== 2 || !FULL_ID.test(old!) || !FULL_ID.test(now!))
        throw new PlanDocError(`commits remap:  not a commit map line:  "${line.trim()}"`)
      if (/^0+$/.test(now!) || ids.has(old!)) continue
      ids.set(old!, now!)
    }
    return ids
  }

  /** `parseMap()` over `files`, read in order:  an id two maps list keeps the first one's. */
  static readMap(files: string[]): Map<string, string> {
    const ids = new Map<string, string>()
    for (const file of files) CommitRemap.parseMap(readFileSync(file, "utf8"), ids)
    return ids
  }

  /**
   * A repo's GitHub address from how it's given:  `spell-parser` (`to`'s owner's), `spell-app/spell-parser`, or
   * the address itself.
   */
  static addressOf(repo: string, to: string): string {
    if (/^https?:\/\//.test(repo)) return repo
    if (repo.includes("/")) return `${GITHUB}/${repo}`
    return `${to.replace(/\/[^/]+\/?$/, "")}/${repo}`
  }

  ////////////////
  // ## Rewriting
  ////////////////

  /** The new id for `sha`, full or a short prefix (unique among the map's);  `undefined` when it isn't there. */
  newIdFor(sha: string): string | undefined {
    if (sha.length >= FULL_LENGTH) return this.ids.get(sha)
    let low = 0
    let high = this.sorted.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (this.sorted[middle]! < sha) low = middle + 1
      else high = middle
    }
    const first = this.sorted[low]
    if (!first?.startsWith(sha) || this.sorted[low + 1]?.startsWith(sha)) return undefined
    return this.ids.get(first)
  }

  /**
   * One file's markup, rewritten;  pure.
   * - `pageRepo`:  the `repo` of the page the file belongs to (`<epic-page repo>`, in it or its epic's page):
   *   what a commit with none of its own links through
   * - returns the new text, how many commits of the old repos it found and remapped, and the ids not in the map
   */
  rewrite(html: string, pageRepo?: string): RemapResult {
    const result: RemapResult = { html, found: 0, remapped: 0, missing: [], page: false }
    const pageIsOld = pageRepo !== undefined && this.isOld(pageRepo)
    result.html = html.replace(START_TAG, (tag: string, name: string, attributes: string) => {
      if (name === "page") {
        const repo = attributeOf(attributes, "repo")
        if (repo === undefined || !this.isOld(repo)) return tag
        result.page = true
        return `<epic-page${withAttribute(attributes, "repo", this.to)}>`
      }
      const sha = attributeOf(attributes, "sha")
      const own = attributeOf(attributes, "repo")
      if (!sha || !(own !== undefined ? this.isOld(own) : pageIsOld)) return tag
      result.found++
      const now = this.newIdFor(sha)
      if (!now) {
        result.missing.push(sha)
        // its page moves to the new repo:  it keeps linking where it did
        return own === undefined ? `<epic-commit${withAttribute(attributes, "repo", pageRepo!, "sha")}>` : tag
      }
      result.remapped++
      const moved = withAttribute(withAttribute(attributes, "sha", now), "repo", this.to, "sha")
      return `<epic-commit${moved}>`
    })
    return result
  }

  /**
   * Every page under `content` (the epic folder), rewritten:  each `.html` file holding an `<epic-commit>` or
   * `<epic-page>`, under the lock its epic page's edits take (`SRV.FileLock`).
   * - `dryRun`:  writes nothing, reports the same
   * - skips links (the old docs folder's links back into `epics/` would count each page twice), dot folders and
   *   `node_modules`
   * - returns what it did, per file and in all
   */
  run(content: string, { dryRun = false }: { dryRun?: boolean } = {}): RemapReport {
    const files = htmlFiles(content).filter((file) => /<epic-(commit|page)\b/.test(readFileSync(file, "utf8")))
    // every page's repo BEFORE any is rewritten:  a part reads its epic's page's
    const pageRepos = new Map(files.map((file) => [file, pageRepoIn(readFileSync(file, "utf8"))] as const))
    const report: RemapReport = { files: [], found: 0, remapped: 0, missing: [], pages: 0 }
    for (const file of files) {
      const page = pageFileOf(content, file)
      const pageRepo = pageRepos.get(file) ?? (page ? pageRepos.get(page) : undefined)
      const result = SRV.FileLock.run(page ?? file, () => {
        const html = readFileSync(file, "utf8")
        const result = this.rewrite(html, pageRepo)
        if (result.html !== html && !dryRun) writeFileSync(file, result.html)
        return result
      })
      if (!result.found && !result.page) continue
      const path = relative(content, file).split(sep).join("/")
      report.files.push({ file: path, found: result.found, remapped: result.remapped, missing: result.missing })
      report.found += result.found
      report.remapped += result.remapped
      report.pages += result.page ? 1 : 0
      report.missing.push(...result.missing.map((sha) => ({ sha, file: path })))
    }
    return report
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Whether `repo` (an address) is one of the old repos, after `renamed`. */
  private isOld(repo: string): boolean {
    return this.from.includes(this.canonical(repo))
  }

  /** `repo` as compared:  renamed (`renamed`, followed to its end), no trailing `/` or `.git`, lower case. */
  private canonical(repo: string): string {
    let address = repo.trim().replace(/(\.git)?\/?$/, "")
    for (let hops = 0; this.renamed[address] && hops < MAX_RENAMES; hops++) address = this.renamed[address]!
    return address.replace(/(\.git)?\/?$/, "").toLowerCase()
  }
}

/** `CommitRemap.rewrite()`'s answer, for one file. */
export type RemapResult = {
  /** the file's new text */
  html: string
  /** commits of the old repos it holds */
  found: number
  /** of those, the ones the map had */
  remapped: number
  /** the ids the map lacks, as listed */
  missing: string[]
  /** whether its `<epic-page repo>` moved to the new repo */
  page: boolean
}

/** `CommitRemap.run()`'s answer. */
export type RemapReport = {
  /** each file holding a commit of the old repos, its path under the epic folder */
  files: { file: string; found: number; remapped: number; missing: string[] }[]
  /** commits of the old repos, in all */
  found: number
  /** of those, the ones the map had */
  remapped: number
  /** the ones it lacked, and where */
  missing: { sha: string; file: string }[]
  /** pages whose own `repo` moved to the new repo */
  pages: number
}

////////////////
// ## Markup
////////////////

/** GitHub's address, before `owner/name`. */
const GITHUB = "https://github.com"

/** A full commit id's length. */
const FULL_LENGTH = 40

/** A full commit id. */
const FULL_ID = /^[0-9a-f]{40}$/

/** The most renames followed from one address:  a loop in `renamedRepos` stops there. */
const MAX_RENAMES = 10

/** An `<epic-commit>` or `<epic-page>` start tag:  its kind (`commit`, `page`), then its attributes. */
const START_TAG = /<epic-(commit|page)\b([^>]*)>/g

/** The value of attribute `name` in a start tag's `attributes`;  `undefined` without one. */
function attributeOf(attributes: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(attributes)?.[1]
}

/**
 * `attributes` with `name` set to `value`:  in place when it's there, else added right after attribute `after`
 * (or at the end).
 */
function withAttribute(attributes: string, name: string, value: string, after?: string): string {
  const existing = new RegExp(`(\\s${name}=")[^"]*(")`)
  if (existing.test(attributes)) return attributes.replace(existing, `$1${value}$2`)
  const anchor = after ? new RegExp(`\\s${after}="[^"]*"`).exec(attributes) : null
  if (!anchor) return `${attributes.replace(/\s*$/, "")} ${name}="${value}"${attributes.match(/\s*$/)![0]}`
  const at = anchor.index + anchor[0].length
  return `${attributes.slice(0, at)} ${name}="${value}"${attributes.slice(at)}`
}

/** The `repo` of the `<epic-page>` in `html`;  `undefined` without one. */
function pageRepoIn(html: string): string | undefined {
  const page = /<epic-page\b([^>]*)>/.exec(html)
  return page ? attributeOf(page[1]!, "repo") : undefined
}

/** The epic page a file under `epics/<epic>/` belongs to:  `epics/<epic>/<epic>.plan.html`;  else `undefined`. */
function pageFileOf(content: string, file: string): string | undefined {
  const [top, epic, ...rest] = relative(content, file).split(sep)
  return top === "epics" && epic && rest.length ? join(content, "epics", epic, `${epic}.plan.html`) : undefined
}

/** Every `.html` file under `folder`, never through a link, a dot folder or `node_modules`. */
function htmlFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) return entry.name.startsWith(".") || entry.name === "node_modules" ? [] : htmlFiles(path)
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : []
  })
}
