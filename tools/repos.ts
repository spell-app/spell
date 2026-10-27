/**
 * `tools/repos.ts`:  what the kit's yarn scripts run over its folders and the repos beside it (epic `repo-split` P7,
 * Q17;  the top repo became the kit, `spell`, in P9;  ONE repo in P20).
 * - Node 24 runs it as is (its types stripped):  `node tools/repos.ts <command>`, no build, no `tsx`.
 *   - So:  node's own modules, `json5` and the kit's plain-node files (`spell/server/Git`, `spell/server/kitFolders`)
 *     only, `import type` for types, no `enum` or parameter property.
 * - The kit's folders, lowest first:  its `package.json`'s `workspaces` (`parser`, `ui`, `epic`, `app`).
 * - The repos BESIDE it (spell-brand), each with its own install:  `repos.json5`, by `path` from the kit's folder.
 *
 * ```sh
 * yarn clone [repo ...]     # clone the repos beside the kit that are missing (none named:  all), then each one's own
 *                           # install
 *   --branch <name>         #   each at that branch when it has one, else its default branch (CI's)
 *   --https --shallow       #   over HTTPS only;  only the last commit (CI's)
 *   --no-install            #   clone only
 * yarn pull                 # `git pull --ff-only` in every repo beside the kit that's there
 * yarn status               # each one's branch and changes;  a clean one in one line
 * yarn repos                # the list:  which are there
 * node tools/repos.ts links       # `node_modules/spell`, a link to the kit, and each folder's `agents` link:
 *                                 # what `yarn install` runs after (`postinstall`)
 * node tools/repos.ts link-kit    # the first of those alone
 * yarn ts | test | lint | review    # the kit's own (`kit:<script>`), then that script in each of its folders,
 *                                   # lowest first
 * ```
 */
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from "node:fs"
import { join, resolve } from "node:path"

import JSON5 from "json5"

// By the kit's own name, which node resolves inside the kit with no link:  `postinstall` runs this before the link
import { Git } from "spell/server/Git"
import { kitFolders } from "spell/server/kitFolders"

/** The kit, the top repo:  this file is in its `tools/`. */
const TOP = resolve(import.meta.dirname, "..")

/** One repo beside the kit, as `repos.json5` lists it. */
type Repo = {
  /** its name on GitHub:  `spell-brand` */
  name: string
  /** where `yarn clone` clones it from */
  url: string
  /** its folder, from the kit's:  `../spell-brand` */
  path: string
}

/** Every repo beside the kit (`repos.json5`). */
function repos(): Repo[] {
  const text = readFileSync(join(TOP, "repos.json5"), "utf8")
  return (JSON5.parse(text) as { repos: Repo[] }).repos
}

/** Repo `repo`'s folder, absolute. */
function dirOf(repo: Repo): string {
  return resolve(TOP, repo.path)
}

/** Is repo `repo` there:  its folder is a git checkout? */
function isCloned(repo: Repo): boolean {
  return existsSync(join(dirOf(repo), ".git"))
}

/** The repos `names` name, all of them when none;  throws on a name `repos.json5` doesn't list. */
function named(names: string[], all = repos()): Repo[] {
  for (const name of names)
    if (!all.some((repo) => repo.name === name))
      throw new Error(`no repo ${name} in repos.json5;  it lists ${all.map((repo) => repo.name).join(", ")}`)
  return names.length ? all.filter((repo) => names.includes(repo.name)) : all
}

/** Runs `command` in `cwd`, its output shown;  its exit status. */
function run(command: string, args: string[], cwd = TOP): number {
  return spawnSync(command, args, { cwd, stdio: "inherit" }).status ?? 1
}

/**
 * Runs git in `cwd` quietly;  its output, its end trimmed, or `undefined` when it fails.
 * - its start kept:  `git status --short` starts a line with a space
 */
function git(cwd: string, ...args: string[]): string | undefined {
  return Git.out(args, cwd, { trim: false })?.trimEnd()
}

/** `git@github.com:org/repo.git` as `https://github.com/org/repo.git`;  any other URL as it is. */
function httpsOf(url: string): string {
  const ssh = /^git@([^:]+):(.+)$/.exec(url)
  return ssh ? `https://${ssh[1]}/${ssh[2]}` : url
}

