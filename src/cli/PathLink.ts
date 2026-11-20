import { execSync } from "node:child_process"
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { delimiter, dirname, join, resolve } from "node:path"

/****************
 * ### `PathLink`
 * A command on your `PATH`, `spell` or `epic`:  a link to one checkout's own (`bin/spell.mjs`, `epic/bin/epic`).
 * - Made two ways:
 *   - by hand, `yarn cli:install` at a checkout's root (`link()`)
 *   - by `spell local on`, in a project (`linkFor()`), which records that it made it, so `spell local off` can take
 *     it away again (`unlinkFor()`) once no project still runs a checkout
 * - A link made by hand is never removed;  a file that isn't a link is never replaced.
 * - Imports only node's own modules, in TypeScript plain node runs:  `scripts/install-cli.mjs` loads it as it is.
 ****************/
export class PathLink {
  /** the command it links:  `spell` (default), `epic` */
  readonly command: string
  /** the environment:  `PATH`, `SPELL_BIN_DIR` */
  readonly env: NodeJS.ProcessEnv
  /** the home folder:  `~/.local/bin`, and `~/.spell/`, where `spell local`'s record is */
  readonly home: string

  constructor(options: PathLinkOptions = {}) {
    this.command = options.command ?? "spell"
    this.env = options.env ?? process.env
    this.home = options.home ?? homedir()
  }

  /** Where `spell local` records the links it made, by command:  `~/.spell/path-links.json`. */
  get recordFile(): string {
    return join(this.home, ".spell", "path-links.json")
  }

  /** The folders on `PATH`, in order. */
  get pathFolders(): string[] {
    return (this.env.PATH ?? "").split(delimiter).filter(Boolean)
  }

  /**
   * The folder to link into:  `SPELL_BIN_DIR`, else the first of these on `PATH` we can write to, else `~/.local/bin`:
   * - `~/.local/bin`
   * - npm's global `bin` (`npm prefix -g`):  NOT on `PATH` under volta, which only puts its shims there
   * - `/usr/local/bin`, `/opt/homebrew/bin`
   */
  get binDir(): string {
    const chosen = this.env[SPELL_BIN_DIR]?.trim()
    if (chosen) return resolve(chosen)
    const localBin = join(this.home, ".local", "bin")
    const candidates = [localBin, npmBin(), "/usr/local/bin", "/opt/homebrew/bin"].filter(Boolean) as string[]
    return candidates.find((dir) => this.pathFolders.includes(dir) && isWritable(dir)) ?? localBin
  }

  ////////////////
  // ## By hand:  yarn cli:install
  ////////////////

  /**
   * Link `spell` to `target` (a checkout's `bin/spell.mjs`), replacing any older link:  `yarn cli:install`.
   * - SIDE EFFECT:  the link is yours now, so `spell local off` never removes it (forgets its record)
   * - `blocked` when something that isn't a link is in the way:  never replaced
   */
  link(target: string): PathLinkResult {
    const link = join(this.binDir, this.command)
    const before = linkTarget(link)
    if (isBlocked(link)) return this.result(link, target, "blocked")
    if (this.record()?.link === link) this.writeRecord(undefined)
    makeLink(link, target)
    return this.result(link, target, before === undefined ? "linked" : before === target ? "kept" : "repointed", before)
  }

  ////////////////
  // ## By spell local
  ////////////////

  /**
   * `spell local on` in `project`:  `spell` on the `PATH`, linked to `target`, and `project` recorded as using it.
   * - `kept`:  a link to `target` was there already;  `madeByLocal` says whether `spell local` made it
   * - `repointed`:  a link to another checkout was there;  `spell local off` puts it back once no project uses this one
   * - `blocked`:  a file that isn't a link is there;  nothing changed
   */
  linkFor(project: string, target: string): PathLinkResult {
    const record = this.record()
    const link = record?.link ?? join(this.binDir, this.command)
    const before = linkTarget(link)
    if (isBlocked(link)) return this.result(link, target, "blocked")
    if (before !== undefined && sameFile(before, target)) {
      if (record) this.writeRecord({ ...record, projects: withProject(record.projects, project) })
      return this.result(link, target, "kept", before)
    }
    makeLink(link, target)
    this.writeRecord({
      link,
      target,
      previous: record ? record.previous : before,
      projects: withProject(record?.projects ?? [], project)
    })
    return this.result(link, target, before === undefined ? "linked" : "repointed", before)
  }

