import { readFileSync } from "node:fs"

import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { CodeHost, type CodeHostClient } from "spell/epic/config/CodeHost"
import { EpicConfig } from "spell/epic/config/EpicConfig"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"
import { EpicCheckout } from "./EpicCheckout"

/****************
 * ### `PullRequest`
 * `epic pr <name> [--title <title>] [--body-file <file>]`:  push branch `<name>` and open its pull request, or merge
 * request on GitLab, against the repo's base branch.
 * - Refuses, plainly, a branch that isn't there, the base branch itself, or one with nothing `origin`'s base lacks.
 * - `git push -u origin <name>`, NEVER `--force`, never the base branch.
 * - One open already:  says its address, and that the push updated it.
 * - The host's command missing or logged out:  the branch is pushed anyway, and it prints exactly what to run.
 * - Host-neutral:  it asks `CodeHost.of()` for GitHub or GitLab, and says "pull request" or "merge request" as told.
 * - Who:  the isolate and epic skills' finish, where the base branch takes only pull requests.
 * - Its position:  a verb of the `epic` command;  node only, imported by path.
 ****************/
export class PullRequest {
  /** the repo's main checkout */
  readonly main: string
  /** this repo's settings */
  readonly config: EpicConfig
  /** the code host to talk to */
  readonly host: CodeHostClient
  /** where it prints */
  readonly print: (line: string) => void

  /** - `main`:  default the repo the current folder is in;  `print`:  a test's stand-in */
  constructor({ main, print = (line: string) => CLI.out(line) }: PullRequestProps = {}) {
    this.config = new EpicConfig(main ?? EpicConfig.mainOf(EpicCheckout.nearest()))
    this.main = this.config.main
    this.host = CodeHost.of(this.config)
    this.print = print
  }

  /**
   * Run `epic pr <args>`:  resolves to the exit code.
   * - throws `EpicCommandError`, in plain words, for what it refuses
   * - SIDE EFFECT:  the branch pushed, a request opened on the code host
   */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args)
    const name = positional[0]
    if (!name) throw new EpicCommandError("epic pr:  name the branch:  epic pr <name>")
    const { main } = this
    const base = this.config.baseBranch
    const { words } = this.host
    if (name === base) throw new EpicCommandError(`epic pr:  ${name} is the base branch:  name the branch to propose`)
    if (!Git.run(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`], main).ok)
      throw new EpicCommandError(`epic pr:  no branch ${name} here (${main}):  git branch lists what there is`)
    if (!Git.out(["remote", "get-url", "origin"], main))
      throw new EpicCommandError("epic pr:  this repo has no remote origin to push to")
    Git.run(["fetch", "-q", "origin", base], main, { timeout: PUSH_TIMEOUT })
    const against = Git.run(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${base}`], main).ok
      ? `refs/remotes/origin/${base}`
      : `refs/heads/${base}`
    const ahead = Git.out(["rev-list", "--count", `${against}..${name}`], main) ?? "0"
    if (ahead === "0") throw new EpicCommandError(`epic pr:  ${name} has nothing ahead of ${base};  nothing to propose`)
    const bodyFile = stringFlag(flags.bodyFile)
    const body = bodyFile ? this.readBody(bodyFile) : this.defaultBody(name, against)
    const title = stringFlag(flags.title) ?? this.defaultTitle(name, ahead)
    const pushed = Git.run(["push", "-u", "origin", name], main, { timeout: PUSH_TIMEOUT })
    if (!pushed.ok)
      throw new EpicCommandError(`epic pr:  git refused the push of ${name}:  ${pushed.err || "no reason given"}`)
    const status = this.host.status()
    if (status !== "ready") {
      const why =
        status === "missing"
          ? `${words.name}'s command, ${words.command}, isn't installed`
          : `${words.command} isn't logged in to ${words.name}`
      this.print(`${name} is pushed;  no ${words.pullRequest} opened:  ${why}.  To open one:`)
      for (const line of [...words.install, `  ${words.openCommand(base, name)}`]) this.print(line)
      return EXIT.ERRORS
    }
    const open = this.host.openPullRequestOf(name, base, main)
    if (open) {
      this.print(`${words.PullRequest} open already:  ${open}`)
      this.print(`The push updated it.`)
      return EXIT.OK
    }
    try {
      this.print(
        `${words.PullRequest} opened:  ${this.host.openPullRequest({ branch: name, base, title, body, cwd: main })}`
      )
    } catch (error) {
      throw new EpicCommandError(`epic pr:  ${name} is pushed;  ${(error as Error).message}`)
    }
    return EXIT.OK
  }

  /** The file's text for the body;  throws `EpicCommandError` for one that won't read. */
  private readBody(file: string): string {
    try {
      return readFileSync(file, "utf8")
    } catch {
      throw new EpicCommandError(`epic pr:  can't read --body-file ${file}`)
    }
  }

  /** What a request says with no `--body-file`:  each commit it brings, a bullet. */
  private defaultBody(name: string, against: string): string {
    return Git.out(["log", "--reverse", "--format=- %s", `${against}..${name}`], this.main) || name
  }

  /** What a request is called with no `--title`:  its one commit's subject, else the branch's name. */
  private defaultTitle(name: string, ahead: string): string {
    return (ahead === "1" && Git.out(["log", "-1", "--format=%s", name], this.main)) || name
  }
}

/** What `PullRequest` takes. */
export type PullRequestProps = {
  /** the repo's main checkout;  default the one the current folder is in */
  main?: string
  /** where it prints;  default the terminal */
  print?: (line: string) => void
}

/** How long a push or a fetch may take:  a network call. */
const PUSH_TIMEOUT = 120_000
