import { describe, expect, test } from "vite-plus/test"
import { describeParseErrors, describeWarnings, unitTestModuleRules } from "spell/parser/spell/test"
import { SP } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module expressions, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "expressions", core.resetRuntime)
})

/**
 * Article agreement, Spanish's half (epic `spanish` P8):  in gender and number.
 * - A type's gender is read off its declaration:  `una carta es una cosa` is feminine.
 * - A warning under the article, never an error:  the line still parses.
 * - English's half, `a` / `an`:  `tests/spell/rules/expressions/expressions.test.ts`.
 */
describe("article agreement, in Spanish", () => {
  const TYPES = ["una carta es una cosa", "un mazo es una lista de cartas"]

  /** `lines` parsed as a block, in a fresh Spanish scope called `scopeName`. */
  const parse = (lines: string[], scopeName: string) =>
    SP.spanish.parser.getScope(scopeName).parse([...TYPES, ...lines].join("\n"), "block")

  test("a type's gender is read off its declaration", () => {
    const scope = SP.spanish.parser.getScope("agreement-es-gender")
    scope.parse(TYPES.join("\n"), "block")
    expect(scope.types.get("Carta")?.gender).toBe("feminine")
    expect(scope.types.get("Mazo")?.gender).toBe("masculine")
  })

  test('`el carta` warns "la carta"?, under the article, and still parses', () => {
    const block = parse(["la carta es una nueva carta", "imprimir el carta"], "agreement-es-el-carta")
    expect(describeParseErrors(block)).toEqual([])
    expect(describeWarnings(block)).toEqual(['4:9 ¿Querías decir "la carta"?'])
  })

  test('`un cartas` warns "unas cartas"?', () => {
    expect(describeWarnings(parse(["para barajar un cartas", "\timprimir 1"], "agreement-es-un-cartas"))).toEqual([
      '3:13 ¿Querías decir "unas cartas"?'
    ])
  })

  test('`los mazo` warns "el mazo"?:  a masculine type, singular', () => {
    const lines = ["el mazo es un nuevo mazo", "para cada carta en los mazo", "\timprimir 1"]
    expect(describeWarnings(parse(lines, "agreement-es-mazo"))).toEqual(['4:19 ¿Querías decir "el mazo"?'])
  })

  test('a built-in type has its gender too:  `un lista` warns "una lista"?', () => {
    expect(describeWarnings(parse(["una pila es un lista de cartas"], "agreement-es-lista"))).toEqual([
      '3:12 ¿Querías decir "una lista"?'
    ])
  })

  test("articles that agree:  none", () => {
    const lines = ["la carta es una nueva carta", "imprimir la carta", "para barajar unas cartas", "\timprimir 1"]
    expect(describeWarnings(parse(lines, "agreement-es-agree"))).toEqual([])
  })

  test("a word with no declared type has no gender to warn about:  `un trébol`", () => {
    const lines = ["la x es una nueva carta", "si la x es un trébol entonces imprimir 1"]
    expect(describeWarnings(parse(lines, "agreement-es-no-type"))).toEqual([])
  })
})
