import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * Lists said in words (epic `language` T152):
 * 1. one item of each thing, `the last card of each column`, as one list
 * 2. a line starting with `and` then a value ends the `where` above it
 * 3. `and` between words that say items joins their items into one flat list
 */

/** The English project the lines run in:  cards, piles of them, columns, and a game holding some. */
const ENGLISH = `a card is a thing
	its "rank" is a number
	its "color" is one of red, black
	its "direction" is up or down
	it "is face (direction)"
	to "play it"
		return yes
a pile is a list of cards
a column is a pile
a game is a thing
	its "stock" is a new pile
	its "discard pile" is a new pile
	to "probe"
`

/** The same, in Spanish. */
const SPANISH = `una carta es una cosa
	su "rango" es un número
una pila es una lista de cartas
una columna es una pila
un juego es una cosa
	su "reserva" es una nueva pila
	su "descarte" es una nueva pila
	para "probar"
`

/** `lines` as the steps of the game's action, compiled:  its code, and the errors. */
function compiled(lines: string[], { project = ENGLISH, path = "/Test.spell" } = {}) {
  const contents = project + lines.map((line) => `\t\t${line}`).join("\n") + "\n"
  const { files } = parseSpellProject([{ path, contents }])
  const [file] = files
  return { code: file!.compiled, errors: file!.errors.map((error) => error.replace(/^\d+:\d+ /, "")) }
}

/** `lines` compiled in Spanish. */
function compiledEs(lines: string[]) {
  return compiled(lines, { project: SPANISH, path: "/Prueba.es.spell" })
}

