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
 *   And a repo whose base branch takes only pull requests:  `epic init` opens one, `epic worktree remove --branches`
 *   asks whether a branch's was merged.
 * - `$SPELL_EPIC_GH` names another `gh` (`command()`):  the tests' stand-ins, or a path to none.
 * - Git itself is the kit's `Git`, never this.
 * - STATIC:  `gh` is the machine's.
 * - Its position:  node's own modules only, so plain `node` loads it (beside `EpicHome`, which does);
 *   NEVER an alias, an `enum` or a parameter property.
 * - One of the two code hosts:  callers ask `CodeHost.of()`, which hands back this class or a `GitLab`;
 *   nothing else tells them apart.  `run()` runs `glab` for `GitLab` too:  one runner.
 ****************/
export class GitHub {
  /** Which code host this is:  `CodeHost`'s word for it. */
  static readonly kind = "github"

  /** What a person reads about this host:  what work is proposed through, and how to get its command. */
  static readonly words: CodeHostWords = {
    name: "GitHub",
    command: "gh",
    pullRequest: "pull request",
    PullRequest: "Pull request",
    number: (id) => `#${id}`,
    install: ["  brew install gh        (other systems:  https://cli.github.com)", "  gh auth login"],
    openCommand: (base, branch) => `gh pr create --base ${base} --head ${branch} --fill`,
    // written out:  `HOST` is declared below the class, after this runs
    server: "github.com",
    canRead: {
      private: "only people added to the repo can read it;  roles control access",
      public:
        "anyone who can reach github.com can read every epic page, guide and comment, without signing in;  " +
        "roles only control who can write"
    }
  }

  /** The `gh` to run:  `$SPELL_EPIC_GH`, else `gh` on the `PATH`.  Read on every call:  a test sets it. */
  static command(): string {
    return process.env[GH_ENV] || "gh"
  }

