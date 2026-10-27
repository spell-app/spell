/**
 * `TranscriptIndex` (epic `epic-engine` I62):  what each transcript names, scanned once per version of the file.
 * - on scratch transcripts in a temp folder;  `scan()` is spied on to count the reads that were really made
 */
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, describe, expect, test, vi } from "vite-plus/test"

import { TranscriptIndex } from "spell/epic/command/TranscriptIndex"

const TEMP = mkdtempSync(join(tmpdir(), "transcript-index-"))
const FILE = join(TEMP, "index", "transcript-index.json")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))
afterEach(() => vi.restoreAllMocks())

/** Transcript `id` with `entries` as JSON lines;  its path. */
function transcript(id: string, entries: object[]): string {
  const path = join(TEMP, `${id}.jsonl`)
  writeFileSync(path, entries.map((it) => JSON.stringify(it)).join("\n"))
  return path
}

describe("scan()", () => {
  test("every title and folder in the text, distinct, escapes undone", () => {
    const text = [
      { type: "custom-title", customTitle: "🚧 seo" },
      { type: "user", cwd: "/repo" },
      { type: "user", cwd: "/repo" },
      { type: "user", cwd: '/repo/odd"one\\x' },
      { type: "custom-title", customTitle: "✅ seo" }
    ]
      .map((it) => JSON.stringify(it))
      .join("\n")
    expect(TranscriptIndex.scan(text)).toEqual({
      titles: ["🚧 seo", "✅ seo"],
      cwds: ["/repo", '/repo/odd"one\\x']
    })
  })
  test("text with neither:  nothing", () => {
    expect(TranscriptIndex.scan('{"type":"user","message":"hello"}')).toEqual({ titles: [], cwds: [] })
  })
})

describe("factsOf() and save()", () => {
  test("an unchanged transcript is not read again, by a later run", () => {
    const path = transcript("one", [{ type: "user", cwd: "/repo/a" }])
    const first = new TranscriptIndex({ file: FILE })
    expect(first.factsOf(path)).toMatchObject({ cwds: ["/repo/a"] })
    first.save()
    expect(readFileSync(FILE, "utf8")).toContain("/repo/a")

    const scan = vi.spyOn(TranscriptIndex, "scan")
    const later = new TranscriptIndex({ file: FILE })
    expect(later.factsOf(path)).toMatchObject({ cwds: ["/repo/a"], titles: [] })
    expect(scan).not.toHaveBeenCalled()
  })

  test("a transcript that grew is scanned again, and its new facts found", () => {
    const path = transcript("grows", [{ type: "user", cwd: "/repo/a" }])
    const index = new TranscriptIndex({ file: FILE })
    expect(index.factsOf(path).titles).toEqual([])
    index.save()

    appendFileSync(path, `\n${JSON.stringify({ type: "custom-title", customTitle: "seo" })}`)
    const scan = vi.spyOn(TranscriptIndex, "scan")
    const later = new TranscriptIndex({ file: FILE })
    expect(later.factsOf(path).titles).toEqual(["seo"])
    expect(scan).toHaveBeenCalledTimes(1)
  })

  test("a transcript rewritten at the same size but another time is scanned again", () => {
    const path = transcript("touched", [{ type: "user", cwd: "/repo/aa" }])
    const index = new TranscriptIndex({ file: FILE })
    index.factsOf(path)
    index.save()

    writeFileSync(path, JSON.stringify({ type: "user", cwd: "/repo/bb" }))
    utimesSync(path, new Date(Date.now() + 60_000), new Date(Date.now() + 60_000))
    expect(new TranscriptIndex({ file: FILE }).factsOf(path).cwds).toEqual(["/repo/bb"])
  })

  test("a transcript that is gone leaves the file at the next save", () => {
    const path = transcript("gone", [{ type: "user", cwd: "/repo/gone-folder" }])
    const index = new TranscriptIndex({ file: FILE })
    index.factsOf(path)
    index.save()
    expect(readFileSync(FILE, "utf8")).toContain("/repo/gone-folder")

    rmSync(path)
    new TranscriptIndex({ file: FILE }).save()
    expect(readFileSync(FILE, "utf8")).not.toContain("/repo/gone-folder")
  })

  test("nothing changed:  the file is not written again", () => {
    const path = transcript("steady", [{ type: "user", cwd: "/repo/s" }])
    const index = new TranscriptIndex({ file: FILE })
    index.factsOf(path)
    index.save()
    const before = readFileSync(FILE, "utf8")
    writeFileSync(FILE, `${before} `)
    const later = new TranscriptIndex({ file: FILE })
    later.factsOf(path)
    later.save()
    expect(readFileSync(FILE, "utf8")).toBe(`${before} `)
  })
})

describe("a file that is no index", () => {
  test("garbage, or another version:  an empty index, scanned afresh, no throw", () => {
    const path = transcript("fresh", [{ type: "user", cwd: "/repo/f" }])
    for (const content of [
      "not json {",
      JSON.stringify({ version: 0, transcripts: { [path]: { cwds: ["/stale"] } } })
    ]) {
      mkdirSync(join(TEMP, "index"), { recursive: true })
      writeFileSync(FILE, content)
      expect(new TranscriptIndex({ file: FILE }).factsOf(path).cwds).toEqual(["/repo/f"])
    }
  })
  test("a save that can't be written is skipped", () => {
    const path = transcript("unwritable", [{ type: "user", cwd: "/repo/u" }])
    // its folder's name is a file
    const blocked = join(TEMP, "blocked")
    writeFileSync(blocked, "")
    const index = new TranscriptIndex({ file: join(blocked, "transcript-index.json") })
    index.factsOf(path)
    expect(() => index.save()).not.toThrow()
  })
})
