import { withoutAccents } from "spell/util/string"
import { SP } from "spell/parser/spell"
import { ROOT_CATALOG } from "spell/ui/components/ui-root/UIRoot.catalog"
import { es } from "spell/ui/components/components.es"
import { SpellUIDefaults } from "./SpellUIDefaults"

/**
 * Spell UI as a drawing names its components, bare (epic `elemental-spell` P7, Q46):
 * `<button>` is `<ui-button>`, `<botón>` in a Spanish file `<es-boton>`.
 * - English:  every tag in Spell UI's catalog, without its `ui-`.
 * - Spanish:  each tag's Spanish name from Spell UI's dictionary, `es-` before it, as a Spanish page reads it;
 *   accents count as written or not (`botón` ~== `boton`).
 * - SIDE EFFECT:  loading this registers it with spell as `"spell-ui"` (`SP.ComponentPacks`), the pack every
 *   project draws with unless its project file says otherwise:  spell-parser never imports Spell UI.
 * - It says what each tag and attribute is, for the editors' completions and hovers (`help()`, epic `editor` P28),
 *   from Spell UI's help table, loaded the first time it's asked.
 * - A Spell type built on one of its tags, `a "netlist column" is a ui tree view` (`viewBaseFor()`):
 *   its attributes and hooks, in the file's language.
 * - It reads an app's widget defaults too, `<ui-defaults>`, into Spell UI's own names (`SpellUIDefaults`, epic
 *   `language` P29);  and the Spanish attributes on an `<acción>`'s button (P53).
 * - Loaded by spaces' barrel, as every program that compiles a project loads it;  NOT by `<spell-viewer>`, which runs
 *   built code and never compiles a drawing.
 */
export const SPELL_UI_PACK: SP.ComponentPack = {
  name: "spell-ui",
  tagFor(word, language) {
    return tagsFor(language).get(withoutAccents(word))
  },
  canonicalTagFor: (tag, language) => SpellUIDefaults.canonicalTagFor(tag, language),
  readDefault: (sample, language) => SpellUIDefaults.read(sample, language),
  readAttribute: (sample, language) => SpellUIDefaults.readAttribute(sample, language),
  attributeNameFor: (tag, attribute, language) => SpellUIDefaults.attributeNameFor(tag, attribute, language),
  // a pane's `loading` and `error` slots, which an element's `<loading>` and `<failed>` fill
  slotNameFor: (tag, slot, language) => SpellUIDefaults.slotNameFor(tag, slot, language),
  // a type built on one of its tags, `a ui tree view`:  its noun of several words as its tag's (`property-editor`)
  viewBaseFor: (noun, language) => SpellUIDefaults.viewBaseFor(noun.replace(/\s+/g, "-"), language),
  // what `<ui-root display="skeleton">` draws for it:  a bare `loading="skeleton"` draws it too
  skeletonFor(tag, language) {
    const canonical = SpellUIDefaults.canonicalTagFor(tag, language)
    return canonical ? ROOT_CATALOG[canonical]?.skeleton : undefined
  },
  help(language) {
    if (!helpTable) {
      loadHelp()
      return undefined
    }
    const { HELP_TABLE, SHARED_HELP } = helpTable
    let help = HELP_BY_LANGUAGE.get(language)
    if (help) return help
    const describe = (tag: string, attribute: string) =>
      HELP_TABLE[tag]?.attributes[attribute] ?? SHARED_HELP[attribute]
    help = {
      tags: SpellUIDefaults.tagsIn(language).map(({ tag, canonical }) => {
        const { description, empty } = HELP_TABLE[canonical] ?? {}
        return { tag, ...(description && { description }), ...(empty && { empty }) }
      }),
      attributesOf: (tag) => SpellUIDefaults.attributesOf(tag, language, describe)
    }
    HELP_BY_LANGUAGE.set(language, help)
    return help
  }
}

/** Spell UI's help table (`help.generated.ts`), once loaded:  loaded the first time it's asked for, a chunk of its own. */
let helpTable: typeof import("spell/ui/vocabulary/help.generated") | undefined
/** Each language's help, made the first time it's asked for. */
const HELP_BY_LANGUAGE = new Map<string, SP.ComponentHelp>()

/**
 * Load Spell UI's help table, once:  until it's in, the pack's `help()` says nothing.
 * - NEVER throws:  a table that won't load leaves the editor without the help, and says why in the console.
 */
function loadHelp() {
  if (isHelpLoading) return
  isHelpLoading = true
  import("spell/ui/vocabulary/help.generated")
    .then((table) => (helpTable = table))
    .catch((error: unknown) => console.error("SPELL_UI_PACK.help():  couldn't load Spell UI's help table", error))
}

/** Has `loadHelp()` started? */
let isHelpLoading = false

/** Each language's bare names => tags, made the first time it's asked for. */
const TAGS_BY_LANGUAGE = new Map<string, Map<string, string>>()

/** `language`'s bare names => Spell UI's tags:  English's from the catalog, Spanish's from its dictionary. */
function tagsFor(language: string): Map<string, string> {
  let tags = TAGS_BY_LANGUAGE.get(language)
  if (tags) return tags
  tags = new Map()
  if (language === "es") {
    for (const name of Object.values(es.tags ?? {})) tags.set(withoutAccents(name), `es-${name}`)
  } else {
    for (const tag of Object.keys(ROOT_CATALOG)) tags.set(tag.replace(/^ui-/, ""), tag)
  }
  TAGS_BY_LANGUAGE.set(language, tags)
  return tags
}

SP.ComponentPacks.register(SPELL_UI_PACK)
