/**
 * Tests of `epic turn end` (`TurnEnd`, epic `epic-friend` P11):  any agent's end of turn, and the hooks that run it.
 * - Ana's checkout and ONE bare remote of her epic repo, in a temp folder (as `SharedSync.test.ts`);  no network,
 *   never Spell's own epic repo.
 * - The end-of-turn hook is run as Claude Code and Codex run it:  JSON on stdin, `node hooks/shared-commit.mjs`.
 */
import { execFileSync, spawn } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { TurnEnd } from "spell/epic/command/TurnEnd"

/** The plugin's folder:  its `hooks/` and `bin/`. */
const ENGINE = resolve(import.meta.dirname, "../..")

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "turn-end-")))
const REMOTE = join(TEMP, "plans.git")
for (const [key, value] of Object.entries({ NAME: "Test", EMAIL: "test@example.com" })) {
  process.env[`GIT_AUTHOR_${key}`] = value
  process.env[`GIT_COMMITTER_${key}`] = value
}
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

git(TEMP, "init", "-q", "--bare", "-b", "main", REMOTE)

/** A person's checkout:  its config naming the epic folder and its remote, the epic repo cloned in it. */
function person(name: string): { main: string; dir: string } {
  const main = join(TEMP, name)
  mkdirSync(join(main, ".epic"), { recursive: true })
  git(main, "init", "-q", "-b", "main")
  writeFileSync(
    join(main, ".epic", "config.json5"),
    JSON.stringify({ contentFolder: "plans", contentRemote: REMOTE, sharedFolders: [] })
  )
  const dir = join(main, "plans")
  git(main, "clone", "-q", REMOTE, dir)
  return { main, dir }
}

/** Run `git <args>` in `cwd`;  its output, trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim()
}

/** The remote's commits' subjects, newest first;  none while it has none. */
function remoteLog(): string[] {
  const log = execFileSync("git", ["log", "--all", "--format=%s"], { cwd: REMOTE, encoding: "utf8" }).trim()
  return log ? log.split("\n") : []
}

/** Run the end-of-turn hook with `input` on stdin, as Claude Code and Codex do;  its exit and stdout. */
function hook(input: object): Promise<{ status: number | null; stdout: string }> {
  return new Promise((done) => {
    const child = spawn(process.execPath, [join(ENGINE, "hooks", "shared-commit.mjs")])
    let stdout = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.on("exit", (status) => done({ status, stdout }))
    child.stdin.end(JSON.stringify(input))
  })
}

const ana = person("ana")

////////////////
// ## Tests
////////////////

describe("TurnEnd.end()", () => {
  // the first turn commits the epic repo's own .gitignore / .gitattributes block too (`Shared.keepRepoFiles()`)
  test("commits the epic folder's changes, one commit per epic, and syncs them:  pushed to the remote", async () => {
    mkdirSync(join(ana.dir, "epics", "seo"), { recursive: true })
    writeFileSync(join(ana.dir, "epics", "seo", "seo.plan.html"), "<h1>SEO</h1>\n")
    const report = await new TurnEnd({ checkout: ana.main }).end({ session: "thread-1" })
    expect(report.commits.length).toBeGreaterThan(0)
    expect(report.sync?.result).toBe("synced")
    expect(report.lines).toEqual([`committed ${report.commits.join(", ")}`, "sync:  synced"])
    expect(remoteLog()).toContain("auto: epic seo")
    expect(git(ana.dir, "log", "--grep=auto: epic seo", "--format=%B")).toMatch(/Session: thread-1/)
  })

  test("QUIET with nothing to do, and safe to run twice", async () => {
    const report = await new TurnEnd({ checkout: ana.main }).end()
    expect(report).toMatchObject({ commits: [], lines: [] })
    expect((await new TurnEnd({ checkout: ana.main }).end()).lines).toEqual([])
  })

  test("in a repo not set up for epics, or with no epic repo yet:  nothing at all", async () => {
    const plain = join(TEMP, "plain")
    mkdirSync(plain)
    git(plain, "init", "-q", "-b", "main")
    expect(await new TurnEnd({ checkout: plain }).end()).toEqual({ commits: [], lines: [] })
    const noContent = join(TEMP, "no-content")
    mkdirSync(join(noContent, ".epic"), { recursive: true })
    git(noContent, "init", "-q", "-b", "main")
    writeFileSync(join(noContent, ".epic", "config.json5"), '{ contentFolder: "plans" }')
    expect(await new TurnEnd({ checkout: noContent }).end()).toEqual({ commits: [], lines: [] })
  })

  test("epic turn end:  prints what it did;  --quiet prints nothing;  any other verb is refused", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      writeFileSync(join(ana.dir, "epics", "seo", "seo.plan.html"), "<h1>SEO, again</h1>\n")
      expect(await new TurnEnd({ checkout: ana.main }).run(["end"])).toBe(0)
      expect(out.mock.calls.map(([text]) => String(text)).join("")).toMatch(/^committed [0-9a-f]+\nsync:  synced\n$/)
      out.mockClear()
      writeFileSync(join(ana.dir, "epics", "seo", "seo.plan.html"), "<h1>SEO, thrice</h1>\n")
      expect(await new TurnEnd({ checkout: ana.main }).run(["end", "--quiet"])).toBe(0)
      expect(out).not.toHaveBeenCalled()
    } finally {
      out.mockRestore()
    }
    await expect(new TurnEnd({ checkout: ana.main }).run(["begin"])).rejects.toThrow(/epic turn end/)
  })
})

