import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell-parser/spell/test"
import { SP } from "spell-parser/spell"
import { core } from "spell-parser/core"

describe("testing spell module assignment, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "assignment", core.resetRuntime)
})
