import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { type SendRequestProps } from "spell-epic/command/command.types"
import { Requests } from "spell-epic/command/Requests"
import { Sessions } from "spell-epic/command/Sessions"
import { PlanDoc } from "spell-epic/tool/PlanDoc"
import { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"

/** A fake `~/.claude`, and a fake checkout holding epic `tooling`. */
const HOME = mkdtempSync(join(tmpdir(), "claude-home-"))
const ROOT = mkdtempSync(join(tmpdir(), "checkout-"))
afterAll(() => {
  rmSync(HOME, { recursive: true, force: true })
  rmSync(ROOT, { recursive: true, force: true })
})

mkdirSync(join(ROOT, "epics", "tooling"), { recursive: true })
writeFileSync(join(ROOT, "epics", "tooling", "tooling.plan.html"), "<html></html>")

/** The `epic` tool's test fixtures:  `epic-plan.html`, a fresh epic page. */
const TOOL_FIXTURES = fileURLToPath(new URL("../tool/fixtures", import.meta.url))

/** Two tiny "images":  their bytes are all a test reads. */
const RED = Buffer.from("red pixel").toString("base64")
const BLUE = Buffer.from("blue pixel").toString("base64")

// the sender:  Owen pasted RED, then BLUE;
// a tool read a picture, and a subagent saw one, which don't count
transcript("sender11", [
  { type: "custom-title", customTitle: "🚧 python" },
  {
    type: "user",
    message: { content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: RED } }] }
  },
  {
    type: "user",
    message: {
      content: [{ type: "tool_result", content: [{ type: "image", source: { type: "base64", data: "eA==" } }] }]
    }
  },
  {
    type: "user",
    isSidechain: true,
    message: { content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "eA==" } }] }
  },
  {
    type: "user",
    message: {
      content: [
        { type: "text", text: "comment threads are too tall" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: BLUE } }
      ]
    }
  }
])
// the receiver:  running, titled for the epic
transcript("receiver22", [{ type: "custom-title", customTitle: "🚧 tooling" }])
mkdirSync(join(HOME, "sessions"), { recursive: true })
writeFileSync(
  join(HOME, "sessions", `${process.pid}.json`),
  JSON.stringify({ pid: process.pid, sessionId: "receiver22", name: "🚧 tooling", status: "idle" })
)

describe("sendRequest()", () => {
  test("writes Owen's words, the sender and the newest images, and names the epic's running session", () => {
    const sent = send({
      root: ROOT,
      epic: "tooling",
      text: 'the "comment" box covers the text',
      from: "sender11",
      images: 2,
      context: "epic python's epic page, P4",
      home: HOME
    })
    expect(sent.request).toMatchObject({ id: "r1", status: "new", images: ["image-1.png", "image-2.jpg"] })
    expect(sent.request.from).toBe("🚧 python (sender11)")
    expect(sent.receivers.map((it) => it.name)).toEqual(["🚧 tooling"])
    expect(readFileSync(join(sent.folder, "image-1.png"), "utf8")).toBe("red pixel")
    expect(readFileSync(join(sent.folder, "image-2.jpg"), "utf8")).toBe("blue pixel")
    const markdown = readFileSync(join(sent.folder, "request.md"), "utf8")
    expect(markdown).toContain('## Owen\'s words\n\nthe "comment" box covers the text\n')
    expect(markdown).toContain("## Context\n\nepic python's epic page, P4\n")
  })

  test("numbers each request after the highest one there", () => {
    const sent = send({ root: ROOT, epic: "tooling", text: "second", home: HOME })
    expect(sent.request.id).toBe("r2")
    expect(sent.request.images).toEqual([])
  })

  test("keeps only the newest images asked for", () => {
    const sent = send({ root: ROOT, epic: "tooling", text: "one", from: "sender11", images: 1, home: HOME })
    expect(readFileSync(join(sent.folder, "image-1.jpg"), "utf8")).toBe("blue pixel")
  })

  test("refuses an epic with no epic page, and more images than were pasted", () => {
    expect(() => send({ root: ROOT, epic: "nope", text: "x", home: HOME })).toThrow(/no epic 'nope'/)
    expect(() => send({ root: ROOT, epic: "tooling", text: "x", from: "sender11", images: 5, home: HOME })).toThrow(
      /pasted 2/
    )
  })

  test("never names the sender as its own receiver", () => {
    const sent = send({ root: ROOT, epic: "tooling", text: "x", from: "receiver22", home: HOME })
    expect(sent.receivers).toEqual([])
    expect(sent.fromEpic).toBe(true)
  })
})

