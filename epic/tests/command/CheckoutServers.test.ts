/**
 * `CheckoutServers` (epic `epic-engine` I53):  a checkout's servers stopped as it goes, and the session-start prune.
 * - on scratch checkouts, each "server" a tiny `node` process that only waits, run as spell-app's page server and
 *   vite are (`.../packages/server/src/page/cli.ts serve`, `.../node_modules/vite/bin/vite.js dev`), so the real
 *   finder (spell-app's `prune.ts`:  `ps`, `lsof`) finds them
 * - the session-start prune is held to the scratch folder (`within`), and the hooks given a fresh stamp:  no test
 *   ever stops a server of the machine's
 * - the hooks run as Claude Code runs them:  plain `node`, JSON on stdin
 */
import { execFileSync, spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { serverProcesses } from "@spell-app/server/src/page/prune.ts"

import { CheckoutServers } from "$/epics/command/CheckoutServers"
import { Worktrees } from "$/epics/command/Worktrees"

const HOOKS = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks")
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "checkout-servers-")))
const HOME = join(TEMP, "epic-home")

/** Every fake server started, stopped at the end whatever happened. */
const started: number[] = []
afterAll(() => {
  for (const pid of started) if (alive(pid)) process.kill(pid, "SIGKILL")
  rmSync(TEMP, { recursive: true, force: true })
})

/** What each fake server runs, by kind:  its script's place in the checkout, and the word after it. */
const KINDS = {
  page: ["packages/server/src/page/cli.ts", "serve"],
  vite: ["node_modules/vite/bin/vite.js", "dev"]
} as const

/**
 * Start a fake server of `kind` in `checkout`:  a `node` process that waits, its working folder the checkout;
 * resolves to its pid once `ps` and `lsof` see it.
 * - started through `sh ... &`, so it's no child of this process:  once stopped it's gone, never a zombie we hold,
 *   as a real server is to the hooks
 */
async function fakeServer(checkout: string, kind: keyof typeof KINDS): Promise<number> {
  const [script, word] = KINDS[kind]
  const file = join(checkout, script)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, "setInterval(() => {}, 60_000)\n")
  const pid = Number(
    execFileSync("sh", ["-c", `"$0" "$1" "$2" >/dev/null 2>&1 & echo $!`, process.execPath, file, word], {
      cwd: checkout,
      encoding: "utf8"
    }).trim()
  )
  started.push(pid)
  await until(() => found(pid))
  return pid
}

/** Whether the real finder sees `pid` as a server, with its working folder. */
function found(pid: number): boolean {
  return serverProcesses().some((it) => it.pid === pid && !!it.cwd)
}

/** `sort()`'s order for pids. */
function byNumber(a: number, b: number): number {
  return a - b
}

/** Whether process `pid` runs. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Wait until `check()` holds, `ms` at most. */
async function until(check: () => boolean, ms = 5000): Promise<void> {
  for (const end = Date.now() + ms; !check();) {
    if (Date.now() > end) throw new Error("timed out")
    await new Promise((done) => setTimeout(done, 50))
  }
}

/** Run hook `name` (a file in `hooks/`) with `args` and `input` on stdin, as Claude Code does. */
function hook(name: string, input: object, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn(process.execPath, [join(HOOKS, name), ...args], { env: { ...process.env, ...env } })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("exit", (status) => done({ status, stdout: stdout.trim(), stderr }))
    child.stdin.end(JSON.stringify(input))
  })
}

