import { describe, expect, test } from "vite-plus/test"
import { parseSpellProject, unitTestModuleRules } from "spell/parser/spell/test"
import { spellParser } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module if", () => {
  unitTestModuleRules(spellParser, "if", core.resetRuntime)

  // epic `language` I96
  describe("`return 0 otherwise`", () => {
    /** Each parse error's line and message, in a project of `lines`. */
    function errorsOf(lines: string[]) {
      const [file] = parseSpellProject([{ path: "/Points.spell", contents: lines.join("\n") }]).files
      return file!.errors.map((error) => `${error}`)
    }

    test("under `return ... if ...` lines, it's fine", () => {
      expect(errorsOf(["to count the points:", "\treturn 10 if 1 is 2", "\treturn 0 otherwise"])).toEqual([])
    })

    test("anywhere else, it's an error saying where it goes", () => {
      const errors = errorsOf(["to count the points:", "\tprint 1", "\treturn 0 otherwise"])
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('This goes under a "return ... if ..." line')
    })
  })
})