  /**
   * `spell local off` in `project`:  forget it, then take the link away when `spell local` made it and no other
   * project still runs a checkout (its `.spell/kit.json5` still there).
   * - The link it replaced, when there was one, is put back instead (`restored`).
   * - NEVER removes a link made by hand.
   */
  unlinkFor(project: string): PathUnlinkResult {
    const record = this.record()
    if (!record) {
      const link = this.resolvedLink()
      return { outcome: link ? "not-ours" : "none", link }
    }
    const others = record.projects.filter((other) => other !== project && usesLocal(other))
    if (others.length) {
      this.writeRecord({ ...record, projects: others })
      return { outcome: "in-use", link: record.link, projects: others }
    }
    this.writeRecord(undefined)
    if (record.previous && existsSync(record.previous)) {
      makeLink(record.link, record.previous)
      return { outcome: "restored", link: record.link, target: record.previous }
    }
    if (linkTarget(record.link) !== undefined) unlinkSync(record.link)
    return { outcome: "removed", link: record.link }
  }

  /**
   * What `spell` on the `PATH` is now:  the first `spell` on it, where it leads, and whether `spell local` made it.
   * - `undefined` when there's no `spell` on the `PATH`
   */
  status(): PathLinkStatus | undefined {
    const record = this.record()
    const link = this.resolvedLink()
    if (!link) return undefined
    const target = linkTarget(link)
    const real = existsSync(link) ? realpathSync(link) : link
    return {
      link,
      target: real,
      isLink: target !== undefined,
      madeByLocal: record?.link === link,
      projects: record?.projects ?? []
    }
  }

  /**
   * The first `spell` on the `PATH`;  else `undefined`.
   * - Skips the folders `yarn` puts first while it runs a script (`node_modules/.bin`, its `xfs-` temp folders):
   *   `yarn spell local status` asks about YOUR `PATH`.
   */
  resolvedLink(): string | undefined {
    return this.pathFolders
      .filter((dir) => !YARN_FOLDER.test(dir))
      .map((dir) => join(dir, this.command))
      .find((file) => existsSync(file) || linkTarget(file) !== undefined)
  }

  ////////////////
  // ## The record
  ////////////////

  /**
   * `spell local`'s record of the link it made, its projects pruned of any that no longer run a checkout;
   * `undefined` when it made none, or the link has changed since (someone else's now).
   * - NEVER throws:  an unreadable record is no record
   */
  record(): PathLinkRecord | undefined {
    try {
      const record = this.records()[this.command]
      if (!record) return undefined
      const now = linkTarget(record.link)
      if (now === undefined || !sameFile(now, record.target)) return undefined
      return { ...record, projects: record.projects.filter(usesLocal) }
    } catch {
      return undefined
    }
  }

  /** Every command's record, as written.  NEVER throws:  an unreadable file is none. */
  private records(): Partial<Record<string, PathLinkRecord>> {
    try {
      return JSON.parse(readFileSync(this.recordFile, "utf8")) as Record<string, PathLinkRecord>
    } catch {
      return {}
    }
  }

  /** Write this command's `record`;  `undefined` forgets it, and the file goes once no command has one. */
  private writeRecord(record: PathLinkRecord | undefined): void {
    const records = { ...this.records(), [this.command]: record }
    if (!record) delete records[this.command]
    if (!Object.keys(records).length) return rmSync(this.recordFile, { force: true })
    mkdirSync(dirname(this.recordFile), { recursive: true })
    writeFileSync(this.recordFile, JSON.stringify(records, null, 2) + "\n")
  }

  /** A `PathLinkResult`, whether the link's folder is on `PATH` filled in. */
  private result(link: string, target: string, outcome: PathLinkOutcome, before?: string): PathLinkResult {
    return { link, target, outcome, before, isOnPath: this.pathFolders.includes(dirname(link)) }
  }
}

////////////////
// ## Types
////////////////

