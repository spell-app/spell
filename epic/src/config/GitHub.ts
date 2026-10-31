import { spawnSync } from "node:child_process"

/****************
 * ### `GitHub`
 * GitHub's own command, `gh`, for the epic tools:  ONE runner, so every call has its time limit, its stand-in for
 * tests, and never throws (epic `epic-friend` P4).
 *
 * ```ts
 * GitHub.status()                              // => "ready", "missing" or "logged-out"
 * GitHub.login()                               // => "analima"
 * GitHub.isOrganization("spell-app")           // => true
 * GitHub.createRepo("analima/my-app.epics")    // => the repo made, private;  throws with gh's words
 * GitHub.addressOf("analima/my-app.epics")     // => "git@github.com:analima/my-app.epics.git", as gh's settings say
 * ```
 *
 * - Who runs it:  `EpicHome.refreshGithub()` (the person's login), `epic init` (the epic repo).
 *   Serving a page or running a hook never does:  `gh` may take seconds, or be offline.
 * - `$SPELL_EPIC_GH` names another `gh` (`command()`):  the tests' stand-ins, or a path to none.
 * - Git itself is the kit's `Git`, never this.
 * - STATIC:  `gh` is the machine's.
 * - Its position:  node's own modules only, so plain `node` loads it (beside `EpicHome`, which does);
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class GitHub {
  /** The `gh` to run:  `$SPELL_EPIC_GH`, else `gh` on the `PATH`.  Read on every call:  a test sets it. */
  static command(): string {
    return process.env[GH_ENV] || "gh"
  }

  /**
   * Run `gh <args>`:  `{ ok, out, err }`, `out` and `err` trimmed.
   * - `command`:  the `gh` to run, default `command()`
   * - a missing `gh`, a timeout or a failing command is `ok: false`;  NEVER throws
   */
  static run(args: string[], { command = GitHub.command(), timeout = TIMEOUT_MS }: GhRunOptions = {}): GhResult {
    try {
      const run = spawnSync(command, args, { encoding: "utf8", timeout })
      return {
        ok: run.status === 0,
        out: (run.stdout ?? "").trim(),
        err: (run.stderr || String(run.error ?? "")).trim()
      }
    } catch (error) {
      return { ok: false, out: "", err: String(error) }
    }
  }

  /**
   * Whether `gh` can make a repo:  `ready`, `missing` (not installed:  `gh --version` doesn't run) or `logged-out`
   * (`gh auth status` says no, or can't reach GitHub).  NEVER throws.
   */
  static status(command = GitHub.command()): GhStatus {
    if (!GitHub.run(["--version"], { command }).ok) return "missing"
    return GitHub.run(["auth", "status", "--hostname", HOST], { command }).ok ? "ready" : "logged-out"
  }

  /** The GitHub login `gh` is logged in as;  `undefined` for none (missing, logged out, offline).  NEVER throws. */
  static login(command = GitHub.command()): string | undefined {
    const run = GitHub.run(["api", "user", "-q", ".login"], { command })
    return run.ok && GitHub.isLogin(run.out) ? run.out : undefined
  }

  /** Whether `name` is a GitHub login:  letters, digits and single hyphens, at most 39. */
  static isLogin(name: string): boolean {
    return LOGIN.test(name)
  }

  /** Whether GitHub account `owner` is an organization, not a person;  `false` when gh can't say.  NEVER throws. */
  static isOrganization(owner: string): boolean {
    return GitHub.run(["api", `users/${owner}`, "-q", ".type"]).out === "Organization"
  }

  /**
   * The GitHub owner in git address `address` (`git@github.com:spell-app/spell.git`, `https://github.com/o/x`);
   * `undefined` for an address that isn't GitHub's.
   */
  static ownerIn(address: string): string | undefined {
    return GITHUB_ADDRESS.exec(address)?.[1]
  }

  /**
   * Make GitHub repo `fullName` (`owner/name`), empty:  private, unless `visibility` says `public`.
   * - throws an `Error` with gh's own words when it can't (a name taken, no right to make one there)
   * - SIDE EFFECT:  a new repo on GitHub
   */
  static createRepo(
    fullName: string,
    { visibility = "private", description = "" }: { visibility?: RepoVisibility; description?: string } = {}
  ): void {
    const run = GitHub.run(["repo", "create", fullName, `--${visibility}`, "--description", description], {
      timeout: CREATE_TIMEOUT_MS
    })
    if (!run.ok)
      throw new Error(`gh repo create ${fullName} failed:  ${run.err || run.out || "no reason given"}`, { cause: run })
  }

  /**
   * GitHub repo `fullName`'s address for git:  its SSH one when gh's settings say `git_protocol` is `ssh`, else its
   * HTTPS one, so pushing takes the way the person logged gh in.
   * - throws an `Error` with gh's words when gh can't find it
   */
  static addressOf(fullName: string): string {
    const run = GitHub.run(["repo", "view", fullName, "--json", "url,sshUrl"])
    if (!run.ok) throw new Error(`gh repo view ${fullName} failed:  ${run.err || "no reason given"}`, { cause: run })
    const { url, sshUrl } = JSON.parse(run.out) as { url: string; sshUrl: string }
    const protocol = GitHub.run(["config", "get", "git_protocol", "--host", HOST]).out
    return protocol === "ssh" ? sshUrl : url.endsWith(".git") || !/^https:/.test(url) ? url : `${url}.git`
  }
}

/** What `GitHub.run()` returns. */
export type GhResult = { ok: boolean; out: string; err: string }

/** `GitHub.run()`'s options. */
export type GhRunOptions = {
  /** the `gh` to run;  default `GitHub.command()` */
  command?: string
  /** how long it may take, ms;  default a few seconds:  it may be offline */
  timeout?: number
}

/** Whether `gh` can make a repo:  `GitHub.status()`. */
export type GhStatus = "ready" | "missing" | "logged-out"

/** What names the `gh` command `GitHub` runs, when set:  a test's stand-in, or a path to none. */
const GH_ENV = "SPELL_EPIC_GH"

/** GitHub's host, for `gh`'s per-host settings. */
const HOST = "github.com"

/** How long a `gh` call waits, ms:  it may be offline. */
const TIMEOUT_MS = 5000

/** Who can see a GitHub repo `GitHub.createRepo()` makes:  `gh repo create`'s `--private` / `--public`. */
export type RepoVisibility = "private" | "public"

/** How long `gh repo create` waits, ms. */
const CREATE_TIMEOUT_MS = 30_000

/** A GitHub login:  letters, digits and single hyphens, at most 39. */
const LOGIN = /^[A-Za-z\d](?:[A-Za-z\d]|-(?=[A-Za-z\d])){0,38}$/

/** A GitHub git address, SSH or HTTPS, its owner caught. */
const GITHUB_ADDRESS = /github\.com[:/]([^/]+)\/[^/]+?(?:\.git)?\/?$/
