import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A line `the card is ...` that SETS the card, in a body answering yes or no:  a warning (epic `language` T137).
 * - Its last line asks already (T135):  these are the lines above it.
 */
describe("a line setting what a yes-or-no body asks about", () => {
  /** `lines`, a project's one file:  its errors, its code, and each warning as `<its text>: <message>`. */
  function compiled(lines: string[], path = "/Test.spell") {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    const warnings = SP.SpellWarnings.in(file!.match!).map(({ message, at }) => `${at.inputText.trim()}: ${message}`)
    return { errors: file!.errors, code: `${file!.compiled}`, warnings }
  }

  const piles = [
    'a "card" is a thing',
    '\tits "value" is a number',
    '\tits "pile" is a pile',
    'a "pile" is a droppable list of cards',
    '\tits "value" is a number',
    'a "foundation" is a pile'
  ]

  test("above the last line of `it is droppable when`, `the card is ...` sets the card:  a warning saying how to ask", () => {
    const { errors, code, warnings } = compiled([
      ...piles,
      "\tit is droppable when",
      "\t\tthe card is the last item of the card's pile",
      "\t\tthe card's value is 1"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("card = card.pile?.lastItem")
    expect(warnings).toEqual([
      "the card is the last item of the card's pile: " +
        'This sets "the card", it doesn\'t ask:  to ask, end the line with "and";  ' +
        'to set it, write "set the card to the last item of the card\'s pile"'
    ])
  })

  test("joined with `and`, it asks:  no warning", () => {
    const { errors, code, warnings } = compiled([
      ...piles,
      "\tit is droppable when",
      "\t\tthe card is the last item of the card's pile and",
      "\t\t\tthe card's value is 1"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("return card === card.pile?.lastItem && card.value === 1")
    expect(warnings).toEqual([])
  })

  test('in `it "is X" if`, a variable set above:  a warning;  `set ... to`, `x = ...` and a new variable, none', () => {
    const { errors, warnings } = compiled([
      'a "card" is a thing',
      '\tits "rank" is a number',
      '\tit "is fine" if',
      "\t\tset x to its rank",
      "\t\tx = 2",
      "\t\ty is 3",
      "\t\tx is 1",
      "\t\tx > y"
    ])
    expect(errors).toEqual([])
    expect(warnings).toEqual([
      'x is 1: This sets "x", it doesn\'t ask:  to ask, end the line with "and";  to set it, write "set x to 1"'
    ])
  })

  test("anywhere else, `x is 1` sets `x` as it always has:  no warning", () => {
    const { errors, code, warnings } = compiled([
      'a "card" is a thing',
      '\tits "rank" is a number',
      "\tto check it",
      "\t\tset x to its rank",
      "\t\tx is 1",
      "\t\tif x is 1",
      "\t\t\tprint x"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("x = 1")
    expect(warnings).toEqual([])
  })

  test("Spanish:  in its own words", () => {
    const { warnings } = compiled(
      [
        'una "carta" es una cosa',
        '\tsu "rango" es un número',
        '\t"está bien" si',
        "\t\tponer x a su rango",
        "\t\tx es 1",
        "\t\tx > 0"
      ],
      "/Prueba.es.spell"
    )
    expect(warnings).toEqual([
      'x es 1: Esto pone "x", no pregunta:  para preguntar, termina la línea con "y";  para ponerlo, escribe "poner x a 1"'
    ])
  })
})
