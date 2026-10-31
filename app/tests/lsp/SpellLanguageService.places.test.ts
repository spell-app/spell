import { describe, expect, test } from "vite-plus/test"
import { mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/** A place's words, in an editor (epic `data` P11):  a hover says what it is, and a rename reaches every line. */
describe("a place's words, in an editor", () => {
  const SOURCE = `cookbook is in memory
a recipe is a thing:
	- it is saved in the cookbook
	- its "title" is text
set all to every recipe
`

  /** A language service on `SOURCE`, and where a word in a row is. */
  async function serviceOn() {
    const folder = mkdtempSync(resolve(tmpdir(), "spell-places-"))
    writeFileSync(resolve(folder, SP.PROJECT_FILE), `{ imports: [{ path: "/Box.spell", active: true }] }\n`)
    writeFileSync(resolve(folder, "Box.spell"), SOURCE)
    const workspace = new SpellDiskWorkspace()
    const service = new LSP.SpellLanguageService(workspace)
    const uri = pathToFileURL(resolve(folder, "Box.spell")).href
    await workspace.update(uri, SOURCE)
    const lines = SOURCE.split("\n")
    const at = (row: string, word: string) => {
      const line = lines.findIndex((it) => it.includes(row))
      return { line, character: lines[line]!.indexOf(word) + 1 }
    }
    return { service, file: workspace.fileFor(uri)!, uri, at }
  }

  test("hovering a place's name says it's a place", async () => {
    const { service, file, at } = await serviceOn()
    const hover = service.hover(file, at("saved in the cookbook", "cookbook"))
    expect((hover!.contents as { value: string }).value).toContain("Cookbook")
  })

  test("hovering a read of a saved type says it waits for its place", async () => {
    const { service, file, at } = await serviceOn()
    expect(service.hover(file, at("set all", "recipe"))).not.toBeNull()
  })

  test("renaming a place's name reaches where a type says it's saved", async () => {
    const { service, file, at, uri } = await serviceOn()
    const edit = service.rename(file, at("saved in the cookbook", "cookbook"), "pantry")
    const changes = edit?.changes?.[uri] ?? []
    expect(changes.map((change) => change.range.start.line).toSorted((one, other) => one - other)).toEqual([0, 2])
  })
})
