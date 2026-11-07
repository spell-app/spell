import { mkdtempSync, readdirSync, readFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { fileURLToPath } from "url"
import { afterAll, describe, test, expect } from "vite-plus/test"

import { CLI } from "spell/app/cli"

/**
 * Each type of a compiled library, as JSON Schema for VS Code and as a Lexicon (`CLI.writeSchemas()`, epic `people-and-orgs` P5):
 * People's, the frozen test project's library, written into a temp folder -- never its build folder.
 */
describe("writeSchemas()", () => {
  // spell's frozen test projects, beside the built-in groups:  `spaces/@spell/test/` at the repo's root
  const people = "../../spaces/@spell/test/people/people.lib.snapshot.ts"
  const library = fileURLToPath(new URL(people, import.meta.url))
  const folder = mkdtempSync(resolve(tmpdir(), "spell-schemas-"))
  afterAll(() => rmSync(folder, { recursive: true, force: true }))

  test("one schema per type the library exports", async () => {
    const wrote = await CLI.writeSchemas(library, folder, "@spell/library/people")
    const types = ["DatedEvent", "FriendList", "Note", "Person", "Relationship"]
    expect(wrote.map((path) => path.slice(folder.length + 1)).sort()).toEqual(
      types.flatMap((type) => [`${type}.lexicon.json`, `${type}.schema.json`])
    )
    expect(readdirSync(folder)).toHaveLength(10)
  })

  test("a type's schema holds its declared properties, and refuses others", () => {
    const person = JSON.parse(readFileSync(resolve(folder, "Person.schema.json"), "utf8"))
    expect(person.title).toBe("Person")
    expect(Object.keys(person.properties)).toEqual(
      expect.arrayContaining(["$type", "id", "name", "nickname", "emails", "dates"])
    )
    expect(person.properties.emails).toEqual({ type: "array", items: { type: ["string", "null"] } })
    expect(person.additionalProperties).toBe(false)
  })

  test("its Lexicon beside it, named by the library's address (epic `atmosphere` P10)", () => {
    const person = JSON.parse(readFileSync(resolve(folder, "Person.lexicon.json"), "utf8"))
    expect(person).toMatchObject({ lexicon: 1, id: "space.spell.spell.library.people.person" })
    expect(person.defs.main).toMatchObject({ type: "record", key: "any" })
    expect(person.defs.main.record.properties.name).toMatchObject({ type: "string", description: "name" })
  })

  test("a type marked for publishing:  what `spell space lexicon publish` would publish", async () => {
    // the frozen library marks none
    expect([...(await CLI.publishedLexicons(library, "@spell/library/people")).keys()]).toEqual([])
  })
})
