/**
 * Tests of `DetailsPages`:  which details and choice pages still wait for Owen's answer, and an epic's list of them as
 * the side bar's Details tab shows it (epic `epic-engine` P59, request r50), on a scratch checkout and home folder.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, beforeAll, expect, test } from "vite-plus/test"

import { DataFile } from "spell/epic/data/DataFile"
import { SeeAlso } from "spell/epic/tool/SeeAlso"

import { AskListeners } from "spell/epic/tools/AskListeners"
import { DetailsPages } from "spell/epic/tools/DetailsPages"

let root: string
/** `SPELL_EPIC_HOME` before these tests */
let home: string | undefined

/** Write `text` at `path` (from the scratch root), its folders made;  changed at `when` (seconds), if given. */
function write(path: string, text: string, when?: number): string {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  if (when) utimesSync(file, when, when)
  return file
}

/** A page titled `title`, changed at `when`. */
function page(path: string, title: string, when: number): string {
  return write(path, `<!doctype html><html><head><title>${title}</title></head><body></body></html>`, when)
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "details-pages-"))
  home = process.env.SPELL_EPIC_HOME
  process.env.SPELL_EPIC_HOME = join(root, "home")
  write(
    "epics/data/data.plan.html",
    `<html><head><title>data</title></head><body><epic-page epic="data"></epic-page></body></html>`
  )
})

afterAll(() => {
  if (home === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = home
  rmSync(root, { recursive: true, force: true })
})

test("isWaiting():  no answer for its round now, or a session waiting on it", () => {
  const file = page("epics/data/details/data-words.html", "The words", 1_000)
  expect(DetailsPages.isWaiting(file)).toBe(true)
  DataFile.write(DataFile.besidePage(file, "answer"), { page: "x", answered: "2026-10-31T11:00:00Z" })
  expect(DetailsPages.isWaiting(file)).toBe(false)
  // a session waits on it again (`ask show --wait`):  waiting, answer or not
  AskListeners.stamp(file)
  expect(DetailsPages.isWaiting(file)).toBe(true)
  AskListeners.stop(file)
  // a new round asked:  only the rounds before are kept, so no answer yet
  DataFile.write(DataFile.besidePage(file, "answer"), { rounds: [{ round: 1 }] })
  expect(DetailsPages.isWaiting(file)).toBe(true)
  expect(DetailsPages.answerOf(file)).toBeUndefined()
})

test("isWaiting():  a page that won't read never holds the tab", () => {
  const file = page("epics/data/details/broken.html", "Broken", 500)
  write("epics/data/details/broken.answer.json5", "{ not json5")
  expect(DetailsPages.isWaiting(file)).toBe(false)
})

test("listed():  an epic's details and choice pages, newest first, each with its file and whether it waits", () => {
  const older = page("epics/data/details/older.html", "Older question", 2_000)
  DataFile.write(DataFile.besidePage(older, "answer"), { page: "x", answered: "2026-10-30T10:00:00Z" })
  const choice = page("epics/data/details/names.html", "Names", 9_000)
  DataFile.write(DataFile.besidePage(choice, "rows"), { rows: [] })
  const seeAlso = new SeeAlso(root)
  const entries = DetailsPages.listed(seeAlso.linksOf("data"), seeAlso.content)
  expect(entries.map((entry) => [entry.title, entry.kind, entry.isWaiting])).toEqual([
    ["Names", "choices", true],
    ["Older question", "details", false],
    ["The words", "details", true],
    ["Broken", "details", false]
  ])
  expect(entries[0]!.file).toBe(choice)
  // a guide the epic links is left out
  expect(DetailsPages.listed([{ href: "/guides/x.html", title: "X", kind: "guide", updated: "" }], root)).toEqual([])
})