describe("epicRequests() and fileRequest()", () => {
  test("lists the requests oldest first, and files one with where it went", () => {
    expect(
      requestsIn(ROOT)
        .list("tooling")
        .map((it) => it.id)
    ).toEqual(["r1", "r2", "r3", "r4"])
    const filed = requestsIn(ROOT).file("tooling", "r1", "P7 · Comment Threads")
    expect(filed).toMatchObject({
      status: "filed",
      filed: "P7 · Comment Threads",
      text: 'the "comment" box covers the text'
    })
    expect(requestsIn(ROOT).list("tooling")[0]).toEqual(filed)
  })

  test("an epic with no requests has none;  filing a missing one throws", () => {
    expect(requestsIn(ROOT).list("nope")).toEqual([])
    expect(() => requestsIn(ROOT).file("tooling", "r99", "P1")).toThrow(/no request 'r99'/)
  })
})

// epic `epic-engine` I4 (epic-workflow's I10):  `epic requests` said r3 was in P18 after a phase went in ahead of it
describe("a request filed into a phase:  its stable id kept, its number today shown", () => {
  const page = join(ROOT, "epics", "phased", "phased.plan.html")
  const record = join(ROOT, "epics", "phased", "requests", "r1", "request.md")
  const files = new PlanDocFiles({ root: ROOT })

  test("filed into P2, it says P3 once a phase goes in before it (add-phase --before 2)", async () => {
    const plan = PlanDoc.parse(readFileSync(join(TOOL_FIXTURES, "epic-plan.html"), "utf8"))
    for (const name of ["One", "Two"]) plan.addPhase(name)
    mkdirSync(dirname(record), { recursive: true })
    await files.writeDoc(page, plan, true)
    const request = { id: "r1", epic: "phased", from: "🚧 python", at: "2026-10-19T09:00-04:00", status: "new" }
    writeFileSync(record, Requests.markdown({ ...request, text: "move it along", images: [] }))
    const requests = requestsIn(ROOT)

    const where = await requests.phaseFiled("phased", "P2")
    expect(where).toEqual({ filed: "P2 · Two", phase: "p-two" })
    expect(await requests.phaseFiled("phased", "two")).toEqual(where)
    expect(await requests.phaseFiled("phased", "9")).toEqual({ filed: "P9" })
    requests.file("phased", "r1", where.filed, where.phase)
    expect(readFileSync(record, "utf8")).toContain("filed: P2 · Two\nphase: p-two\n")

    const moved = files.read(page)
    moved.addPhase("Inserted", { before: 2 })
    await files.writeDoc(page, moved, true)
    expect((await requests.shown("phased"))[0]).toMatchObject({ filed: "P3 · Two", phase: "p-two" })
    // the record keeps the number it had then
    expect(requests.list("phased")[0]!.filed).toBe("P2 · Two")
  })

  test("filed elsewhere after, or its phase gone:  the words as written", async () => {
    const requests = requestsIn(ROOT)
    requests.file("phased", "r1", "P3 · Gone", "p-gone")
    expect((await requests.shown("phased"))[0]!.filed).toBe("P3 · Gone")
    requests.file("phased", "r1", "dropped:  done in P1")
    expect(readFileSync(record, "utf8")).not.toContain("phase:")
    expect((await requests.shown("phased"))[0]).toMatchObject({ filed: "dropped:  done in P1", phase: undefined })
  })

  test("an epic with no requests:  none, and its page never read", async () => {
    expect((await requestsIn(ROOT).shown("nope")).length).toBe(0)
  })
})

describe("requestHTML()", () => {
  test("quotes his words (escaped), then the context, when, and each screenshot", () => {
    const html = Requests.html({
      id: "r3",
      epic: "tooling",
      from: "🚧 python (sender11)",
      at: "2026-10-11T06:10-04:00",
      status: "new",
      text: "the <b> box\n\ncovers it",
      context: "P4",
      images: ["image-1.png"]
    })
    expect(html).toContain("<blockquote><p>the &lt;b&gt; box</p><p>covers it</p></blockquote>")
    expect(html).toContain("<p>Looking at:  P4</p>")
    expect(html).toContain('<a href="requests/r3/request.md">')
    expect(html).toContain('<img src="requests/r3/image-1.png" alt="r3, screenshot 1"')
  })
})

