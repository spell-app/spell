import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { BUILT_IN_TEMPLATE_DECLARATIONS } from "./builtInTemplates.generated"

/**
 * Spell's built-in TEMPLATES written in spell, e.g. `two sided view` (epic `elemental-spell` Q71).
 * - Each is a spell file in the core's `src/core/templates/`, e.g. `TwoSidedView.spell`, compiled ONCE:
 *   - its class into the core, `TwoSidedView`, which every program made from it extends
 *   - its declarations into `builtInTemplates.generated.ts`, in each language it's written in
 *   - by `yarn core:gen:templates`;  a test fails while either is stale
 * - So `a card is a two sided view` compiles to just the card's own members:  its direction, `turn it over` and its
 *   drawing are the template's, once, in the core.
 * - Its datatype is still a type word of each language (`two sided view`, `vista reversible`) and a class name
 *   (`P.BUILT_IN_CLASS_NAMES`), but NOT one of `P.BUILT_IN_TYPES`:  its type comes from its declarations.
 */

/**
 * The built-in templates written in spell, by datatype:  each one's class, and its source in the core's
 * `src/core/templates/`, e.g. `TwoSidedView.spell` (English) and `TwoSidedView.es.spell` (Spanish).
 * - Add one:  its file(s) there, its line here, its datatype in each language's type words and in
 *   `P.BUILT_IN_CLASS_NAMES`, then `yarn core:gen:templates`.
 */
export const BUILT_IN_TEMPLATES: Record<string, string> = {
  "two sided view": "TwoSidedView",
  notebook: "Notebook"
}

/** Is `datatype` a built-in template written in spell, e.g. `two sided view`? */
export function isBuiltInTemplate(datatype: string): boolean {
  return Object.hasOwn(BUILT_IN_TEMPLATES, datatype)
}

/**
 * Load every built-in template into root `scope`, in each of `languages`' words:  its type, then its members.
 * - The first language's declarations bring the type;  each other language's add their words for the same members
 *   (a Spanish file's `está boca arriba` reads `isFaceDirection("up")`), as a root of several languages has its
 *   built-in types' members in every one of their words.
 * - A language the template isn't written in reads English's.
 * - SIDE EFFECT:  adds types, members and rules to `scope`, and its parser -- `SP.Language.rootScope` calls it as it
 *   builds, once.
 * - Throws `P.ParserError` if a template's declarations won't load:  regenerate them (`yarn core:gen:templates`).
 */
export function loadBuiltInTemplates(scope: P.RootScope, languages: readonly SP.Language[]): void {
  for (const [datatype, byLanguage] of Object.entries(BUILT_IN_TEMPLATE_DECLARATIONS)) {
    const langs = [...new Set(languages.map((language) => (byLanguage[language.lang] ? language.lang : "en")))]
    langs.forEach((lang, index) => {
      const declarations = byLanguage[lang]
      if (!declarations) return
      // a second language's words for the same members:  the type is there already
      const statements = index ? declarations.statements.filter((it) => !it.type) : declarations.statements
      SP.SpellDeclarations.load(scope, {
        from: `${TEMPLATES_FROM}/${P.classCase(datatype)}`,
        declarations: { ...declarations, statements }
      })
    })
  }
}

/**
 * The file in the core's `src/core/templates/` that spell path `path` names, if it's a built-in template's:
 * where its records say they were declared, e.g. `@spell/core/TwoSidedView/TwoSidedView.es.spell` => `TwoSidedView.es.spell`.
 * - So an editor opens the template's source when a person goes to one of its words (epic `elemental-spell` C20).
 * - `undefined` for any other path.
 */
export function builtInTemplateFileFor(path: string): string | undefined {
  const [className, file, ...rest] = path.startsWith(`${TEMPLATES_FROM}/`)
    ? path.slice(TEMPLATES_FROM.length + 1).split("/")
    : []
  const isTemplate = Object.values(BUILT_IN_TEMPLATES).includes(className ?? "")
  return isTemplate && file && !rest.length ? file : undefined
}

/** Where a built-in template's records say they came from:  the core's templates, e.g. `@spell/core/TwoSidedView`. */
const TEMPLATES_FROM = "@spell/core"
