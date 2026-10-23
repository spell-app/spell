import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { parseSpellProject } from "spell-parser/spell/test"
import { Translator } from "spell-parser/spell/translate/Translator"
import { TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import type { NamesData } from "spell-parser/spell/translate/translate.types"

/**
 * The translator (epic `spanish` P24):  a project written in English, written again in Spanish, rule by rule.
 * - Each case:  the English, the Spanish it writes, and that Spanish read back by Spanish's parser:
 *   no errors, and the same compiled javascript SHAPE as the English (`shapeOf()`:  names and texts left out,
 *   as they're the dictionary's words).
 * - On a small card game, in the outline style, written inline:  a lower repo's tests never read spell-app's examples.
 */

const ENGLISH = SP.Language.for("en")!
const SPANISH = SP.Language.for("es")!

/** The game's names in Spanish:  what `<Project>.es.names.json5` holds. */
const NAMES: NamesData = {
  types: { card: { name: "carta", gender: "feminine" }, deck: { name: "mazo", gender: "masculine" } },
  names: {
    rank: "rango",
    suit: "palo",
    ace: "as",
    king: "rey",
    hearts: "corazones",
    spades: "espadas",
    up: "arriba",
    down: "abajo",
    direction: "dirección",
    pile: "pila",
    count: "cuenta"
  },
  phrases: {
    "is a (rank)": "es un (rango)",
    "is face (direction)": "está boca (dirección)",
    "turn it over": "voltear eso",
    "card setup": "la preparación de la carta"
  },
  texts: { "ace of hearts": "as de corazones" },
  comments: { "a playing card": "una carta de la baraja" }
}

/** The game, in English:  the rules each line uses are in its comment. */
const CARD = `// a playing card
a "card" is a thing where:
	- its "rank" is one of ace, 2 ... 10 or king
	- it "is a (rank)"
	- its "suit" is one of hearts or spades
	- its "direction" is up or down
	- it "is face (direction)"
	- its "name" is its rank + " of " + its suit
	- to turn it over:
		if it is face up:
			set its direction to down
		otherwise:
			set its direction to up

a "deck" is a list of cards

to test card setup
	get a new card whose rank is ace, suit is hearts and direction is up
	its name should be "ace of hearts"
	it is an ace should be yes
	it is not a king should be yes
	turn it over
	it is face down should be yes
	set the pile to a new deck
	add it to the pile
	the number of cards in the pile should be 1
	the first card of the pile is an ace should be yes
	count = 0
	for each card in the pile
		set count to count + 1
	count should be 1
	the pile is empty should be no
	pause for 10 msec
	print "ace of hearts"
`

/** What the translator writes for `CARD`, line by line. */
const CARTA = `// una carta de la baraja
una "carta" es una cosa donde:
	- su "rango" es uno de as, 2 ... 10 o rey
	- "es un (rango)"
	- su "palo" es uno de corazones o espadas
	- su "dirección" es arriba o abajo
	- "está boca (dirección)"
	- su "nombre" es su rango + " of " + su palo  // TODO: translate (texts " of ")
	- para voltearla:
		si está boca arriba:
			poner su dirección a abajo
		de lo contrario:
			poner su dirección a arriba

un "mazo" es una lista de cartas

para probar la preparación de la carta
	obtener una nueva carta cuyo rango es as, palo es corazones y dirección es arriba
	su nombre debería ser "as de corazones"
	es un as debería ser sí
	no es un rey debería ser sí
	voltear eso
	está boca abajo debería ser sí
	poner la pila a un nuevo mazo
	agregar eso a la pila
	el número de cartas en la pila debería ser 1
	la primera carta de la pila es un as debería ser sí
	cuenta = 0
	para cada carta en la pila
		poner cuenta a cuenta + 1
	cuenta debería ser 1
	la pila es vacío debería ser no
	pausar 10 mseg
	imprimir "as de corazones"
`

describe("Translator:  English to Spanish, rule by rule", () => {
  test("writes each line with the same rule's Spanish, its names from the dictionary", () => {
    expect(translated(CARD).lines.join("\n")).toBe(CARTA)
  })

  test("the Spanish reads back, with no errors, as the same program:  the same compiled shape", () => {
    const english = parseSpellProject([{ path: "/Card.spell", contents: CARD }]).files[0]!
    const spanish = parseSpellProject([{ path: "/Carta.es.spell", contents: CARTA }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.warnings).toEqual([])
    expect(shapeOf(spanish.compiled)).toBe(shapeOf(english.compiled))
  })

  test("one line out for each line in", () => {
    expect(translated(CARD).lines).toHaveLength(CARD.split("\n").length)
  })

  test("a name the dictionary lacks:  kept as written, the line marked TODO, the name noted", () => {
    const { names, file } = translatedWith({ ...NAMES, names: { ...NAMES.names, pile: "" } }, CARD)
    const at = CARD.split("\n").indexOf("\tset the pile to a new deck")
    expect(file.lines[at]).toBe('\tponer el pile a un nuevo mazo  // TODO: translate (names "pile")')
    expect(file.todo.get(at)).toEqual(['names "pile"'])
    expect(file.missing.get(at)).toEqual([{ kind: "names", words: "pile" }])
    expect(names.markTodo(file.missing.get(at)!)).toBe(1)
    expect(names.data.names.pile).toBe(TranslationNames.TODO)
  })

  test("a comment the dictionary lacks stays as it was, and is no TODO", () => {
    const file = translatedWith({ ...NAMES, comments: {} }, CARD).file
    expect(file.lines[0]).toBe("// a playing card")
    expect(file.todo.has(0)).toBe(false)
    expect(file.missing.get(0)).toEqual([{ kind: "comments", words: "a playing card" }])
  })
})

describe("TranslationNames", () => {
  const names = new TranslationNames(NAMES, { from: ENGLISH, to: SPANISH })

  test("a plural from its singular, by the other language's rules", () => {
    expect(names.type("cards")).toEqual({ name: "cartas", gender: "feminine" })
    expect(names.name("ranks")).toBe("rangos")
  })

  test("a singular from its plural:  a value kind's one value", () => {
    expect(names.name("heart")).toBe("corazón")
  })

  test("a kind's values, by the language's propertyKindName", () => {
    expect(names.type("card ranks")).toEqual({ name: "rangos de carta" })
    expect(names.type("card rank")).toEqual({ name: "rango de carta" })
  })

  test("a built-in type is the pack's own word", () => {
    expect(names.type("text")).toEqual({ name: "texto" })
    expect(names.type("drawable thing")).toEqual({ name: "cosa dibujable" })
  })

  test("a word with no letters is itself;  a missing one is noted", () => {
    expect(names.name("2")).toBe("2")
    expect(names.name("joker")).toBeUndefined()
    expect(names.takeMissing()).toEqual([{ kind: "names", words: "joker" }])
  })
})

////////////////
// ## Helpers
////////////////

/** `source`, translated with `NAMES`. */
function translated(source: string) {
  return translatedWith(NAMES, source).file
}

/** `source` (one English file), translated with `data`:  the file, and the dictionary after. */
function translatedWith(data: NamesData, source: string) {
  const { files } = parseSpellProject([{ path: "/Card.spell", contents: source }])
  const names = new TranslationNames(data, { from: ENGLISH, to: SPANISH })
  const translator = new Translator({ from: ENGLISH, to: SPANISH, names })
  const file = translator.translateFile({ path: "/Card.spell", contents: source, match: files[0]!.match })
  return { names, file, translator }
}

/**
 * `js`'s shape:  its names and texts each one placeholder, its comments out --
 * so two programs which differ only in their names' language compare equal.
 */
function shapeOf(js: string): string {
  return js
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
    .replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "TEXT")
    .replace(/[\p{L}_$][\p{L}\p{N}_$]*/gu, "NAME")
    .replace(/\s+/g, " ")
    .trim()
}
