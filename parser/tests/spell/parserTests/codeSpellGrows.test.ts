import { describe, test, expect } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { parseSpellProject, runSpellFiles } from "spell-parser/spell/test"

/**
 * What code spell learned so it can say all spellx can (epic `elemental-spell` P5):  each spellx tag has a twin line.
 * - aliases indented under their property (Q13)
 * - a worked-out value from a list of its own:  `- its "color" is one of red, black:` + its value lines (o1's color)
 * - parts:  `- it has parts "front" and "back"`, `- to draw its front:`, `draw its front` (Q55, Q56;  J6)
 * - a markup line in a drawing IS the drawing, no `return` (Q14)
 * - the two sided view's own words, its parts and its drawing (J8)
 * - each in English and Spanish
 */
describe("aliases under their property (Q13)", () => {
  test("compile as the same lines written after it", () => {
    const nested = [
      'a "card" is a view where:',
      '\t- its "suit" is one of clubs, diamonds, hearts, spades',
      '\t\t- it "is a (suit)"',
      '\t- its "rank" is one of ace, 2 ... 10, jack, queen, king',
      '\t\t- it "is a (rank)"',
      '\t\t- it "is a face card" if its rank is jack, queen or king',
      "\t\t- it must not be empty"
    ]
    const flat = [
      'a "card" is a view where:',
      '\t- its "suit" is one of clubs, diamonds, hearts, spades',
      '\t- it "is a (suit)"',
      '\t- its "rank" is one of ace, 2 ... 10, jack, queen, king',
      "\t\t- it must not be empty",
      '\t- it "is a (rank)"',
      '\t- it "is a face card" if its rank is jack, queen or king'
    ]
    expect(compile(nested)).toBe(compile(flat))
    expect(compile(nested)).toContain("isAFaceCard()")
  })

  test("any other line under a property warns, and still compiles", () => {
    const { files } = parseSpellProject([
      {
        path: "/test.spell",
        contents: [
          'a "card" is a view where:',
          '\t- its "rank" is a number',
          "\t\t- to show it:",
          "\t\t\tprint 1"
        ].join("\n")
      }
    ])
    const [file] = files
    expect(file!.errors).toEqual([])
    expect(SP.SpellWarnings.in(file!.match!).map(({ message }) => message)).toContain(
      "Only a property's rules and aliases go under it:  this line still works, but write it after the property, not under it"
    )
    expect(file!.compiled).toContain("show() {")
  })
})

