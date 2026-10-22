import { describe, expect, test } from "vite-plus/test"
import { unitTestModuleRules } from "spell-lang/spell/test"
import type { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { core } from "spell-lang/core"

describe("testing spell module classes, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "classes", core.resetRuntime)

  /** `lines` as one block in a fresh Spanish scope:  its compiled code, and the lines it couldn't read. */
  function compiled(name: string, lines: string[]) {
    const block = SP.spanish.parser.getScope(name).parse(lines.join("\n"), "block")!
    const code = `${block.compile()}`
    return { code, errors: code.split("\n").filter((line) => line.includes("PARSE ERROR")) }
  }

  describe("a drawable's sides, by what their names mean (`side_name`)", () => {
    test("`frente` and `dorso`:  each a getter, and `draw()` picks one by direction", () => {
      const { code, errors } = compiled("draw-sides", [
        "una card es una cosa dibujable:",
        '\t- para "dibujar su frente": <div>front</div>',
        '\t- para "dibujar su dorso": <div>back</div>'
      ])
      expect(errors).toEqual([])
      expect(code).toContain("get frente()")
      expect(code).toContain("get dorso()")
      expect(code).toContain('return this.direction === "down" ? this.dorso : this.frente')
    })

    test("any other side is a getter of its own, and no `draw()`", () => {
      const { code, errors } = compiled("draw-other-side", [
        "una card es una cosa dibujable:",
        '\t- para "dibujar su lomo": <div>spine</div>'
      ])
      expect(errors).toEqual([])
      expect(code).toContain("get lomo()")
      expect(code).not.toContain("this.direction")
    })
  })

  describe("an outline body", () => {
    test("`- tiene ...`, `- su ... es ...`, `- pertenece a ...`", () => {
      const { errors } = compiled("outline-body", [
        "una pila es una lista de cards",
        "una card es una cosa donde:",
        "\t- tiene un rango como un número",
        '\t- su "palo" es uno de tréboles, diamantes, corazones o espadas',
        "\t- pertenece a una pila",
        "\t- se guarda dentro"
      ])
      expect(errors).toEqual([])
    })

    test("a property's rules:  `, que no debe estar vacío`, and indented under it", () => {
      const { code, errors } = compiled("outline-rules", [
        "una person es una cosa donde:",
        "\t- tiene un name como texto, que no debe estar vacío",
        "\t- tiene un nick como texto",
        "\t\t- debe tener como mucho 12 letras",
        "\t- su email no debe estar vacío"
      ])
      expect(errors).toEqual([])
      expect(code).toContain('{ type: "empty" }')
      expect(code).toContain('{ type: "maxLength", value: "12" }')
    })
  })

  describe("an outline body's long forms, in Spanish (epic `spanish` P17)", () => {
    const OUTLINE = [
      "una pila es una lista de cartas",
      "una carta es una cosa donde:",
      "\t- tiene un nombre como texto",
      '\t- su "rango" es un número',
      "\t- su dirección es arriba o abajo",
      '\t- su "palo" es uno de tréboles, diamantes, corazones o espadas',
      '\t- "está boca arriba" si su dirección es arriba',
      '\t- "es un (palo)"',
      '\t- su "color" es rojo si su palo es o bien diamantes o corazones de lo contrario es negro',
      "\t- pertenece a una pila",
      '\t- su "baraja" es una lista de cartas'
    ]

    test("each line reads as the sentence style says it, in Spanish, and compiles the same", () => {
      const block = SP.spanish.parser.getScope("long-forms-es").parse(OUTLINE.join("\n"), "block")!
      const typeLine = block.matched[1] as P.Match
      const body = (typeLine.data.statement as P.Match).data.body as P.Match
      const longForms = body.matched
        .map((line) => (line as P.Match).data.statement as P.Match | undefined)
        .map((statement) => statement && (statement.rule as SP.SpellStatement).getLongForm(statement))
      expect(longForms).toEqual([
        "una carta tiene un nombre como texto",
        "una carta tiene un rango como un número",
        "una carta tiene una dirección como uno de arriba o abajo",
        "una carta tiene un palo como uno de tréboles, diamantes, corazones o espadas",
        'una carta "está boca arriba" si su dirección es arriba',
        'una carta "es un (palo)" para sus palos',
        'el "color" de una carta es rojo si su palo es o bien diamantes o corazones de lo contrario es negro',
        "una carta pertenece a una pila",
        "una carta tiene una baraja como una nueva lista de cartas"
      ])
      const { code, errors } = compiled("long-forms-es-sentences", [
        "una pila es una lista de cartas",
        "una carta es una cosa",
        ...(longForms as string[])
      ])
      expect(errors).toEqual([])
      // each line's comment is its source line, as written
      const withoutComments = (text: string) =>
        text
          .split("\n")
          .filter((line) => !line.trim().startsWith("//"))
          .join("\n")
      expect(withoutComments(code)).toBe(withoutComments(compiled("long-forms-es-outline", OUTLINE).code))
    })
  })
})
