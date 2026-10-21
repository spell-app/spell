/**
 * `tools/repos.ts`:  what the kit's yarn scripts run over the child repos (epic `repo-split` P7, Q17;  the top repo
 * became the kit, `spell-kit`, in P9).
 * - Node 24 runs it as is (its types stripped):  `node tools/repos.ts <command>`, no build, no `tsx`.
 *   - So:  node's own modules and `json5` only, `import type` for types, no `enum` or parameter property.
 * - The repos, lowest first, and what each needs:  `repos.json5` beside `package.json`.
 *
 * ```sh
 * yarn clone [repo ...]     # clone what's missing (the named repos and everything they need;  none named:  all),
 *                           # then ONE `yarn install` over every repo
 * yarn pull                 # `git pull --ff-only` in every child repo there
 * yarn status               # each child repo's branch and changes;  a clean one in one line
 * yarn repos                # the list:  which are cloned, and what each needs
 * node tools/repos.ts link-kit    # `node_modules/spell-kit`, a link to the kit:  what `yarn install` runs after
 *                                 # (`postinstall`)
 * yarn ts | test | lint | review    # the kit's own (`kit:<script>`), then that script in every child repo there,
 *                                   # lowest first
 * ```
 */
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import { join, resolve } from "node:path"

import JSON5 from "json5"

/** The kit, the top repo:  this file is in its `tools/`. */
const TOP = resolve(import.meta.dirname, "..")

/** One child repo, as `repos.json5` lists it. */
type Repo = {
  /** its folder in the top repo, and its name on GitHub:  `spell-ui` */
  name: string
  /** where `yarn clone` clones it from */
  url: string
  /** the repos its code uses, directly */
  needs: string[]
  /** repos it runs by its settings, never imports:  cloned with it too */
  runs?: string[]
}

/** Every child repo, lowest first (`repos.json5`). */
function repos(): Repo[] {
  const text = readFileSync(join(TOP, "repos.json5"), "utf8")
  return (JSON5.parse(text) as { repos: Repo[] }).repos
}

/** Is child repo `name` cloned:  its folder is a git checkout? */
function isCloned(name: string): boolean {
  return existsSync(join(TOP, name, ".git"))
}

/**
 * The repos `names` need, with them, lowest first:  everything `yarn clone <names>` clones.
 * - Throws on a name `repos.json5` doesn't list.
 */
export function closure(names: string[], all = repos()): Repo[] {
  const byName = new Map(all.map((repo) => [repo.name, repo]))
  const wanted = new Set<string>()
  const visit = (name: string): void => {
    const repo = byName.get(name)
    if (!repo) throw new Error(`no repo ${name} in repos.json5;  it lists ${[...byName.keys()].join(", ")}`)
    if (wanted.has(name)) return
    wanted.add(name)
    for (const other of [...repo.needs, ...(repo.runs ?? [])]) visit(other)
  }
  for (const name of names) visit(name)
  return all.filter((repo) => wanted.has(repo.name))
}

/** Runs `command` in `cwd`, its output shown;  its exit status. */
function run(command: string, args: string[], cwd = TOP): number {
  return spawnSync(command, args, { cwd, stdio: "inherit" }).status ?? 1
}

/** Runs git in `cwd` quietly;  its output, trimmed, or `undefined` when it fails. */
function git(cwd: string, ...args: string[]): string | undefined {
  const done = spawnSync("git", args, { cwd, encoding: "utf8" })
  return done.status === 0 ? done.stdout.trimEnd() : undefined
}

/** `git@github.com:org/repo.git` as `https://github.com/org/repo.git`;  any other URL as it is. */
function httpsOf(url: string): string {
  const ssh = /^git@([^:]+):(.+)$/.exec(url)
  return ssh ? `https://${ssh[1]}/${ssh[2]}` : url
}

/** `yarn clone [repo ...]`:  clone what's missing, then one install over every repo. */
function clone(names: string[]): number {
  const wanted = names.length ? closure(names) : repos()
  const missing = wanted.filter((repo) => !isCloned(repo.name))
  for (const repo of missing) {
    if (existsSync(join(TOP, repo.name))) {
      console.error(`${repo.name}:  the folder is there, but it isn't a git checkout:  move it away, then clone again`)
      return 1
    }
    console.log(`== cloning ${repo.name}  (${repo.url})`)
    // SSH refused (no key for it here):  the same repo over HTTPS, with GitHub's login (`gh auth setup-git`)
    if (run("git", ["clone", repo.url, repo.name]) !== 0 && run("git", ["clone", httpsOf(repo.url), repo.name]) !== 0)
      return 1
  }
  if (!missing.length) console.log(`every repo asked for is cloned:  ${wanted.map((repo) => repo.name).join(", ")}`)
  for (const repo of wanted) linkAgents(repo.name)
  console.log("== yarn install:  one install over every repo")
  return run("yarn", ["install"])
}

/**
 * The repos whose root gets no `agents` link:  spell-epic, where a root `agents/` makes Claude Code load WWOD and the
 * logs as the plugin's agents (epic `epic-engine`'s move check).
 */
const NO_AGENTS_LINK = new Set(["spell-epic"])

/**
 * Links child repo `name`'s `agents` (git-ignored there) to the kit's `agents/`:  WWOD, tracked in the kit, and the
 * three logs (epic `repo-split` P9), so a repo's instructions find `agents/wwod/WWOD.md`, `agents/PAPERCUTS.md` ...
 * - Leaves anything already there alone.
 */