/**
 * An HTTPS URL signed in with `SPELL_REPOS_TOKEN`, when the environment has it (CI's secret, epic `repo-split` J74);
 * any other URL, or no token, as it is.
 * - The repos are public, so CI clones with no token:  the secret is only for a repo made private later.
 */
function signedIn(url: string): string {
  const token = process.env.SPELL_REPOS_TOKEN
  return token && url.startsWith("https://") ? url.replace("https://", `https://x-access-token:${token}@`) : url
}

/** How `yarn clone` clones:  its flags. */
type CloneOptions = {
  /**
   * `--branch <name>`:  each repo at that branch when it has one, else at its default branch (`main`).
   * - CI's:  the branch under test, so a change across repos is checked together.
   */
  branch?: string
  /** `--https`:  over HTTPS only, never trying SSH first (CI has no SSH key) */
  https: boolean
  /** `--shallow`:  only each repo's last commit (CI's:  no history needed) */
  shallow: boolean
  /** `--no-install`:  clone only, no `yarn install` after */
  install: boolean
}

/** `yarn clone`'s command line:  the repos named, and the flags. */
function cloneArgs(args: string[]): { names: string[]; options: CloneOptions } {
  const names: string[] = []
  const options: CloneOptions = { https: false, shallow: false, install: true }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === "--branch") options.branch = args[++i]
    else if (arg === "--https") options.https = true
    else if (arg === "--shallow") options.shallow = true
    else if (arg === "--no-install") options.install = false
    else if (arg.startsWith("--")) throw new Error(`yarn clone:  no flag ${arg}`)
    else names.push(arg)
  }
  if (options.branch === "") throw new Error("yarn clone:  --branch needs a branch name")
  return { names, options }
}

/**
 * Where to clone `repo` from, and its branches:  the first of its URLs that answers `git ls-remote`.
 * - SSH first, then HTTPS (GitHub's login, `gh auth setup-git`):  `--https`, HTTPS alone.
 * - Asks nothing:  no password prompt, no SSH host-key question (a hung CI job otherwise).
 */
function remoteOf(repo: Repo, https: boolean): { url: string; branches: string[] } | undefined {
  const urls = https ? [httpsOf(repo.url)] : [...new Set([repo.url, httpsOf(repo.url)])]
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes"
  }
  for (const url of urls) {
    const listed = Git.out(["ls-remote", "--heads", signedIn(url)], TOP, { env, timeout: 0 })
    if (listed !== undefined)
      return { url, branches: listed.split("\n").flatMap((line) => /\trefs\/heads\/(.+)$/.exec(line)?.[1] ?? []) }
  }
  return undefined
}

/**
 * `yarn clone [repo ...] [--branch <name>] [--https] [--shallow] [--no-install]`:  clone the repos beside the kit that
 * are missing, each to its `path`, then each one's own `yarn install`:  each is a project of its own.
 */
function clone(args: string[]): number {
  let parsed: ReturnType<typeof cloneArgs>
  try {
    parsed = cloneArgs(args)
  } catch (error) {
    console.error((error as Error).message)
    return 2
  }
  const { names, options } = parsed
  let wanted: Repo[]
  try {
    wanted = named(names)
  } catch (error) {
    console.error((error as Error).message)
    return 2
  }
  const missing = wanted.filter((repo) => !isCloned(repo))
  for (const repo of missing) {
    if (existsSync(dirOf(repo))) {
      console.error(`${repo.name}:  the folder is there, but it isn't a git checkout:  move it away, then clone again`)
      return 1
    }
    const remote = remoteOf(repo, options.https)
    if (!remote) {
      console.error(
        `${repo.name}:  can't reach ${options.https ? httpsOf(repo.url) : `${repo.url} or ${httpsOf(repo.url)}`}`
      )
      return 1
    }
    const branch = options.branch && remote.branches.includes(options.branch) ? options.branch : undefined
    console.log(`== cloning ${repo.name}  (${remote.url}, ${branch ? `branch ${branch}` : "its default branch"})`)
    const flags = [...(branch ? ["--branch", branch] : []), ...(options.shallow ? ["--depth", "1"] : [])]
    if (run("git", ["clone", ...flags, signedIn(remote.url), dirOf(repo)]) !== 0) return 1
    // the token stays out of the clone's settings
    if (signedIn(remote.url) !== remote.url) git(dirOf(repo), "remote", "set-url", "origin", remote.url)
  }
  if (!missing.length) console.log(`every repo asked for is cloned:  ${wanted.map((repo) => repo.name).join(", ")}`)
  if (!options.install) return 0
  for (const repo of missing) {
    console.log(`== ${repo.name}:  yarn install, its own`)
    if (run("yarn", ["install"], dirOf(repo)) !== 0) return 1
  }
  return 0
}

