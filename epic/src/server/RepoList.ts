import { existsSync, mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { RealPath } from "spell/server/RealPath"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"

import {
  encodedPath,
  HOME_ENV,
  HOME_FOLDER,
  REPO_NAME,
  repoPrefixFor,
  REPOS_FILE,
  type Repo,
  type RepoEntry,
  type RepoListData
} from "./server.types"

/****************
 * ### `RepoList`
 * The REPOS the machine's one epic server serves (epic `epic-eject` P7):  `~/.spell-epic/repos.json5`.
 * Read and written through `DataFile`, so Owen's comments in it stay.
 *
 * ```ts
 * const list = new RepoList()
 * list.add("/Users/owen/www/spell-app/spell-app")   // => { name: "spell-app", content: ".../spell-app-dev", ... }
 * list.repos()                                       // every repo, its content folder read from its config
 * list.urlPathFor(".../spell-app-dev/epics/seo/seo.plan.html")   // => "/epics/seo/seo.plan.html"
 * ```
 *
 * - Each repo is kept as its NAME and MAIN checkout only.
 *   Where its content folder is comes from its own `.epic/config.json5` each time (`EpicConfig`),
 *   so a move there needs no second edit here.
 * - The DEFAULT repo is served at `/` as well as `/r/<name>/`:  the one named `default`, else the first added.
 * - `epic repo add | list | remove | default` edit it (`Repos`);  nothing else writes it.
 * - The folder:  `~/.epic/`, or `SPELL_EPIC_HOME` (tests give a temp folder:  the real file is never touched).
 * - Takes no lock:  one person adds a repo now and then.
 ****************/
export class RepoList {
  /** spell-epic's home folder:  `~/.spell-epic`, or `home` */
  readonly home: string

  /** the list's file, `<home>/repos.json5` */
  readonly file: string

  /** - `home`:  default `RepoList.homeFolder()` */
  constructor({ home = RepoList.homeFolder() }: { home?: string } = {}) {
    this.home = resolve(home)
    this.file = join(this.home, REPOS_FILE)
  }

  /**
   * spell-epic's home folder:  `$SPELL_EPIC_HOME`, else `~/.spell-epic`.
   * - read on every call, for tests
   */
  static homeFolder(): string {
    return process.env[HOME_ENV] || join(homedir(), HOME_FOLDER)
  }

  ////////////////
  // ## Reading
  ////////////////

  /** The file's data;  no file:  no repos. */
  read(): RepoListData {
    const data = DataFile.read<Partial<RepoListData>>(this.file)
    return { ...(data?.default && { default: data.default }), repos: data?.repos ?? [] }
  }

  /**
   * Every repo, in the order added, each with its content folder (its config's) and URL prefix.
   * - the default one marked
   * - a repo whose config won't read is left out, and said on stderr:  the rest are still served
   */
  repos(): Repo[] {
    const data = this.read()
    const named = data.repos.find((entry) => entry.name === data.default)?.name ?? data.repos[0]?.name
    return data.repos.flatMap((entry) => {
      try {
        return [RepoList.resolved(entry, entry.name === named)]
      } catch (error) {
        console.error(`epic repos:  ${entry.name} (${entry.checkout}) left out:  ${(error as Error).message}`)
        return []
      }
    })
  }

  /** The repo called `name`;  `undefined` for none. */
  named(name: string): Repo | undefined {
    return this.repos().find((repo) => repo.name === name)
  }

  /** The repo served at `/`;  `undefined` while none is registered. */
  get defaultRepo(): Repo | undefined {
    return this.repos().find((repo) => repo.isDefault)
  }

  /**
   * The repo whose content `file` is (or whose checkout holds it),
   * and its path inside the content folder, `epics/seo/seo.plan.html`.
   * - `undefined` outside every repo's content
   * - by real paths:  a checkout's `epics/` link and a worktree's lead to the same file in the content folder
   */
  repoOf(file: string, repos = this.repos()): { repo: Repo; path: string } | undefined {
    const real = RealPath.of(file)
    for (const repo of repos) {
      const inside = relative(RealPath.of(repo.content), real)
      if (inside && !inside.startsWith("..") && !isAbsolute(inside)) return { repo, path: inside.split(sep).join("/") }
    }
    return undefined
  }

  /**
   * `file`'s URL path on the epic server:
   * - `/<path>` for the default repo's content
   * - `/r/<repo>/<path>` for another's
   * - `undefined` for a file in no repo's content
   */
  urlPathFor(file: string, repos = this.repos()): string | undefined {
    const found = this.repoOf(file, repos)
    if (!found) return undefined
    return `${found.repo.isDefault ? "/" : found.repo.prefix}${encodedPath(found.path)}`
  }

  /**
   * The checkout the pages of checkout `root` are LAID UNDER when served:  where their links to code resolve, so the
   * linker's root (`SRV.Linker`;  epic `epic-engine` I22).
   * - FIRST, a multi-repo top, or a child repo of one, that shares the top's content folder:  the TOP's checkout
   *   (`root` itself, for the top;  for a child, the folder above it, the epic's worktree of the top for a child's
   *   worktree, else the top's main)
   *   - since epic `repo-split` P16 the top's page server serves that content, from the top's root
   *   - before epic `readme` P14 this fell through to the first registered repo with the content (spell-app), so a
   *     guide's `../../ui/...` checked as missing, and `../ui/...` as spell-app's
   * - `root` itself:
   *   - when it holds its own pages (`content` is `root`), or its repo is registered (spell-app, a worktree of it)
   *   - when no registered repo has `content` (another machine's list, a test's made-up checkout)
   * - ELSE the registered repo whose content folder `content` is:  spell-epic's epic pages are spell-app's content,
   *   served by spell-app's page server under spell-app's checkout, where the engine's files are `spell/epic/...`
   *   (its `engineFolder` link), not this checkout's `src/...`
   * - `content`:  default `root`'s (`EpicConfig.contentOf()`)
   * - a list that won't read:  `root`
   */
  linkRootOf(root: string, content = EpicConfig.contentOf(root)): string {
    if (resolve(content) === resolve(root)) return root
    const top = topCheckoutOf(root, content)
    if (top) return top
    let repos: Repo[]
    try {
      repos = this.repos()
    } catch {
      return root
    }
    const main = EpicConfig.mainOf(root)
    if (repos.some((repo) => RealPath.same(repo.checkout, main))) return root
    return repos.find((repo) => RealPath.same(repo.content, content))?.checkout ?? root
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Register the repo `checkout` is in (its MAIN checkout, from any worktree),
   * as `name` (default:  its folder's name);  returns it.
   * - already there by that checkout (any spelling of it):  renamed to `name` when one is given, else left;  its
   *   path made the real one
   * - `isDefault`:  served at `/` from now on
   * - throws `RepoListError` for a bad name, a name another checkout has, or a checkout that isn't a folder
   * - SIDE EFFECT:  writes the file (and makes its folder)
   */
  add(checkout: string, { name, isDefault = false }: { name?: string; isDefault?: boolean } = {}): Repo {
    const main = EpicConfig.mainOf(resolve(checkout))
    const data = this.read()
    // by real paths:  an entry written before a move behind a compat link is the same repo, and takes the real path
    const there = data.repos.find((entry) => RealPath.same(entry.checkout, main))
    const repoName = name ?? there?.name ?? basename(main)
    if (!REPO_NAME.test(repoName))
      throw new RepoListError(`"${repoName}" can't be a repo name:  letters, digits, ".", "_" and "-" only`)
    const clash = data.repos.find((entry) => entry.name === repoName && !RealPath.same(entry.checkout, main))
    if (clash) throw new RepoListError(`"${repoName}" is ${clash.checkout} already:  give this one another --name`)
    if (there) {
      // renamed:  the default follows it
      if (data.default === there.name) data.default = repoName
      there.name = repoName
      there.checkout = main
    } else data.repos.push({ name: repoName, checkout: main })
    if (isDefault) data.default = repoName
    this.write(data)
    return this.named(repoName) ?? RepoList.resolved({ name: repoName, checkout: main }, isDefault)
  }

  /**
   * Unregister repo `name`;  returns whether it was there.
   * - the default:  the first left becomes it (`default` is dropped)
   * - SIDE EFFECT:  writes the file
   */
  remove(name: string): boolean {
    const data = this.read()
    const repos = data.repos.filter((entry) => entry.name !== name)
    if (repos.length === data.repos.length) return false
    this.write({ ...(data.default && data.default !== name && { default: data.default }), repos })
    return true
  }

  /**
   * Serve repo `name` at `/`.
   * - throws `RepoListError` for a repo that isn't registered
   * - SIDE EFFECT:  writes the file
   */
  setDefault(name: string): void {
    const data = this.read()
    if (!data.repos.some((entry) => entry.name === name)) throw new RepoListError(`no repo "${name}":  epic repo list`)
    this.write({ ...data, default: name })
  }

  /**
   * Write `data`, its comments kept (`DataFile.write()`).
   * - SIDE EFFECT:  makes the home folder
   */
  private write(data: RepoListData): void {
    mkdirSync(this.home, { recursive: true })
    DataFile.write(this.file, data)
  }

  /**
   * `entry` as it's served:  its content folder from its config (`EpicConfig`), its URL prefix.
   * - throws when its config won't read
   */
  static resolved(entry: RepoEntry, isDefault: boolean): Repo {
    const content = new EpicConfig(entry.checkout).contentFolder
    return { ...entry, content, prefix: repoPrefixFor(entry.name), isDefault }
  }
}

/**
 * The top's checkout that serves child repo `root`'s pages (`RepoList.linkRootOf()`), when `root` is a child repo of a
 * multi-repo top whose content folder is `content`;  else `undefined`.
 * - the folder above `root` when it is a checkout of the top (a child's worktree sits in the top's), else the top's main
 * - `root` is the top itself:  `root`
 * - a single repo, another content folder, or a config that won't read:  `undefined`
 */
function topCheckoutOf(root: string, content: string): string | undefined {
  try {
    const config = EpicConfig.of(root)
    const top = config.top
    if (!top || !RealPath.same(EpicConfig.contentOf(top.main), content)) return undefined
    if (top === config) return root
    const above = dirname(resolve(root))
    return existsSync(join(above, EpicConfig.FILE)) ? above : top.main
  } catch {
    return undefined
  }
}

/** A repo list change that can't be made:  its message says why, for Owen. */
export class RepoListError extends Error {}
