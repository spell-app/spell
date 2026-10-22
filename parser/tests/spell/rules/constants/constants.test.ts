import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell-lang/spell/test"
import { spellParser } from "spell-lang/spell"
import { core } from "spell-lang/core"

describe("testing spell module constants", () => {
  unitTestModuleRules(spellParser, "constants", core.resetRuntime)

  // describe("integration tests", () => {})
})
