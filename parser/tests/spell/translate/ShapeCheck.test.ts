import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell-parser/spell/test"
import { ShapeCheck, shapeOf } from "spell-parser/spell/translate/ShapeCheck"
import type { SourceFile } from "spell-parser/spell/translate/translate.types"

/**
 * The shape check (epic `spanish` P26):  each translated line against its source line, compiled, names and texts aside.
 * - A small card game in English and its Spanish, written inline:  a lower repo's tests never read spell-app's examples.
 */

const CARD = `a "card" is a thing where:
	- its "rank" is one of ace, 2 ... 10 or king
	- its "direction" is up or down
	- it "is face (direction)"
	- its "name" is its rank + " of hearts"
	- to turn it over:
		if it is face up:
			set its direction to down
		otherwise:
			set its direction to up
`

const CARTA = `una "carta" es una cosa donde:
	- su "rango" es uno de as, 2 ... 10 o rey
	- su "dirección" es arriba o abajo
	- "está boca (dirección)"
	- su "nombre" es su rango + " de corazones"
	- para voltearla:
		si está boca arriba:
			poner su dirección a abajo
		de lo contrario:
			poner su dirección a arriba
`

describe("ShapeCheck:  the same program, line by line", () => {
  test("a faithful translation has the same shape on every line", () => {
    const check = new ShapeCheck()
    expect(compare(check, CARD, CARTA)).toEqual([])
    expect(check.statements).toBe(10)
  })

  test("a line that reads, but means something else, is caught and named:  the deepest line, not its `if`", () => {
    // `si no está boca arriba`:  Spanish reads it, lint is clean, but it's the opposite test
    const wrong = CARTA.replace("si está boca arriba:", "si no está boca arriba:")
    const mismatches = compare(new ShapeCheck(), CARD, wrong)
    expect(mismatches.map(({ path, line }) => ({ path, line }))).toEqual([{ path: "/Carta.es.spell", line: 6 }])
    expect(mismatches[0]!.translated).not.toBe(mismatches[0]!.english)
    // where their javascript differs, for the fix-up
    expect(mismatches[0]!.difference.english).toContain("if (")
    expect(mismatches[0]!.difference.translated).toContain("!")
  })

  test("a wrong line in a body is blamed on that line, not on the statement around it", () => {
    const wrong = CARTA.replace("poner su dirección a abajo", "poner su dirección a abajo + 1")
    expect(compare(new ShapeCheck(), CARD, wrong).map(({ line }) => line)).toEqual([7])
  })

  test("`shapeOf()`:  names, texts and comments aside;  a template text is one text", () => {
    expect(shapeOf('card.rank + " of " + card.suit // a name')).toBe(shapeOf('carta.rango + " de " + carta.palo'))
    expect(shapeOf("`${this.color} joker`")).toBe(shapeOf("`comodín ${this.color}`"))
    expect(shapeOf("a === b")).not.toBe(shapeOf("a !== b"))
  })
})

/** `english` and `spanish` (one file each), each parsed in its own project, compared. */
function compare(check: ShapeCheck, english: string, spanish: string) {
  const source = fileOf("/Card.spell", english)
  const translation = fileOf("/Carta.es.spell", spanish)
  return check.compare([source], [translation], new Map([["/Card.spell", "/Carta.es.spell"]]))
}

/** One file, parsed in a project of its own. */
function fileOf(path: string, contents: string): SourceFile {
  const { files } = parseSpellProject([{ path, contents }])
  return { path, contents, match: files[0]!.match }
}
