import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * `and` / `or` between values (epic `language` T146):  `or` the first that's there, `and` both, in a list;
 * a line of its own starting with `or` an alternative;  `where it can play the card` asking an action.
 */

/** The English project the lines run in:  cards, piles of them, and a game holding some. */
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
	to "shuffle and deal"
		return
	to "probe"
`

/** The same, in Spanish. */
const SPANISH = `una carta es una cosa
	su "rango" es un número
	para "jugarla"
		devolver sí
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

describe("`and` / `or` between values (epic `language` T146)", () => {
  test("1. two questions:  both true, as always", () => {
    const { code, errors } = compiled(["set done to the stock is empty and the discard pile is empty"])
    expect(errors).toEqual([])
    expect(code).toContain("const done = this.stock.isEmpty && this.discardPile.isEmpty")
  })

  test("2. two things:  both, in a list;  three, one list", () => {
    const { code, errors } = compiled([
      "set both to the stock and the discard pile",
      "set all to the stock and the discard pile and the stock"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const both = [this.stock, this.discardPile]")
    expect(code).toMatch(/const all = \[\s*this\.stock,\s*this\.discardPile,\s*this\.stock\s*\]/)
  })

  test("2. a loop's item word says which:  the piles' cards, or the piles", () => {
    const { code, errors } = compiled([
      "for each card in the stock and the discard pile",
      "\tplay the card",
      "for each pile in the stock and the discard pile",
      "\tprint the pile"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("core.map(core.mergeLists([this.stock, this.discardPile]), (card) =>")
    expect(code).toMatch(
      /\[this\.stock, this\.discardPile\]\.forEach\(\(pile\) =>|core\.map\(\[this\.stock, this\.discardPile\], \(pile\) =>/
    )
  })

  test("3. in a `where`, `and` joins conditions:  a thing there is refused", () => {
    const { errors } = compiled(["set x to cards in the columns where it is face up and the discard pile"])
    expect(errors).toEqual([
      'In a "where", "and" joins conditions, and "the discard pile" isn\'t one:  to put it with what the "where" finds, put the list and its "where" in parentheses, "(... where ...) and the discard pile"'
    ])
  })

  test("4. `and` and `or` between values, no parentheses:  refused;  with them, read", () => {
    expect(compiled(["set x to the stock or the discard pile and the stock"]).errors).toEqual([
      '"and" and "or" between values:  say which goes first with parentheses, "(A or B) and C" or "A or (B and C)"'
    ])
    const { code, errors } = compiled(["set x to (the stock or the discard pile) and the stock"])
    expect(errors).toEqual([])
    expect(code).toContain("const x = [(this.stock || this.discardPile), this.stock]")
  })

  test("5. a name with `and` in it is still that name", () => {
    const { code, errors } = compiled(["shuffle and deal"])
    expect(errors).toEqual([])
    expect(code).toContain("this.shuffleAndDeal()")
  })

  test("6. two kinds, or a question and a thing:  refused", () => {
    expect(compiled(["set x to the stock and 3"]).errors).toEqual([
      '"the stock" and "3" aren\'t the same kind of thing, so "and" can\'t join them'
    ])
    expect(compiled(["set x to the stock is empty or the first card of the stock"]).errors).toEqual([
      '"the stock is empty" is a question and "the first card of the stock" isn\'t, so "or" can\'t join them:  join two questions, or two values of one kind'
    ])
    expect(compiled(["if the stock is empty and red", "\treturn"]).errors).toEqual([
      '"and red" asks nothing:  say what is red, e.g. "and it is red"'
    ])
  })

  test("7. two cards with `and`:  both cards, never one dropped", () => {
    const { code, errors } = compiled(["set x to the last card of the stock and the first card of the stock"])
    expect(errors).toEqual([])
    expect(code).toContain("const x = [this.stock.lastItem, this.stock.firstItem]")
  })

  test("`or`:  the first that's there, a thing of its kind", () => {
    const { code, errors } = compiled([
      "set x to the last card of the discard pile or the first card of the stock",
      "if x is face up",
      "\treturn"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const x = this.discardPile.lastItem || this.stock.firstItem")
    expect(code).toContain('if (x.isFaceDirection("up")) return')
  })

  test("in a condition, a value is a test of whether it's there, as always", () => {
    const { code, errors } = compiled(["if the stock and the discard pile", "\treturn"])
    expect(errors).toEqual([])
    expect(code).toContain("if (this.stock && this.discardPile) return")
  })

  test("Spanish:  `y`, `o`", () => {
    const { code, errors } = compiledEs([
      "poner las dos a la reserva y el descarte",
      "poner una a la última carta de la reserva o la primera carta de la reserva"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("const dos = [this.reserva, this.descarte]")
    expect(code).toContain("const una = this.reserva.lastItem || this.reserva.firstItem")
    expect(compiledEs(["poner x a la reserva y 3"]).errors).toEqual([
      '"la reserva" y "3" no son el mismo tipo de cosa, así que "y" no puede unirlos'
    ])
  })
})

describe("a line starting with `or`:  one alternative (epic `language` T146)", () => {
  test("each line's `where` its own", () => {
    const { code, errors } = compiled([
      "set card to the last card in the discard pile",
      "\tor a random card in the columns where it is face down",
      "\tor the first card in the columns where it is face up and can play the card"
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      'const card = this.discardPile.lastItem || core.randomItemOf(core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("down"))) || core.itemWhere(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("up") && card.play(), 0)'
    )
  })

  test("the first line's `where` ends with its line", () => {
    const { code, errors } = compiled([
      "set card to the last card in the discard pile where it is face up",
      "\tor the first card of the stock"
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      'const card = this.discardPile.filter((card) => card.isFaceDirection("up")).lastItem || this.stock.firstItem'
    )
  })

  test("a condition over lines reads as it did", () => {
    const { code, errors } = compiled([
      "if the stock is empty and",
      "\tthe discard pile is empty",
      "\tor the game is the game",
      "\t\treturn"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("if ((this.stock.isEmpty && this.discardPile.isEmpty) || this === this) return")
  })
})

describe("`where it can play the card`:  an action asked of each item (epic `language` T146)", () => {
  test("compiles to the action's call, and `the first` stops at the first yes", () => {
    const { code, errors } = compiled(["set x to the first card in the columns where it can play the card"])
    expect(errors).toEqual([])
    expect(code).toContain(
      "const x = core.itemWhere(core.mergeLists(core.everyThing(Column)), (card) => card.play(), 0)"
    )
  })

  test("run:  only the cards up to the first yes are asked", () => {
    const run = runSpell([
      "a card is a thing",
      '\tits "name" is text',
      '\tits "asked" is a number',
      '\tto "play it"',
      "\t\tset its asked to 1",
      '\t\treturn its name is "b"',
      "a pile is a list of cards",
      "the pile is a new pile",
      'add a new card with name "a" to the pile',
      'add a new card with name "b" to the pile',
      'add a new card with name "c" to the pile',
      "set found to the first card in the pile where it can play the card",
      "set name to the name of found",
      "set asked to the number of cards in the pile where its asked is 1"
    ])
    expect(run("name, asked")).toEqual({ name: "b", asked: 2 })
  })

  test("Spanish:  `donde puede jugarla`", () => {
    const { code, errors } = compiledEs(["poner x a la primera carta en las columnas donde puede jugar la carta"])
    expect(errors).toEqual([])
    expect(code).toContain(
      "const x = core.itemWhere(core.mergeLists(core.everyThing(Columna)), (carta) => carta.jugar(), 0)"
    )
  })
})
