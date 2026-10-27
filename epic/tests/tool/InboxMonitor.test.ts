/**
 * Tests of `InboxMonitor` (`epic session listen`, the look the plugin's monitor runs) on a scratch checkout:
 * an epic page, its inbox file, and a made-up session record.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import type { RunningSession } from "spell/epic/command/command.types"
import { Sessions } from "spell/epic/command/Sessions"
import { InboxMonitor } from "spell/epic/tool/InboxMonitor"
import { LISTEN_STALE_MS, ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "inbox-monitor-"))
const home = mkdtempSync(join(tmpdir(), "inbox-monitor-home-"))
const file = join(root, "epics", "x", "x.plan.html")
const inboxFile = ReviewInbox.pathFor(file)

/** A session titled for epic `x`, in the scratch checkout, alive (this process). */
const SESSION: RunningSession = { pid: process.pid, sessionId: "s1", cwd: root, name: "🚧 x", nameSource: "hook" }

/** A monitor for `session`. */
function monitor(session: RunningSession | undefined = SESSION): InboxMonitor {
  return new InboxMonitor({ sessions: new Sessions({ home }), findSession: () => session })
}

beforeEach(() => {
  mkdirSync(join(root, "epics", "x"), { recursive: true })
  copyFileSync(join(FIXTURES, "epic-plan.html"), file)
  rmSync(inboxFile, { force: true })
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

test("epicOf:  the epic the session's title names;  none for a title or folder naming no epic page", () => {
  const each = monitor()
  expect(each.epicOf(SESSION)?.name).toBe("x")
  expect(each.epicOf({ ...SESSION, name: "📅 nope" })).toBeUndefined()
  expect(each.epicOf({ ...SESSION, name: "" })).toBeUndefined()
})

/** The poller's process:  this one, alive. */
const MONITOR = { monitor: process.pid }

test("check:  listens for the session at once, held by its monitor;  watches the inbox;  nothing waiting", () => {
  const check = monitor().check(MONITOR)
  expect(check).toMatchObject({ pid: process.pid, epic: "x", waiting: false })
  expect(check.watch[0]).toBe(inboxFile)
  expect(check.notice).toBeUndefined()
  expect(ReviewInbox.read(inboxFile).listening).toMatchObject({ session: "s1", pid: process.pid })
})

test("check:  run by hand (no monitor), it listens as inbox watch does:  a heartbeat, no process", () => {
  expect(monitor().check()).toMatchObject({ epic: "x" })
  expect(ReviewInbox.read(inboxFile).listening).toMatchObject({ session: "s1" })
  expect(ReviewInbox.read(inboxFile).listening?.pid).toBeUndefined()
})

test("check:  a Send is waiting, with the line to print;  taken, nothing is", () => {
  const each = monitor()
  each.check(MONITOR)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  expect(each.check(MONITOR)).toMatchObject({ waiting: true, notice: InboxMonitor.notice("x") })
  ReviewInbox.update(inboxFile, (box) => box.takeWork())
  expect(each.check(MONITOR)).toMatchObject({ waiting: false })
})

test("check:  another session listening hears it;  this one watches nothing until that one would go stale", () => {
  const now = Date.now()
  ReviewInbox.update(inboxFile, (box) => {
    box.setListening("other", new Date(now).toISOString())
    box.markSent(new Date(now).toISOString())
  })
  const check = monitor().check({ ...MONITOR, now })
  expect(check).toMatchObject({ waiting: false, watch: [] })
  expect(check.recheckMs).toBeGreaterThan(LISTEN_STALE_MS)
  expect(check.recheckMs).toBeLessThan(LISTEN_STALE_MS + 5_000)
  expect(ReviewInbox.read(inboxFile).listening?.session).toBe("other")
  expect(ReviewInbox.read(inboxFile).hasWork).toBe(true)
})

test("check:  this session's own /epic review wait (no process) keeps the inbox;  the monitor stands back", () => {
  const now = Date.now()
  ReviewInbox.update(inboxFile, (box) => box.setListening("s1", new Date(now).toISOString()))
  expect(monitor().check({ ...MONITOR, now })).toMatchObject({ watch: [] })
  expect(ReviewInbox.read(inboxFile).listening?.pid).toBeUndefined()
})

// epic `epic-engine` I144:  every turn's end starts a new poller (the `Stop` hook);  the last turn's may still run
test("check:  an older poller of this session holds it (the last turn's hook);  this newer one takes over", () => {
  ReviewInbox.update(inboxFile, (box) => box.setListening("s1", undefined, process.ppid))
  expect(monitor().check(MONITOR)).toMatchObject({ watch: [inboxFile], waiting: false })
  expect(ReviewInbox.read(inboxFile).listening).toMatchObject({ session: "s1", pid: process.pid })
})

test("check:  another session's live poller holds it;  this one stands back", () => {
  ReviewInbox.update(inboxFile, (box) => box.setListening("other", undefined, process.ppid))
  expect(monitor().check(MONITOR)).toMatchObject({ watch: [], recheckMs: 5 * 60_000 })
  expect(ReviewInbox.read(inboxFile).listening?.pid).toBe(process.ppid)
})

// epic `epic-engine` I144:  "start review" while the session's poller runs asks through the inbox, not by typing
test("check:  a review asked for from the page is waiting, its own line;  gone once the session's own wait listens", () => {
  const each = monitor()
  each.check(MONITOR)
  ReviewInbox.update(inboxFile, (box) => box.askReview())
  expect(each.check(MONITOR)).toMatchObject({ waiting: true, notice: InboxMonitor.askNotice("x") })
  expect(InboxMonitor.askNotice("x")).toContain("/epic review x")
  // the session's `/epic review` (`epic inbox watch`):  no poller's pid
  ReviewInbox.update(inboxFile, (box) => box.setListening("s1"))
  expect(ReviewInbox.read(inboxFile).reviewAsked).toBeNull()
})

test("check:  a review asked AND work sent:  the work's line, which takes the session to its review anyway", () => {
  const each = monitor()
  each.check(MONITOR)
  ReviewInbox.update(inboxFile, (box) => {
    box.askReview()
    box.markSent()
  })
  expect(each.check(MONITOR)).toMatchObject({ waiting: true, notice: InboxMonitor.notice("x") })
})

test("check:  batch names what's waiting:  the same work, the same batch;  a newer Send, a new one", () => {
  const each = monitor()
  each.check(MONITOR)
  ReviewInbox.update(inboxFile, (box) => box.markSent("2026-10-26T20:00:00.000-04:00"))
  const first = each.check(MONITOR).batch
  expect(first).toBeTruthy()
  expect(each.check(MONITOR).batch).toBe(first)
  ReviewInbox.update(inboxFile, (box) => box.markSent("2026-10-26T20:05:00.000-04:00"))
  expect(each.check(MONITOR).batch).not.toBe(first)
  ReviewInbox.update(inboxFile, (box) => box.takeWork())
  expect(each.check(MONITOR).batch).toBeUndefined()
})

test("check:  no epic, nothing done, its record watched;  the session's process gone, it ended", () => {
  const check = monitor({ ...SESSION, name: "" }).check(MONITOR)
  expect(check).toMatchObject({ waiting: false, watch: [join(home, "sessions", `${process.pid}.json`)] })
  expect(ReviewInbox.read(inboxFile).listening).toBeNull()
  expect(monitor({ ...SESSION, pid: 999_999 }).check()).toMatchObject({ ended: true })
  const unfound = new InboxMonitor({ sessions: new Sessions({ home }), findSession: () => undefined })
  expect(unfound.check()).toMatchObject({ watch: [], waiting: false })
})
