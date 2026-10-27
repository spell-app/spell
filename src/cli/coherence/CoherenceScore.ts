import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { localTime } from "spell/util/time"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { CodeMap, type MapGraph, type MappedRepo } from "spell/cli/map"

import {
  type MechanismScore,
  type ScoreSearch,
  type ScoreSearches,
  type ScoreSnapshot,
  type UsersFrom,
  type WordCount
} from "./coherence.types"
import { RepoCode } from "./RepoCode"
import { readScoreSearches } from "./scoreSearches"

/****************
 * ### `CoherenceScore`
 * How coherent the code is, over every installed repo:  `spell coherence score` (epic `coherence` P15).
 * - For each catalog mechanism with a **Score:** line:
 *   - copies:  the lines its search finds in the repos' code, outside its homes and what's left out
 *   - users:  the files that use its homes, outside them:  from the code map's links when there is one, else the
 *     files naming what a home exports
 *   - its score:  `users / (users + copies)`
 * - The code's score:  every mechanism's users over its users and copies, summed:  the mean weighted by size, 0-100.
 * - Beside it, never in it:  each word list entry's replaced words, counted;  each repo's tests, counted.
 * - Code only:  each repo's `src/`, tests and their helpers left out (`RepoCode`).
 * - `at`:  the code as it was then, every repo:  a revision each repo reads itself (`main@{2026-10-25 14:00}`),
 *   else the kit's commit or a time, each repo at its newest commit by then;  users then by search (the map is
 *   today's)
 ****************/
export class CoherenceScore {
  /** The searches, from the catalog and the word list (or handed in, for a test). */
  readonly searches: ScoreSearches
  /** The commit or time asked for;  none:  the working tree. */
  readonly at?: string
  /** Each repo's code, lowest first, as it was `at`:  a repo with no commit by then is left out. */
  readonly repos: RepoCode[]

  /**
   * - `checkout`:  the kit's root
   * - `at`:  a commit or a time to count at;  none:  the working tree
   * - `searches`:  instead of the checkout's catalog's
   * - throws `CliError` when `at` is neither a commit nor a time
   */
  constructor(
    readonly checkout: string,
    { at, searches }: { at?: string; searches?: ScoreSearches } = {}
  ) {
    this.searches = searches ?? readScoreSearches(checkout)
    this.at = at
    this.repos = this.reposAt(at)
  }

  /**
   * Count everything, and score it.
   * - `onProblem`:  told of a search git couldn't run (a bad pattern):  it counts none
   */
  measure(onProblem: (message: string) => void = () => {}): ScoreSnapshot {
    const map = this.at ? undefined : readMap(new CodeMap(this.checkout).file)
    const usersFrom: UsersFrom = map ? "map" : "search"
    const mechanisms = this.searches.mechanisms.map((search) => {
      const files = this.copiesOf(search, onProblem)
      const copies = sum(Object.values(files))
      const users = (map ? usersInMap(map, search.homes) : this.usersBySearch(search.homes)).length
      return { name: search.name, copies, users, score: percent(users, users + copies), files }
    })
    const words: WordCount[] = this.searches.words.map((search) => ({
      name: search.name,
      count: sum(Object.values(this.copiesOf(search, onProblem)))
    }))
    return {
      at: this.where(),
      measuredAt: localTime(),
      usersFrom,
      ...totals(mechanisms),
      mechanisms,
      words,
      tests: Object.fromEntries(this.repos.map((repo) => [repo.name, repo.testCount]))
    }
  }

  /** Each file `search` finds copies in, and how many lines:  outside its homes and what it leaves out. */
  copiesOf(search: ScoreSearch, onProblem: (message: string) => void = () => {}): Record<string, number> {
    const files: Record<string, number> = {}
    const skipped = [...search.homes, ...search.not]
    for (const repo of this.repos) {
      for (const { file } of repo.grep(search.pattern, onProblem)) {
        if (search.within.length && !search.within.some((path) => isUnder(file, path))) continue
        if (skipped.some((path) => isUnder(file, path))) continue
        files[file] = (files[file] ?? 0) + 1
      }
    }
    return files
  }

  /**
   * The files naming what `homes` export, outside them:  the users, without a map.
   * - a home folder:  what each of its code files exports
   */
  usersBySearch(homes: string[]): string[] {
    const files = this.repos.flatMap((repo) => repo.files).filter((file) => homes.some((home) => isUnder(file, home)))
    const names = [...new Set(files.flatMap((file) => exportedNames(this.textOf(file) ?? "")))]
    const users = this.repos.flatMap((repo) => repo.filesNaming(names))
    return users.filter((file) => !homes.some((home) => isUnder(file, home)))
  }

  /** `path`'s text (from the checkout's root), from the repo it's in. */
  private textOf(path: string): string | undefined {
    for (const repo of this.repos) {
      const text = repo.text(path)
      if (text !== undefined) return text
    }
    return undefined
  }

  /** Where this run counted:  each repo's commit, the newest one's time, and whether the working tree had changes. */
  private where(): ScoreSnapshot["at"] {
    const commits: Record<string, string> = {}
    let newest = 0
    let dirty = false
    for (const repo of this.repos) {
      const commit = repo.commit ?? Git.out(["rev-parse", "HEAD"], repo.root)
      if (!commit) continue
      commits[repo.name] = commit.slice(0, 12)
      newest = Math.max(newest, Number(Git.out(["log", "-1", "--format=%ct", commit], repo.root) ?? 0))
      if (!repo.commit && Git.out(["status", "--porcelain", "--", "src"], repo.root)) dirty = true
    }
    return { time: localTime(new Date(newest * 1000)), commits, ...(dirty ? { dirty } : {}) }
  }