function linkAgents(name: string): void {
  if (NO_AGENTS_LINK.has(name)) return
  const link = join(TOP, name, "agents")
  if (existsSync(link) || isLink(link)) return
  symlinkSync("../agents", link)
  console.log(`${name}/agents -> ../agents  (the kit's WWOD and the logs)`)
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
 * `postinstall`:  `node_modules/spell-kit`, a link to the kit itself (epic `repo-split` P9).
 * - The kit is a package, `spell-kit`, AND the install's root workspace, and yarn's node-modules linker links the root
 *   workspace nowhere:  without this, no child repo could import `spell-kit/util` ... (yarn's own self-references,
 *   `nmSelfReferences`, leave the root out too).
 * - Yarn leaves a link it didn't make alone on a quick install, and removes it on a full one:  so every install remakes
 *   it, if it's gone.
 */
function linkKit(): number {
  const link = join(TOP, "node_modules", "spell-kit")
  if (existsSync(join(link, "package.json"))) return 0
  if (isLink(link)) rmSync(link)
  mkdirSync(join(TOP, "node_modules"), { recursive: true })
  symlinkSync("..", link)
  return 0
}

/** `yarn pull`:  `git pull --ff-only` in every child repo there. */
function pull(): number {
  let failed = 0
  for (const repo of repos().filter((each) => isCloned(each.name))) {
    console.log(`== ${repo.name}`)
    if (run("git", ["pull", "--ff-only"], join(TOP, repo.name)) !== 0) failed++
  }
  return failed ? 1 : 0
}

/** How many of a repo's changed files `yarn status` lists. */
const SHOWN = 12

/** `yarn status`:  each child repo's branch, how far from its upstream, and its changes (the first `SHOWN`). */
function status(): number {
  for (const repo of repos()) {
    const dir = join(TOP, repo.name)
    if (!isCloned(repo.name)) {
      console.log(`${repo.name.padEnd(14)} not cloned  (yarn clone ${repo.name})`)
      continue
    }
    const branch = git(dir, "rev-parse", "--abbrev-ref", "HEAD") ?? "?"
    const counts = git(dir, "rev-list", "--left-right", "--count", "@{upstream}...HEAD")
    const [behind = "0", ahead = "0"] = counts?.split(/\s+/) ?? []
    const away = counts === undefined ? "  (no upstream)" : `${+ahead ? `  ahead ${ahead}` : ""}${+behind ? `  behind ${behind}` : ""}`
    const changes = git(dir, "status", "--short") ?? ""
    console.log(`${repo.name.padEnd(14)} ${branch}${away}${changes ? "" : "  clean"}`)
    const lines = changes ? changes.split("\n") : []
    for (const line of lines.slice(0, SHOWN)) console.log(`    ${line}`)
    if (lines.length > SHOWN) console.log(`    ... and ${lines.length - SHOWN} more  (git -C ${repo.name} status)`)
  }
  return 0
}

/** `yarn repos`:  the list, with what's cloned. */
function list(): number {
  for (const repo of repos()) {
    const uses = [...repo.needs, ...(repo.runs ?? []).map((name) => `${name} (runs)`)]
    console.log(`${isCloned(repo.name) ? "✓" : " "} ${repo.name.padEnd(14)} ${uses.length ? uses.join(", ") : "-"}`)
  }
  return 0
}

/**
 * `yarn ts | test | lint | review`:  the kit's own (`kit:<script>`, the toolchain's `spell-folders`), then that script in every child
 * repo there, lowest first, each in its own folder.
 * - Lowest first:  a repo's `ts` builds its declarations (epic `repo-split` I12), which the repos above it read;  the
 *   kit's are the lowest of all.
 * - Every repo runs, failed or not;  the summary says which failed, and the exit status is 1 if any did.
 */
function runEverywhere(script: string): number {
  const results: Array<[string, string]> = []
  const kit = JSON.parse(readFileSync(join(TOP, "package.json"), "utf8")) as { scripts?: Record<string, string> }
  if (kit.scripts?.[`kit:${script}`]) {
    console.log(`\n==================== spell-kit:  yarn kit:${script}\n`)
    const started = Date.now()
    const code = run("yarn", ["run", `kit:${script}`])
    results.push(["spell-kit", `${code === 0 ? "passed" : "FAILED"}  (${Math.round((Date.now() - started) / 1000)}s)`])
  }
  for (const repo of repos().filter((each) => isCloned(each.name))) {
    const manifest = JSON.parse(readFileSync(join(TOP, repo.name, "package.json"), "utf8")) as {
      scripts?: Record<string, string>
    }
    if (!manifest.scripts?.[script]) {
      results.push([repo.name, `no ${script} script`])
      continue
    }
    console.log(`\n==================== ${repo.name}:  yarn ${script}\n`)
    const started = Date.now()
    const code = run("yarn", ["run", script], join(TOP, repo.name))
    results.push([repo.name, `${code === 0 ? "passed" : "FAILED"}  (${Math.round((Date.now() - started) / 1000)}s)`])
  }
  console.log(`\n==================== yarn ${script}, every repo\n`)
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
    case "link-kit":
      return linkKit()
    case "run":
      if (args.length === 1) return runEverywhere(args[0]!)
      break
  }
  console.error("usage:  node tools/repos.ts clone [repo ...] | pull | status | list | link-kit | run <script>")
  return 2
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
