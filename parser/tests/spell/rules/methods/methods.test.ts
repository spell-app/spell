import { describe, test, expect } from "vite-plus/test"
import { describeWarnings, parseSpellProject, unitTestModuleRules } from "spell/parser/spell/test"
import { P } from "spell/parser/parser"
import { spellParser } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module methods", () => {
  unitTestModuleRules(spellParser, "methods", core.resetRuntime)

  describe("declarations", () => {
    test("a method's call-site rule maps back to its definition, and its args to the definition too", () => {
      const scope = spellParser.getScope("method-declaration")
      scope.parse("to notify (message): print the message", "block")
      const scopeRule = scope.rules.get().find((it) => it.declaredBy?.rule.name === "to_do_something")
      expect(scopeRule).toBeDefined()
      const call = scope.parse("notify 1", "statement")
      expect(scopeRule?.instance).toBe(call?.rule)

      // `message` was declared by the definition, inside its method scope
      const definition = scopeRule!.declaredBy!
      const methodScope = definition.nestedScope as P.MethodScope
      expect(methodScope.variables.get("message")?.declaredBy).toBe(definition)
    })

    test("a typed parameter before its receiver leaves it a method of the receiver's type", () => {
      const scope = spellParser.getScope("typed-before-receiver")
      const lines = ["a calculator is an app", "to append (digit as text) to (a calculator): print its input + digit"]
      const compiled = `${scope.compile(lines.join("\n"), "block")}`
      expect(compiled).toContain("appendDigitToCalculator(digit) {")
      expect(compiled).not.toContain("export function")
    })
  })

  describe("names:  the receiver's type stays where a little word would dangle (epic `output-targets`, Q44)", () => {
    /** Compiled names of the methods `signatures` define on `typeName`, in a scope with a calculator, card and pile. */
    const namesOf = (typeName: string, signatures: string[], scopeName: string) => {
      const scope = spellParser.getScope(scopeName)
      const lines = ["a calculator is an app", "a card is a thing", "a pile is a list of cards"]
      scope.parse([...lines, ...signatures.map((it) => `${it}: print 1`)].join("\n"), "block")
      return scope
        .types!.get(typeName)!
        .methods.get()
        .map((method) => method.name)
    }

    test("a preposition before the receiver keeps its type's name", () => {
      const signatures = [
        "to update the total of (a calculator)",
        "to append (digit as text) to (a calculator)",
        "to set the operator of (a calculator) to (op as text)",
        "to clear everything in a calculator"
      ]
      expect(namesOf("Calculator", signatures, "dangling-names")).toEqual([
        "update_the_total_of_calculator",
        "append_$digit_to_calculator",
        "set_the_operator_of_calculator_to_$op",
        "clear_everything_in_calculator"
      ])
    })

    test("nothing dangles:  the name drops it", () => {
      const signatures = ["to turn (a card) face up", "to move (a card) to (a pile)", "to pick up (a card)"]
      expect(namesOf("Card", signatures, "no-dangling-names")).toEqual(["turn_face_up", "move_to_$pile", "pick_up"])
    })

    test("a call compiles to the same name", () => {
      const scope = spellParser.getScope("dangling-name-call")
      const lines = [
        "a calculator is an app",
        "to update the total of (a calculator): print 1",
        "c is a new calculator"
      ]
      scope.parse(lines.join("\n"), "block")
      expect(`${scope.compile("update the total of c", "statement")}`).toBe("c.updateTheTotalOfCalculator()")
    })
  })

  describe("warnings:  a parameter asks for the type it doesn't say (epic `output-targets`, Q24)", () => {
    /** Warnings in `lines`, parsed as a block in a fresh scope. */
    const warningsIn = (lines: string[], scopeName: string) =>
      describeWarnings(spellParser.getScope(scopeName).parse(lines.join("\n"), "block"))

    test("`(digit)`:  under its name", () => {
      const lines = ["a calculator is an app", "to append (digit) to (a calculator):", "\tprint the digit"]
      expect(warningsIn(lines, "untyped-parameter")).toEqual(['2:11 Say what "digit" is, e.g. "(digit as text)"'])
    })

    test("its example names a type its name does", () => {
      expect(warningsIn(["a card is a thing", "to show (card): print card"], "untyped-parameter-named")).toEqual([
        '2:9 Say what "card" is, e.g. "(card as a card)"'
      ])
    })

    test("none where it says, or spell works it out", () => {
      const lines = [
        "a card is a thing",
        "a calculator is an app",
        "to append (digit as text) to (a calculator): print the digit",
        "to notify (message = 'hi'): print the message",
        "to show a card: print the card",
        "to flip (a card): print the card"
      ]
      expect(warningsIn(lines, "typed-parameters")).toEqual([])
    })
  })

  describe("what runs as a thing is made names its type:  `when creating a deck` (epic `language`)", () => {
    function compiled(path: string, lines: string[]) {
      return parseSpellProject([{ path, contents: lines.join("\n") }]).files[0]!
    }

    test("its own type, inline too, `(with ...)` kept:  the type's `create()`", () => {
      const file = compiled("/Deck.spell", [
        'a "deck" is a view:',
        "\twhen creating a deck (with title as text): print the title"
      ])
      expect(file.errors).toEqual([])
      expect(file.compiled).toContain("create(props = {}) {")
    })

    test("another type is refused, saying which to write", () => {
      const file = compiled("/Deck.spell", [
        'a "card" is a thing',
        'a "deck" is a view:',
        "\twhen creating a card: print 1"
      ])
      expect(file.errors).toEqual(['3:1 Name the type this is in:  "when creating a deck"'])
    })

    test("Spanish's:  `al crear un mazo`, and its refusal", () => {
      const own = compiled("/Mazo.es.spell", ['un "mazo" es una vista:', "\tal crear un mazo: imprimir 1"])
      expect(own.errors).toEqual([])
      expect(own.compiled).toContain("create() {")
      const other = compiled("/Mazo.es.spell", [
        'una "tarea" es una cosa',
        'un "mazo" es una vista:',
        "\tal crear una tarea: imprimir 1"
      ])
      expect(other.errors).toEqual(['3:1 Nombra el tipo en el que está:  "al crear un mazo"'])
    })
  })
})

// epic `language` T132
describe("an action's `disabled when`", () => {
  /** Each parse error's line and message, in a project of `lines`. */
  function errorsOf(lines: string[]) {
    const [file] = parseSpellProject([{ path: "Cards.spell", contents: lines.join("\n") }]).files
    return file!.errors.map((error) => `${error}`)
  }
  const card = ["a card is a thing where:", "\t- its direction is one of up or down", "\t- to turn it over:"]

  test("alone, it's fine", () => {
    expect(errorsOf([...card, "\t\t- disabled when its direction is up", "\t\tset its direction to up"])).toEqual([])
  })

  test("with `enabled when` on the same action, it's an error naming both", () => {
    const errors = errorsOf([
      ...card,
      "\t\t- enabled when its direction is down",
      "\t\t- disabled when its direction is up",
      "\t\tset its direction to up"
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('"enabled when" or "disabled when", not both')
  })
})
