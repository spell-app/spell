import { describe, test, expect } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/**
 * What code spell learned so it can say all spellx can (epic `elemental-spell` P5):  each spellx tag has a twin line.
 * - aliases indented under their property (Q13)
 * - a worked-out value from a list of its own:  `- its "color" is one of red, black:` + its value lines (o1's color)
 * - slots:  `- it has slots "front" and "back"`, `- to draw its front:`, `draw its front` (Q55, Q56;  J6;  P27)
 * - a markup line in a drawing IS the drawing, no `return` (Q14)
 * - the two sided view's own words, its slots and its drawing (J8)
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

describe("slots (Q55, Q56;  P27)", () => {
  test("declared, drawn and placed;  each slot's markup carries its name as a CSS part (J6)", () => {
    const compiled = compile([
      'a "box" is a view where:',
      '\t- it has slots "lid" and "base"',
      "\t- to draw it:",
      '\t\t<div class="box">{draw its lid}</div>',
      '\t- to "draw its lid": <b part="top">lid</b>',
      "\t- to draw its base:",
      "\t\t<i>base</i>"
    ])
    expect(compiled).toContain('static slots = ["lid", "base"]')
    expect(compiled).toContain('return h("b", { part: "top lid" }, "lid")')
    expect(compiled).toContain('return h("i", { part: "base" }, "base")')
  })

  test("a slot placed is the web's own slot, holding its drawing:  what's put in it from outside replaces that", () => {
    const compiled = compile([
      'a "box" is a view where:',
      '\t- it has slots "lid" and "base"',
      "\t- to draw it:",
      '\t\t<div class="box">{draw its lid}</div>',
      "\t\tdraw its base",
      '\t- to "draw its lid": <b>lid</b>',
      '\t- to "draw its base": <i>base</i>'
    ])
    expect(compiled).toContain('h("div", { class: "box" }, h("slot", { name: "lid" }, () => this.drawLid()))')
    expect(compiled).toContain('h("slot", { name: "base" }, () => this.drawBase())')
  })

  test("`has slots` in the sentence style, and with the subject left out", () => {
    for (const line of ['a box has slots "lid", "side" and "base"', '\t- has slots "lid", "side" and "base"']) {
      const lines = line.startsWith("\t") ? ['a "box" is a view where:', line] : ['a "box" is a view', line]
      expect(compile(lines).replace(/\s+/g, " ")).toContain('static slots = [ "lid", "side", "base" ]')
    }
  })

  test("the old `has parts` still reads, as an error naming `slots` over just the word (its quick fix)", () => {
    for (const [path, lines, word, replacement] of [
      ["/test.spell", ['a "box" is a view where:', '\t- it has parts "lid" and "base"'], "parts", "slots"],
      [
        "/test.es.spell",
        ['una "caja" es una vista donde:', '\t- tiene las partes "tapa" y "base"'],
        "partes",
        "ranuras"
      ]
    ] as const) {
      const { files } = parseSpellProject([{ path, contents: lines.join("\n") }])
      const [file] = files
      const contents = lines.join("\n")
      const errors = SP.Block.getParseErrors(file!.match!) ?? []
      expect(errors.map((error) => contents.slice(error.start, error.end))).toEqual([word])
      expect(errors.map((error) => error.data.replacement)).toEqual([replacement])
      expect(file!.compiled).toContain(
        path.endsWith(".es.spell") ? 'static slots = ["tapa", "base"]' : 'static slots = ["lid", "base"]'
      )
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

  test("several drawn lines, a loop and an `if` draw all of them, in order, as one list (C28)", () => {
    const compiled = compile([
      'a "card" is a view',
      'a "board" is a view where:',
      '\t- its "cards" is a list of cards',
      '\t- its "title" is "Klondike"',
      "\t- to draw it:",
      "\t\t<ui-text>top</ui-text>",
      "\t\t<ui-text>bottom</ui-text>",
      "\t\tfor each card in its cards",
      "\t\t\t<ui-segment>{draw the card}</ui-segment>",
      '\t\tif its title is "Klondike"',
      "\t\t\t<ui-text>K</ui-text>",
      "\t\totherwise",
      "\t\t\t<ui-text>?</ui-text>"
    ])
    expect(compiled).toContain(
      [
        "    return [",
        '      h("ui-text", "top"),',
        '      h("ui-text", "bottom"),',
        '      core.map(this.cards, (card) => h("ui-segment", () => core.drawThing(card))),',
        '      this.title === "Klondike" ? h("ui-text", "K") : h("ui-text", "?")',
        "    ]"
      ].join("\n")
    )
  })

  test("a loop alone is the drawing, one per time round;  in an `if`, each branch returns its own (C28)", () => {
    const compiled = compile([
      'a "card" is a view',
      'a "pile" is a view where:',
      '\t- its "cards" is a list of cards',
      "\t- to draw it:",
      "\t\tfor each card in its cards",
      "\t\t\t<ui-text>{the card}</ui-text>",
      'a "stack" is a view where:',
      '\t- its "cards" is a list of cards',
      "\t- to draw it:",
      "\t\tif its cards is empty",
      "\t\t\t<ui-text>none</ui-text>",
      "\t\totherwise",
      "\t\t\t<ui-text>cards:</ui-text>",
      "\t\t\tfor each card in its cards",
      "\t\t\t\t<ui-text>{the card}</ui-text>"
    ])
    expect(compiled).toContain('return core.map(this.cards, (card) => h("ui-text", () => card))')
    expect(compiled).toMatch(
      /else \{\s+return \[\s+h\("ui-text", "cards:"\),\s+core\.map\(this\.cards, \(card\) => h\("ui-text", \(\) => card\)\)\s+\]/
    )
  })

  test("a line that draws nothing, after a drawn one, runs before the drawing;  an `if` that does more can't draw", () => {
    const compiled = compile([
      'a "board" is a view where:',
      '\t- its "moves" is 0',
      "\t- to draw it:",
      "\t\t<ui-text>top</ui-text>",
      "\t\tset its moves to 1",
      "\t\t<ui-text>bottom</ui-text>",
      "\t\tif its moves is 1",
      "\t\t\tset its moves to 2",
      "\t\t\t<ui-text>two</ui-text>"
    ])
    expect(compiled).toMatch(/this\.moves = 1\n\s+return \[/)
    expect(compiled).toContain("PARSE ERROR: an `if` among other drawn lines can only draw")
  })

  test("a drawing of several things draws all of them when it runs (C28)", () => {
    const run = runSpell([
      'a "board" is a view where:',
      '\t- its "names" is a list of texts',
      "\t- to draw it:",
      "\t\t<ui-text>top</ui-text>",
      "\t\tfor each name in its names",
      "\t\t\t<ui-text>{the name}</ui-text>",
      "the board is a new board",
      'add "a" to the names of the board',
      'add "b" to the names of the board'
    ])
    const { board } = run("board") as { board: { draw(): unknown } }
    const drawing = board.draw() as unknown[]
    expect(drawing).toHaveLength(2)
    expect(drawing[1]).toHaveLength(2)
  })

  test("in Spanish:  `para cada carta en sus cartas` (C28)", () => {
    const compiled = compile(
      [
        'una "carta" es una vista',
        'un "tablero" es una vista donde:',
        '\t- sus "cartas" son una lista de cartas',
        "\t- para dibujarlo:",
        "\t\t<ui-text>arriba</ui-text>",
        "\t\tpara cada carta en sus cartas",
        "\t\t\t<ui-text>{la carta}</ui-text>"
      ],
      "/test.es.spell"
    )
    expect(compiled).toContain('core.map(this.cartas, (carta) => h("ui-text", () => carta))')
    expect(compiled).toMatch(/return \[\s+h\("ui-text", "arriba"\),/)
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

  test("its words are the template's, compiled once in the core:  a card has just its own (Q71)", () => {
    const compiled = compile(card)
    expect(compiled).toContain("export class Card extends TwoSidedView {")
    expect(compiled).toContain("drawFront() {")
    expect(compiled).toContain("drawBack() {")
    // NOT copied in:  `TwoSidedView` holds them, once
    expect(compiled).not.toContain("static slots")
    expect(compiled).not.toContain("turnOver() {")
    expect(compiled).not.toMatch(/^\s+draw\(\) \{/m)
    const run = runSpell([
      ...card,
      "set c to a new card",
      "set was_down to c is face down",
      "turn c over",
      "set now_up to c is face up",
      "turn c over",
      "set back_down to c is face down"
    ])
    // a new one is face down:  `its "direction" is down or up`, the first of its list (Owen, J36)
    expect(run("was_down, now_up, back_down")).toEqual({ was_down: true, now_up: true, back_down: true })
  })

  test("in Spanish, in its own words, the same class:  `frente` draws its front", () => {
    const carta = [
      'una "carta" es una vista reversible donde:',
      "\t- para dibujar su frente:",
      "\t\t<es-texto>hola</es-texto>",
      '\t- para "dibujar su dorso": <es-imagen source="dorso.svg" />'
    ]
    const compiled = compile(carta, "/test.es.spell")
    expect(compiled).toContain("export class Carta extends TwoSidedView {")
    expect(compiled).toContain("drawFront() {")
    expect(compiled).toContain("drawBack() {")
    expect(compiled).toContain('part: "front"')
    expect(compiled).not.toContain("voltear() {")
    const run = runSpellFiles([
      {
        path: "/Test.es.spell",
        contents: [
          ...carta,
          "c es una nueva carta",
          "abajo1 es c está boca abajo",
          "voltear c",
          "arriba2 es c está boca arriba",
          "lado es la dirección de c"
        ].join("\n")
      }
    ])
    expect(run("abajo1, arriba2, lado")).toEqual({ abajo1: true, arriba2: true, lado: "up" })
  })

  test("its actions are known ahead, as any type's:  a file before the card's turns it over", () => {
    const { files } = parseSpellProject([
      { path: "/Game.spell", contents: ["to flip (a card):", "\tturn the card over"].join("\n") },
      { path: "/Card.spell", contents: card.join("\n") }
    ])
    expect(files.flatMap((file) => file.errors)).toEqual([])
    expect(files[0]!.compiled).toContain("this.turnOver()")
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
