import { describe, expect, test } from "vite-plus/test"
import { parseSpellProject, unitTestModuleRules } from "spell/parser/spell/test"
import { SP } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module if, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "if", core.resetRuntime)

  // epic `language` I96
  describe("`devolver 0 de lo contrario`", () => {
    /** Each parse error's line and message, in a project of `lines`. */
    function errorsOf(lines: string[]) {
      const [file] = parseSpellProject([{ path: "/Puntos.es.spell", contents: lines.join("\n") }]).files
      return file!.errors.map((error) => `${error}`)
    }

    test("under `devolver ... si ...` lines, it's fine", () => {
      expect(errorsOf(["para contar los puntos:", "\tdevolver 10 si 1 es 2", "\tdevolver 0 sino"])).toEqual([])
    })

    test("anywhere else, it's an error saying where it goes", () => {
      const errors = errorsOf(["para contar los puntos:", "\timprimir 1", "\tdevolver 0 de lo contrario"])
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('Esto va debajo de una línea "devolver ... si ..."')
    })
  })
})
