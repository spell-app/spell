import { describe, test, expect } from "vite-plus/test"

import { SP, spellParser } from "spell-parser/spell"
import { describeParseErrors, describeWarnings } from "spell-parser/spell/test"

/** `text` parsed as a block, in a fresh scope called `scopeName`. */
function parse(text: string, scopeName: string) {
  return spellParser.getScope(scopeName).parse(text, "block")!
}

describe("SpellWarnings", () => {
  test("`note()` notes a warning once:  the same message about the same match again is ignored", () => {
    const match = parse("set x to 1", "warnings-note")
    SP.SpellWarnings.note(match, "say more")
    SP.SpellWarnings.note(match, "say more")
    SP.SpellWarnings.note(match, "say something else")
    expect(SP.SpellWarnings.in(match).map(({ message }) => message)).toEqual(["say more", "say something else"])
  })

  test("`in()` finds them in nested bodies too, in the order of their text", () => {
    const text = ["a calculator is an app", "to clear (a calculator):", "\tset state to []", "a calculator has a left"]
    expect(describeWarnings(parse(text.join("\n"), "warnings-order"))).toEqual([
      '3:14 Say what "state" holds, e.g. "set state to a new list of text"',
      '4:0 Say what "left" is, e.g. "a calculator has a left as text"'
    ])
  })

  test("`in()` leaves out matches parsed from a string:  their rule notes them again, about its own text", () => {
    const text = [
      "a card is a thing",
      "a card has a color as text",
      'a card "is the (color) joker" if its color is color'
    ]
    expect(describeWarnings(parse(text.join("\n"), "warnings-quoted"))).toEqual([
      '3:7 Say what "color" is, e.g. "(color as text)"'
    ])
  })

  test("a program which says every type has none", () => {
    const text = [
      "a calculator is an app",
      "a calculator has an input as text",
      "to append (digit as text) to (a calculator):",
      "\tset digits to a new list of text",
      "\tadd the digit to digits"
    ]
    expect(describeWarnings(parse(text.join("\n"), "warnings-none"))).toEqual([])
  })

  describe("a member read its type never declares (epic `output-targets`, Q45)", () => {
    const PILE = ["a card is a thing", "a pile is a list of cards", "the pile is a new pile"]

    test("`the label of the pile`, `its label`:  under the member's word", () => {
      const text = [...PILE, "print the label of the pile", "the state of a pile is:", "\treturn its label"]
      expect(describeWarnings(parse(text.join("\n"), "warnings-undeclared"))).toEqual([
        '4:10 A pile never says it has a label:  declare it, e.g. "a pile has a label as text"',
        '6:12 A pile never says it has a label:  declare it, e.g. "a pile has a label as text"'
      ])
    })

    test("its example names a type its name does", () => {
      const text = [...PILE, "print the card of the pile"]
      expect(describeWarnings(parse(text.join("\n"), "warnings-undeclared-type"))).toEqual([
        '4:10 A pile never says it has a card:  declare it, e.g. "a pile has a card as a card"'
      ])
    })

    test("none once a later line declares it:  checked when the warnings are gathered", () => {
      const declaredLater = [...PILE, "print the label of the pile", "a pile has a label as text"]
      const setLater = [...PILE, "print the label of the pile", 'set the label of the pile to "stock"']
      expect(describeWarnings(parse(declaredLater.join("\n"), "warnings-declared-later"))).toEqual([])
      expect(describeWarnings(parse(setLater.join("\n"), "warnings-set-later"))).toEqual([])
    })

    test("none where spell can't be sure:  a built-in member, a method, a type it doesn't know", () => {
      const text = [
        ...PILE,
        "to shuffle (a pile): print 1",
        "print the length of the pile",
        // every list has a `name`, built in (epic `spanish` P15)
        "print the name of the pile",
        "print the shuffle of the pile",
        "print the name of the stranger",
        "print the length of 'text'"
      ]
      expect(describeWarnings(parse(text.join("\n"), "warnings-undeclared-none"))).toEqual([])
    })
  })
})