describe("epicHome() and setEpicHome()", () => {
  test("none until set;  only an epic with an epic page", () => {
    expect(requestsIn(ROOT).home()).toBeNull()
    expect(() => requestsIn(ROOT).setHome("nope")).toThrow(/no epic 'nope'/)
    requestsIn(ROOT).setHome("tooling")
    expect(requestsIn(ROOT).home()).toBe("tooling")
  })

  test("set:  the LOCAL day, never UTC's:  an evening's home is set today, not tomorrow", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(new Date(2026, 9, 25, 23, 30))
      requestsIn(ROOT).setHome("tooling")
      expect(readFileSync(join(ROOT, "epics", "home.json5"), "utf8")).toContain("2026-10-25")
    } finally {
      vi.useRealTimers()
    }
  })

  test("epics/home.json5 (epic `epic-workflow` P21):  its old home.json read;  a comment added by hand kept", () => {
    const home = join(ROOT, "epics", "home.json5")
    rmSync(home, { force: true })
    writeFileSync(join(ROOT, "epics", "home.json"), '{ "epic": "tooling", "set": "2026-10-11" }')
    expect(requestsIn(ROOT).home()).toBe("tooling")
    writeFileSync(home, '// Owen:  where tooling requests go\n{ "epic": "tooling", "set": "2026-10-11" }\n')
    requestsIn(ROOT).setHome("tooling")
    expect(readFileSync(home, "utf8")).toContain("// Owen:  where tooling requests go")
    expect(existsSync(join(ROOT, "epics", "home.json"))).toBe(false)
  })
})

describe("nextRequestId()", () => {
  test("r1 for a missing folder", () => {
    expect(Requests.nextId(join(ROOT, "missing"))).toBe("r1")
    expect(existsSync(join(ROOT, "missing"))).toBe(false)
  })
})

/** Write transcript `id` into the fake home, one JSON line per entry. */
// epic `epic-engine` I50:  a screenshot pasted while the sender was mid-turn, and a receiver resumed in a new process
describe("send() with a mid-turn screenshot, to a resumed session", () => {
  const GREEN = Buffer.from("green pixel").toString("base64")
  const image = (data: string) => ({ type: "image", source: { type: "base64", media_type: "image/png", data } })
  mkdirSync(join(ROOT, "epics", "midturn"), { recursive: true })
  writeFileSync(join(ROOT, "epics", "midturn", "midturn.plan.html"), "<html></html>")
  // as Claude Code writes them (2.1.301):  Owen's prompt between turns is a `user` entry;  one sent mid-turn is
  // queued, then written as a `queued_command` attachment when the turn takes it, never as a `user` entry
  transcript("sender44", [
    { type: "custom-title", customTitle: "🚧 property-editor" },
    { type: "user", message: { content: [{ type: "text", text: "show the whole set" }, image(RED)] } },
    {
      type: "attachment",
      attachment: {
        type: "queued_command",
        prompt: [image(GREEN), { type: "text", text: "this box is ugly" }],
        commandMode: "prompt",
        origin: { kind: "human" },
        humanTurn: true
      }
    },
    { type: "queue-operation", operation: "remove", content: "this box is ugly", reason: "absorbed_mid_turn" },
    // a subagent's hand-back is queued the same way:  never Owen's
    {
      type: "attachment",
      attachment: { type: "queued_command", prompt: [image("eA==")], origin: { kind: "peer", from: "a1" } }
    }
  ])
  // the receiver, resumed in a new process:  Claude Code made its registry name up;  its tab shows its title
  transcript("resumed55", [{ type: "custom-title", customTitle: "🚧 midturn" }])
  writeFileSync(
    join(HOME, "sessions", `${process.ppid}.json`),
    JSON.stringify({
      pid: process.ppid,
      sessionId: "resumed55",
      name: "midturn-cb",
      nameSource: "derived",
      status: "busy"
    })
  )

  test("takes the screenshot Owen pasted mid-turn, the newest, and never a subagent's", () => {
    const sent = send({
      root: ROOT,
      epic: "midturn",
      text: "this box is ugly",
      from: "sender44",
      images: 1,
      home: HOME
    })
    expect(readFileSync(join(sent.folder, "image-1.png"), "utf8")).toBe("green pixel")
    const both = send({ root: ROOT, epic: "midturn", text: "both", from: "sender44", images: 2, home: HOME })
    expect(readFileSync(join(both.folder, "image-1.png"), "utf8")).toBe("red pixel")
    expect(readFileSync(join(both.folder, "image-2.png"), "utf8")).toBe("green pixel")
    expect(() => send({ root: ROOT, epic: "midturn", text: "x", from: "sender44", images: 3, home: HOME })).toThrow(
      /pasted 2/
    )
  })

  test("tells the epic's session resumed in a new process, by its address", () => {
    const sent = send({ root: ROOT, epic: "midturn", text: "x", from: "sender44", home: HOME })
    expect(sent.receivers.map((it) => it.name)).toEqual(["midturn-cb"])
  })
})

function transcript(id: string, entries: object[]): void {
  const folder = join(HOME, "projects", "-repo")
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, `${id}.jsonl`), entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n")
}

/** The requests of the checkout at `root`, its sessions read from the fake home. */
function requestsIn(root: string): Requests {
  return new Requests({ root, sessions: new Sessions({ home: HOME }) })
}

/** `Requests.send()` for the checkout at `root`, as the fake home's sessions see it. */
function send({ root, home, ...props }: SendRequestProps & { root: string; home: string }) {
  return new Requests({ root, sessions: new Sessions({ home }) }).send(props)
}
