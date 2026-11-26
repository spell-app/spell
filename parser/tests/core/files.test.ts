import { mkdtempSync, openAsBlob, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"

/**
 * `core.readFile()` (epic `language` P67, r32;  I174):  `the file as text`, `as json`, `as binary`,
 * on real files:  one on disk, read as the browser hands one over (`openAsBlob()`), and a `File` made in memory.
 */
describe("core.readFile()", () => {
  const folder = mkdtempSync(join(tmpdir(), "spell-read-file-"))
  afterAll(() => rmSync(folder, { recursive: true, force: true }))

  /** A file on disk holding `contents`, as a `File` named `name`. */
  async function fileOnDisk(name: string, contents: string | Uint8Array): Promise<File> {
    const path = join(folder, name)
    writeFileSync(path, contents)
    return new File([await openAsBlob(path)], name)
  }

  test("as text:  its text", async () => {
    const file = await fileOnDisk("notes.txt", "hello, señor\nline two")
    expect(await core.readFile(file, "text")).toBe("hello, señor\nline two")
  })

  test("as json:  its text read as JSON;  JSON that doesn't read throws a SyntaxError", async () => {
    const file = await fileOnDisk("deck.json", '{ "cards": [1, 2, "king"], "shuffled": true }')
    expect(await core.readFile(file, "json")).toEqual({ cards: [1, 2, "king"], shuffled: true })
    const broken = await fileOnDisk("broken.json", "{ cards: ")
    await expect(core.readFile(broken, "json")).rejects.toThrow(SyntaxError)
  })

  test("as binary:  its bytes, a Uint8Array", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255])
    const read = await core.readFile(await fileOnDisk("image.png", bytes), "binary")
    expect(read).toBeInstanceOf(Uint8Array)
    expect([...(read as Uint8Array)]).toEqual([...bytes])
  })

  test("a File made in memory reads the same", async () => {
    const file = new File(['{"a":1}'], "a.json", { type: "application/json" })
    expect(await core.readFile(file, "text")).toBe('{"a":1}')
    expect(await core.readFile(file, "json")).toEqual({ a: 1 })
    expect((await core.readFile(file, "binary")) as Uint8Array).toHaveLength(7)
  })

  test("something that isn't a file throws a TypeError", async () => {
    await expect(core.readFile("notes.txt", "text")).rejects.toThrow(TypeError)
    await expect(core.readFile(undefined, "text")).rejects.toThrow(/nothing isn't a file/)
  })

  test("a file still being dragged, only its summary, says to read it once it's dropped (I172)", async () => {
    const summary = { count: 1, kinds: ["text/plain"], via: "drop", x: 10, y: 20 }
    await expect(core.readFile(summary, "text")).rejects.toThrow(/still being dragged.*dropped on it/)
  })
})
