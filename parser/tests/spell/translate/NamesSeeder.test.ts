import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import { parseSpellProject } from "spell-lang/spell/test"
import { NamesSeeder } from "spell-lang/spell/translate/NamesSeeder"
import { TranslationNames } from "spell-lang/spell/translate/TranslationNames"

/**
 * Seeding a names dictionary from a translation a person made (epic `spanish` P24):  `--seed`.
 * - A small game and its Spanish, inline;  the Spanish has a comment line the English doesn't, which only skips itself.
 */

const CARD = `// a playing card
a "card" is a thing where:
	- its "rank" is one of ace or king
	- it "is a (rank)"
	- to turn it over:
		print "over"

to test card setup
	get a new card whose rank is ace
	it is an ace should be yes
	turn it over
`

const CARTA = `// una carta de la baraja
una "carta" es una cosa donde:
	// su rango
	- su "rango" es uno de as o rey
	- "es un (rango)"
	- para voltearla:
		imprimir "volteada"

para probar la preparación de la carta
	obtener una nueva carta cuyo rango es as
	es un as debería ser sí
	voltear eso
`

describe("NamesSeeder", () => {
  const english = parseSpellProject([{ path: "/Card.spell", contents: CARD }]).files[0]!
  const spanish = parseSpellProject([{ path: "/Carta.es.spell", contents: CARTA }]).files[0]!
  const names = new TranslationNames({ names: { king: "rey mago" } }, { from: SP.english, to: SP.spanish })
  const added = new NamesSeeder(names).seed(
    [{ path: "/Card.spell", contents: CARD, match: english.match }],
    [{ path: "/Carta.es.spell", contents: CARTA, match: spanish.match }]
  )

  test("a type, with its gender from its declaration's article", () => {
    expect(names.data.types.card).toEqual({ name: "carta", gender: "feminine" })
  })

  test("properties and values, slot by slot", () => {
    expect(names.data.names).toMatchObject({ rank: "rango", ace: "as" })
  })

  test("a name already chosen stays", () => {
    expect(names.data.names.king).toBe("rey mago")
  })

  test("phrases as declared:  a verb with `it` fused on written apart, to fuse again per type", () => {
    expect(names.data.phrases).toEqual({
      "is a (rank)": "es un (rango)",
      "turn it over": "voltear eso",
      "card setup": "la preparación de la carta"
    })
  })

  test("texts and comments, lined up past a line only one side has", () => {
    expect(names.data.texts).toEqual({ over: "volteada" })
    expect(names.data.comments).toEqual({ "a playing card": "una carta de la baraja" })
    expect(added).toBeGreaterThan(5)
  })
})