/**
 * The folders that get no `agents` link:  the plugin's, `epic/`, where a root `agents/` makes Claude Code load WWOD and
 * the logs as the plugin's agents (epic `epic-engine`'s move check).  By the folder's package name, so this file names
 * no folder.
 */
const NO_AGENTS_LINK = new Set(["spell-epic"])

/** Where each folder's `agents` link points, from the folder:  the kit's `agents/`. */
const KIT_AGENTS = "../agents"

/**
 * Links folder `dir`'s `agents` (git-ignored there) to the kit's `agents/`:  WWOD, tracked in the kit, and the
 * three logs (epic `repo-split` P9), so a folder's instructions find `agents/wwod/WWOD.md`, `agents/PAPERCUTS.md` ...
 * - Replaces a link pointing anywhere else:  a checkout from before the split links the content repo's old copy,
 *   `../spell.epics/agents` (epic `repo-split` I64).
 * - Leaves a real folder or file alone:  never deletes what isn't a link.
 */
function linkAgents(dir: string): void {
  const { name } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name?: string }
  if (name && NO_AGENTS_LINK.has(name)) return
  const link = join(dir, "agents")
  if (isLink(link)) {
    if (readlinkSync(link) === KIT_AGENTS) return
    rmSync(link)
  } else if (existsSync(link)) return
  symlinkSync(KIT_AGENTS, link)
  console.log(`${dir.slice(TOP.length + 1)}/agents -> ${KIT_AGENTS}  (the kit's WWOD and the logs)`)
}

/** Is there a symbolic link at `path` (even one pointing nowhere)? */
function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * `postinstall`:  the links every install needs (epic `repo-split` P12):  the kit's own (`linkKit()`), and each
 * folder's `agents` (`linkAgents()`).
 * - So every checkout gets its `agents` links:  an epic's worktree (the worktree hook runs `yarn install`), CI.
 */
function links(): number {
  linkKit()
  for (const dir of kitFolders(TOP)) linkAgents(dir)
  return 0
}

/**
 * `node_modules/spell`, a link to the kit itself (epic `repo-split` P9).
 * - The kit is a package, `spell`, AND the install's root workspace, and yarn's node-modules linker links the root
 *   workspace nowhere:  without this, no folder could import `spell/util`, `spell/ui/...` (yarn's own
 *   self-references, `nmSelfReferences`, leave the root out too).
 * - Yarn leaves a link it didn't make alone on a quick install, and removes it on a full one:  so every install remakes
 *   it, if it's gone.
 * - Removes the kit's link by its old name, `node_modules/spell-kit` (epic `repo-split` P17, Q54).
 */
function linkKit(): number {
  const oldLink = join(TOP, "node_modules", "spell-kit")
  if (isLink(oldLink) && readlinkSync(oldLink) === "..") rmSync(oldLink)
  const link = join(TOP, "node_modules", "spell")
  if (existsSync(join(link, "package.json"))) return 0
  if (isLink(link)) rmSync(link)
  mkdirSync(join(TOP, "node_modules"), { recursive: true })
  symlinkSync("..", link)
  return 0
}

/** `yarn pull`:  `git pull --ff-only` in every repo beside the kit that's there. */
function pull(): number {
  let failed = 0
  for (const repo of repos().filter(isCloned)) {
    console.log(`== ${repo.name}`)
    if (run("git", ["pull", "--ff-only"], dirOf(repo)) !== 0) failed++
  }
  return failed ? 1 : 0
}

