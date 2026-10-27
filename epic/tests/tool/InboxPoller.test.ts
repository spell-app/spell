/**
 * Tests of `InboxPoller` (the plugin's monitor) with made-up looks and a scratch file:
 * when it looks, what it prints, when it stops.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { InboxPoller, listenerOf } from "spell-epic/tool/InboxPoller.mjs"

const folder = mkdtempSync(join(tmpdir(), "inbox-poller-"))
const watched = join(folder, "x.inbox.json5")

afterAll(() => rmSync(folder, { recursive: true, force: true }))

/** Each test's own folder of listener files. */
let listeners = ""

/** A poller whose looks are `looks`, in turn (then the session ended), its lines caught in `printed`. */
function poller(
  looks: object[],
  printed: string[],
  onLook: (count: number) => void = () => {},
  mode: "monitor" | "hook" = "monitor"
) {
  let count = 0
  listeners ||= mkdtempSync(join(folder, "listeners-"))
  return new InboxPoller({
    mode,
    listeners,
    look: () => {
      onLook(++count)
      return looks[count - 1] ?? { ended: true }
    },
    print: (line: string) => void printed.push(line),
    pollMs: 5,
    settleMs: 5,
    retryMs: 5
  })
}

/** A look that found `waiting`, due again at once;  `batch` what's waiting, `pid` the session's process. */
function found(waiting: boolean, { batch = "b1", pid }: { batch?: string; pid?: number } = {}) {
  return { waiting, watch: [], recheckMs: 0, ...(waiting ? { notice: "📬 x", batch } : {}), ...(pid ? { pid } : {}) }
}

test("run:  the line once per batch of work;  again after a look found nothing waiting", async () => {
  const printed: string[] = []
  await poller([found(true), found(true), found(false), found(true)], printed).run()
  expect(printed).toEqual(["📬 x", "📬 x"])
})

test("run:  a failed look changes nothing, and is tried again", async () => {
  const printed: string[] = []
  const looks = [found(true), undefined, found(true)] as object[]
  await poller(looks, printed).run()
  expect(printed).toEqual(["📬 x"])
})

test("waitForChange:  a watched file changing calls for a look;  else the look's own time", async () => {
  writeFileSync(watched, "{}")
  const each = poller([], [])
  const changing = each.waitForChange({ watch: [watched], recheckMs: 5_000 })
  setTimeout(() => writeFileSync(watched, "{ sent: 1 }"), 20)
  expect(await changing).toBe("changed")
  expect(await each.waitForChange({ watch: [watched], recheckMs: 20 })).toBe("due")
})

test("waitForChange:  the session's process gone, it ended", async () => {
  expect(await poller([], []).waitForChange({ pid: 999_999, watch: [], recheckMs: 5_000 })).toBe("ended")
})

// epic `epic-engine` I144:  in VS Code's panel no plugin monitor runs;  the `asyncRewake` `Stop` hook runs the poller
test("run, as the Stop hook:  the line, then exit 2, which wakes the session", async () => {
  listeners = ""
  const printed: string[] = []
  const looked: number[] = []
  const code = await poller([found(false), found(true), found(true)], printed, (n) => looked.push(n), "hook").run()
  expect(code).toBe(2)
  expect(printed).toEqual(["📬 x"])
  expect(looked).toEqual([1, 2])
})

test("run, as the Stop hook:  the session's process gone, exit 0 without a word", async () => {
  listeners = ""
  const printed: string[] = []
  expect(await poller([found(false)], printed, () => {}, "hook").run()).toBe(0)
  expect(printed).toEqual([])
})

test("claim:  the listener file names this poller for the session;  listenerOf() finds it while it lives", () => {
  listeners = ""
  const each = poller([], [])
  each.claim(process.ppid)
  expect(readFileSync(join(listeners, `${process.ppid}.pid`), "utf8").split("\n")[0]).toBe(String(process.pid))
  expect(listenerOf(process.ppid, listeners)).toBe(process.pid)
  expect(listenerOf(999_999, listeners)).toBeUndefined()
  writeFileSync(join(listeners, "123.pid"), "999999\n")
  expect(listenerOf(123, listeners)).toBeUndefined()
})

test("waitForChange:  a newer poller claimed the session, superseded", async () => {
  listeners = ""
  const each = poller([], [])
  each.claim(process.ppid)
  expect(each.isSuperseded).toBe(false)
  writeFileSync(join(listeners, `${process.ppid}.pid`), "424242\n")
  expect(await each.waitForChange({ watch: [], recheckMs: 5_000 })).toBe("superseded")
})

test("announce:  a batch the poller before announced is not announced again;  a new batch is", async () => {
  listeners = ""
  const printed: string[] = []
  // the last turn's hook announced b1, and the session left it
  expect(await poller([found(true, { pid: process.ppid })], printed, () => {}, "hook").run()).toBe(2)
  // the next turn's hook:  b1 still waiting, then b2
  const next = poller(
    [found(true, { pid: process.ppid }), found(true, { pid: process.ppid, batch: "b2" })],
    printed,
    () => {},
    "hook"
  )
  expect(await next.run()).toBe(2)
  expect(printed).toEqual(["📬 x", "📬 x"])
  expect(next.lastBatch).toBe("b2")
})
