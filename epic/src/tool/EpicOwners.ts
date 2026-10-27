import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { Git } from "spell/server/Git"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { PageStages } from "spell/epic/phases"

import { PlanDocFiles, type EpicListing } from "./PlanDocFiles"
import { PARTS_DIR } from "./PlanParts"

/****************
 * ### `EpicOwners`
 * Which open epics own a file:  `epic owns <path...>`, for the `/coherence` skill (epic `coherence` P3),
 * which lands each finding in the epic that owns the files it's about.
 * - An epic owns a path two ways (`Ownership`):
 *   - `branch`:  its branch changes it.
 *     - Its worktree's commits since it left the base branch (`git diff <base>...HEAD`), and what's not committed yet.
 *     - In the checkout and in each child repo inside it (spell-ui, spell-epic ...), named from the checkout's root:
 *       `epic/src/window.mjs`.
 *     - Only an epic in progress whose checkout is a worktree:  the main checkout's own changes are nobody's.
 *   - `plan`:  its epic page names the path:  the skeleton or one of its part files (`parts/*.html`) has the path's
 *     text, as a whole path (`epic/src/x.ts` doesn't name `src/x.ts`;  a link's `../../../src/x.ts` does).
 * - Each owner with its stage (`OwnerStage`):  `planning` (a page agreeing its Overview or Phases, or a future epic),
 *   else `building`.
 * - NEVER a done epic.
 * - Node only (git, `node:fs`):  NOT in the `spell-epic` barrel, imported by path.  Reads, never writes.
 ****************/
export class EpicOwners {
  /** the checkout's epic pages, and its git */
  readonly files: PlanDocFiles

  /** the main checkout's root:  every epic's `checkout` is relative to it (`PlanDocFiles.listEpics()`) */
  readonly main: string

  /** the open epics:  in progress and future, as `listEpics()` lists them (its order) */
  readonly epics: EpicListing[]

  /**
   * - `epics`:  the epics to look through;  default every epic of `files`, the done ones left out
   */
  constructor({ files, epics = files.listEpics() }: { files: PlanDocFiles; epics?: EpicListing[] }) {
    this.files = files
    this.main = files.mainRoot()
    this.epics = epics.filter((epic) => epic.status !== "done")
  }

  ////////////////
  // ## Finding owners
  ////////////////

  /**
   * Which open epics own each of `paths`, in order:  each path with its owners, `[]` when none does.
   * - a path is the checkout root's:  `src/server/LiveReload.ts`, `epic/src/window.mjs`;
   *   an absolute one inside this checkout is made so (`pathOf()`)
   * - owners in `listEpics()`' order:  in progress, then future
   */
  find(paths: string[]): PathOwners[] {
    const wanted = paths.map((path) => EpicOwners.pathOf(path, this.files.root))
    const owners = wanted.map((): PathOwner[] => [])
    for (const epic of this.epics) {
      const changed = this.branchFiles(epic)
      const page = this.pageText(epic)
      const stage = EpicOwners.stageOf(epic, page)
      wanted.forEach((path, index) => {
        const how: Ownership[] = []
        if (changed.has(path)) how.push("branch")
        if (EpicOwners.names(page, path)) how.push("plan")
        if (how.length) owners[index]!.push({ epic: epic.name, stage, how })
      })
    }
    return wanted.map((path, index) => ({ path, owners: owners[index]! }))
  }

  /**
   * The files epic `epic`'s branch changes, from its checkout's root:  `src/a.ts`, `ui/src/b.ts`.
   * - none for a future epic, or one running in the main checkout (`PlanDocFiles.MAIN_CHECKOUT`), or whose worktree
   *   is gone
   * - each repo's (`repoFolders()`):  its commits since the base branch (`<base>...HEAD`:  from where they meet, so
   *   `main`'s own commits since don't count), its changes not committed, its new files git doesn't ignore
   * - a repo git can't answer for (no base branch there) adds nothing
   */
  branchFiles(epic: EpicListing): Set<string> {
    const changed = new Set<string>()
    if (epic.status !== "in progress" || epic.checkout === PlanDocFiles.MAIN_CHECKOUT) return changed
    const checkout = resolve(this.main, epic.checkout)
    if (!existsSync(checkout)) return changed
    const base = EpicConfig.of(this.main).baseBranch
    for (const repo of EpicOwners.repoFolders(checkout)) {
      const prefix = repo === checkout ? "" : `${relative(checkout, repo).split(sep).join("/")}/`
      const lists = [
        ["diff", "--name-only", `${base}...HEAD`],
        ["diff", "--name-only", "HEAD"],
        ["ls-files", "--others", "--exclude-standard"]
      ]
      for (const args of lists) {
        const run = Git.run(["-c", "core.quotepath=off", ...args], repo)
        if (!run.ok) continue
        for (const path of run.out.split("\n").filter(Boolean)) changed.add(`${prefix}${path}`)
      }
    }
    return changed
  }

