/**
 * Every saved type's `created` and `modified`, as the compiler gives them (epic `data` T57).
 * - The running half:  `tests/core/savedTimes.test.ts`.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** What `lines` compile to. */
function compiled(lines: string[], path = "/T.spell") {
  const { compiled: code, errors } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
  return { code: code ?? "", errors }
}

const PLACE = `family cookbook is a database on this device`

describe("a saved type's times", () => {
  test("it has both by itself:  its savedIn says so, and `its created` reads", () => {
    const { code, errors } = compiled([
      PLACE,
      `a "recipe" is a thing:`,
      `\t- it lives in the family cookbook`,
      `\t- its "title" is text`,
      `\t- to say when:`,
      `\t\treturn its created`
    ])
    expect(errors).toEqual([])
    expect(code).toContain(`times: [`)
    expect(code).toContain(`get created()`)
    expect(code).toContain(`get modified()`)
    expect(code).toContain(`this.created`)
  })

  test("`- it keeps no times` has neither", () => {
    const { code, errors } = compiled([
      PLACE,
      `a "recipe" is a thing:`,
      `\t- it lives in the family cookbook`,
      `\t- it keeps no times`
    ])
    expect(errors).toEqual([])
    expect(code).not.toContain(`times:`)
    expect(code).not.toContain(`get created()`)
  })

  test("a line of its own keeps that one its own, whichever line comes first", () => {
    for (const lines of [
      [`\t- it lives in the family cookbook`, `\t- its "created" is text`],
      [`\t- its "created" is text`, `\t- it lives in the family cookbook`]
    ]) {
      const { code, errors } = compiled([PLACE, `a "recipe" is a thing:`, ...lines])
      expect(errors).toEqual([])
      expect(code).toContain(`times: ["modified"]`)
      expect(code.match(/get created\(\)/g)).toHaveLength(1)
      expect(code).toContain(`type: "text"`)
    }
  })

  test("a type with no place has neither", () => {
    const { code } = compiled([`a "recipe" is a thing:`, `\t- its "title" is text`])
    expect(code).not.toContain(`get created()`)
  })

  test("Spanish:  su creado, its row's field still `created`", () => {
    const { code, errors } = compiled(
      [
        `recetario es una base de datos en este dispositivo`,
        `una "receta" es una cosa:`,
        `\t- vive en el recetario`,
        `\t- para decir cuándo:`,
        `\t\tdevolver su creado`
      ],
      "/T.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`get creado()`)
    expect(code).toContain(`storedAs: "created"`)
  })

  test("Spanish:  no guarda fechas", () => {
    const { code, errors } = compiled(
      [
        `recetario es una base de datos en este dispositivo`,
        `una "receta" es una cosa:`,
        `\t- vive en el recetario`,
        `\t- no guarda fechas`
      ],
      "/T.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).not.toContain(`get creado()`)
  })
})
