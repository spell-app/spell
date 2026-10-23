//
//  ## Master import file for shared test helpers.
//  Imported by `*.test.ts` files only -- nothing in `src/` proper should depend on this.
//  - The frozen test projects' helpers (`loadFixtureProject()` ...) are spell-app's, `spell-app/spaces/test`:
//    the projects are its (`spaces/@spell/test/`), and spell-lang's tests never read a higher repo's files.
//

export { unitTestModuleRules } from "spell-lang/parser/test"
export { tsxBinary } from "./tsxBinary"
export { solidSample } from "./samples"
export { runSpell, runSpellFiles, type RunOptions } from "./runSpell"
export {
  parseSpellProject,
  compiledSpellProject,
  incrementalSpellProject,
  summarize,
  summarizeIncremental,
  describeParseErrors,
  describeWarnings
} from "./parseSpellProject"
export type { SpellSourceFile, ParsedSpellProject, SpellProjectSummary } from "./parseSpellProject"