  /**
   * Epic `epic`'s page as text:  its skeleton, then each part file (`parts/*.html`), as they are on disk.
   * - raw markup, so a link's `href` and a path's tooltip (`title`) count as naming it
   */
  pageText(epic: EpicListing): string {
    const parts = join(dirname(epic.file), PARTS_DIR)
    const partFiles = existsSync(parts)
      ? readdirSync(parts)
          .filter((name) => name.endsWith(".html"))
          .sort()
          .map((name) => join(parts, name))
      : []
    return [epic.file, ...partFiles].map((file) => readFileSync(file, "utf8")).join("\n")
  }

  ////////////////
  // ## Rules
  ////////////////

  /**
   * Does epic-page text `text` name checkout path `path`, as a whole path?
   * - not inside a longer one:  `epic/src/x.ts` and `src/x.tsx` don't name `src/x.ts`
   * - a relative link's climb is fine:  `../../../src/x.ts` names it
   * - STATIC:  pure
   */
  static names(text: string, path: string): boolean {
    if (!path) return false
    return new RegExp(`(?<![\\w-])(?<![\\w-]/)${escapeRegExp(path)}(?![\\w/-]|\\.\\w)`).test(text)
  }

  /**
   * Epic `epic`'s stage, from its skeleton's text `page`:
   * `planning` for a future epic, or a page agreeing its Overview or Phases (`<epic-page stage>`, `PageStages`);
   * else `building` (a page with no stage, made before stages, too).
   * - STATIC:  pure
   */
  static stageOf(epic: Pick<EpicListing, "status">, page: string): OwnerStage {
    if (epic.status === "future") return "planning"
    const stage = PageStages.read(/<epic-page\b[^>]*?\sstage="([^"]*)"/.exec(page)?.[1])
    return PageStages.isPlanning(stage) ? "planning" : "building"
  }

  /**
   * Path `path` as `find()` takes it:  `/`-separated, from the checkout's root, no leading `./`.
   * - an absolute path inside checkout `root`:  from there
   * - STATIC:  pure
   */
  static pathOf(path: string, root: string): string {
    const inside = isAbsolute(path) ? relative(root, path) : path
    return inside
      .split(sep)
      .join("/")
      .replace(/^(\.\/)+/, "")
  }

  /**
   * The git repos of checkout `checkout`:  it, then each folder right inside it that's a repo of its own (has a
   * `.git`:  the child repos of a multi-repo top, `spell-ui` ...).
   * - a single repo's checkout:  just it
   * - a LINK is never one:  a worktree's link to the content folder is the shared repo, nobody's branch
   */
  static repoFolders(checkout: string): string[] {
    const children = readdirSync(checkout, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(checkout, entry.name, ".git")))
      .map((entry) => join(checkout, entry.name))
    return [checkout, ...children]
  }
}

////////////////
// ## Types
////////////////

/** How an epic owns a path:  its branch changes it, or its page names it. */
export type Ownership = "branch" | "plan"

/** Where an owner is:  still agreeing its plan, or building it. */
export type OwnerStage = "planning" | "building"

/** One epic owning a path. */
export type PathOwner = {
  /** the epic's name:  `epic-engine` */
  epic: string
  /** `planning` or `building` */
  stage: OwnerStage
  /** how it owns it:  `branch`, `plan`, or both */
  how: Ownership[]
}

/** One path and its owners:  `epic owns --json`'s entries. */
export type PathOwners = {
  /** the path, from the checkout's root */
  path: string
  /** the open epics that own it;  `[]` for none */
  owners: PathOwner[]
}
