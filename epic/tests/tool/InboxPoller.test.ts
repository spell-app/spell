/**
 * Tests of `InboxPoller` (the plugin's monitor) with made-up looks and a scratch file:
 * when it looks, what it prints, when it stops.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { InboxPoller } from "spell-epic/tool/InboxPoller.mjs"

const folder = mkdtempSync(join(tmpdir(), "inbox-poller-"))
const watched = join(folder, "x.inbox.json5")

afterAll(() => rmSync(folder, { recursive: true, force: true }))

/** A poller whose looks are `looks`, in turn (then the session ended), its lines caught in `printed`. */
function poller(looks: object[], printed: string[], onLook: (count: number) => void = () => {}) {
  let count = 0
  return new InboxPoller({
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

/** A look that found `waiting`, due again at once. */
function found(waiting: boolean) {
  return { waiting, watch: [], recheckMs: 0, ...(waiting ? { notice: "📬 x" } : {}) }
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
