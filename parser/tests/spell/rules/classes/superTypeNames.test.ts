import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * Inside a type's rules and actions, each kind up its chain names the thing, as its own name does (epic `language`
 * J188):  `the pile` in a foundation's rule is the foundation.
 */
describe("`the <super-type>` in a type's lines means the thing", () => {
  /** `lines`, a project's one file, compiled:  its errors and its code. */
  function compiled(lines: string[], path = "/Test.spell") {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return { errors: file!.errors, code: `${file!.compiled}` }
  }

  const cards = [
    'a "card" is a thing',
    '\tits "suit" is text',
    '\tits "value" is a number',
    'a "pile" is a droppable list of cards',
    '\tits "suit" is text',
    '\tits "value" is a number'
  ]

  test("Owen's foundation:  `the pile's suit` in its `droppable when` is its own", () => {
    const { errors, code } = compiled([
      ...cards,
      'a "foundation" is a pile',
      "\tit is droppable when",
      "\t\tthe pile's suit is the suit of the card and",
      "\t\t\tthe card's value is the pile's value + 1"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("return this.suit === card.suit && card.value === this.value + 1")
  })

  test("any kind up the chain, in an action too", () => {
    const { errors, code } = compiled([
      ...cards,
      'a "foundation" is a pile',
      'a "home foundation" is a foundation',
      "\tto check it",
      "\t\tprint the suit of the pile",
      "\t\tprint the value of the foundation"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.console.log(this.suit)")
    expect(code).toContain("core.console.log(this.value)")
  })

  test("a variable of that name still wins:  a loop's `pile`", () => {
    const { errors, code } = compiled([
      ...cards,
      'a "game" is a thing',
      '\tits "piles" is a list of piles',
      'a "foundation" is a pile',
      '\tits "game" is a game',
      "\tto check it",
      "\t\tfor each pile in the piles of its game",
      "\t\t\tprint the suit of the pile"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.console.log(pile.suit)")
  })

  test("Spanish:  `la pila` in a foundation's rule", () => {
    const { errors, code } = compiled(
      [
        'una "carta" es una cosa',
        '\tsu "palo" es un texto',
        'una "pila" es una lista de cartas',
        '\tsu "palo" es un texto',
        'una "base" es una pila',
        "\tpara revisarla",
        "\t\timprimir el palo de la pila"
      ],
      "/Prueba.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain("core.console.log(this.palo)")
  })
})
