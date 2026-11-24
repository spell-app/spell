/**
 * Tests of `WakeNotes`, the notes the epic hub leaves a session when the person sends (epic `epic-engine` T163),
 * in a scratch folder.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { WakeNotes, wakeNotesFolder } from "spell/epic/tool/WakeNotes.mjs"

const scratch = mkdtempSync(join(tmpdir(), "wake-notes-"))

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

/** Notes in a fresh folder of their own. */
function notes(): WakeNotes {
  return new WakeNotes({ folder: mkdtempSync(join(scratch, "notes-")) })
}

const NOTE = { epic: "x", batch: "sent=1", notice: "📬 x" }

test("leave, take:  a note is taken once;  the same batch is never left again, a new one is", () => {
  const each = notes()
  expect(each.anyWaiting).toBe(false)
  expect(each.leave("s1", NOTE)).toBe(true)
  expect(each.leave("s1", NOTE)).toBe(false)
  expect(each.anyWaiting).toBe(true)
  expect(each.take("s1")).toMatchObject(NOTE)
  // the second reader finds none
  expect(each.take("s1")).toBeUndefined()
  expect(each.anyWaiting).toBe(false)
  expect(each.leave("s1", NOTE)).toBe(false)
  expect(each.leave("s1", { ...NOTE, batch: "sent=2" })).toBe(true)
})

test("clear:  nothing waiting any more, the notes go, so the next batch is left", () => {
  const each = notes()
  each.leave("s1", NOTE)
  each.take("s1")
  each.clear("s1")
  expect(each.sessions()).toEqual([])
  expect(each.leave("s1", NOTE)).toBe(true)
  expect(each.sessions()).toEqual(["s1"])
})

test("the hub's record:  live while its process runs;  removed only by its own process", () => {
  const each = notes()
  expect(each.hubIsLive()).toBe(false)
  each.writeHub()
  expect(each.hubIsLive()).toBe(true)
  each.removeHub(process.pid + 1)
  expect(each.hubPid).toBe(process.pid)
  each.removeHub()
  expect(each.hubIsLive()).toBe(false)
  // the record is no note
  each.writeHub()
  expect(each.anyWaiting).toBe(false)
})

test("wakeNotesFolder:  its own variable, else the epic home's wakes/", () => {
  expect(wakeNotesFolder({ SPELL_EPIC_WAKES_DIR: "/a" })).toBe("/a")
  expect(wakeNotesFolder({ SPELL_EPIC_HOME: "/h" })).toBe(join("/h", "wakes"))
})