  /**
   * Run `gh <args>`:  `{ ok, out, err }`, `out` and `err` trimmed.
   * - `command`:  the command to run, default `command()`;  `GitLab` passes its `glab` here
   * - a missing command, a timeout or a failing command is `ok: false`;  NEVER throws
   */
  static run(args: string[], { command = GitHub.command(), timeout = TIMEOUT_MS, cwd }: GhRunOptions = {}): GhResult {
    try {
      const run = spawnSync(command, args, { encoding: "utf8", timeout, cwd })
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

  /**
   * The repo page `<epic-commit>` links under, for git address `address`:  `https://github.com/o/r`, which takes
   * `/commit/<sha>`;  `null` for an address that isn't GitHub's.
   */
  static commitBase(address: string | null | undefined): string | null {
    const repo = GitHub.repoIn(String(address ?? "").trim())
    return repo ? `https://github.com/${repo}` : null
  }

  /** Nothing to do:  a new GitHub repo's main takes pushes from everyone added to it.  `CodeHost`'s other side. */
  static letTeamPush(): string | undefined {
    return undefined
  }

  /** Nothing to say:  GitHub has no rule against a first push into a new repo.  `GitLab`'s says what to do. */
  static firstPushRefusal(): FirstPushHelp | undefined {
    return undefined
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

  /** The GitHub repo in git address `address`, `owner/name`;  `undefined` for an address that isn't GitHub's. */
  static repoIn(address: string): string | undefined {
    const match = GITHUB_ADDRESS.exec(address)
    return match ? `${match[1]}/${match[2]}` : undefined
  }

  /**
   * Whether GitHub requires a pull request into `branch` of repo `fullName` (`owner/name`):
   * a ruleset's `pull_request` rule, or, where this person may read it, classic branch protection's required reviews.
   * - `false` for anything else:  no rule, no right to read it, offline, `gh` missing.  NEVER throws.
   */
  static requiresPullRequest(fullName: string, branch: string): boolean {
    const path = `repos/${fullName}`
    const name = encodeURIComponent(branch)
    const rules = GitHub.json<{ type?: string }[]>(["api", `${path}/rules/branches/${name}`])
    if (Array.isArray(rules) && rules.some((rule) => rule.type === PULL_REQUEST_RULE)) return true
    const classic = GitHub.json<{ required_pull_request_reviews?: unknown }>([
      "api",
      `${path}/branches/${name}/protection`
    ])
    return Boolean(classic?.required_pull_request_reviews)
  }

  /**
   * The pull request of branch `branch` into `base` that GitHub merged, as `gh` run in `cwd` reports it:
   * `{ number, url, head }` (`head`:  its last commit), the newest first;  `[]` when `gh` can't say.  NEVER throws.
   */
  static mergedPullRequests(branch: string, base: string, cwd: string): MergedPullRequest[] {
    const args = [
      "pr",
      "list",
      "--head",
      branch,
      "--base",
      base,
      "--state",
      "merged",
      "--json",
      "number,url,headRefOid"
    ]
    const found = GitHub.json<{ number: number; url: string; headRefOid: string }[]>(args, { cwd, timeout: NETWORK_MS })
    return Array.isArray(found) ? found.map(({ number, url, headRefOid }) => ({ number, url, head: headRefOid })) : []
  }

  /**
   * Open a pull request of `branch` into `base`, from checkout `cwd`:  its address.
   * - one open already:  that one's address
   * - throws an `Error` with gh's own words when it can't
   * - SIDE EFFECT:  a pull request on GitHub
   */
  static openPullRequest({ branch, base, title, body, cwd }: OpenPullRequest): string {
    const open = GitHub.openPullRequestOf(branch, base, cwd)
    if (open) return open
    const run = GitHub.run(["pr", "create", "--base", base, "--head", branch, "--title", title, "--body", body], {
      cwd,
      timeout: CREATE_TIMEOUT_MS
    })
    if (!run.ok) throw new Error(`gh pr create failed:  ${run.err || run.out || "no reason given"}`, { cause: run })
    return run.out.split("\n").at(-1) ?? ""
  }

  /** The address of the pull request of `branch` into `base` that's open, from checkout `cwd`;  none:  `undefined`.  NEVER throws. */
  static openPullRequestOf(branch: string, base: string, cwd: string): string | undefined {
    const open = GitHub.json<{ url: string }[]>(
      ["pr", "list", "--head", branch, "--base", base, "--state", "open", "--json", "url"],
      { cwd, timeout: NETWORK_MS }
    )
    return Array.isArray(open) ? open[0]?.url || undefined : undefined
  }

  /** `gh <args>`'s output as JSON;  `undefined` when it failed or wasn't JSON.  NEVER throws. */
  private static json<T>(args: string[], options?: GhRunOptions): T | undefined {
    const run = GitHub.run(args, options)
    if (!run.ok) return undefined
    try {
      return JSON.parse(run.out) as T
    } catch {
      return undefined
    }
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

/** What a person reads about a code host:  `GitHub.words`, `GitLab`'s;  the ONE place that says "merge request". */
export type CodeHostWords = {
  /** its name:  GitHub, GitLab */
  name: string
  /** its command:  `gh`, `glab` */
  command: string
  /** what work is proposed through, in a sentence:  `pull request`, `merge request` */
  pullRequest: string
  /** that, starting a sentence */
  PullRequest: string
  /** one of them, as this host numbers it:  `#12`, `!12` */
  number: (id: number) => string
  /** the lines to run to get its command, logged in, two spaces in */
  install: string[]
  /** the line that opens one by hand, for a branch already pushed */
  openCommand: (base: string, branch: string) => string
  /** the server people reach it on:  `github.com`, a GitLab's own host */
  server: string
  /**
   * who can read a repo of each visibility, and how access is controlled, in a line:  "Private or public?"'s hints
   * (epic `epic-engine` P69:  "Maybe describe this in the CLI interface a bit more")
   */
  canRead: Record<RepoVisibility, string>
}

/**
 * What to do when the code host refused the epic repo's first push (`CodeHostClient.firstPushRefusal()`):
 * GitLab's protected default branch, which only a Maintainer can push the first commit to.
 */
export type FirstPushHelp = {
  /** the page that lists who can help:  the project's members */
  membersPage: string
  /** what a Maintainer runs, a line each, filled in for this repo */
  commands: string[]
  /** the branch the plans sync on:  every teammate needs to push to it */
  branch: string
}

/** What `GitHub.run()` returns. */
export type GhResult = { ok: boolean; out: string; err: string }

/** `GitHub.run()`'s options. */
export type GhRunOptions = {
  /** the `gh` to run;  default `GitHub.command()` */
  command?: string
  /** how long it may take, ms;  default a few seconds:  it may be offline */
  timeout?: number
  /** where it runs, for what asks about "this repo" (`gh pr ...`);  default the current folder */
  cwd?: string
}

/** A pull request GitHub merged:  `GitHub.mergedPullRequests()`;  `head`:  its last commit. */
export type MergedPullRequest = { number: number; url: string; head: string }

/** What `GitHub.openPullRequest()` takes. */
export type OpenPullRequest = { branch: string; base: string; title: string; body: string; cwd: string }

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

/** How long `gh repo create` and `gh pr create` wait, ms. */
const CREATE_TIMEOUT_MS = 30_000

/** How long a question about pull requests waits, ms:  longer than a login's, it pages through them. */
const NETWORK_MS = 15_000

/** A ruleset rule's `type` that requires a pull request. */
const PULL_REQUEST_RULE = "pull_request"

/** A GitHub login:  letters, digits and single hyphens, at most 39. */
const LOGIN = /^[A-Za-z\d](?:[A-Za-z\d]|-(?=[A-Za-z\d])){0,38}$/

/** A GitHub git address, SSH or HTTPS, its owner and name caught. */
const GITHUB_ADDRESS = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/
