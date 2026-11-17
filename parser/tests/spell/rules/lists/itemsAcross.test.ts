import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A list of lists read by its items' word (epic `language` I152):  `cards in the columns` is every column's cards,
 * together, in the columns' order;  a word it can't read is an error, never words dropped.
 */

/** The English project the lines run in:  cards, piles of them, and a game holding some. */
const ENGLISH = `a card is a thing
	its "rank" is a number
	its "color" is one of red, black
	its "direction" is up or down
	it "is face (direction)"
a pile is a list of cards
a column is a pile
a deck is a list of cards
a game is a thing
	its "discard pile" is a new pile
	its "deck" is a new deck
	to "probe"
`

/** The same, in Spanish. */
const SPANISH = `una carta es una cosa
	su "rango" es un número
	su "color" es uno de rojo, negro
una pila es una lista de cartas
una columna es una pila
un juego es una cosa
	su "descarte" es una nueva pila
	para "probar"
`

/** `lines` as the steps of the game's action, compiled:  its code's lines, and the errors. */
function compiled(lines: string[], { project = ENGLISH, path = "/Test.spell" } = {}) {
  const contents = project + lines.map((line) => `\t\t${line}`).join("\n") + "\n"
  const { files } = parseSpellProject([{ path, contents }])
  const [file] = files
  const code = file!.compiled
  return { code, errors: file!.errors.map((error) => error.replace(/^\d+:\d+ /, "")) }
}

describe("a list of lists, read by its items' word (epic `language` I152)", () => {
  test.each([
    ["set x to cards in the columns", "core.mergeLists(core.everyThing(Column))"],
    ["set x to the cards in the columns", "core.mergeLists(core.everyThing(Column))"],
    ["set x to the first card in the columns", "core.getItemAt(core.mergeLists(core.everyThing(Column)), 0)"],
    ["set x to the last card in the columns", "core.getItemAt(core.mergeLists(core.everyThing(Column)), -1)"],
    ["set x to a random card in the columns", "core.randomItemOf(core.mergeLists(core.everyThing(Column)))"],
    [
      "set x to the first card in the columns where it is face up",
      'core.getItemAt(core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("up")), 0)'
    ],
    [
      "set x to a random card in the columns where it is face down",
      'core.randomItemOf(core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("down")))'
    ],
    [
      "set x to cards in the columns which are face down",
      'core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("down"))'
    ],
    ["set x to the piles in the columns", "core.everyThing(Column)"],
    ["set x to the first pile in the columns", "core.getItemAt(core.everyThing(Column), 0)"],
    ["set x to the cards in the discard pile", "this.discardPile"]
  ])("%s", (line, js) => {
    const { code, errors } = compiled([line])
    expect(errors).toEqual([])
    expect(code).toContain(`const x = ${js}`)
  })

  test("a loop's item word:  each list's items in turn, or the lists", () => {
    const { code, errors } = compiled([
      "for each card in the columns",
      "\tprint the card",
      "for each pile in the columns",
      "\tshuffle the pile"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.map(core.mergeLists(core.everyThing(Column)), (card) =>")
    expect(code).toMatch(
      /core\.everyThing\(Column\)\.forEach\(\(pile\) =>|core\.map\(core\.everyThing\(Column\), \(pile\) =>/
    )
  })

  test("a word naming none of its items is refused, saying what it holds", () => {
    const { errors } = compiled(["set x to the columns in the deck"])
    expect(errors).toEqual(['the deck holds cards, not columns:  say "cards in the deck"'])
  })

  test("words it can't read are an error, never dropped", () => {
    const { errors } = compiled(["set x to cards in the columns where it is face up and purple"])
    expect(errors).toEqual(['Don\'t understand "purple"'])
  })

  test("Spanish:  the same reading", () => {
    const { code, errors } = compiled(
      [
        "poner x a las cartas en las columnas",
        "poner y a la primera carta en las columnas donde su rango es 1",
        "poner z a una carta al azar en las columnas donde su rango es 1",
        "poner w a las pilas en las columnas"
      ],
      { project: SPANISH, path: "/Prueba.es.spell" }
    )
    expect(errors).toEqual([])
    expect(code).toContain("const x = core.mergeLists(core.everyThing(Columna))")
    expect(code).toContain(
      "const y = core.getItemAt(core.filter(core.mergeLists(core.everyThing(Columna)), (carta) => carta.rango === 1), 0)"
    )
    expect(code).toContain(
      "const z = core.randomItemOf(core.filter(core.mergeLists(core.everyThing(Columna)), (carta) => carta.rango === 1))"
    )
    expect(code).toContain("const w = core.everyThing(Columna)")
  })
})

describe("a bare word after `and` / `or` in a filter carries its verb (epic `language` I152)", () => {
  test.each([
    [
      "set x to cards in the columns which are face up and red",
      'core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("up") && card.color === "red")'
    ],
    [
      "set x to cards in the columns where it is face up and red",
      'core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("up") && card.color === "red")'
    ],
    [
      "set x to cards in the columns where it is red or black",
      'core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.color === "red" || card.color === "black")'
    ],
    [
      "set x to cards in the columns where its rank is 1 or 2",
      "core.filter(core.mergeLists(core.everyThing(Column)), (card) => core.includes([1, 2], card.rank))"
    ]
  ])("%s", (line, js) => {
    const { code, errors } = compiled([line])
    expect(errors).toEqual([])
    expect(code).toContain(`const x = ${js}`)
  })

  test("Spanish:  the same, its subject left out", () => {
    const { code, errors } = compiled(["poner x a las cartas en las columnas que son rojo o negro"], {
      project: SPANISH,
      path: "/Prueba.es.spell"
    })
    expect(errors).toEqual([])
    expect(code).toContain(
      'const x = core.filter(core.mergeLists(core.everyThing(Columna)), (carta) => carta.color === "rojo" || carta.color === "negro")'
    )
  })
})
