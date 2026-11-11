import { describe, test, expect } from "vite-plus/test"

import { incrementalSpellProject, parseSpellProject, summarize, summarizeIncremental } from "spell/parser/spell/test"

/**
 * Plain Spell as the drawn-bubbly page writes it (epic `language` P48):  each new form compiles to the program
 * today's form does, in English and Spanish, and today's forms still read.
 * - A body with no colon before it (T93 made general).
 * - An ability a word before the template:  `a "card" is a draggable two sided view`.
 * - A declaration's description the first comment inside its body.
 * - What a declaration says about itself on its own line:  `to "deal the cards" with title "Deal"`, `, aka "card"`,
 *   `, starting at -1`, `, with default down`.
 * - An action's default title, its name in Initial Caps.
 */
describe("plain Spell like the picture", () => {
  describe("a body with no colon before it", () => {
    test("a worked-out value from a list of its own (T93)", () => {
      sameProgram(
        [
          'a "card" is a thing',
          '\tits "suit" is one of clubs, diamonds, hearts or spades',
          '\tits "color" is one of red, black',
          "\t\tred if it is a diamond or it is a heart",
          "\t\tblack otherwise"
        ],
        [
          'a "card" is a thing:',
          '\tits "suit" is one of clubs, diamonds, hearts or spades',
          '\tits "color" is one of red, black:',
          "\t\tred if it is a diamond or it is a heart",
          "\t\tblack otherwise"
        ]
      )
    })

    test("a list of its own with only its aliases or a comment under it stays stored", () => {
      const { compiled, errors } = compile([
        'a "card" is a thing',
        '\tits "rank" is one of ace, 2 ... 10, jack, queen, king',
        '\t\tit "is a (rank)"',
        '\tits "mood" is one of happy, sad',
        "\t\t// how it feels"
      ])
      expect(errors).toEqual([])
      expect(compiled).toContain('this.declareProp("rank"')
      expect(compiled).toContain('this.declareProp("mood"')
      expect(compiled).toContain("isARank(rank)")
    })

    test("a type re-opened, a getter, an action, a handler and a list's guard", () => {
      sameProgram(
        [
          'a "pile" is a list of cards',
          '\tits "size" is',
          "\t\treturn the number of its cards",
          "\tit is droppable when",
          "\t\treturn yes",
          "\ton click",
          '\t\tprint "clicked"',
          "a pile",
          "\tto empty it",
          "\t\tclear it",
          'a "card" is a thing'
        ],
        [
          'a "pile" is a list of cards:',
          '\tits "size" is:',
          "\t\treturn the number of its cards",
          "\tit is droppable when:",
          "\t\treturn yes",
          "\ton click:",
          '\t\tprint "clicked"',
          "a pile:",
          "\tto empty it:",
          "\t\tclear it",
          'a "card" is a thing'
        ]
      )
    })

    test("an edit under a line that reads what's under it parses as a whole parse does", () => {
      const stored = ['a "card" is a thing', '\tits "color" is one of red, black', "\t\t// its color"].join("\n")
      const workedOut = stored + "\n\t\tred if it is a thing\n\t\tblack otherwise"
      const project = incrementalSpellProject([{ path: "/A.spell", contents: stored }])
      project.update("/A.spell", workedOut)
      expect(summarizeIncremental(project)).toEqual(
        summarize(parseSpellProject([{ path: "/A.spell", contents: workedOut }]))
      )
      project.update("/A.spell", stored)
      expect(summarizeIncremental(project)).toEqual(
        summarize(parseSpellProject([{ path: "/A.spell", contents: stored }]))
      )
    })

    test("a lone `a pile`, nothing under it, is still a fragment", () => {
      const { errors } = compile(['a "pile" is a thing', "a pile"])
      expect(errors).toHaveLength(1)
    })

    test("in Spanish", () => {
      sameProgram(
        [
          'una "carta" es una cosa',
          '\tsu "palo" es uno de tréboles, diamantes, corazones o espadas',
          '\tsu "color" es uno de rojo, negro',
          "\t\trojo si es un diamante o es un corazón",
          "\t\tnegro de lo contrario"
        ],
        [
          'una "carta" es una cosa:',
          '\tsu "palo" es uno de tréboles, diamantes, corazones o espadas',
          '\tsu "color" es uno de rojo, negro:',
          "\t\trojo si es un diamante o es un corazón",
          "\t\tnegro de lo contrario"
        ],
        "/Carta.es.spell"
      )
    })
  })

  describe("an ability a word before the template", () => {
    test("a type, and a list", () => {
      sameProgram(
        [
          'a "card" is a draggable thing',
          '\tits "rank" is a number',
          'a "pile" is a droppable viewable list of cards',
          '\tits "name" is text'
        ],
        [
          'a "card" is a thing',
          "\tit is draggable",
          '\tits "rank" is a number',
          'a "pile" is a viewable list of cards',
          "\tit is droppable",
          '\tits "name" is text'
        ]
      )
    })

    test("several", () => {
      const { compiled, errors } = compile(['a "task" is a clickable selectable thing'])
      expect(errors).toEqual([])
      expect(compiled).toContain("static clickable = true")
      expect(compiled).toContain("static selectable = true")
    })

    test("in Spanish, after the template", () => {
      sameProgram(
        [
          'una "carta" es una cosa arrastrable',
          '\tsu "rango" es un número',
          'una "pila" es una lista visible soltable de cartas'
        ],
        [
          'una "carta" es una cosa',
          "\tes arrastrable",
          '\tsu "rango" es un número',
          'una "pila" es una lista visible de cartas',
          "\tes soltable"
        ],
        "/Carta.es.spell"
      )
    })
  })

  describe("a declaration's description, the first comment inside its body", () => {
    test("a getter, an action, a stored property, a line with its body on it, and a group", () => {
      sameProgram(
        [
          'a "card" is a thing',
          '\tits "suit" is a number',
          '\tgroup "Names"',
          "\t\t// What a person calls it",
          '\tits "rank" is a number',
          "\t\t// Ace is low",
          '\tits "name" is "card " + its rank',
          "\t\t// Its name",
          '\tits "state" is',
          "\t\t// Its short name",
          "\t\treturn its rank",
          "\tto turn it over",
          "\t\t// Face up, or face down",
          "\t\tprint 1"
        ],
        [
          'a "card" is a thing',
          '\tits "suit" is a number',
          "\t// What a person calls it",
          '\tgroup "Names"',
          "\t// Ace is low",
          '\tits "rank" is a number',
          "\t// Its name",
          '\tits "name" is "card " + its rank',
          "\t// Its short name",
          '\tits "state" is:',
          "\t\treturn its rank",
          "\t// Face up, or face down",
          "\tto turn it over:",
          "\t\tprint 1"
        ]
      )
    })

    test("a type's", () => {
      const { compiled } = compile([
        'a "stock pile" is a thing',
        "\t// The cards not played yet",
        '\tits "name" is text'
      ])
      expect(compiled).toMatch(/\/\*\* The cards not played yet \*\/\n\/\*! SPELL: DECLARES \{\n {2}type: "StockPile"/)
    })
  })

  describe("what a declaration says about itself on its own line (Q6)", () => {
    test("an action's quoted name, title, icon, shortcut and undoable", () => {
      sameProgram(
        [
          "a game is a thing",
          '\tits "score" is a number',
          '\tto "deal the cards" with title "Deal", icon "card", shortcut "meta+N", undoable',
          "\t\tset its score to 0"
        ],
        [
          "a game is a thing",
          '\tits "score" is a number',
          "\tto deal the cards:",
          '\t\ttitled "Deal"',
          '\t\ticon "card"',
          "\t\tshortcut meta+N",
          "\t\tundoable",
          "\t\tset its score to 0"
        ]
      )
    })

    test("an action's undo name, after a comma, its name not quoted (Owen)", () => {
      sameProgram(
        [
          "a game is a thing",
          '\tits "score" is a number',
          '\tto put a card on a pile, undoable as "Move Card"',
          "\t\tset its score to 0"
        ],
        [
          "a game is a thing",
          '\tits "score" is a number',
          "\tto put a card on a pile:",
          '\t\tundoable as "Move Card"',
          "\t\tset its score to 0"
        ]
      )
    })

    test("an action's undo name in Spanish, and with a title first", () => {
      sameProgram(
        [
          "un juego es una cosa",
          '\tsu "puntos" es un número',
          '\tpara repartir las cartas, deshacible como "Repartir"',
          "\t\tponer sus puntos a 0",
          '\tpara "barajar" con título "Barajar", deshacible como "Barajar cartas"',
          "\t\tponer sus puntos a 1"
        ],
        [
          "un juego es una cosa",
          '\tsu "puntos" es un número',
          "\tpara repartir las cartas:",
          '\t\tdeshacible como "Repartir"',
          "\t\tponer sus puntos a 0",
          "\tpara barajar:",
          '\t\ttitulada "Barajar"',
          '\t\tdeshacible como "Barajar cartas"',
          "\t\tponer sus puntos a 1"
        ],
        "/Juego.es.spell"
      )
    })

    test("a type's short name, a property's start", () => {
      sameProgram(
        ['a "playing card" is a thing, aka "card"', "\tits score is a number, starting at -1"],
        ["a playing card aka card is a thing", "\tits score is a number starting at -1"]
      )
    })

    test("a list of its own's default:  its value from the start", () => {
      const { compiled, errors } = compile([
        'a "card" is a thing',
        '\tits "direction" is one of up or down, with default down'
      ])
      expect(errors).toEqual([])
      expect(compiled).toContain('this.declareProp("direction", { oneOf: Card.Directions, init: () => "down" })')
    })

    test("in Spanish", () => {
      sameProgram(
        [
          "un juego es una cosa",
          '\tsu "puntos" es un número, empezando en 0',
          '\tpara "repartir las cartas" con título "Repartir", icono "carta", atajo "meta+N"',
          "\t\tponer sus puntos a 0"
        ],
        [
          "un juego es una cosa",
          '\tsu "puntos" es un número empezando en 0',
          "\tpara repartir las cartas:",
          '\t\ttitulada "Repartir"',
          '\t\ticono "carta"',
          "\t\tatajo meta+N",
          "\t\tponer sus puntos a 0"
        ],
        "/Juego.es.spell"
      )
    })
  })

  test("an action's default title is its name in Initial Caps", () => {
    const { compiled } = compile(["a game is a thing", "\tto auto play", "\t\tundoable", "\t\tprint 1"])
    expect(compiled).toContain('core.describeAction(Game, "autoPlay", { title: "Auto Play", undoneAs: "Auto Play" })')
  })
})

/** `lines` compiled as one file, `path`. */
function compile(lines: string[], path = "/test.spell") {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  return { compiled: file!.compiled, errors: file!.errors }
}

/**
 * Do `newLines` and `oldLines` compile to the same program, with no errors?
 * - Where each declaration is in its file aside, and the comments that quote its source.
 */
function sameProgram(newLines: string[], oldLines: string[], path = "/test.spell", tweakOld = (code: string) => code) {
  const program = (code: string) =>
    code
      .split("\n")
      .filter((line) => !/^\s*defined: /.test(line) && !/^\s*\/\/ /.test(line))
      .join("\n")
  const now = compile(newLines, path)
  const before = compile(oldLines, path)
  expect(now.errors).toEqual([])
  expect(before.errors).toEqual([])
  expect(program(now.compiled)).toEqual(program(tweakOld(before.compiled)))
}
