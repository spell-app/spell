import { afterAll, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { valueAsWritten } from "spell/parser/core/saving"
import { runSpellFiles } from "spell/parser/spell/test"

/**
 * A text field a web server sends as an object or a list, a file's JSON:  read as its JSON text, two spaces a level,
 * so a page shows it as it is;  written back as what it was.
 */

afterAll(() => void vi.unstubAllGlobals())

test("text sent as an object is its JSON text;  a list's too;  written back as what came", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json([
      { id: "1", content: { name: "rack", nodes: [1, 2] }, note: "plain" },
      { id: "2", content: ["a", "b"], note: "also" }
    ])
  )
  core.resetRuntime()
  const contents = `lab is a web server at "https://lab.test"
	it is read only
	files live at "/files"

a "file" is a thing
	it lives in lab
	its "content" is text
	its "note" is text
	its "length" is the length of its content
`
  const { File } = runSpellFiles([{ path: "/T.spell", contents }], { registered: true })("File") as {
    File: new () => unknown
  }
  const { items } = (await core.savedThings(File)) as unknown as {
    items: { content: unknown; note: unknown; length: number }[]
  }
  expect(items[0]!.content).toBe(`{\n  "name": "rack",\n  "nodes": [\n    1,\n    2\n  ]\n}`)
  expect(items[0]!.length).toBe((items[0]!.content as string).length)
  expect(items[1]!.content).toBe(`[\n  "a",\n  "b"\n]`)
  expect(items[0]!.note).toBe("plain")
  const Class = File as unknown as Parameters<typeof valueAsWritten>[0]
  expect(valueAsWritten(Class, "content", items[0]!.content)).toEqual({ name: "rack", nodes: [1, 2] })
  expect(valueAsWritten(Class, "content", "not json")).toBe("not json")
  expect(valueAsWritten(Class, "note", "plain")).toBe("plain")
})
