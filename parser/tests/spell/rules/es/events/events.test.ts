import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell-lang/spell/test"
import { SP } from "spell-lang/spell"
import { core } from "spell-lang/core"

describe("testing spell module events, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "events", core.resetRuntime)
})
