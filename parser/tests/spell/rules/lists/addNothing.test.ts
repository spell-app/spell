import { describe, expect, test } from "vite-plus/test"

import { runSpellFiles } from "spell/parser/spell/test"

/**
 * Adding nothing to a list adds nothing, and a loop skips an empty item (epic `language` T153).
 * - Found by Solitaire:  turning over the next card with the stock and the discard pile both empty
 *   put nothing on the discard pile, and the next `auto play` threw on it.
 */

describe("adding nothing to a list adds nothing", () => {
  test("turning over the next card of an empty stock leaves the discard pile as it was", () => {
    const run = runSpellFiles([
      {
        path: "/Test.spell",
        contents: [
          "a card is a thing",
          '\tits "rank" is a number',
          "a pile is a list of cards",
          "the stock is a new pile",
          "the discards is a new pile",
          "set the next card to the last card of the stock",
          "add the next card to the discards",
          "add the next card to the front of the discards",
          "set moved to move the next card to the discards",
          "set count to the number of cards in the discards",
          "set ranks to 0",
          "for each card in the discards",
          "\tadd 1 to ranks"
        ].join("\n")
      }
    ])
    expect(run("count, moved, ranks")).toEqual({ count: 0, moved: false, ranks: 0 })
  })

  test("Spanish:  `agregar la siguiente carta al descarte`", () => {
    const run = runSpellFiles([
      {
        path: "/Prueba.es.spell",
        contents: [
          "una carta es una cosa",
          '\tsu "rango" es un número',
          "una pila es una lista de cartas",
          "la reserva es una nueva pila",
          "el descarte es una nueva pila",
          "poner la siguiente carta a la última carta de la reserva",
          "agregar la siguiente carta al descarte",
          "agregar la siguiente carta al principio del descarte",
          "poner movida a mover la siguiente carta al descarte",
          "poner cuenta al número de cartas en el descarte"
        ].join("\n")
      }
    ])
    expect(run("cuenta, movida")).toEqual({ cuenta: 0, movida: false })
  })
})
