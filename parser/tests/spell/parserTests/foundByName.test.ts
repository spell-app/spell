/**
 * A collection found only by name, with no list of them all (epic `data` P27):
 * `wiki pages are found at "/page/summary/{name}"`.  One is read by its id;  every one of them can't be.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

const HOST = "https://wiki.test/api"

/** A project of these lines, in `language`:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/W.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

const WIKI = [
  `wikipedia is a web server at "${HOST}":`,
  `\t- its id is its "title"`,
  `\t- wiki pages are found at "/page/summary/{name}"`,
  `a "wiki page" is a thing:`,
  `\t- it lives in wikipedia`,
  `\t- its "title" is text`,
  `\t- its "summary" is text, stored as "extract"`
]

describe("a collection found by name", () => {
  test("one is read by its id:  its address says where the name goes", () => {
    const { errors, compiled: code } = compiled([
      ...WIKI,
      `a "planet" is a thing:`,
      `\t- its "name" is text`,
      `\t- its "page" is the wiki page whose id is its name`
    ])
    expect(errors).toEqual([])
    expect(code).toContain(`wikiPages: { at: "/page/summary/{id}" }`)
    expect(code).toContain("core.savedThingWithId(WikiPage, this.name)")
  })

  test("every one of them is refused, saying how to read one", () => {
    const every = compiled([...WIKI, `set pages to every wiki page`])
    expect(every.errors.join("\n")).toMatch(/wiki pages are only found by name, with no list of them all/)
    const bare = compiled([...WIKI, `set pages to the wiki pages`])
    expect(bare.errors.join("\n")).toMatch(/wiki pages are only found by name/)
  })

  test("the same in Spanish", () => {
    const lines = [
      `wikipedia es un servidor web en "${HOST}":`,
      `\t- su identificador está en "title"`,
      `\t- los artículos se encuentran en "/page/summary/{name}"`,
      `un "artículo" es una cosa:`,
      `\t- vive en wikipedia`,
      `\t- su "title" es texto`,
      `poner artículos a cada artículo`
    ]
    const { errors, compiled: code } = compiled(lines, "/W.es.spell")
    expect(code).toContain(`at: "/page/summary/{id}"`)
    expect(errors.join("\n")).toMatch(/solo se encuentran por su nombre/)
  })
})
