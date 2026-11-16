import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** The parse errors of `spell`, one file in `path`'s language. */
function errorsOf(spell: string, path = "/Test.spell"): string[] {
  const { files } = parseSpellProject([{ path, contents: spell }])
  return files.flatMap((file) => file.errors)
}

/** A game whose action adds `{thing}` to its discard pile, a pile of cards. */
const GAME = `a "card" is a thing
	its "rank" is a number
a "pile" is a list of cards
solitaire is an app
	"stock" is a new pile
	"discard pile" is a new pile
	to "turn over the next card"
		{line}
`

describe("putting what a list can't hold in it (epic `language` I106, Q67)", () => {
  test("`it` is the solitaire in its own action:  says so, what the pile holds, and the fix", () => {
    const errors = errorsOf(GAME.replace("{line}", "add it to the discard pile"))
    expect(errors.join("\n")).toContain(
      'it is solitaire here, which isn\'t a card, and the discard pile holds cards:  say which card, or "get" it first'
    )
  })

  test("a thing named, not `it`:  says what it is", () => {
    const errors = errorsOf(GAME.replace("{line}", "move the stock to the discard pile"))
    expect(errors.join("\n")).toContain(`"the stock" is a pile, which isn't a card:  the discard pile holds cards`)
  })

  test("every verb that puts a thing in a list:  add, append, prepend, add before, move", () => {
    for (const line of [
      "append it to the discard pile",
      "prepend it to the discard pile",
      "add it to the discard pile before the top card of the stock",
      "move it to the discard pile"
    ]) {
      expect(errorsOf(GAME.replace("{line}", line)).join("\n"), line).toContain("it is solitaire here")
    }
  })

  test("a card is fine", () => {
    for (const line of [
      "add the top card of the stock to the discard pile",
      "get the top card of the stock\n\t\tadd it to the discard pile",
      "add each card in the stock to the discard pile",
      "add 10 to the rank of the top card of the stock"
    ]) {
      expect(errorsOf(GAME.replace("{line}", line)), line).toEqual([])
    }
  })

  test("in Spanish, in Spanish", () => {
    const juego = `una "carta" es una cosa
una "pila" es una lista de cartas
solitario es una aplicación
	"descartes" es una nueva pila
	para "dar vuelta la siguiente carta"
		agregar eso a los descartes
`
    expect(errorsOf(juego, "/Juego.es.spell").join("\n")).toContain(
      'eso es solitario aquí, que no es una carta, y los descartes guarda cartas:  di qué carta, u "obtener" eso antes'
    )
  })
})
