/**
 * Master import file for spell language.
 * - All other files MUST only import from here (or a direct peer file):
 *   reaching into a leaf file from outside `spell/parser/spell` risks circular import problems.
 * - NOTE: this barrel is also pulled into the server:
 *   spaces' `project-utils.ts` does `import { SP } from "spell/parser/spell"`,
 *   and calls `SP.SpellLocation...` / `SP.spellParser.compile()` directly.
 * - NOTE: its project groups are spaces' (`spell/app/spaces`):  load them before reading a path -- see `SpellSetup`.
 *   - So nothing reachable from here can rely on browser-only globals at module-evaluation time.
 *   - Methods that only run client-side are fine:  the server just never calls them.
 * - NOTE: nothing here imports `core`'s code -- only its types file.
 *   - Programs run on a runner's own copy of it, see `spellRuntime.ts`,
 *     so a second copy here would be one no program runs on.
 */

/**
 * All SpellParser code as `SP` barrel.
 * - Prefer importing as `import { SP } from "spell/parser/spell"` when possible.
 */
export * as SP from "./"

export * from "./spell.types"

export * from "./SpellLocation"
export * from "./SpellProject"
export * from "./CompileCache"
export * from "./SpellDeclarationPlaces"
export * from "./SpellFile"
export * from "./SpellJSFile"
export * from "./SpellCSSFile"
export * from "./SpellSetup"
export * from "./SpellUrls"
export * from "./SpellParser"
export * from "./PageTokens"
export * from "./PageTokenizer"
export * from "./PageTwin"
export * from "./AlonePage"
export * from "./PageChunks"
export * from "./ComponentPacks"
export * from "./UIViews"
export * from "./builtinTypes"
export * from "./builtInTemplates"
export * from "./builtInDimensions"

/**
 * The grammar:  `spellParser` and what else the rules export, as live bindings, there once `loadGrammar()` has loaded
 * them (epic `solid-2-final` P20) -- see `grammar.ts`.
 * - The barrel never imports the rules themselves:  a page holding a project downloads no grammar till it parses.
 */
export * from "./grammar"

export * from "./SpellDeclarations"
export * from "./NativeCode"
export * from "./SpellWords"
export * from "./SpellWarnings"
export * from "./PlaceFieldMarks"
export * from "./LineEndComments"
export * from "./OldForms"
export * from "./hoistClassMembers"
export * from "./targets"
export * from "./highlight"
export * from "./languages/Language"
export * from "./SpellLines"

import { Language } from "./languages/Language"

// The language packs:  English first, the default, its parser with the grammar (`loadGrammar()`, epic `solid-2-final`
// P20);  Spanish on first use (P11), so a page reading only English never downloads its grammar -- see
// `SP.Language.loadsOnFirstUse()`
export { english } from "./languages/en/english"
Language.loadsOnFirstUse("es", () => import("spell/parser/spell/languages/es"))