describe("the end-of-turn hook (shared-commit.mjs)", () => {
  test("Claude Code's Stop hook and Codex's both run it, and it goes through TurnEnd.inBackground():  ONE path", () => {
    const claude = JSON.parse(readFileSync(join(ENGINE, "hooks", "hooks.json"), "utf8"))
    const codex = JSON.parse(readFileSync(join(ENGINE, "hooks", "codex-hooks.json"), "utf8"))
    const commands = (file: { hooks: Record<string, { hooks: { command: string }[] }[]> }) =>
      file.hooks.Stop!.flatMap((group) => group.hooks.map((each) => each.command))
    expect(commands(claude)).toContain('node "${CLAUDE_PLUGIN_ROOT}/hooks/shared-commit.mjs"')
    expect(commands(codex)).toEqual(['node "${PLUGIN_ROOT}/hooks/shared-commit.mjs" --codex-plugin'])
    expect(readFileSync(join(ENGINE, "hooks", "shared-commit.mjs"), "utf8")).toMatch(/TurnEnd\.inBackground\(input\)/)
  })

  test("TurnEnd.inBackground() starts `epic turn end --quiet --session <id>` in the session's folder, detached", async () => {
    // a stand-in `epic`, writing down how it was run
    const stub = join(TEMP, "stub-epic.mjs")
    const record = join(TEMP, "stub-ran.json")
    writeFileSync(
      stub,
      `import { writeFileSync } from "node:fs"\n` +
        `writeFileSync(${JSON.stringify(record)}, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }))\n`
    )
    chmodSync(stub, 0o755)
    const args = TurnEnd.inBackground({ session_id: "s-42", cwd: ana.main }, { epic: stub })
    expect(args).toEqual([stub, "turn", "end", "--quiet", "--session", "s-42"])
    await vi.waitFor(() => expect(existsSync(record)).toBe(true), { timeout: 10_000 })
    expect(JSON.parse(readFileSync(record, "utf8"))).toEqual({
      args: ["turn", "end", "--quiet", "--session", "s-42"],
      cwd: ana.main
    })
    // no repo set up for epics:  nothing started
    expect(TurnEnd.inBackground({ session_id: "s-42", cwd: dirname(TEMP) }, { epic: stub })).toBeUndefined()
    expect(TurnEnd.inBackground({}, { epic: stub })).toBeUndefined()
  })

  test("run as an agent runs it:  prints NOTHING (Codex reads a Stop hook's output as JSON), exits 0, and the turn's plans reach the remote", async () => {
    writeFileSync(join(ana.dir, "epics", "seo", "seo.plan.html"), "<h1>SEO, from the hook</h1>\n")
    const before = remoteLog().length
    expect(await hook({ session_id: "hook-1", cwd: ana.main, hook_event_name: "Stop" })).toEqual({
      status: 0,
      stdout: ""
    })
    await vi.waitFor(() => expect(remoteLog().length).toBe(before + 1), { timeout: 30_000, interval: 250 })
    // anywhere else:  nothing, and still 0
    expect(await hook({ cwd: TEMP })).toEqual({ status: 0, stdout: "" })
    expect(await hook({})).toEqual({ status: 0, stdout: "" })
  }, 40_000)
})
