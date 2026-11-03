/**
 * The words for a server's field names and numbers (epic `data` P23), both languages:  what's written, what it compiles to.
 * - What the running program does with them:  `tests/core/serverFieldNames.test.ts`.
 */
import { describe, expect, it } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** A program's lines, compiled:  what a test asks of it. */
function compiled(lines: string[], path = "/Test.spell") {
  const { files } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }])
  const { compiled: js, errors } = files[0]!
  return { js: `${js}`, errors: errors as unknown as string[] }
}

const SERVER = [
  'star wars is a web server at "https://swapi.py4e.com/api":',
  '\t- it writes names like "hair_color"',
  '\t- it writes numbers like "1.200,5"',
  '\t- characters live at "/people"',
  ""
]

describe("a field's own line says what isn't its words", () => {
  it("or its words for nothing;  stored as its name there", () => {
    const { js, errors } = compiled([
      ...SERVER,
      'a "character" is a thing:',
      "\t- it lives in star wars",
      '\t- its "height" is a number or "unknown"',
      '\t- its "average height" is a number or "n/a" or "unknown", stored as "avg_ht"',
      '\t- its "hair color" is text'
    ])
    expect(errors).toEqual([])
    expect(js).toContain('this.declareProp("height", { type: "number", nothingAs: ["unknown"],')
    expect(js).toContain(
      'this.declareProp("averageHeight", { type: "number", storedAs: "avg_ht", nothingAs: ["n/a", "unknown"],'
    )
    expect(js).toContain('this.declareProp("hairColor", { type: "text",')
  })

  it("the server's lines:  how it writes names and numbers", () => {
    const { js, errors } = compiled(SERVER)
    expect(errors).toEqual([])
    expect(js).toContain('namesLike: "hair_color"')
    expect(js).toContain('numbersLike: "1.200,5"')
    expect(js).not.toContain("unclearNumbers")
  })

  it("in Spanish:  o, guardado como, escribe ... como;  a number its text can't settle reads with a comma", () => {
    const { js, errors } = compiled(
      [
        'guerra de las galaxias es un servidor web en "https://swapi.py4e.com/api":',
        '\t- escribe los nombres como "hair_color"',
        '\t- escribe los números como "1.200,5"',
        "",
        'un "personaje" es una cosa:',
        "\t- vive en guerra de las galaxias",
        '\t- su "altura" es un número o "unknown"',
        '\t- su "color de pelo" es texto, guardado como "hair_colour"'
      ],
      "/Test.es.spell"
    )
    expect(errors).toEqual([])
    expect(js).toContain('this.declareProp("altura", { type: "number", nothingAs: ["unknown"],')
    expect(js).toContain('this.declareProp("colorDePelo", { type: "text", storedAs: "hair_colour",')
    expect(js).toContain('namesLike: "hair_color"')
    expect(js).toContain('unclearNumbers: ","')
  })

  it('the old way still reads:  a character\'s hair color is its "hair_color"', () => {
    const { js, errors } = compiled([
      ...SERVER.slice(0, 1),
      `\t- a character's hair color is its "hair_colour"`,
      '\t- characters live at "/people"',
      "",
      'a "character" is a thing:',
      "\t- it lives in star wars",
      '\t- its "hair color" is text'
    ])
    expect(errors).toEqual([])
    expect(js).toContain('fields: { hairColor: "hair_colour" }')
  })
})
