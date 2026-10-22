import { describe, expect, test } from "vite-plus/test"
import { unitTestModuleRules } from "spell-lang/spell/test"
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
})
