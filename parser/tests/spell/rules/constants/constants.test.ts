import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell/parser/spell/test"
import { spellParser } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module constants", () => {
  unitTestModuleRules(spellParser, "constants", core.resetRuntime)

  // describe("integration tests", () => {})
})