  /**
   * Each installed repo's code, at `at` (the working tree when none).
   * - each repo reads `at` itself when it can:  `main@{2026-10-25 14:00}` is each one's `main` then, by its reflog
   * - else each is at its newest commit by the time of the kit's `at` commit, or by `at` as a time
   */
  private reposAt(at: string | undefined): RepoCode[] {
    const repos = codeUnitsOf(this.checkout)
    const inside = repos.slice(1).map((repo) => repo.folder)
    if (!at) return repos.map((repo) => codeOf(repo, undefined, repo.folder ? [] : inside))
    const kit = repos[0]!
    const kitCommit = commitOf(kit.root, at)
    const seconds = kitCommit ? Git.out(["log", "-1", "--format=%ct", kitCommit], kit.root) : timeOf(at)
    if (!seconds) throw new CLI.CliError(`--at ${at}:  neither a commit of the kit nor a time (2026-10-25 14:00)`)
    return repos.flatMap((repo) => {
      const own = commitOf(repo.root, at) ?? lastCommitBy(repo.root, seconds)
      return own ? [codeOf(repo, own, repo.folder ? [] : inside)] : []
    })
  }
}

/**
 * What the score reads as one repo's code each:  the kit's `src/`, then each of its folders' (`ui/src/` ...), by the
 * folder's package name (`spell-ui`), ONE git repo since epic `repo-split` P20.
 */
function codeUnitsOf(checkout: string): MappedRepo[] {
  const [kit, ...folders] = new CodeMap(checkout).importRoots.reverse()
  if (!kit) return []
  return [
    kit,
    ...folders.map((folder) => {
      const { name } = JSON.parse(readFileSync(join(folder.root, "package.json"), "utf8")) as { name?: string }
      return { ...folder, name: name ?? folder.folder }
    })
  ]
}

/** A repo's code, at `commit` (none:  the working tree), leaving out the folders `inside` it that are code of their own. */
function codeOf(repo: MappedRepo, commit?: string, inside: string[] = []): RepoCode {
  return new RepoCode(repo.name, repo.root, repo.folder, commit, inside)
}

/** The commit `revision` names in the repo at `root`;  `undefined` when it names none there. */
function commitOf(root: string, revision: string): string | undefined {
  return Git.out(["rev-parse", "--verify", "--quiet", `${revision}^{commit}`], root) || undefined
}

/** The repo's newest commit by `seconds` (since 1970), from `HEAD`;  `undefined` when it had none. */
function lastCommitBy(root: string, seconds: string): string | undefined {
  return Git.out(["rev-list", "-1", `--before=${seconds}`, "HEAD"], root) || undefined
}

/** `text` as a time, in seconds since 1970, as git takes it;  `undefined` when it isn't one. */
function timeOf(text: string): string | undefined {
  const time = new Date(text.replace(" ", "T")).getTime()
  return Number.isNaN(time) ? undefined : String(Math.floor(time / 1000))
}

/** The code map, read;  `undefined` when there's none (graphify is optional). */
function readMap(file: string): MapGraph | undefined {
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, "utf8")) as MapGraph
  } catch {
    return undefined
  }
}

/**
 * The scored files the map links into `homes`, outside them:  files that import, use, call or extend what's there.
 * - Tests and their helpers never count:  `RepoCode.isScored()`, on the file's path in its repo.
 */
export function usersInMap(map: MapGraph, homes: string[]): string[] {
  const fileOf = new Map(map.nodes.map((node) => [node.id, node.source_file]))
  const inHome = (file?: string) => !!file && homes.some((home) => isUnder(file, home))
  const users = new Set<string>()
  for (const link of map.links) {
    if (!inHome(fileOf.get(link.target))) continue
    const file = fileOf.get(link.source)
    if (!file || inHome(file) || !isScoredInCheckout(file)) continue
    users.add(file)
  }
  return [...users]
}

/** Whether `file`, from the checkout's root, is code the score reads:  under the kit's or a folder's `src/`, not a test. */
function isScoredInCheckout(file: string): boolean {
  const inRepo = file.startsWith("src/") ? file : file.replace(/^[\w.-]+\//, "")
  return RepoCode.isScored(inRepo, new Set())
}

/**
 * The names `text` exports:  `export class Git`, `export function slug`, `export const X`;  never types.
 * - What a search for users looks for, without a map.
 */
export function exportedNames(text: string): string[] {
  const names = [
    ...text.matchAll(
      /^export\s+(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:class|function\*?|const|let)\s+([\w$]+)/gm
    )
  ]
  return [...new Set(names.map((match) => match[1]!))]
}

/** The code's totals:  copies, users and the score, from `mechanisms`. */
export function totals(mechanisms: MechanismScore[]): { score: number; copies: number; users: number } {
  const copies = sum(mechanisms.map((each) => each.copies))
  const users = sum(mechanisms.map((each) => each.users))
  return { score: percent(users, users + copies), copies, users }
}

/** `counts` added up. */
function sum(counts: number[]): number {
  return counts.reduce((total, each) => total + each, 0)
}

/** `part` of `whole`, 0-100, rounded;  100 for nothing of nothing. */
function percent(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 100
}

/**
 * Whether `file` is `path`, or in folder `path`.
 * - `path` may be a glob:  `*` within a name, `**` across folders (`ui/src/**.fallback.ts`)
 */
export function isUnder(file: string, path: string): boolean {
  if (path.includes("*")) return globPattern(path).test(file)
  return file === path || file.startsWith(path.endsWith("/") ? path : `${path}/`)
}

/** Glob `path` as a regex over a whole path. */
function globPattern(path: string): RegExp {
  const source = path
    .split("**")
    .map((part) => escapeRegExp(part).replaceAll("\\*", "[^/]*"))
    .join(".*")
  return new RegExp(`^${source}`)
}
