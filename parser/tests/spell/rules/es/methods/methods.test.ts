import { describe, expect, test } from "vite-plus/test"
import { parseSpellProject, unitTestModuleRules } from "spell-lang/spell/test"
import { SP } from "spell-lang/spell"
import { core } from "spell-lang/core"

describe("testing spell module methods, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "methods", core.resetRuntime)

  /** `lines` as one file of a Spanish project:  its compiled code. */
  function compiled(lines: string[]) {
    const { files } = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }], {
      parentScope: SP.spanish.rootScope
    })
    return files[0]!.compiled
  }

  describe("a method's name keeps its type after a little word, `a` (`danglingWords`)", () => {
    test("the definition and a call read ahead of it agree:  `darLaVueltaACarta`", () => {
      const code = compiled([
        "una carta es una cosa",
        "una pila es una lista de cartas",
        "para jugar una carta en una pila:",
        "\tdar la vuelta a la carta",
        "para dar la vuelta a una carta: imprimir 1"
      ])
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toContain("darLaVueltaACarta() {")
      expect(code).toContain("this.darLaVueltaACarta()")
      expect(code).not.toContain("darLaVueltaA(")
    })
  })
})