/**
 * A Spanish program's warnings and errors, in Spanish (epic `spanish` P17):  the pack's `parserMessages`.
 * - Their examples are Spanish spell too:  `poner X a una nueva lista de texto`.
 * - English's above are unchanged.
 */
describe("SpellWarnings, in Spanish", () => {
  /** `lines` parsed as a block, in a fresh Spanish scope called `scopeName`. */
  const parseEs = (lines: string[], scopeName: string) =>
    SP.spanish.parser.getScope(scopeName).parse(lines.join("\n"), "block")!

  test("the cartas project's:  a new variable's list says what it holds, with a Spanish example", () => {
    const lines = [
      "una carta es una cosa",
      "un mazo es una lista de cartas",
      "para mostrar un mazo",
      "\tponer nombres-de-cartas a una nueva lista",
      "\timprimir nombres-de-cartas"
    ]
    expect(describeWarnings(parseEs(lines, "warnings-es-cartas"))).toEqual([
      '4:27 Di qué contiene "nombres-de-cartas", p. ej. "poner nombres-de-cartas a una nueva lista de texto"'
    ])
  })

  test("a property and a parameter with no type", () => {
    const lines = [
      "una calculadora es una aplicación",
      "una calculadora tiene una entrada",
      "una calculadora tiene tareas como una nueva lista",
      "para añadir (dígito) a (una calculadora):",
      "\timprimir 1"
    ]
    expect(describeWarnings(parseEs(lines, "warnings-es-untyped"))).toEqual([
      '2:0 Di qué es "entrada", p. ej. "una calculadora tiene una entrada como texto"',
      '3:0 Di qué contiene "tareas", p. ej. "una calculadora tiene tareas como una nueva lista de texto"',
      '4:13 Di qué es "dígito", p. ej. "(dígito como texto)"'
    ])
  })

  test("a member its type never declares:  `una pila`, by the type's gender", () => {
    const lines = ["una carta es una cosa", "una pila es una lista de cartas", "la pila es una nueva pila"]
    expect(describeWarnings(parseEs([...lines, "imprimir la etiqueta de la pila"], "warnings-es-member"))).toEqual([
      '4:12 Una pila nunca dice que tiene una etiqueta:  decláralo, p. ej. "una pila tiene una etiqueta como texto"'
    ])
    expect(describeWarnings(parseEs([...lines, "poner la etiqueta de la pila a nada"], "warnings-es-set"))).toEqual([
      '4:6 Di qué es "etiqueta":  decláralo, p. ej. "una pila tiene una etiqueta como texto"'
    ])
  })

  test("an outline's getter which is only a value", () => {
    const lines = ["una carta es una cosa donde:", "\t- puntos es 0"]
    expect(describeWarnings(parseEs(lines, "warnings-es-always"))).toEqual([
      '2:3 puntos siempre es 0:  para darle un tipo, escribe "puntos es un número"'
    ])
  })

  test("a line it can't read:  `No entiendo`", () => {
    expect(describeParseErrors(parseEs(["imprimir eso eso eso"], "warnings-es-dont"))).toEqual([
      '1:0 No entiendo "imprimir eso eso eso"'
    ])
  })
})

describe("SP.Language.parserMessage()", () => {
  test("fills each `{name}` from its params;  one with no param stays as written", () => {
    expect(SP.english.parserMessage("dont-understand", { text: "x y" })).toBe('Don\'t understand "x y"')
    expect(SP.english.parserMessage("named-twice", { type: "tableau" })).toBe(
      'More than one tableau is named "{name}":  this finds the first one made'
    )
  })

  test("a key a language lacks reads English", () => {
    const { "dont-understand": _left, ...messages } = SP.spanish.parserMessages
    const lacking = Object.assign(Object.create(SP.Language.prototype), { ...SP.spanish, parserMessages: messages })
    expect(lacking.parserMessage("dont-understand", { text: "x" })).toBe('Don\'t understand "x"')
    expect(lacking.parserMessage("example-text")).toBe("texto")
  })
})
