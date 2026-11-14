import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A condition said over several lines (`JoinedLines`, epic `language` P55, Q53 A):
 * a line ending in `and` / `or` goes on onto the line indented under it,
 * and a line of just `and` / `or` joins the lines either side, each in parentheses.
 */
describe("a condition over several lines", () => {
  /** `lines`, a project's one file, compiled:  its errors and its code. */
  function compiled(lines: string[], path = "/Test.spell") {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return { errors: file!.errors, code: `${file!.compiled}` }
  }

  const card = ['a "card" is a thing', '\tits "rank" is a number', '\tits "color" is text']

  test("a line ending in `and` goes on onto the line indented under it;  what's under that is the body", () => {
    const { errors, code } = compiled([
      ...card,
      "\tto check it",
      "\t\tif its rank > 1 and its rank < 5 or",
      "\t\t   its rank is 9",
      "\t\t\tprint 2"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("if ((this.rank > 1 && this.rank < 5) || this.rank === 9) core.console.log(2)")
  })

  test("in a yes-or-no's body:  a lone `or` between two parts, each in parentheses, one of them going on", () => {
    const { errors, code } = compiled([
      ...card,
      '\tit "is fine" if',
      '\t\tits rank is 1 and its color is "red"',
      "\t\tor",
      "\t\tits rank is 2 and",
      '\t\t  its color is "black"'
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      'return (this.rank === 1 && this.color === "red") || (this.rank === 2 && this.color === "black")'
    )
  })

  test("a lone `and` binds its parts before an `or` inside them", () => {
    const { errors, code } = compiled([
      ...card,
      '\tit "is odd" if',
      "\t\tits rank is 1 or its rank is 3",
      "\t\tand",
      '\t\tits color is "red"'
    ])
    expect(errors).toEqual([])
    expect(code).toContain('return (this.rank === 1 || this.rank === 3) && this.color === "red"')
  })

  test("Spanish:  `y`, `o`", () => {
    const { errors, code } = compiled(
      [
        'una "carta" es una cosa',
        '\tsu "rango" es un número',
        "\tpara revisarla",
        "\t\tsi su rango es 1 o",
        "\t\t   su rango es 2",
        "\t\t\timprimir 1"
      ],
      "/Prueba.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain("if (this.rango === 1 || this.rango === 2) core.console.log(1)")
  })

  test("a line that doesn't fit the shape is read as before:  `and` alone at a block's end", () => {
    const { errors } = compiled([...card, "\tto check it", "\t\tprint 1", "\t\tand"])
    expect(errors.length).toBe(1)
  })
})
