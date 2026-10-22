//
//  ## Barrel for shared test helpers that only need the generic parser.
//  Imported by `*.test.ts` files only -- nothing in `src/` proper should depend on this.
//  NOTE: `spell-lang/spell/test` re-exports this,
//  so `import { unitTestModuleRules } from "spell-lang/spell/test"` works too.
//

export { unitTestModuleRules } from "./unitTestModuleRules"
