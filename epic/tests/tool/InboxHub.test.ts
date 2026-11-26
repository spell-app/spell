/**
 * Tests of `InboxHub`, the epic hub's ONE listener for every epic's page (epic `epic-engine` T163), on a scratch
 * checkout:  an epic page, its inbox, a made-up session in a scratch Claude registry, and a scratch notes folder.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import { Sessions } from "spell/epic/command/Sessions"
import { InboxHub } from "spell/epic/tool/InboxHub"
import { InboxMonitor } from "spell/epic/tool/InboxMonitor"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { WakeNotes } from "spell/epic/tool/WakeNotes.mjs"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "inbox-hub-"))
const home = mkdtempSync(join(tmpdir(), "inbox-hub-home-"))
const file = join(root, "epics", "x", "x.plan.html")
const inboxFile = ReviewInbox.pathFor(file)

/** A clock the tests move on by hand, so every look is due. */
let clock = Date.now()

/** The notes, a fresh folder each test. */
let notes: WakeNotes

beforeEach(() => {
  mkdirSync(join(root, "epics", "x"), { recursive: true })
  copyFileSync(join(FIXTURES, "epic-plan.html"), file)
  rmSync(inboxFile, { force: true })
  mkdirSync(join(home, "sessions"), { recursive: true })
  // a session titled for epic `x`, alive (this process)
  writeFileSync(
    join(home, "sessions", `${process.pid}.json`),
    JSON.stringify({ pid: process.pid, sessionId: "s1", cwd: root, name: "🚧 x", nameSource: "hook", status: "idle" })
  )
  notes = new WakeNotes({ folder: mkdtempSync(join(root, "wakes-")) })
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

/** A hub over the scratch registry;  `hearsHub` says whether the session's poller hears it. */
function hub(hearsHub = true): InboxHub {
  return new InboxHub({ sessions: new Sessions({ home }), notes, hearsHub: () => hearsHub, now: () => clock })
}

/** One look, a minute after the last:  due whatever changed. */
function look(each: InboxHub): void {
  clock += 61_000
  each.look()
}

test("look:  it listens for the session, held by the session's own process:  the page says a session listens", () => {
  look(hub())
  expect(ReviewInbox.read(inboxFile).listening).toMatchObject({ session: "s1", pid: process.pid })
  expect(notes.sessions()).toEqual([])
})

test("look:  a Send leaves the session ONE note, its line;  taken, the same batch is never left again", () => {
  const each = hub()
  look(each)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  look(each)
  const note = notes.take("s1")
  expect(note).toMatchObject({ epic: "x", notice: InboxMonitor.notice("x") })
  look(each)
  expect(notes.take("s1")).toBeUndefined()
})

test.each([
  ["idle", "wakeQuietChat"],
  ["busy", "passSendToBusy"]
])("look:  a %s session's switch off in Bells & Whistles (%s):  no note, the Send waits", (status, key) => {
  writeFileSync(
    join(home, "sessions", `${process.pid}.json`),
    JSON.stringify({ pid: process.pid, sessionId: "s1", cwd: root, name: "🚧 x", nameSource: "hook", status })
  )
  const asked: string[] = []
  const each = new InboxHub({
    sessions: new Sessions({ home }),
    notes,
    hearsHub: () => true,
    now: () => clock,
    isOn: (step) => (asked.push(step), step !== key)
  })
  look(each)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  look(each)
  expect(asked).toContain(key)
  expect(notes.take("s1")).toBeUndefined()
})

test("look:  the session took the work (its `wait --timeout 5`):  the note goes", () => {
  const each = hub()
  look(each)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  look(each)
  expect(notes.anyWaiting).toBe(true)
  ReviewInbox.update(inboxFile, (box) => box.takeWork())
  look(each)
  expect(notes.sessions()).toEqual([])
})

test("look:  the inbox changing is looked at on the next tick, with no wait for the recheck", () => {
  const each = hub()
  look(each)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  each.look()
  expect(notes.anyWaiting).toBe(true)
})

test("look:  the session's own wait (another process) holds the place:  it hears the work, and no note is left", () => {
  ReviewInbox.update(inboxFile, (box) => {
    box.setListening("s1", undefined, process.ppid)
    box.markSent()
  })
  look(hub(false))
  expect(notes.anyWaiting).toBe(false)
  expect(ReviewInbox.read(inboxFile).listening?.pid).toBe(process.ppid)
})

test("look:  a session that ended is forgotten, its note gone", () => {
  notes.leave("gone", { epic: "x", batch: "b1", notice: "📬 x" })
  look(hub())
  expect(notes.sessions()).toEqual([])
})

test("start, stop:  the hub's record says a hub listens, while it runs", () => {
  const each = hub().start()
  expect(notes.hubIsLive()).toBe(true)
  each.stop()
  expect(notes.hubIsLive()).toBe(false)
})
