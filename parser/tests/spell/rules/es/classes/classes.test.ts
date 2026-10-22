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

  describe("drawing:  ONE `para dibujarlo`, and a list's `para dibujar cada elemento` (`draw_method`, P20)", () => {
    test('`para "dibujarla":` + markup is `draw()`;  `dibujarlo` and `dibujar eso` say it too', () => {
      for (const words of ['"dibujarla"', '"dibujarlo"', '"dibujar eso"']) {
        const { code, errors } = compiled("draw-it", [
          "una carta es una cosa dibujable:",
          `\t- para ${words}: <div>carta</div>`
        ])
        expect(errors).toEqual([])
        expect(code).toMatch(/draw\(\) \{\s+return h\("div", "carta"\)/)
      }
    })

    test("`para dibujarla:` unquoted is a method's body, which returns it:  `draw()`, never `dibujarla()`", () => {
      const { code, errors } = compiled("draw-it-method", [
        "una carta es una cosa dibujable:",
        "\t- para dibujarla:",
        "\t\tdevolver <div>carta</div>"
      ])
      expect(errors).toEqual([])
      expect(code).toContain("draw() {")
      expect(code).not.toContain("dibujarla()")
    })

    test("a drawable list:  `para dibujarla` is its wrapper, `para dibujar cada elemento` the one around each item", () => {
      const { code, errors } = compiled("draw-each-item", [
        "una carta es una cosa dibujable",
        "una pila es una lista dibujable de cartas:",
        "\t- para dibujarla:",
        '\t\tdevolver <div class="pila"><hijos/></div>',
        "\t- para dibujar cada elemento:",
        '\t\tdevolver <div class="hueco">{dibujar la carta}</div>',
        "un mazo es una lista dibujable de cartas:",
        '\t- para "dibujar cada elemento": <b>{dibujar el elemento}</b>'
      ])
      expect(errors).toEqual([])
      expect(code).toContain('return h("div", { class: "pila" }, h("slot"))')
      expect(code).toContain('return h("div", { class: "hueco" }, () => core.drawThing(item))')
      expect(code).toContain('return h("b", () => core.drawThing(item))')
    })

    test("a thing's sides are gone:  `dibujar su frente` is no drawing", () => {
      const { errors } = compiled("no-sides", [
        "una carta es una cosa dibujable:",
        '\t- para "dibujar su frente": <b/>'
      ])
      expect(errors).toHaveLength(1)
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