describe("a worked-out value from a list of its own", () => {
  const card = [
    'a "card" is a view where:',
    '\t- its "suit" is one of clubs, diamonds, hearts, spades',
    '\t\t- it "is a (suit)"',
    '\t- its "color" is one of red, black:',
    "\t\tred if it is a diamond or it is a heart",
    "\t\tblack otherwise",
    '\t\t- it "is (color)"',
    '\t\t- it "is a (color) card"'
  ]

  test("its list, its getter, then its aliases", () => {
    const compiled = compile(card)
    expect(compiled).toContain('static Colors = ["red", "black"]')
    expect(compiled).toMatch(
      /get color\(\) \{\n\s+if \(this\.isASuit\("diamonds"\) \|\| this\.isASuit\("hearts"\)\) return "red"\n\s+return "black"/
    )
    expect(compiled).toContain("isAColorCard(color) {")
    // its list declares its constants:  `red` reads as the value
    const run = runSpell([...card, 'set c to a new card with suit = "hearts"', "set red_one to c is red"])
    expect(run("red_one")).toEqual({ red_one: true })
  })

  test("the sentence style says the same (Q20)", () => {
    const sentences = [
      'a "card" is a view where:',
      '\t- its "suit" is one of clubs, diamonds, hearts, spades',
      '\t\t- it "is a (suit)"',
      "the color of a card is one of red, black:",
      "\tred if it is a diamond or it is a heart",
      "\tblack otherwise"
    ]
    expect(compile(sentences)).toContain('static Colors = ["red", "black"]')
    expect(compile(sentences)).toContain("get color() {")
  })

  test("in Spanish", () => {
    const compiled = compile(
      [
        'una "carta" es una vista donde:',
        '\t- su "palo" es uno de tréboles, diamantes, corazones, espadas',
        '\t\t- "es un (palo)"',
        '\t- su "color" es uno de rojo, negro:',
        "\t\trojo si es un diamante o es un corazón",
        "\t\tnegro de lo contrario",
        '\t\t- "es (color)"'
      ],
      "/test.es.spell"
    )
    expect(compiled).toContain('static Colores = ["rojo", "negro"]')
    expect(compiled).toContain("esColor(color) {")
  })
})

describe("parts (Q55, Q56)", () => {
  test("declared, drawn and placed;  each part's markup carries its name as a CSS part (J6)", () => {
    const compiled = compile([
      'a "box" is a view where:',
      '\t- it has parts "lid" and "base"',
      "\t- to draw it:",
      '\t\t<div class="box">{draw its lid}</div>',
      '\t- to "draw its lid": <b part="top">lid</b>',
      "\t- to draw its base:",
      "\t\t<i>base</i>"
    ])
    expect(compiled).toContain('static parts = ["lid", "base"]')
    expect(compiled).toContain('return h("div", { class: "box" }, () => this.drawLid())')
    expect(compiled).toContain('return h("b", { part: "top lid" }, "lid")')
    expect(compiled).toContain('return h("i", { part: "base" }, "base")')
  })

  test("`has parts` in the sentence style, and with the subject left out", () => {
    for (const line of ['a box has parts "lid", "side" and "base"', '\t- has parts "lid", "side" and "base"']) {
      const lines = line.startsWith("\t") ? ['a "box" is a view where:', line] : ['a "box" is a view', line]
      expect(compile(lines).replace(/\s+/g, " ")).toContain('static parts = [ "lid", "side", "base" ]')
    }
  })

  test("`draw its <property>` is still drawing a property's thing", () => {
    const compiled = compile([
      'a "card" is a view',
      'a "spot" is a view where:',
      '\t- its "card" is a card',
      "\t- to draw it:",
      "\t\treturn <div>{draw its card}</div>"
    ])
    expect(compiled).toContain("core.drawThing(this.card)")
  })
})

describe("a markup line in a drawing IS the drawing (Q14)", () => {
  test("spell lines around it decide which;  `return` still works", () => {
    const compiled = compile([
      'a "card" is a view where:',
      '\t- its "direction" is up or down',
      '\t- it "is face (direction)"',
      "\t- to draw it:",
      "\t\t// face up shows its face",
      "\t\tif it is face up",
      '\t\t\t<ui-text part="face">up</ui-text>',
      "\t\totherwise",
      "\t\t\treturn <ui-text>down</ui-text>",
      'a "pile" is a viewable list of cards where:',
      "\t- to draw each item:",
      '\t\t<div class="spot">{draw the card}</div>'
    ])
    expect(compiled).toMatch(
      /if \(this\.isFaceDirection\("up"\)\) return h\("ui-text", \{ part: "face" \}, "up"\)\n\s+else return h\("ui-text", "down"\)/
    )
    expect(compiled).toContain('return h("div", { class: "spot" }, () => core.drawThing(item))')
  })

  test("outside a drawing, a markup line isn't understood", () => {
    const { files } = parseSpellProject([
      { path: "/test.spell", contents: ["to show it:", "\t<div>hi</div>"].join("\n") }
    ])
    expect(files[0]!.errors.length).toBe(1)
  })
})

describe("a two sided view (J8)", () => {
  const card = [
    'a "card" is a two sided view where:',
    '\t- its "rank" is a number',
    "\t- to draw its front:",
    "\t\t<ui-text>{its rank}</ui-text>",
    "\t- to draw its back:",
    '\t\t<ui-image source="back.svg" />'
  ]

  test("gives its own words, its parts and a drawing that picks its front or its back", () => {
    const compiled = compile(card)
    expect(compiled).toContain("export class Card extends TwoSidedView {")
    expect(compiled).toContain('static parts = ["front", "back"]')
    expect(compiled).toMatch(
      /draw\(\) \{\n\s+if \(this\.isFaceDirection\("down"\)\) return this\.drawBack\(\)\n\s+else return this\.drawFront\(\)/
    )
    const run = runSpell([
      ...card,
      "set c to a new card",
      "set was_up to c is face up",
      "turn c over",
      "set now_down to c is face down",
      "turn c over",
      "set back_up to c is face up"
    ])
    // a new one is face up:  its direction starts as the first of its list
    expect(run("was_up, now_down, back_up")).toEqual({ was_up: true, now_down: true, back_up: true })
  })

  test("in Spanish, in its own words", () => {
    const compiled = compile(
      [
        'una "carta" es una vista reversible donde:',
        "\t- para dibujar su frente:",
        "\t\t<es-texto>hola</es-texto>",
        '\t- para "dibujar su dorso": <es-imagen source="dorso.svg" />'
      ],
      "/test.es.spell"
    )
    expect(compiled).toContain('static parts = ["frente", "dorso"]')
    expect(compiled).toContain("voltear() {")
    expect(compiled).toMatch(/return this\.drawDorso\(\)\n\s+else return this\.drawFrente\(\)/)
  })

  test("its actions are known ahead, as any type's:  a file before the card's turns it over", () => {
    const { files } = parseSpellProject([
      { path: "/Game.spell", contents: ["to flip (a card):", "\tturn the card over"].join("\n") },
      { path: "/Card.spell", contents: card.join("\n") }
    ])
    expect(files.flatMap((file) => file.errors)).toEqual([])
    expect(files[0]!.compiled).toContain("this.turnOver()")
  })

  test("its lines parse, in every language", () => {
    for (const language of SP.Language.all.values()) {
      const prelude = language.words.templatePreludes?.["two sided view"]
      if (!prelude) continue
      const path = language.lang === "en" ? "/test.spell" : `/test.${language.lang}.spell`
      const declare = language.lang === "en" ? 'a "card" is a view where:' : 'una "carta" es una vista donde:'
      const body = prelude.split("\n").map((line) => `\t${line}`)
      const { files } = parseSpellProject([{ path, contents: [declare, ...body].join("\n") }])
      expect(files[0]!.errors, language.lang).toEqual([])
    }
  })
})

/** Compiled `lines`, as one file of its own project, without comments, its declarations or blank lines. */
function compile(lines: string[], path = "/test.spell"): string {
  const { files } = parseSpellProject([{ path, contents: lines.join("\n") }])
  const [file] = files
  if (file!.errors.length) throw new Error(`parse errors:\n${JSON.stringify(file!.errors, null, 2)}`)
  return file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
}

/** `lines` run as one file:  ask it for its variables by name. */
function runSpell(lines: string[]) {
  return runSpellFiles([{ path: "/Test.spell", contents: lines.join("\n") }])
}