/** How many of a repo's changed files `yarn status` lists. */
const SHOWN = 12

/** `yarn status`:  each repo beside the kit:  its branch, how far from its upstream, its changes (the first `SHOWN`). */
function status(): number {
  for (const repo of repos()) {
    const dir = dirOf(repo)
    if (!isCloned(repo)) {
      console.log(`${repo.name.padEnd(14)} not cloned  (yarn clone ${repo.name})`)
      continue
    }
    const branch = git(dir, "rev-parse", "--abbrev-ref", "HEAD") ?? "?"
    const counts = git(dir, "rev-list", "--left-right", "--count", "@{upstream}...HEAD")
    const [behind = "0", ahead = "0"] = counts?.split(/\s+/) ?? []
    const away =
      counts === undefined
        ? "  (no upstream)"
        : `${+ahead ? `  ahead ${ahead}` : ""}${+behind ? `  behind ${behind}` : ""}`
    const changes = git(dir, "status", "--short") ?? ""
    console.log(`${repo.name.padEnd(14)} ${branch}${away}${changes ? "" : "  clean"}`)
    const lines = changes ? changes.split("\n") : []
    for (const line of lines.slice(0, SHOWN)) console.log(`    ${line}`)
    if (lines.length > SHOWN) console.log(`    ... and ${lines.length - SHOWN} more  (git -C ${repo.path} status)`)
  }
  return 0
}

/** `yarn repos`:  the list, with what's there. */
function list(): number {
  for (const repo of repos()) console.log(`${isCloned(repo) ? "✓" : " "} ${repo.name.padEnd(14)} ${repo.path}`)
  return 0
}

/**
 * `yarn ts | test | lint | review`:  the kit's own (`kit:<script>`), then that script in each of its folders, lowest
 * first, each in its own folder.
 * - Lowest first:  a folder's `ts` may build declarations the folders above it, or a project beside the kit, read.
 * - Every folder runs, failed or not;  the summary says which failed, and the exit status is 1 if any did.
 * - The repos beside the kit run their own:  each has its own install.
 */
function runEverywhere(script: string): number {
  const results: Array<[string, string]> = []
  const kit = JSON.parse(readFileSync(join(TOP, "package.json"), "utf8")) as { scripts?: Record<string, string> }
  if (kit.scripts?.[`kit:${script}`]) {
    console.log(`\n==================== spell:  yarn kit:${script}\n`)
    const started = Date.now()
    const code = run("yarn", ["run", `kit:${script}`])
    results.push(["spell", `${code === 0 ? "passed" : "FAILED"}  (${Math.round((Date.now() - started) / 1000)}s)`])
  }
  for (const dir of kitFolders(TOP)) {
    const folder = `${dir.slice(TOP.length + 1)}/`
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      scripts?: Record<string, string>
    }
    if (!manifest.scripts?.[script]) {
      results.push([folder, `no ${script} script`])
      continue
    }
    console.log(`\n==================== ${folder}:  yarn ${script}\n`)
    const started = Date.now()
    const code = run("yarn", ["run", script], dir)
    results.push([folder, `${code === 0 ? "passed" : "FAILED"}  (${Math.round((Date.now() - started) / 1000)}s)`])
  }
  console.log(`\n==================== yarn ${script}, the kit and its folders\n`)
  for (const [name, result] of results) console.log(`${name.padEnd(14)} ${result}`)
  return results.some(([, result]) => result.startsWith("FAILED")) ? 1 : 0
}

/** The command line:  `node tools/repos.ts <command> [args]`. */
function main([command, ...args]: string[]): number {
  switch (command) {
    case "clone":
      return clone(args)
    case "pull":
      return pull()
    case "status":
      return status()
    case "list":
      return list()
    case "links":
      return links()
    case "link-kit":
      return linkKit()
    case "run":
      if (args.length === 1) return runEverywhere(args[0]!)
      break
  }
  console.error(
    "usage:  node tools/repos.ts clone [repo ...] [--branch <name>] [--https] [--shallow] [--no-install] | pull | status | list | links | link-kit | run <script>"
  )
  return 2
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
