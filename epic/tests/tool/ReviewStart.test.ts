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

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { ReviewStart } from "spell/epic/tool/ReviewStart"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

let home: string
let root: string
let bridge: Server
let bridgePort: number
/** what the fake bridge was asked:  `[op, body]` */
const asked: [string, unknown][] = []
/** the fake bridge's answer:  ok, or refused */
let refuse = false
/** what else the fake bridge answers (`typed`, epic `epic-engine` I144) */
let bridgeSays: object = {}
/** the inbox poller each session's process has, by its pid (`ReviewStart`'s `pollerOf`) */
const pollers = new Map<number, number>()
/** what `launch` was asked:  `[args, cwd]` */
const launched: [string[], string][] = []

beforeAll(async () => {
  home = realpathSync(mkdtempSync(join(tmpdir(), "review-wake-")))
  root = fakeMainCheckout(realpathSync(mkdtempSync(join(tmpdir(), "review-wake-root-"))))
  mkdirSync(join(home, "sessions"))
  mkdirSync(join(home, "windows"))
  process.env.CLAUDE_CONFIG_DIR = home
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
      response.end(JSON.stringify(refuse ? { ok: false, error: "no thanks" } : { ok: true, ...bridgeSays }))
    })
  })
  await new Promise<void>((done) => bridge.listen(0, "127.0.0.1", done))
  bridgePort = (bridge.address() as AddressInfo).port
})

afterAll(() => {
  bridge.close()
  delete process.env.CLAUDE_CONFIG_DIR
  delete process.env.SPELL_WINDOWS_DIR
  delete process.env.SPELL_EPIC_WINDOWS_DIR
  rmSync(home, { recursive: true, force: true })
  rmSync(root, { recursive: true, force: true })
})

beforeEach(() => {
  asked.splice(0)
  launched.splice(0)
  refuse = false
  bridgeSays = {}
  pollers.clear()
  rmSync(join(home, "windows", `${process.pid}.json`), { force: true })
  rmSync(join(root, ".claude"), { recursive: true, force: true })
})

/** a `ReviewStart` on the scratch checkout `at` (default:  its root), `launch` recorded, never run */
function starter(at = root) {
  return new ReviewStart(at, {
    launch: (args, cwd) => void launched.push([args, cwd]),
    airplane: () => false,
    pollerOf: (pid) => pollers.get(pid)
  })
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
    expect(asked).toEqual([["open-session", { sessionId: id, prompt: "/epic review big", title: "🚧 big" }]])
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
    expect(asked).toEqual([["open-session", { sessionId: id, prompt: "/epic review feedback", title: "🚧 feedback" }]])
  } finally {
    rmSync(join(home, "sessions", `${process.pid}.json`), { force: true })
    rmSync(join(root, "epics"), { recursive: true, force: true })
  }
})

////////////////
// ## A session whose tab is open, or whose poller runs (epic `epic-engine` I144)
////////////////

// r39:  repo-split's session was open in its window;  "start review" typed into it through VS Code, which refused
// ("Session is already open.  Your prompt was not applied"), and the page said it was typed

/** A session titled for epic `big`, idle, in its worktree's window, for `run`;  its record removed after. */
async function withBigSession(run: (id: string, planDoc: string) => Promise<void>) {
  const id = "0f0f0f0f-9999-aaaa-bbbb-cccccccccccc"
  const folder = worktree("big")
  window([folder])
  const planDoc = join(root, "epics", "big", "big.plan.html")
  mkdirSync(dirname(planDoc), { recursive: true })
  writeFileSync(
    join(home, "sessions", `${process.pid}.json`),
    JSON.stringify({ pid: process.pid, sessionId: id, cwd: folder, status: "idle", name: "🚧 big", nameSource: "hook" })
  )
  try {
    await run(id, planDoc)
  } finally {
    rmSync(join(home, "sessions", `${process.pid}.json`), { force: true })
    rmSync(join(root, "epics"), { recursive: true, force: true })
  }
}

test("start:  the session's inbox poller runs:  asked through the inbox, nothing typed", async () => {
  await withBigSession(async (_id, planDoc) => {
    pollers.set(process.pid, 4242)
    const start = await starter().start("big", planDoc)
    expect(start).toMatchObject({ state: "asked", command: "/epic review big", sessions: ["🚧 big"] })
    expect(start.message).toBe(
      "Asked 🚧 big to start the review:  its inbox poller wakes it in a few seconds, nothing typed."
    )
    expect(asked).toEqual([])
    expect(ReviewInbox.read(ReviewInbox.pathFor(planDoc)).reviewAsked).toBeTruthy()
  })
})

test("start:  its tab open already (the bridge types nothing):  says so plainly, never that it typed", async () => {
  await withBigSession(async (id, planDoc) => {
    bridgeSays = { typed: false }
    const start = await starter().start("big", planDoc)
    expect(start.state).toBe("tab-open")
    expect(start.message).toBe(
      "🚧 big's tab is open, and VS Code types only into a session it opens:  nothing typed.  " +
        "Paste /epic review big there:  it's copied."
    )
    expect(start.message).not.toMatch(/Typed/)
    expect(asked).toEqual([["open-session", { sessionId: id, prompt: "/epic review big", title: "🚧 big" }]])
  })
})

test("start:  typed (the bridge says so):  press Enter there;  an older bridge that can't tell says what to do if not", async () => {
  await withBigSession(async (_id, planDoc) => {
    bridgeSays = { typed: true }
    expect(await starter().start("big", planDoc)).toMatchObject({
      state: "sent",
      message: "Typed /epic review big into 🚧 big:  press Enter there."
    })
    bridgeSays = {}
    const older = await starter().start("big", planDoc)
    expect(older.state).toBe("sent")
    expect(older.message).toMatch(/^Asked VS Code to type \/epic review big into 🚧 big/)
    expect(older.message).toMatch(/If VS Code says the session is already open, nothing was typed/)
  })
})

test("wake:  the session's inbox poller runs:  told, nothing typed, kept for the cooldown", async () => {
  await withBigSession(async () => {
    pollers.set(process.pid, 4242)
    const wake = await starter().wake("big")
    expect(wake).toMatchObject({
      state: "told",
      did: "told 🚧 big through its inbox poller",
      message: "Told 🚧 big through its inbox poller:  it wakes in a few seconds, nothing typed."
    })
    expect(asked).toEqual([])
  })
})

test("wake:  its tab open already:  `tab-open`, nothing typed, nothing kept", async () => {
  await withBigSession(async () => {
    bridgeSays = { typed: false }
    const wake = await starter().wake("big")
    expect(wake).toMatchObject({ state: "tab-open", did: "" })
    expect(wake.message).toMatch(/^🚧 big's tab is open/)
  })
})
