/**
 * Tests of `ReviewStart.wake()` (epic `epic-workflow` P16):
 * who a wake reaches, on a fake window registry and bridge, with `epic window launch` stubbed.
 * - The routes' cases (Send, Do Now, the cooldown) are `reviewRoutes.test.ts`'s.
 * - NEVER the real `~/.claude` or `~/.spell`:  a wake types into VS Code
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, beforeEach, expect, test } from "vite-plus/test"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { ReviewStart } from "$/epics/tool/ReviewStart"
import { fakeMainCheckout, fakeWorktree } from "$/server/test/checkouts"

let home: string
let root: string
let bridge: Server
let bridgePort: number
/** what the fake bridge was asked:  `[op, body]` */
const asked: [string, unknown][] = []
/** the fake bridge's answer:  ok, or refused */
let refuse = false
/** what `launch` was asked:  `[args, cwd]` */
const launched: [string[], string][] = []

beforeAll(async () => {
  home = realpathSync(mkdtempSync(join(tmpdir(), "review-wake-")))
  root = fakeMainCheckout(realpathSync(mkdtempSync(join(tmpdir(), "review-wake-root-"))))
  mkdirSync(join(home, "sessions"))
  mkdirSync(join(home, "windows"))
  process.env.SPELL_CLAUDE_HOME = home
  process.env.SPELL_WINDOWS_DIR = join(home, "windows")
  // spell-epic's own bridges' folder:  empty, never the real one
  // (the old extension's, above, holds the test's window)
  process.env.SPELL_EPIC_WINDOWS_DIR = join(home, "epic-windows")
  bridge = createServer((request, response) => {
    let text = ""
    request.on("data", (chunk) => (text += chunk))
    request.on("end", () => {
      asked.push([request.url!.slice(1), JSON.parse(text)])
      response.setHeader("content-type", "application/json")
      response.statusCode = refuse ? 409 : 200
      response.end(JSON.stringify(refuse ? { ok: false, error: "no thanks" } : { ok: true }))
    })
  })
  await new Promise<void>((done) => bridge.listen(0, "127.0.0.1", done))
  bridgePort = (bridge.address() as AddressInfo).port
})

afterAll(() => {
  bridge.close()
  delete process.env.SPELL_CLAUDE_HOME
  delete process.env.SPELL_WINDOWS_DIR
  delete process.env.SPELL_EPIC_WINDOWS_DIR
  rmSync(home, { recursive: true, force: true })
  rmSync(root, { recursive: true, force: true })
})

beforeEach(() => {
  asked.splice(0)
  launched.splice(0)
  refuse = false
  rmSync(join(home, "windows", `${process.pid}.json`), { force: true })
  rmSync(join(root, ".claude"), { recursive: true, force: true })
})

/** a `ReviewStart` on the scratch checkout `at` (default:  its root), `launch` recorded, never run */
function starter(at = root) {
  return new ReviewStart(at, { launch: (args, cwd) => void launched.push([args, cwd]), airplane: () => false })
}

/** this process's window, showing `folders` */
function window(folders: string[], workspaceFile: string | null = null) {
  const entry = { pid: process.pid, port: bridgePort, token: "t", workspaceFile, folders }
  writeFileSync(join(home, "windows", `${process.pid}.json`), JSON.stringify(entry))
}

/** epic `name`'s worktree, made in the scratch checkout as git leaves one */
function worktree(name: string): string {
  return fakeWorktree(root, join(root, ".claude", "worktrees", name))
}

test("a worktree, its window closed:  `epic window launch <epic>`, from the main checkout, the command as its prompt", async () => {
  worktree("big")
  window([root])
  const wake = await starter().wake("big")
  expect(wake).toMatchObject({
    state: "launched",
    did: "opened big's window",
    message: "Opened big's window:  press Enter on /epic review big there."
  })
  expect(launched).toEqual([[["launch", "big", "--prompt", "/epic review big"], root]])
  expect(asked).toEqual([])
})

test("the worktree's window found by its window file, too (`<windowsFolder>/ongoing/<epic>.code-workspace`)", async () => {
  worktree("big")
  // the windows folder in the scratch checkout:  never the default, beside it in the temp folder
  mkdirSync(join(root, ".epic"), { recursive: true })
  writeFileSync(join(root, EpicConfig.FILE), '{ "windowsFolder": "windows" }')
  const file = EpicConfig.of(root).worktreeWindowFile("big")
  expect(file).toBe(join(root, "windows", "ongoing", "big.code-workspace"))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, "{}")
  window([root], file)
  expect((await starter().wake("big")).state).toBe("opened")
  expect(asked).toEqual([["open-session", { prompt: "/epic review big" }]])
  expect(launched).toEqual([])
})

