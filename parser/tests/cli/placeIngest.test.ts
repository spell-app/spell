import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { diskFiles, fetchWithFiles, placeUpdate, readThroughSpell } from "spell/parser/cli/placeIngest"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"

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
  test("names a description in the project's file once, keeping its comments;  with no project's file, nothing", async () => {
    const projectFile = join(folder, "__project.json5")
    writeFileSync(projectFile, `{\n  // mine\n  "imports": []\n}\n`)
    await diskFiles.listInProject!(join(folder, "A.api.spell"), join(folder, "A.api.json5"))
    await diskFiles.listInProject!(join(folder, "A.api.spell"), join(folder, "A.api.json5"))
    const text = readFileSync(projectFile, "utf8")
    expect(text).toContain("// mine")
    expect(JSON.parse(text.replace(/\/\/.*\n/, ""))).toEqual({ imports: [], development: { apis: ["A.api.json5"] } })
    const elsewhere = mkdtempSync(join(tmpdir(), "place-no-project-"))
    await diskFiles.listInProject!(join(elsewhere, "B.api.spell"), join(elsewhere, "B.api.json5"))
    expect(() => readFileSync(join(elsewhere, "__project.json5"))).toThrow()
    rmSync(elsewhere, { recursive: true, force: true })
  })

  test("a description written again keeps a person's comment and their own key", async () => {
    const path = join(folder, "A.api.json5")
    const description = { about: { name: "box" }, notes: [] } as unknown as PlaceDescriptionOnDisk
    await diskFiles.writeDescription(path, description)
    expect(readFileSync(path, "utf8")).toContain("What `spell place ingest` found")
    const text = readFileSync(path, "utf8").replace(`"notes"`, `// mine\n  "notes"`)
    writeFileSync(path, text)
    await diskFiles.writeDescription(path, { ...description, notes: ["new"] })
    expect(readFileSync(path, "utf8")).toContain("// mine")
    expect((await diskFiles.readDescription(path))!.notes).toEqual(["new"])
  })

  test("finds the other Spell files beside a file, no others", async () => {
    const spell = join(folder, "A.api.spell")
    writeFileSync(join(folder, "A.api.json5"), "{}")
    writeFileSync(join(folder, "B.spell"), "print 1")
    writeFileSync(spell, "print 2")
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

test("update says what to do with no description beside the file", async () => {
  await expect(placeUpdate(join(folder, "A.api.spell"), { ai: false })).rejects.toThrow(
    /A\.api\.json5, so there's nothing to look at again:  spell place ingest <address> --into/
  )
})
