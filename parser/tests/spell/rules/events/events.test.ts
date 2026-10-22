import { describe } from "vite-plus/test"
import { unitTestModuleRules } from "spell-lang/spell/test"
import { spellParser } from "spell-lang/spell"
import { core } from "spell-lang/core"

describe("testing spell module events", () => {
  unitTestModuleRules(spellParser, "events", core.resetRuntime)
})
