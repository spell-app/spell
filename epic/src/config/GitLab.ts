import {
  GitHub,
  type CodeHostWords,
  type FirstPushHelp,
  type GhResult,
  type GhRunOptions,
  type GhStatus,
  type MergedPullRequest,
  type OpenPullRequest,
  type RepoVisibility
} from "./GitHub.ts"

/****************
 * ### `GitLab`
 * GitLab's command, `glab`, for the epic tools:  the same operations as `GitHub`, on one GitLab instance.
 *
 * ```ts
 * const lab = GitLab.ofAddress("git@git.acme.com:team/sub/app.git")
 * lab.status()                                // => "ready", "missing" or "logged-out"
 * lab.repoIn("https://git.acme.com/a/b/c")    // => "a/b/c"
 * lab.createRepo("team/sub/app.epics")        // => the project made, private;  throws with glab's words
 * ```
 *
 * - One instance per repo, unlike `GitHub`'s statics:  a repo's GitLab may be any host (`git.acme.com`).
 *   - Every call names that host, so a self-hosted address works from anywhere:  `glab api --hostname`, `glab auth
 *     status --hostname`, `glab mr create --repo <its address>`.
 * - Callers ask `CodeHost.of()`, never this class.
 * - It leans on `glab api`, whose answers are GitLab's documented JSON, not `glab`'s printed tables;
 *   `glab mr create` is the one exception, and even so its address is read back from the API when it can't be parsed.
 * - It makes a project through the API, never `glab repo create`, whose `--skipGitInit` still adds a local remote
 *   (https://gitlab.com/gitlab-org/cli/-/issues/8533).
 * - NOT tried against a real GitLab yet:  README-epics.md's "On GitLab" says so.
 * - Its position:  `GitHub` beside it (the one runner) and nothing else of ours, so plain `node` loads it;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class GitLab {
  /** Which code host this is:  `CodeHost`'s word for it. */
  readonly kind = "gitlab"
  /** the instance:  `gitlab.com`, `git.acme.com`;  none:  `glab` picks */
  readonly host: string | undefined
  /** the repo's path on it:  `team/sub/app`;  none for a repo with no GitLab address */
  readonly repoPath: string | undefined
  /** whether the repo is reached over SSH:  a project made for it is too */
  readonly usesSsh: boolean

  /** - `host`, `repoPath`, `usesSsh`:  as the fields;  `ofAddress()` works them out from a git address */
  constructor({ host, repoPath, usesSsh = false }: { host?: string; repoPath?: string; usesSsh?: boolean } = {}) {
    this.host = host
    this.repoPath = repoPath
    this.usesSsh = usesSsh
  }

  /**
   * The `GitLab` of the repo at git address `address`:  `git@host:group/sub/p.git`, `ssh://git@host/group/sub/p`,
   * `https://host/group/sub/p.git`;  self-hosted hosts too.
   * - no address, or one naming no host (a local path):  `glab` picks the host, and there's no repo path
   */
  static ofAddress(address: string | null | undefined): GitLab {
    const parts = GitLab.partsOf(address)
    return new GitLab(parts ? { host: parts.host, repoPath: parts.path, usesSsh: parts.ssh } : {})
  }

  /**
   * The host, the path and the protocol in git address `address`;  `undefined` for a local path or anything else.
   * - scp-like (`git@host:a/b.git`) and `ssh://` are SSH, an `ssh://` port dropped (`glab` knows the web host);
   *   `https://` keeps its port
   */
  static partsOf(address: string | null | undefined): { host: string; path: string; ssh: boolean } | undefined {
    const text = String(address ?? "").trim()
    const web = /^https?:\/\/(?:[^/@]+@)?([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(text)
    if (web) return { host: web[1]!, path: web[2]!, ssh: false }
    const ssh = /^ssh:\/\/(?:[^/@]+@)?([^/:]+)(?::\d+)?\/(.+?)(?:\.git)?\/?$/.exec(text)
    if (ssh) return { host: ssh[1]!, path: ssh[2]!, ssh: true }
    const scp = /^(?:[^/@]+@)?([^/:]+):(?!\/\/)(.+?)(?:\.git)?\/?$/.exec(text)
    return scp ? { host: scp[1]!, path: scp[2]!, ssh: true } : undefined
  }

  /** The `glab` to run:  `$SPELL_EPIC_GLAB`, else `glab` on the `PATH`.  Read on every call:  a test sets it. */
  static command(): string {
    return process.env[GLAB_ENV] || "glab"
  }

  /** What a person reads about this host. */
  get words(): CodeHostWords {
    return GitLab.wordsOn(this.host)
  }

  /** What a person reads about GitLab at `host`:  self-hosted, how to log in names it, and who can read a repo. */
  static wordsOn(host?: string): CodeHostWords {
    const named = host && host !== DEFAULT_HOST ? ` --hostname ${host}` : ""
    const server = host || DEFAULT_HOST
    return {
      name: "GitLab",
      command: "glab",
      pullRequest: "merge request",
      PullRequest: "Merge request",
      number: (id) => `!${id}`,
      install: [
        "  brew install glab      (other systems:  https://gitlab.com/gitlab-org/cli)",
        `  glab auth login${named}`
      ],
      openCommand: (base, branch) => `glab mr create --source-branch ${branch} --target-branch ${base} --fill --yes`,
      server,
      canRead: {
        private: "only people added to the project, and members of its group, can read it;  roles control access",
        public:
          `anyone who can reach ${server} can read every epic page, guide and comment, without signing in;  ` +
          "roles only control who can write"
      }
    }
  }

  /**
   * Whether git's words `said`, from a push, are GitLab refusing a new project's FIRST push:  "You cannot push the
   * initial commit because the default branch is protected and your role does not allow it."
   * - GitLab breaks that sentence across `remote:` lines:  they're taken out, and the words joined, before comparing
   */
  static refusesFirstPush(said: string | undefined): boolean {
    const joined = String(said ?? "")
      .replace(/^remote:[ \t]?/gm, "")
      .replace(/\s+/g, " ")
    return FIRST_PUSH_REFUSED.test(joined)
  }

  /** Run `glab <args>`:  as `GitHub.run()`, `glab` by default.  NEVER throws. */
  private run(args: string[], options: GhRunOptions = {}): GhResult {
    return GitHub.run(args, { command: GitLab.command(), timeout: READ_MS, ...options })
  }

  /** Call GitLab's API on this repo's host.  NEVER throws. */
  private api(
    endpoint: string,
    options: { method?: string; fields?: Record<string, string> } & GhRunOptions = {}
  ): GhResult {
    const { method, fields, ...run } = options
    return this.run(
      [
        "api",
        ...(this.host ? ["--hostname", this.host] : []),
        ...(method ? ["--method", method] : []),
        endpoint,
        ...Object.entries(fields ?? {}).flatMap(([name, value]) => ["--raw-field", `${name}=${value}`])
      ],
      run
    )
  }

  /** `glab api <endpoint>`'s answer as JSON;  `undefined` when it failed or wasn't JSON.  NEVER throws. */
  private json<T>(endpoint: string): T | undefined {
    return parsed<T>(this.api(endpoint))
  }

  /** Whether `glab` can work:  `ready`, `missing` (`glab version` doesn't run) or `logged-out`.  NEVER throws. */
  status(command = GitLab.command()): GhStatus {
    if (!GitHub.run(["version"], { command, timeout: READ_MS }).ok) return "missing"
    const auth = this.run(["auth", "status", ...(this.host ? ["--hostname", this.host] : [])], { command })
    return auth.ok ? "ready" : "logged-out"
  }

  /** The GitLab username `glab` is logged in as;  `undefined` for none (missing, logged out, offline).  NEVER throws. */
  login(): string | undefined {
    const username = this.json<{ username?: string }>("user")?.username
    return username && this.isLogin(username) ? username : undefined
  }

  /** Whether `name` is a GitLab username. */
  isLogin(name: string): boolean {
    return USERNAME.test(name)
  }

  /** Whether namespace `owner` is a GitLab group, subgroups too, not a person's;  `false` when glab can't say.  NEVER throws. */
  isOrganization(owner: string): boolean {
    return this.json<{ id?: number }>(`groups/${encoded(owner)}`)?.id !== undefined
  }

  /** The group or user in git address `address`, subgroups included:  `team/sub`;  `undefined` without one. */
  ownerIn(address: string): string | undefined {
    const repo = this.repoIn(address)
    return repo?.includes("/") ? repo.slice(0, repo.lastIndexOf("/")) : undefined
  }

  /** The project path in git address `address`, `team/sub/app`;  `undefined` for an address naming no host. */
  repoIn(address: string): string | undefined {
    return GitLab.partsOf(address)?.path
  }

  /**
   * The repo page `<epic-commit>` links under, for git address `address`:  `https://host/team/sub/app/-`, which takes
   * `/commit/<sha>`;  `null` for an address naming no host.
   * - the `/-` is GitLab's own:  a page's `repo` attribute carries it, so the element needs no rule for GitLab
   */
  commitBase(address: string | null | undefined): string | null {
    const parts = GitLab.partsOf(address)
    return parts ? `https://${parts.host}/${parts.path}/-` : null
  }

  /**
   * Whether a merge request is the only way into `branch` of project `fullName`:  its protected branches, any rule
   * naming `branch` (`*-stable` too), with no push level the caller reaches.
   * - nobody may push (level 0), or levels above the caller's:  `true`;  a level by user or group it can't check:  counts
   *   as reachable
   * - `false` for anything else:  no rule, no right to read it, offline, `glab` missing.  NEVER throws.
   */
  requiresPullRequest(fullName: string, branch: string): boolean {
    const path = encoded(fullName)
    const rules = this.json<ProtectedBranch[]>(`projects/${path}/protected_branches?per_page=100`)
    if (!Array.isArray(rules)) return false
    const levels = rules
      .filter((rule) => branchMatches(rule.name, branch))
      .flatMap((rule) => rule.push_access_levels ?? [])
    if (!levels.length) return false
    const me = this.json<{ id?: number }>("user")
    const project = this.json<ProjectAccess>(`projects/${path}`)
    const mine = [project?.permissions?.project_access?.access_level, project?.permissions?.group_access?.access_level]
      .filter((level): level is number => typeof level === "number")
      .reduce<number | undefined>((best, level) => Math.max(best ?? 0, level), undefined)
    return !levels.some((level) => canPush(level, me?.id, mine))
  }

  /**
   * The merge requests of `branch` into `base` that GitLab merged:  `{ number, url, head }` (`head`:  its last commit),
   * newest first;  `[]` when `glab` can't say.  NEVER throws.
   */
  mergedPullRequests(branch: string, base: string, _cwd: string): MergedPullRequest[] {
    const found = this.requestsOf(branch, base, "merged")
    return found.map(({ iid, web_url, sha }) => ({ number: iid, url: web_url, head: sha }))
  }

  /** The address of the merge request of `branch` into `base` that's open;  none:  `undefined`.  NEVER throws. */
  openPullRequestOf(branch: string, base: string, _cwd: string): string | undefined {
    return this.requestsOf(branch, base, "opened")[0]?.web_url
  }

  /** This repo's merge requests of `branch` into `base`, by state;  `[]` when `glab` can't say. */
  private requestsOf(branch: string, base: string, state: "merged" | "opened"): MergeRequest[] {
    if (!this.repoPath) return []
    const query = `state=${state}&source_branch=${encoded(branch)}&target_branch=${encoded(base)}&per_page=100`
    const found = this.json<MergeRequest[]>(`projects/${encoded(this.repoPath)}/merge_requests?${query}`)
    return Array.isArray(found) ? found : []
  }

  /**
   * Open a merge request of `branch` into `base`, from checkout `cwd`:  its address.
   * - one open already:  that one's address
   * - never asks anything:  `--yes`, with title and description given
   * - `body` empty:  the title, `glab` otherwise asking for one
   * - throws an `Error` with glab's own words when it can't
   * - SIDE EFFECT:  a merge request on GitLab
   */
  openPullRequest({ branch, base, title, body, cwd }: OpenPullRequest): string {
    const open = this.openPullRequestOf(branch, base, cwd)
    if (open) return open
    const run = this.run(
      [
        "mr",
        "create",
        "--source-branch",
        branch,
        "--target-branch",
        base,
        "--title",
        title,
        "--description",
        body || title,
        "--yes",
        ...(this.repoAddress ? ["--repo", this.repoAddress] : [])
      ],
      { cwd, timeout: CREATE_MS }
    )
    if (!run.ok) throw new Error(`glab mr create failed:  ${run.err || run.out || "no reason given"}`, { cause: run })
    return REQUEST_URL.exec(`${run.out}\n${run.err}`)?.[0] ?? this.openPullRequestOf(branch, base, cwd) ?? ""
  }

  /** The repo's own address, for `--repo`:  `https://host/team/sub/app`;  none without a host and path. */
  private get repoAddress(): string | undefined {
    return this.host && this.repoPath ? `https://${this.host}/${this.repoPath}` : undefined
  }

  /**
   * Make GitLab project `fullName` (`team/sub/name`, or `username/name`), empty:  private, unless `visibility` says.
   * - through the API (the class's note):  `POST projects`, under the group, or the person's own namespace
   * - throws an `Error` with glab's own words when it can't (a name taken, no right to make one there)
   * - SIDE EFFECT:  a new project on GitLab
   */
  createRepo(
    fullName: string,
    { visibility = "private", description = "" }: { visibility?: RepoVisibility; description?: string } = {}
  ): void {
    const name = fullName.slice(fullName.lastIndexOf("/") + 1)
    const owner = fullName.slice(0, fullName.lastIndexOf("/"))
    const group = owner && owner !== this.login() ? this.json<{ id?: number }>(`groups/${encoded(owner)}`) : undefined
    if (owner && owner !== this.login() && group?.id === undefined)
      throw new Error(`glab repo create ${fullName} failed:  no group ${owner} that you can read`)
    const run = this.api("projects", {
      method: "POST",
      timeout: CREATE_MS,
      fields: {
        name,
        path: name,
        visibility,
        description,
        ...(group?.id !== undefined && { namespace_id: String(group.id) })
      }
    })
    if (!run.ok)
      throw new Error(`glab api projects ${fullName} failed:  ${run.err || run.out || "no reason given"}`, {
        cause: run
      })
  }

  /**
   * GitLab project `fullName`'s address for git:  SSH when this repo is reached over SSH, else HTTPS, so a push goes
   * the way this person's already do.
   * - throws an `Error` with glab's words when glab can't find it
   */
  addressOf(fullName: string): string {
    const run = this.api(`projects/${encoded(fullName)}`)
    const project = parsed<{ ssh_url_to_repo?: string; http_url_to_repo?: string }>(run)
    const address = this.usesSsh ? project?.ssh_url_to_repo : project?.http_url_to_repo
    if (!address)
      throw new Error(`glab api projects/${fullName} failed:  ${run.err || "no address in its answer"}`, { cause: run })
    return address
  }

  /**
   * What to do about git's words `said` from the first push of project `fullName` (git address `address`) to
   * `branch`, when they're GitLab's refusal (`refusesFirstPush()`):  a Maintainer pushes the first commit, then lets
   * everyone push;  `undefined` for any other failure.
   * - the commands, filled in for this project:  clone it, an empty first commit (the Maintainer hasn't the plans;
   *   ours go on top of it), push it, then what `letTeamPush()` runs, the branch's protection lifted
   * - NEVER throws
   */
  firstPushRefusal(
    said: string | undefined,
    { fullName, address, branch }: FirstPushAttempt
  ): FirstPushHelp | undefined {
    if (!GitLab.refusesFirstPush(said)) return undefined
    const server = this.host ?? GitLab.partsOf(address)?.host ?? DEFAULT_HOST
    const folder = fullName.slice(fullName.lastIndexOf("/") + 1)
    return {
      membersPage: `https://${server}/${fullName}/-/project_members`,
      branch,
      commands: [
        `git clone ${address}`,
        `cd ${folder}`,
        'git commit --allow-empty -m "First commit of the epic repo"',
        `git push -u origin HEAD:${branch}`,
        `glab api --hostname ${server} --method DELETE projects/${encoded(fullName)}/protected_branches/${encoded(branch)}`
      ]
    }
  }

  /**
   * Let every teammate push to `branch` of project `fullName`:  run once the branch exists (its first push), which is
   * when GitLab protects a new project's default branch, Developers kept out.
   * - a line saying what to do by hand when it couldn't (no right to, offline);  `undefined` when it's done
   * - NEVER throws:  a project it can't open up is still a project
   * - SIDE EFFECT:  the rule removed from the project
   */
  letTeamPush(fullName: string, branch: string): string | undefined {
    const path = encoded(fullName)
    const byHand = `in ${fullName}, Settings › Repository › Protected branches, unprotect ${branch}, or teammates can't sync`
    const rules = this.json<ProtectedBranch[]>(`projects/${path}/protected_branches?per_page=100`)
    if (!Array.isArray(rules)) return `couldn't check whether ${branch} is protected:  ${byHand}`
    if (!rules.some((rule) => rule.name === branch)) return undefined
    const run = this.api(`projects/${path}/protected_branches/${encoded(branch)}`, { method: "DELETE" })
    return run.ok ? undefined : `couldn't unprotect ${branch} (${run.err || "no reason given"}):  ${byHand}`
  }
}

/** `run`'s output as JSON;  `undefined` when it failed or wasn't JSON. */
function parsed<T>(run: GhResult): T | undefined {
  if (!run.ok) return undefined
  try {
    return JSON.parse(run.out) as T
  } catch {
    return undefined
  }
}

/** `path` as one path segment of a GitLab API address:  its slashes too. */
function encoded(path: string): string {
  return encodeURIComponent(path)
}

/** Whether protected-branch rule `name` (an exact name, or a wildcard:  `*-stable`) covers `branch`. */
function branchMatches(name: string, branch: string): boolean {
  const pattern = name.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  return new RegExp(`^${pattern}$`).test(branch)
}

/** Whether one protected-branch push level lets this person push;  what can't be checked counts as yes. */
function canPush(level: PushLevel, me: number | undefined, mine: number | undefined): boolean {
  if (typeof level.user_id === "number") return me === undefined || level.user_id === me
  if (typeof level.group_id === "number") return true
  if (level.access_level === NO_ONE) return false
  return mine === undefined || level.access_level === null || mine >= level.access_level
}

/** What `GitLab.firstPushRefusal()` is told about the push that failed. */
export type FirstPushAttempt = {
  /** the project, `team/sub/app.epics` */
  fullName: string
  /** its git address, as the push used it */
  address: string
  /** the branch pushed */
  branch: string
}

/** GitLab's words for a first push its protected default branch refused, joined onto one line. */
const FIRST_PUSH_REFUSED = /cannot push the initial commit because the default branch is protected/i

/** What names the `glab` command `GitLab` runs, when set:  a test's stand-in, or a path to none. */
const GLAB_ENV = "SPELL_EPIC_GLAB"

/** gitlab.com:  no need to name it when logging in. */
const DEFAULT_HOST = "gitlab.com"

/** How long a question to GitLab waits, ms. */
const READ_MS = 15_000

/** How long making a project or a merge request waits, ms. */
const CREATE_MS = 30_000

/** A protected-branch push level nobody reaches. */
const NO_ONE = 0

/** A GitLab username:  letters, digits, `_`, `.` and `-`. */
const USERNAME = /^[\w.-]+$/

/** A merge request's address in what `glab mr create` printed. */
const REQUEST_URL = /https?:\/\/\S+\/-\/merge_requests\/\d+/

/** One rule of `GET projects/:id/protected_branches`. */
type ProtectedBranch = { name: string; push_access_levels?: PushLevel[] }

/** A push access level:  a role, a user or a group. */
type PushLevel = { access_level: number | null; user_id?: number | null; group_id?: number | null }

/** What `GET projects/:id` says about this person. */
type ProjectAccess = {
  permissions?: {
    project_access?: { access_level?: number } | null
    group_access?: { access_level?: number } | null
  }
}

/** What's read of a merge request from the API. */
type MergeRequest = { iid: number; web_url: string; sha: string }
