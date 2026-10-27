import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell/parser/spell/test"
import { spellParser } from "spell/parser/spell"
import { core } from "spell/parser/core"

describe("testing spell module properties", () => {
  unitTestModuleRules(spellParser, "properties", core.resetRuntime)

  // describe("integration tests", () => {})
})