describe("1. one item of each thing, as one list", () => {
  test("`each column` is every column;  `in the columns` names the list", () => {
    const { code, errors } = compiled([
      "set lasts to the last card of each column",
      "set named to the last card of each column in the columns"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const lasts = core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)")
    expect(code).toContain("const named = core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)")
  })

  test("every place a pick says:  first, a numbered one, at random", () => {
    const { code, errors } = compiled([
      "set firsts to the first card of each column",
      "set seconds to the second card of each column",
      "set any to a random card of each column"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.pickFromEach(core.everyThing(Column), (column) => column.firstItem)")
    expect(code).toContain("core.pickFromEach(core.everyThing(Column), (column) => column.getItem(1))")
    expect(code).toContain("core.pickFromEach(core.everyThing(Column), (column) => column.randomItem())")
  })

  test("a `where` about the item:  each thing's items that pass, then the pick", () => {
    const { code, errors } = compiled([
      "set a to the first card of each column where the card is face up",
      "set b to the first card of each column where it is face up",
      "set c to the first card of each column which is face up"
    ])
    expect(errors).toEqual([])
    const each =
      'core.pickFromEach(core.everyThing(Column), (column) => column.filter((card) => card.isFaceDirection("up")).firstItem)'
    expect(code).toContain(`const a = ${each}`)
    expect(code).toContain(`const b = ${each}`)
    expect(code).toContain(`const c = ${each}`)
  })

  test("a `where` about the thing:  the things that pass, then the pick from each", () => {
    const { code, errors } = compiled(["set lasts to the last card of each column where the column is not empty"])
    expect(errors).toEqual([])
    expect(code).toContain(
      "core.pickFromEach(core.filter(core.everyThing(Column), (column) => !column.isEmpty), (column) => column.lastItem)"
    )
  })

  test("a list, never a loop:  `set` and `return` give one value;  a statement of its own is still each's loop", () => {
    const { code, errors } = compiled([
      "set lasts to the last card of each pile in the columns",
      "add the last card of each column in the columns to the stock",
      "set the rank of each card in the stock to 0",
      "return the last card of each column"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const lasts = core.pickFromEach(core.everyThing(Column), (pile) => pile.lastItem)")
    expect(code).not.toContain("lasts = pile.lastItem")
    expect(code).toContain("core.map(core.everyThing(Column), (column) => this.stock.append(column.lastItem))")
    expect(code).toContain("this.stock.forEach((card) => (card.rank = 0))")
    expect(code).toContain("return core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)")
  })

  test("an action asked of each:  refused, saying why", () => {
    const { errors } = compiled(["set playable to the first card of each column where it can play the card"])
    expect(errors).toEqual([
      '"the first card of each column where it can play the card" asks an action of one card at a time, so it can\'t pick one of each:  pick from one list, or ask it in a loop, "for each ..."'
    ])
  })

  test("runs:  one of each, in order, an empty column adding nothing", () => {
    const run = runSpell([
      "a card is a thing",
      '\tits "rank" is a number',
      "a column is a list of cards",
      "the west is a new column",
      "the middle is a new column",
      "the east is a new column",
      "add a new card with rank 1 to the west",
      "add a new card with rank 2 to the west",
      "add a new card with rank 3 to the east",
      "set columns to the west and the middle and the east",
      "set lasts to the last card of each column in columns",
      "set ranks to the rank of each card in lasts"
    ])
    expect([...(run("ranks").ranks as number[])]).toEqual([2, 3])
  })

  test("Spanish:  `la última carta de cada columna`", () => {
    const { code, errors } = compiledEs([
      "poner c a la última carta de cada columna",
      "poner d a la primera carta de cada columna donde su rango es 1",
      "poner e a una carta al azar de cada columna en las columnas",
      "poner f a la última carta de cada columna donde la columna no está vacía"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const c = core.pickFromEach(core.everyThing(Columna), (columna) => columna.lastItem)")
    expect(code).toContain(
      "const d = core.pickFromEach(core.everyThing(Columna), (columna) => columna.filter((carta) => carta.rango === 1).firstItem)"
    )
    expect(code).toContain("const e = core.pickFromEach(core.everyThing(Columna), (columna) => columna.randomItem())")
    expect(code).toContain(
      "const f = core.pickFromEach(core.filter(core.everyThing(Columna), (columna) => !columna.isEmpty), (columna) => columna.lastItem)"
    )
  })
})

describe("2. a line starting with `and`:  a value ends the `where` above it, a condition goes on with it", () => {
  test("a value:  one more item of the list", () => {
    const { code, errors } = compiled([
      "set candidates to cards in the discard pile which are face up",
      "\tand the last card of each column",
      "\tand the first card of each column where the card is face up"
    ])
    expect(errors).toEqual([])
    expect(code).toMatch(
      /const candidates = core\.mergeLists\(\[\s*this\.discardPile\.filter\(\(card\) => card\.isFaceDirection\("up"\)\),\s*core\.pickFromEach\(core\.everyThing\(Column\), \(column\) => column\.lastItem\),\s*core\.pickFromEach\(core\.everyThing\(Column\), \(column\) => column\.filter\(\(card\) => card\.isFaceDirection\("up"\)\)\.firstItem\)\s*\], List\)/
    )
  })

  test("a condition:  the `where` goes on, as always", () => {
    const { code, errors } = compiled([
      "set reds to cards in the discard pile which are face up",
      "\tand it is red",
      "set more to cards in the discard pile which are face up",
      "\tand red"
    ])
    expect(errors).toEqual([])
    const filter = 'this.discardPile.filter((card) => card.isFaceDirection("up") && card.color === "red")'
    expect(code).toContain(`const reds = ${filter}`)
    expect(code).toContain(`const more = ${filter}`)
  })

  test("on one line, the `where` takes the rest, as always:  a thing there is refused", () => {
    const { errors } = compiled([
      "set x to cards in the discard pile where it is face up and the last card of each column"
    ])
    expect(errors).toHaveLength(1)
  })

  test("Spanish:  `y` on a line of its own", () => {
    const { code, errors } = compiledEs([
      "poner c a las cartas de la reserva donde su rango es 1",
      "\ty la última carta de cada columna",
      "poner d a las cartas de la reserva donde su rango es 1",
      "\ty su rango es 2"
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      "const c = core.mergeLists([this.reserva.filter((carta) => carta.rango === 1), core.pickFromEach(core.everyThing(Columna), (columna) => columna.lastItem)], List)"
    )
    expect(code).toContain("const d = this.reserva.filter((carta) => carta.rango === 1 && carta.rango === 2)")
  })
})

describe("3. `and` joins words that say items into one flat list", () => {
  test("items and items:  their items, together", () => {
    const { code, errors } = compiled([
      "set both to cards in the stock and cards in the discard pile",
      "set all to cards in the stock and cards in the discard pile and cards in the columns"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const both = core.mergeLists([this.stock, this.discardPile], List)")
    expect(code).toMatch(
      /const all = core\.mergeLists\(\[\s*this\.stock,\s*this\.discardPile,\s*core\.mergeLists\(core\.everyThing\(Column\)\)\s*\], List\)/
    )
  })

  test("items and one item:  that one joins them", () => {
    const { code, errors } = compiled(["set more to cards in the discard pile and the last card of the stock"])
    expect(errors).toEqual([])
    expect(code).toContain("const more = core.mergeLists([this.discardPile, [this.stock.lastItem]], List)")
  })

  test("named things stay things:  two piles;  two cards", () => {
    const { code, errors } = compiled([
      "set piles to the stock and the discard pile",
      "set cards to the last card of the stock and the first card of the stock"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const piles = [this.stock, this.discardPile]")
    expect(code).toContain("const cards = [this.stock.lastItem, this.stock.firstItem]")
  })

  test("a named list beside items:  refused, saying how", () => {
    const { errors } = compiled(["set mixed to the stock and cards in the discard pile"])
    expect(errors).toEqual([
      '"the stock" is one thing and "cards in the discard pile" are cards, so "and" can\'t join them into one list:  for its cards, say "cards in the stock"'
    ])
  })

  test("a loop over them:  each card of both", () => {
    const { code, errors } = compiled([
      "for each card in cards in the stock and cards in the discard pile",
      "\tplay the card"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.mergeLists([this.stock, this.discardPile], List)")
  })

  test("runs:  one flat list", () => {
    const run = runSpell([
      "a card is a thing",
      '\tits "rank" is a number',
      "a pile is a list of cards",
      "the west is a new pile",
      "the east is a new pile",
      "add a new card with rank 1 to the west",
      "add a new card with rank 2 to the east",
      "add a new card with rank 3 to the east",
      "set all to cards in the west and cards in the east and the first card of the west",
      "set ranks to the rank of each card in all"
    ])
    expect([...(run("ranks").ranks as number[])]).toEqual([1, 2, 3, 1])
  })

  test("Spanish:  `y`", () => {
    const { code, errors } = compiledEs(["poner c a las cartas en la reserva y las cartas en el descarte"])
    expect(errors).toEqual([])
    expect(code).toContain("const c = core.mergeLists([this.reserva, this.descarte], List)")
    expect(compiledEs(["poner d a la reserva y las cartas en el descarte"]).errors).toEqual([
      '"la reserva" es una cosa y "las cartas en el descarte" son cartas, así que "y" no puede unirlos en una lista:  para sus cartas, di "cartas en la reserva"'
    ])
  })
})

describe("only `of each`:  `in every` is one list", () => {
  test("Spanish's `en cada pila` is every pile:  the first that passes", () => {
    const { code, errors } = compiledEs(["poner p a la primera pila en cada pila donde su rango es 1"])
    expect(errors).toEqual([])
    expect(code).not.toContain("pickFromEach")
  })
})