/** `git <args>` in `cwd`. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

/** A scratch repo using epics, its worktrees beside it, and worktree `name` of it;  returns both folders. */
function repoWithWorktree(dir: string, name: string): { main: string; worktree: string } {
  const main = join(dir, "repo")
  mkdirSync(join(main, ".epic"), { recursive: true })
  writeFileSync(join(main, ".epic", "config.json5"), '{ "worktreesFolder": "../repo.worktrees" }')
  // the fake servers' scripts:  ignored, as a real checkout's `node_modules` is, so git removes the worktree
  writeFileSync(join(main, ".gitignore"), "/packages/\n/node_modules/\n")
  git(main, "init", "-q", "-b", "main")
  git(main, "add", "-A")
  git(main, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
  const worktree = join(dir, "repo.worktrees", name)
  git(main, "worktree", "add", "-q", "-b", name, worktree)
  return { main, worktree }
}

describe("CheckoutServers", () => {
  test("stop():  the checkout's page and vite servers stop;  another checkout's run on", async () => {
    const going = join(TEMP, "stop", "going")
    const staying = join(TEMP, "stop", "staying")
    const page = await fakeServer(going, "page")
    const vite = await fakeServer(going, "vite")
    const other = await fakeServer(staying, "page")
    const stopped = CheckoutServers.stop(going)
    expect(stopped.map((it) => it.pid).sort(byNumber)).toEqual([page, vite].sort(byNumber))
    expect(CheckoutServers.said(stopped)).toMatch(/^stopped 2 servers \(page pid \d+, vite pid \d+\)$/)
    await until(() => !alive(page) && !alive(vite))
    expect(alive(other)).toBe(true)
    // a checkout inside another's folder (the old `.claude/worktrees`):  stopping the inner one leaves the outer's
    const inner = join(staying, ".claude", "worktrees", "inner")
    const innerPage = await fakeServer(inner, "page")
    expect(CheckoutServers.stop(inner).map((it) => it.pid)).toEqual([innerPage])
    expect(alive(other)).toBe(true)
    // nothing of its own:  nothing stopped
    expect(CheckoutServers.stop(join(TEMP, "stop", "empty"))).toEqual([])
    expect(CheckoutServers.said([])).toBe("")
  })

  test("the WorktreeRemove hook stops the worktree's servers before removing it", async () => {
    const { main, worktree } = repoWithWorktree(join(TEMP, "hook"), "seo")
    const page = await fakeServer(worktree, "page")
    const removed = await hook("worktree.mjs", { worktree_path: worktree, cwd: main }, ["remove"])
    expect(removed.status).toBe(0)
    expect(removed.stderr).toMatch(/removed .*seo and branch seo;  stopped 1 server \(page pid \d+\)/)
    expect(alive(page)).toBe(false)
    expect(existsSync(worktree)).toBe(false)
  })

  test("the hook keeps a worktree with changes, and its servers with it", async () => {
    const { main, worktree } = repoWithWorktree(join(TEMP, "kept"), "dirty")
    const page = await fakeServer(worktree, "page")
    writeFileSync(join(worktree, "new.txt"), "work\n")
    const kept = await hook("worktree.mjs", { worktree_path: worktree, cwd: main }, ["remove"])
    expect(kept.status).toBe(1)
    expect(kept.stderr).toMatch(/kept .*uncommitted changes/)
    expect(alive(page)).toBe(true)
  })

  test("`epic worktree remove`:  its servers stopped first, then git's remove;  refuses what isn't a worktree", async () => {
    const { main, worktree } = repoWithWorktree(join(TEMP, "verb"), "docs")
    const page = await fakeServer(worktree, "page")
    const worktrees = new Worktrees({ main })
    const lines = worktrees.remove("docs")
    expect(lines[0]).toMatch(/^stopped 1 server \(page pid \d+\)$/)
    expect(lines[1]).toBe(`removed ${worktree}`)
    expect(alive(page)).toBe(false)
    expect(existsSync(worktree)).toBe(false)
    expect(() => worktrees.remove("docs")).toThrow(/no worktree docs/)
    expect(() => worktrees.remove(main)).toThrow(/main checkout/)
  })

  test("the session-start prune stops a REMOVED checkout's servers, never a live one's;  once an hour", async () => {
    const gone = join(TEMP, "prune", "gone")
    const live = join(TEMP, "prune", "live")
    const orphan = await fakeServer(gone, "page")
    const orphanVite = await fakeServer(gone, "vite")
    const kept = await fakeServer(live, "page")
    // the folder deleted by hand, its servers still running:  what `epic server prune` found 128 of
    rmSync(gone, { recursive: true, force: true })
    const now = Date.parse("2026-10-19T12:00:00Z")
    const first = CheckoutServers.atSessionStart({ home: HOME, now, within: TEMP, waitMs: 0 })
    expect(first.ran).toBe(true)
    expect(first.stopped.map((it) => it.pid).sort(byNumber)).toEqual([orphan, orphanVite].sort(byNumber))
    await until(() => !alive(orphan) && !alive(orphanVite))
    expect(alive(kept)).toBe(true)
    // the stamp:  when it last ran, in the epic home
    expect(readFileSync(join(HOME, CheckoutServers.STAMP), "utf8").trim()).toBe(new Date(now).toISOString())
    // within the hour:  it doesn't run, even with an orphan waiting
    const later = await fakeServer(join(TEMP, "prune", "later"), "page")
    rmSync(join(TEMP, "prune", "later"), { recursive: true, force: true })
    const soon = CheckoutServers.atSessionStart({ home: HOME, now: now + 59 * 60_000, within: TEMP, waitMs: 0 })
    expect(soon).toEqual({ ran: false, stopped: [] })
    expect(alive(later)).toBe(true)
    // an hour on:  it runs again
    const hourOn = CheckoutServers.atSessionStart({ home: HOME, now: now + 60 * 60_000, within: TEMP, waitMs: 0 })
    expect(hourOn.ran).toBe(true)
    expect(hourOn.stopped.map((it) => it.pid)).toEqual([later])
    expect(alive(kept)).toBe(true)
  })

  test("the SessionStart hook:  quiet, exit 0, only in a repo using epics, and it waits its hour", async () => {
    const { main } = repoWithWorktree(join(TEMP, "session"), "x")
    const home = join(TEMP, "session-home")
    const plain = join(TEMP, "session", "plain")
    mkdirSync(plain, { recursive: true })
    // not a repo using epics:  nothing done, no stamp
    const outside = await hook("server-prune.mjs", { cwd: plain }, [], { SPELL_EPIC_HOME: home })
    expect(outside).toEqual({ status: 0, stdout: "", stderr: "" })
    expect(existsSync(join(home, CheckoutServers.STAMP))).toBe(false)
    // a fresh stamp:  it loads its code (plain node, the server's `prune.ts` too), says nothing, stops nothing
    mkdirSync(home, { recursive: true })
    writeFileSync(join(home, CheckoutServers.STAMP), `${new Date().toISOString()}\n`)
    const orphan = await fakeServer(join(TEMP, "session", "gone"), "page")
    rmSync(join(TEMP, "session", "gone"), { recursive: true, force: true })
    const fresh = await hook("server-prune.mjs", { cwd: main }, [], { SPELL_EPIC_HOME: home })
    expect(fresh).toEqual({ status: 0, stdout: "", stderr: "" })
    expect(alive(orphan)).toBe(true)
    // nonsense on stdin:  still exit 0
    const child = spawn(process.execPath, [join(HOOKS, "server-prune.mjs")])
    child.stdin.end("not json")
    expect(await new Promise((done) => child.on("exit", done))).toBe(0)
  })
})
