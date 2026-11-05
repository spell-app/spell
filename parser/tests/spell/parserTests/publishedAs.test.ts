import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A type marked for publishing as a Lexicon (`published_as`, epic `atmosphere` P10),
 * and the warnings that watch its round trip:
 * - a decimal number, which a schema keeps as text
 * - a renamed field, which a schema can't rename
 * - Only on a type marked for publishing:  the same lines on any other type say nothing.
 */
describe("published_as:  the round-trip warnings", () => {
  /** `source`'s warnings, one file in `path`'s language. */
  const warningsOf = (source: string, path = "/T.spell") =>
    parseSpellProject([{ path, contents: source }]).files.flatMap((file) => [...file.errors, ...file.warnings])

  test("a decimal number, named wherever it's declared:  above the line or below it", () => {
    const warnings = warningsOf(`a "recipe" is a thing:
	- its "price" is a number
	- it is published
	- its "weight" is a number
	- its "servings" is an integer
`)
    expect(warnings).toEqual([
      '3:3 A schema has no decimal numbers:  price, weight will be kept as text, "12.50", and read back as numbers here, but other apps see text.  A whole number is "an integer"'
    ])
  })

  test("a rename, at its version line", () => {
    const warnings = warningsOf(`a "recipe" is a thing:
	- it is published as "com.example.recipe"
	- its "title" is text

a recipe version 2 renames name to title
`)
    expect(warnings).toEqual([
      "5:0 A published schema's fields never change:  other apps go on reading the old name.  This line only changes how records read here;  to rename it for everyone, publish it under a new name"
    ])
  })

  test("NOT on a type that isn't published", () => {
    expect(
      warningsOf(`a "recipe" is a thing:
	- its "price" is a number

a recipe version 2 renames name to title
`)
    ).toEqual([])
  })

  test("Spanish:  the same, in the program's language", () => {
    const warnings = warningsOf(
      `una "receta" es una cosa:
	- se publica
	- su "precio" es un número
`,
      "/T.es.spell"
    )
    expect(warnings).toEqual([expect.stringContaining("Un esquema no tiene números decimales:  precio se guardarán")])
  })
})