test("from a worktree's page server:  the main checkout's worktrees and windows", async () => {
  const other = worktree("other")
  window([root])
  const wake = await starter(other).wake("future-thing")
  expect(wake.state).toBe("opened")
  expect(asked).toEqual([["open-session", { prompt: "/epic review future-thing" }]])
})

test("a main window is one whose first folder is the main checkout, with no worktree among its folders", async () => {
  const other = worktree("other")
  window([root, other])
  expect((await starter().wake("future-thing")).state).toBe("no-vscode")
  window([join(root, "packages")])
  expect((await starter().wake("future-thing")).state).toBe("no-vscode")
  expect(asked).toEqual([])
})

test("a window that refuses:  `failed`, in words, nothing kept", async () => {
  window([root])
  refuse = true
  const wake = await starter().wake("big")
  expect(wake).toMatchObject({ state: "failed", did: "" })
  expect(wake.message).toMatch(
    /^Couldn't wake big:  the session's window refused:  no thanks\.  Type \/epic review big/
  )
})

// epic `epic-engine` I51:  Do Now on outline-spell's page opened a NEW session beside its running one.  Resumed in a
// new process (its window reloaded), the session's registry record had a name Claude Code made up
// (`outline-spell-cb`, `nameSource: "derived"`);  only its transcript still said `🚧 outline-spell`.
test("a session resumed in a new process, mid-turn:  found by its transcript's title, and typed into", async () => {
  const id = "0f0f0f0f-1111-2222-3333-444444444444"
  const worktreeFolder = worktree("big")
  window([worktreeFolder])
  mkdirSync(join(home, "projects", "-big"), { recursive: true })
  writeFileSync(
    join(home, "projects", "-big", `${id}.jsonl`),
    [
      { type: "custom-title", customTitle: "🚧 big" },
      { type: "ai-title", aiTitle: "Fix the parser" }
    ]
      .map((entry) => JSON.stringify(entry))
      .join("\n") + "\n"
  )
  const record = { pid: process.pid, sessionId: id, cwd: worktreeFolder, status: "busy" }
  writeFileSync(
    join(home, "sessions", `${process.pid}.json`),
    JSON.stringify({ ...record, name: "big-cb", nameSource: "derived" })
  )
  try {
    const wake = await starter().wake("big")
    expect(wake).toMatchObject({
      state: "typed",
      did: "typed /epic review big into 🚧 big",
      message: "Typed /epic review big into 🚧 big:  press Enter there.  It reads it once its turn ends."
    })
    expect(asked).toEqual([["open-session", { sessionId: id, prompt: "/epic review big" }]])
    // a name the session was given (`/rename`, the prompt gate) is its title as it is
    asked.splice(0)
    writeFileSync(
      join(home, "sessions", `${process.pid}.json`),
      JSON.stringify({ ...record, name: "🚧 big", nameSource: "hook" })
    )
    expect((await starter().wake("big")).state).toBe("typed")
  } finally {
    rmSync(join(home, "sessions", `${process.pid}.json`), { force: true })
  }
})

// epic `epic-engine` T9 (J7):  a page no epic owns wakes the STANDING epic `feedback`, which has no worktree:
// a new session in a main window, or the one session titled for it
test("feedback, woken from a page no epic owns:  a new session in a main window;  its own session once it has one", async () => {
  const planDoc = join(root, "epics", "feedback", "feedback.plan.html")
  mkdirSync(dirname(planDoc), { recursive: true })
  window([root])
  const first = await starter().wakeFor(planDoc, "feedback", { fresh: true })
  expect(first).toMatchObject({ state: "opened", command: "/epic review feedback" })
  expect(asked).toEqual([["open-session", { prompt: "/epic review feedback" }]])
  asked.splice(0)
  const id = "0f0f0f0f-5555-6666-7777-888888888888"
  writeFileSync(
    join(home, "sessions", `${process.pid}.json`),
    JSON.stringify({
      pid: process.pid,
      sessionId: id,
      cwd: root,
      status: "idle",
      name: "🚧 feedback",
      nameSource: "hook"
    })
  )
  try {
    const wake = await starter().wake("feedback")
    expect(wake).toMatchObject({ state: "typed", did: "typed /epic review feedback into 🚧 feedback" })
    expect(asked).toEqual([["open-session", { sessionId: id, prompt: "/epic review feedback" }]])
  } finally {
    rmSync(join(home, "sessions", `${process.pid}.json`), { force: true })
    rmSync(join(root, "epics"), { recursive: true, force: true })
  }
})
