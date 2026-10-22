/**
 * Tests of `InboxMonitor` (`epic session listen`, the plugin's monitor) on a scratch checkout:
 * an epic page, its inbox file, and a made-up session record.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeEach, expect, test } from "vite-plus/test"

import type { RunningSession } from "spell-epic/command/command.types"
import { Sessions } from "spell-epic/command/Sessions"
import { InboxMonitor, POLL_MS } from "spell-epic/tool/InboxMonitor"
import { ReviewInbox } from "spell-epic/tool/ReviewInbox"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "inbox-monitor-"))
const home = mkdtempSync(join(tmpdir(), "inbox-monitor-home-"))
const file = join(root, "epics", "x", "x.plan.html")
const inboxFile = ReviewInbox.pathFor(file)

/** A session titled for epic `x`, in the scratch checkout, alive (this process). */
const SESSION: RunningSession = { pid: process.pid, sessionId: "s1", cwd: root, name: "🚧 x", nameSource: "hook" }

/** What the monitor printed. */
let printed: string[]

/** A monitor for `session`, its lines caught in `printed`. */
function monitor(session: RunningSession | undefined = SESSION): InboxMonitor {
  return new InboxMonitor({
    sessions: new Sessions({ home }),
    print: (line) => void printed.push(line),
    findSession: () => session
  })
}

beforeEach(() => {
  printed = []
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

test("poll:  listens for the session at once, says nothing while nothing waits", () => {
  const each = monitor()
  expect(each.poll(1_000)).toBe(true)
  expect(ReviewInbox.read(inboxFile).listening?.session).toBe("s1")
  expect(printed).toEqual([])
})

test("poll:  a Send is announced ONCE, after two polls;  taken, the next one is announced again", () => {
  const each = monitor()
  const now = Date.now()
  each.poll(now)
  ReviewInbox.update(inboxFile, (box) => box.markSent())
  each.poll(now + POLL_MS)
  // one poll:  a `wait` running in the session may take it first
  expect(printed).toEqual([])
  each.poll(now + 2 * POLL_MS)
  each.poll(now + 3 * POLL_MS)
  expect(printed).toEqual([InboxMonitor.notice("x")])
  ReviewInbox.update(inboxFile, (box) => box.takeWork())
  each.poll(now + 4 * POLL_MS)
  ReviewInbox.update(inboxFile, (box) => box.markSent(new Date(now + 5 * POLL_MS).toISOString()))
  each.poll(now + 5 * POLL_MS)
  each.poll(now + 6 * POLL_MS)
  expect(printed).toHaveLength(2)
})

test("poll:  another session listening hears it;  this monitor stays quiet and takes nothing", () => {
  const now = Date.now()
  ReviewInbox.update(inboxFile, (box) => {
    box.setListening("other", new Date(now).toISOString())
    box.markSent(new Date(now).toISOString())
  })
  const each = monitor()
  each.poll(now)
  each.poll(now + POLL_MS)
  each.poll(now + 2 * POLL_MS)
  expect(printed).toEqual([])
  expect(ReviewInbox.read(inboxFile).listening?.session).toBe("other")
  expect(ReviewInbox.read(inboxFile).hasWork).toBe(true)
})

test("poll:  no epic, nothing done;  the session's process gone, the monitor stops", () => {
  expect(monitor({ ...SESSION, name: "" }).poll()).toBe(true)
  expect(ReviewInbox.read(inboxFile).listening).toBeNull()
  expect(monitor({ ...SESSION, pid: 999_999 }).poll()).toBe(false)
})
