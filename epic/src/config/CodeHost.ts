import { readFileSync } from "node:fs"
import { join } from "node:path"

import { EpicHome } from "./EpicHome.ts"
import {
  GitHub,
  type CodeHostWords,
  type GhStatus,
  type MergedPullRequest,
  type OpenPullRequest,
  type RepoVisibility
} from "./GitHub.ts"
import { GitLab } from "./GitLab.ts"

/****************
 * ### `CodeHost`
 * Which company's server a repo's code is on, and the ONE chooser of how to talk to it:  `GitHub` or `GitLab`.
 *
 * ```ts
 * const host = CodeHost.of(config)      // an `EpicConfig`, or `{ main, codeHost }`
 * host.status()                         // => "ready", "missing" or "logged-out"
 * host.words.pullRequest                // => "merge request" on GitLab
 * host.openPullRequest({ ... })         // => its address
 * CodeHost.kindOfAddress("git@gitlab.acme.com:a/b.git")   // => "gitlab"
 * ```
 *
 * - The setting is `codeHost` in `.epic/config.json5`;  a key left out is worked out from the `origin` remote each
 *   time it's read:  `kindOfAddress()`.
 * - Every caller asks this class;  no other code compares host names or kinds.
 * - Its position:  `GitHub`, `GitLab` and `EpicHome` beside it, so plain `node` loads it (`EpicConfig` does);
 *   NEVER an alias, an `enum` or a parameter property.
 * - All `static`:  no state.
 ****************/
export class CodeHost {
  /** The values `codeHost` can take. */
  static readonly KINDS: readonly CodeHostKind[] = ["github", "gitlab"]

  /** Whether `value` is one of `KINDS`. */
  static isKind(value: unknown): value is CodeHostKind {
    return (CodeHost.KINDS as readonly unknown[]).includes(value)
  }

  /**
   * Whose address git address `address` is:  a host naming `gitlab` is GitLab's, `github.com` GitHub's, anything else
   * (no address, a local path, `git.acme.com`) GitHub's by default.
   * - the HOST only, so `github.com:me/gitlab-tools.git` stays GitHub's
   */
  static kindOfAddress(address: string | null | undefined): CodeHostKind {
    return hostSays(address) ?? "github"
  }

  /**
   * Whether git address `address` names a host that doesn't say whose it is (`git.acme.com`):  `epic init`'s question.
   * - no address, or a local path:  `false`:  no host to ask about
   */
  static isUnknownAddress(address: string | null | undefined): boolean {
    return Boolean(GitLab.partsOf(address)) && !hostSays(address)
  }

  /** The host of git address `address`, when it has one:  `git.acme.com`. */
  static hostOf(address: string | null | undefined): string | undefined {
    return GitLab.partsOf(address)?.host
  }

  /**
   * How to talk to the code host of `config`:  `GitHub`, or the `GitLab` of its `origin`.
   * - `config`:  an `EpicConfig`, or `{ main, codeHost }` for settings not written yet
   * - reads `origin` from `.git/config`, only for GitLab:  it needs the host
   */
  static of(config: CodeHostConfig): CodeHostClient {
    return config.codeHost === "gitlab" ? GitLab.ofAddress(CodeHost.originOf(config.main)) : GitHub
  }

  /** The `origin` remote's address in main checkout `main`, as `.git/config` says it;  none:  `undefined`.
   * - no `git` run:  every `EpicConfig` without a `codeHost` asks, the page server's included
   */
  static originOf(main: string): string | undefined {
    return REMOTE_ORIGIN.exec(readConfig(join(main, ".git", "config")))?.[1]?.trim() || undefined
  }

  /** What a person reads about code host `kind` (a report's lines, with no client to hand);  `host`:  GitLab's. */
  static wordsFor(kind: CodeHostKind | undefined, host?: string): CodeHostWords {
    return kind === "gitlab" ? GitLab.wordsOn(host) : GitHub.words
  }

  /** The repo page `<epic-commit>` links under, for `kind`'s git address `address`;  `null` for one that isn't. */
  static commitBase(kind: CodeHostKind, address: string | null | undefined): string | null {
    return kind === "gitlab" ? GitLab.ofAddress(address).commitBase(address) : GitHub.commitBase(address)
  }

  /**
   * This person's login on `host`, its command asked, for a name to suggest.
   * - GitHub's is kept (`EpicHome.refreshGithub()`):  pages show it, never running `gh`
   */
  static loginOn(host: CodeHostClient): string | undefined {
    return host === GitHub ? EpicHome.refreshGithub() : host.login()
  }
}

/** The code hosts `epic` works with. */
export type CodeHostKind = "github" | "gitlab"

/** What `CodeHost.of()` takes:  an `EpicConfig`, or just the two values it needs. */
export type CodeHostConfig = { main: string; codeHost: CodeHostKind }

/**
 * One code host's operations:  `GitHub`'s statics and a `GitLab` both are one of these.
 * - `status()`, `login()`, `isLogin()`:  whether its command is there and logged in, and as whom
 * - `isOrganization()`, `ownerIn()`, `repoIn()`:  an owner's kind, and what a git address names
 * - `requiresPullRequest()`, `mergedPullRequests()`, `openPullRequestOf()`, `openPullRequest()`:  work proposed
 *   through a pull or merge request
 * - `createRepo()`, `addressOf()`, `letTeamPush()`:  a shared repo made and opened up for the team
 * - `commitBase()`:  the page commit links go under
 * - `words`:  what a person reads
 */
export type CodeHostClient = {
  kind: CodeHostKind
  words: CodeHostWords
  status(): GhStatus
  login(): string | undefined
  isLogin(name: string): boolean
  isOrganization(owner: string): boolean
  ownerIn(address: string): string | undefined
  repoIn(address: string): string | undefined
  commitBase(address: string | null | undefined): string | null
  requiresPullRequest(fullName: string, branch: string): boolean
  mergedPullRequests(branch: string, base: string, cwd: string): MergedPullRequest[]
  openPullRequestOf(branch: string, base: string, cwd: string): string | undefined
  openPullRequest(request: OpenPullRequest): string
  createRepo(fullName: string, options?: { visibility?: RepoVisibility; description?: string }): void
  addressOf(fullName: string): string
  letTeamPush(fullName: string, branch: string): string | undefined
}

/** What git address `address`'s host says about whose it is;  `undefined` when it doesn't. */
function hostSays(address: string | null | undefined): CodeHostKind | undefined {
  const host = CodeHost.hostOf(address)
  if (!host) return undefined
  if (/gitlab/i.test(host)) return "gitlab"
  return /(^|\.)github\.com$/i.test(host) ? "github" : undefined
}

/** `file`'s text;  `""` when it can't be read. */
function readConfig(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

/** The `url` line of `[remote "origin"]`, in a git config file's text. */
const REMOTE_ORIGIN = /\[remote "origin"\][^[]*?\burl\s*=\s*(.+)/
