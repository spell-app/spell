import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { diskFiles, fetchWithFiles, placeIngest, readThroughSpell } from "spell/parser/cli/placeIngest"
import type { PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * `spell place ingest`'s disk and terminal half (epic `data` P18).
 * - The steps themselves:  `tests/spell/ingest/PlaceIngest.test.ts`.
 */

let folder: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "place-ingest-"))
})
afterEach(() => rmSync(folder, { recursive: true, force: true }))

describe("diskFiles", () => {
  test("a description written again keeps a person's comment and their own key", async () => {
    const path = join(folder, "A.box.place.json5")
    const description = { about: { name: "box" }, notes: [] } as unknown as PlaceDescription
    await diskFiles.writeDescription(path, description)
    expect(readFileSync(path, "utf8")).toContain("What `spell place ingest` found")
    const text = readFileSync(path, "utf8").replace(`"notes"`, `// mine\n  "notes"`)
    writeFileSync(path, text)
    await diskFiles.writeDescription(path, { ...description, notes: ["new"] })
    expect(readFileSync(path, "utf8")).toContain("// mine")
    expect((await diskFiles.readDescription(path))!.notes).toEqual(["new"])
  })

  test("finds the descriptions and other Spell files beside a file, no others", async () => {
    const spell = join(folder, "A.spell")
    writeFileSync(join(folder, "A.box.place.json5"), "{}")
    writeFileSync(join(folder, "AB.box.place.json5"), "{}")
    writeFileSync(join(folder, "B.spell"), "print 1")
    writeFileSync(spell, "print 2")
    expect(await diskFiles.descriptionsBeside(spell)).toEqual([join(folder, "A.box.place.json5")])
    expect(await diskFiles.otherSpellBeside(spell)).toEqual(["print 1"])
    expect(await diskFiles.read(join(folder, "nope.spell"))).toBeUndefined()
  })
})

test("fetchWithFiles reads a local file, as a CSV", async () => {
  const path = join(folder, "r.csv")
  writeFileSync(path, "id,title\n1,Soup\n")
  const fetch = fetchWithFiles((async () => new Response("from the web")) as typeof globalThis.fetch)
  const local = await fetch(path)
  expect(local.headers.get("content-type")).toBe("text/csv")
  expect(await local.text()).toContain("Soup")
  expect((await fetch(join(folder, "nope.csv"))).status).toBe(404)
  expect(await (await fetch("https://web.test/x")).text()).toBe("from the web")
})

describe("readThroughSpell", () => {
  const SPELL = `box is a web server at "https://web.test":\n\t- things live at "/things"\na "gadget" is a thing:\n\t- it lives in the box\n\t- its "title" is text\n\t- its "size" is a number\n`
  const wide = SPELL.replaceAll("things", "gadgets")

  test("really reads, puts everything back, and says of a field no row filled", async () => {
    const before = globalThis.fetch
    const fetch = (async () => Response.json([{ id: 1, title: "Cog" }])) as typeof globalThis.fetch
    const { byType, complaints } = await readThroughSpell({ spell: wide, types: { gadget: "Gadget" }, fetch })
    expect(byType.gadget).toEqual({ rows: 1 })
    expect(complaints.join("\n")).toMatch(/No row read filled gadget's "size"/)
    expect(complaints.join("\n")).not.toMatch(/"title"/)
    expect(globalThis.fetch).toBe(before)
  })

  test("a read that fails says so, and doesn't throw", async () => {
    const fetch = (async () => new Response("no", { status: 403 })) as typeof globalThis.fetch
    const { byType } = await readThroughSpell({ spell: wide, types: { gadget: "Gadget" }, fetch })
    expect(byType.gadget!.rows).toBe(0)
    expect(byType.gadget!.problem).toBeTruthy()
  })
})

test("the command says what to do with no address", async () => {
  await expect(placeIngest(undefined, { ai: false })).rejects.toThrow(/which source/)
})