/** A folder `yarn` adds to `PATH` while it runs a script. */
const YARN_FOLDER = /node_modules|\/xfs-[^/]+$/

/** The environment variable naming the folder to link `spell` into, instead of the first on `PATH`. */
export const SPELL_BIN_DIR = "SPELL_BIN_DIR"

/** `new PathLink()`'s options:  tests pass their own. */
export type PathLinkOptions = {
  /** the command to link, default `spell` */
  command?: string
  /** default:  `process.env` */
  env?: NodeJS.ProcessEnv
  /** default:  `os.homedir()` */
  home?: string
}

/** What `link()` / `linkFor()` did. */
export type PathLinkOutcome = "linked" | "kept" | "repointed" | "blocked"

/** What `link()` / `linkFor()` did, and where. */
export type PathLinkResult = {
  /** the link, `~/.local/bin/spell` */
  link: string
  /** what it leads to now (`blocked`:  would have) */
  target: string
  outcome: PathLinkOutcome
  /** what the link led to before, when it was a link */
  before?: string
  /** whether the link's folder is on `PATH`:  else `spell` won't be found */
  isOnPath: boolean
}

/** What `unlinkFor()` did, and where. */
export type PathUnlinkResult = {
  /**
   * - `removed`, `restored` (the link it replaced put back):  the link was `spell local`'s, and no project uses it now
   * - `in-use`:  kept, for `projects`
   * - `not-ours`:  kept, made by hand
   * - `none`:  no link to take away
   */
  outcome: "removed" | "restored" | "in-use" | "not-ours" | "none"
  link?: string
  /** `restored`:  what it leads to again */
  target?: string
  /** `in-use`:  the projects still running a checkout */
  projects?: string[]
}

/** `status()`:  the `spell` on the `PATH`. */
export type PathLinkStatus = {
  /** the first `spell` on the `PATH` */
  link: string
  /** where it leads, links followed */
  target: string
  /** whether it's a link at all (npm's global install is one too) */
  isLink: boolean
  /** whether `spell local on` made it */
  madeByLocal: boolean
  /** the projects that turned local on with it */
  projects: string[]
}

/** `spell local`'s record of one command's link, in `~/.spell/path-links.json`. */
export type PathLinkRecord = {
  /** the link it made */
  link: string
  /** what it leads to */
  target: string
  /** what the link led to before `spell local` repointed it, to put back */
  previous?: string
  /** the projects that turned local on, full paths */
  projects: string[]
}

////////////////
// ## Helpers
////////////////

/** Link `link` to `target`, replacing a link there;  `target` made runnable. */
function makeLink(link: string, target: string): void {
  if (existsSync(target)) chmodSync(target, 0o755)
  mkdirSync(dirname(link), { recursive: true })
  if (linkTarget(link) !== undefined) unlinkSync(link)
  symlinkSync(target, link)
}

/** What the link at `path` leads to, as a full path;  `undefined` when it's no link.  Even a broken one. */
function linkTarget(path: string): string | undefined {
  try {
    return lstatSync(path).isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : undefined
  } catch {
    return undefined
  }
}

/** Something that isn't a link at `path`:  never replaced. */
function isBlocked(path: string): boolean {
  return existsSync(path) && linkTarget(path) === undefined
}

/** Whether `a` and `b` are the same file, links followed. */
function sameFile(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch {
    return resolve(a) === resolve(b)
  }
}

/**
 * Whether `project` still runs a checkout:  its `.spell/kit.json5` is there.
 * - NOTE:  `KIT_FILE`, written out:  importing `./kitCheckout` would need a `.ts` plain node reads and tsc refuses
 */
function usesLocal(project: string): boolean {
  return existsSync(join(project, ".spell", "kit.json5"))
}

/** `projects`, with `project` added once. */
function withProject(projects: string[], project: string): string[] {
  return projects.includes(project) ? projects : [...projects, project]
}

/** npm's global `bin`;  `undefined` without npm.  NEVER throws. */
function npmBin(): string | undefined {
  try {
    return resolve(execSync("npm prefix -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), "bin")
  } catch {
    return undefined
  }
}

/** Can we write into folder `dir`? */
function isWritable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK)
    return true
  } catch {
    return false
  }
}
