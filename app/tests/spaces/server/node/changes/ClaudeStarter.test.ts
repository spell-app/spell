import { EventEmitter } from "node:events"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { SPACES } from "spell/app/spaces"
import { ChangeRequests } from "spell/app/spaces/server/node/changes/ChangeRequests"
import { ClaudeStarter } from "spell/app/spaces/server/node/changes/ClaudeStarter"

/**
 * Starting Claude Code for a change, and finding it (epic `editor` T66).
 * - NEVER starts a real Claude:  every start goes to a stand-in `spawn()`.
 */

/** A request, as the editor asks. */
const ASKED: SPACES.ChangeAsked = {
  projectId: "owen@spell/Proj",
  filePath: "/Proj.spell",
  line: 3,
  column: 2,
  kind: "ui-button",
  excerpt: "<ui-button>Go</ui-button>",
  text: "say Stop"
}

/** The `spell` command the session is allowed:  this node, and a stand-in bin. */
const SPELL_BIN = "/kit/bin/spell.mjs"
const SPELL = `${process.execPath} ${SPELL_BIN}`

/** A pid past any real one:  a process that's gone. */
const GONE_PID = 4194305

describe("ClaudeStarter.find()", () => {
  const home = "/Users/ana"

  it("finds `claude` on the PATH first", () => {
    const found = ClaudeStarter.find({
      env: { PATH: ["/usr/bin", "/opt/tools/bin"].join(path.delimiter) },
      home,
      canRun: (file) => file === "/opt/tools/bin/claude" || file === "/Users/ana/.local/bin/claude"
    })
    expect(found).toBe("/opt/tools/bin/claude")
  })

  it("then in the usual install places, a short PATH or none", () => {
    const usual = (file: string) => ClaudeStarter.find({ env: { PATH: "/usr/bin" }, home, canRun: (at) => at === file })
    expect(usual("/Users/ana/.local/bin/claude")).toBe("/Users/ana/.local/bin/claude")
    expect(usual("/Users/ana/.claude/local/claude")).toBe("/Users/ana/.claude/local/claude")
    expect(usual("/opt/homebrew/bin/claude")).toBe("/opt/homebrew/bin/claude")
    expect(ClaudeStarter.find({ env: {}, home, canRun: (at) => at === "/usr/local/bin/claude" })).toBe(
      "/usr/local/bin/claude"
    )
  })

  it("says it isn't there when it's nowhere", () => {
    expect(ClaudeStarter.find({ env: { PATH: "/usr/bin" }, home, canRun: () => false })).toBeUndefined()
  })

  it("only takes a file that runs", () => {
    const folder = mkdtempSync(path.join(os.tmpdir(), "claude-find-"))
    try {
      writeFileSync(path.join(folder, "claude"), "not a program", { mode: 0o644 })
      // not ours:  this machine's own usual places may have one
      expect(ClaudeStarter.find({ env: { PATH: folder }, home: folder })).not.toBe(path.join(folder, "claude"))
      chmodSync(path.join(folder, "claude"), 0o755)
      expect(ClaudeStarter.find({ env: { PATH: folder }, home: folder })).toBe(path.join(folder, "claude"))
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})

describe("ClaudeStarter.argsFor()", () => {
  const request = { ...ASKED, id: "c7", diskPath: "/disk/Proj.spell", status: "waiting", at: "" } as const
  const args = ClaudeStarter.argsFor(request, SPELL)

  it("runs headless, editing only in its folder, asking nobody", () => {
    expect(args.slice(1, 10)).toEqual([
      "--print",
      "--name",
      "Change This c7",
      "--permission-mode",
      "acceptEdits",
      "--permission-prompts",
      "none",
      "--tools",
      "Read,Glob,Grep,Edit,Write,Bash"
    ])
  })

  it("allows reading, and only the two `spell app changes` commands, last", () => {
    expect(args.slice(args.indexOf("--allowedTools"))).toEqual([
      "--allowedTools",
      "Read",
      "Glob",
      "Grep",
      `Bash(${SPELL} app changes take:*)`,
      `Bash(${SPELL} app changes done:*)`
    ])
  })

  it("streams its events as they happen, without this machine's hooks or MCP servers (I138)", () => {
    expect(args.slice(args.indexOf("--output-format"), args.indexOf("--add-dir"))).toEqual([
      "--output-format",
      "stream-json",
      "--verbose",
      "--settings",
      '{"disableAllHooks":true}',
      "--strict-mcp-config"
    ])
  })

  it("may edit in the folder of the file it names too:  a draft can be outside the project (I152)", () => {
    expect(args.slice(args.indexOf("--add-dir"), args.indexOf("--allowedTools"))).toEqual(["--add-dir", "/disk"])
  })

  it("never skips its permissions", () => {
    expect(args.join(" ")).not.toMatch(/dangerously|bypassPermissions/)
  })

  it("tells it to take the request by the command it's allowed", () => {
    expect(args[0]).toContain(`\`${SPELL} app changes take c7\``)
  })
})

describe("ClaudeStarter.start()", () => {
  let folder: string
  let inbox: ChangeRequests
  /** What the stand-in `spawn()` was called with, and the process it gave. */
  let spawned: { command: string; args: string[]; options: Record<string, unknown> } | undefined
  let child: EventEmitter & { pid?: number; unref: () => void }

  const spawn = ((command: string, args: string[], options: Record<string, unknown>) => {
    spawned = { command, args, options }
    return child
  }) as unknown as typeof import("node:child_process").spawn

  /** The pids a stand-in ended, and the stand-in clock's now. */
  let ended: number[]
  let now: number

  /** A starter on the stand-ins;  `none`:  Claude Code isn't installed. */
  const starter = (claude: "/bin/claude" | "none" = "/bin/claude") =>
    new ClaudeStarter(inbox, {
      claude: claude === "none" ? undefined : claude,
      spellBin: SPELL_BIN,
      spawn,
      end: (pid) => ended.push(pid),
      now: () => now
    })

  beforeEach(() => {
    folder = mkdtempSync(path.join(os.tmpdir(), "claude-starter-"))
    inbox = new ChangeRequests(path.join(folder, "inbox.json"))
    spawned = undefined
    ended = []
    now = Date.parse("2026-11-14T22:34:05.000Z")
    child = Object.assign(new EventEmitter(), { pid: GONE_PID, unref: vi.fn() })
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("starts `claude` in the project's folder, in the background, and notes its session", () => {
    process.env.CLAUDECODE = "1"
    try {
      const request = inbox.add(ASKED, "/disk/Proj.spell")
      const started = starter().start(request, "/disk/Proj")
      expect(spawned).toMatchObject({ command: "/bin/claude", options: { cwd: "/disk/Proj", detached: true } })
      expect(spawned!.args).toEqual(ClaudeStarter.argsFor(request, SPELL))
      const env = spawned!.options.env as NodeJS.ProcessEnv
      expect(env.SPELL_CHANGES_COMMAND).toBe(SPELL)
      // started from inside a Claude Code session, the page server mustn't pass its mark on
      expect(env.CLAUDECODE).toBeUndefined()
      expect(child.unref).toHaveBeenCalled()
      expect(started.session).toMatchObject({ pid: GONE_PID, log: path.join(folder, "__change-sessions", "c1.log") })
      expect(inbox.of("c1")?.session?.pid).toBe(GONE_PID)
    } finally {
      delete process.env.CLAUDECODE
    }
  })

  it("won't start without Claude Code, or for a request that isn't waiting", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    expect(starter("none").hasClaude).toBe(false)
    expect(() => starter("none").start(request, "/disk/Proj")).toThrow(/isn't installed/)
    expect(() => starter().start(inbox.take("c1"), "/disk/Proj")).toThrow(/c1 is taken already/)
    expect(spawned).toBeUndefined()
  })

  it("fails the request when its session ends without finishing, its last line the reason", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    const { session } = starter().start(request, "/disk/Proj")
    writeFileSync(session!.log, "Thinking...\nError:  not logged in\n")
    child.emit("exit", 1)
    expect(inbox.of("c1")).toMatchObject({ status: "failed", summary: "Error:  not logged in" })
  })

  it("leaves a finished request, and one whose session still runs", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    starter().start(request, "/disk/Proj")
    inbox.finish("c1", "done", "it says Stop")
    child.emit("exit", 0)
    expect(inbox.of("c1")).toMatchObject({ status: "done", summary: "it says Stop" })
    inbox.add(ASKED, "/disk/Proj.spell")
    inbox.startedFor("c2", { pid: process.pid, at: "", log: "/nowhere.log" })
    expect(starter().settle(inbox.of("c2"))?.status).toBe("waiting")
  })

  it("stops a session that hasn't taken its request within a minute, and fails it as stalled (I138)", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    starter().start(request, "/disk/Proj")
    // still running:  this process's pid
    inbox.startedFor("c1", { ...inbox.of("c1")!.session!, pid: process.pid })
    now += 59_000
    expect(starter().settle(inbox.of("c1"))?.status).toBe("waiting")
    expect(ended).toEqual([])
    now += 2000
    expect(starter().settle(inbox.of("c1"))).toMatchObject({ status: "failed", failure: "stalled" })
    expect(inbox.of("c1")?.summary).toMatch(/didn't take the request within a minute/)
    expect(ended).toEqual([process.pid])
  })

  it("never stops one that took its request, however long it works", () => {
    inbox.add(ASKED, "/disk/Proj.spell")
    inbox.startedFor("c1", { pid: process.pid, at: new Date(now).toISOString(), log: "/nowhere.log" })
    inbox.take("c1")
    now += 10 * 60_000
    expect(starter().settle(inbox.of("c1"))?.status).toBe("taken")
    expect(ended).toEqual([])
  })

  it("says what its session is doing, from its log (I138)", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    const { session } = starter().start(request, "/disk/Proj")
    expect(starter().progressOf(inbox.of("c1")!)).toEqual({ step: "starting" })
    // taken, before its log shows it
    inbox.take("c1")
    expect(starter().progressOf(inbox.of("c1")!)).toEqual({ step: "reading request" })
    writeFileSync(session!.log, toolLine("Edit", { file_path: "/disk/Proj/Proj.spell" }))
    expect(starter().progressOf(inbox.of("c1")!)).toEqual({ step: "editing", file: "Proj.spell" })
    inbox.finish("c1", "done", "it says Stop")
    expect(starter().progressOf(inbox.of("c1")!)).toBeUndefined()
  })

  it("fails the request with the session's result, from its streamed log", () => {
    const request = inbox.add(ASKED, "/disk/Proj.spell")
    const { session } = starter().start(request, "/disk/Proj")
    writeFileSync(session!.log, JSON.stringify({ type: "result", is_error: true, result: "Not logged in" }) + "\n")
    child.emit("exit", 1)
    expect(inbox.of("c1")).toMatchObject({ status: "failed", summary: "Not logged in" })
  })
})

/** A log line of the session asking for `tool`, as Claude Code streams it. */
function toolLine(tool: string, input: Record<string, unknown>): string {
  return JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: tool, input }] } }) + "\n"
}
