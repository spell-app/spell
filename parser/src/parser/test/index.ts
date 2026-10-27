//
//  ## Barrel for shared test helpers that only need the generic parser.
//  Imported by `*.test.ts` files only -- nothing in `src/` proper should depend on this.
//  NOTE: `spell/parser/spell/test` re-exports this,
//  so `import { unitTestModuleRules } from "spell/parser/spell/test"` works too.
//

export { unitTestModuleRules } from "./unitTestModuleRules"
