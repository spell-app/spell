import { withoutAccents } from "spell/util/string"
import { SP } from "spell/parser/spell"
import { DefaultValues, Vocabulary, type ComponentVocabulary, type LocalizedVocabulary } from "spell/ui/vocabulary"
import { DEFAULTS_TABLE } from "spell/ui/vocabulary/defaults.generated"
import { es } from "spell/ui/components/components.es"

/****************
 * ### `SpellUIDefaults`
 * An app's widget defaults (`<ui-defaults>`, epic `language` P29) in Spell UI's own names, for the spell compiler:
 * the Spell UI pack's `readDefault()` (`SP.ComponentPack`).
 * - `<es-boton apariencia="píldora"/>` in a Spanish file => `{ tag: "ui-button", attribute: "appearance", value: "pill" }`,
 *   which is what the page's root reads (P28's roots check values in English only, T38).
 * - Checked as the root checks them (`DefaultValues`, Spell UI's):  an unknown widget or attribute, a content
 *   attribute or a value the attribute doesn't take is a problem the compiler words in the file's language.
 * - Reads every tag's attributes from Spell UI's defaults table (`defaults.generated.ts`, written by its
 *   `yarn site:data`), and its Spanish names from its dictionary, through Spell UI's own `Vocabulary`:
 *   the names a Spanish page reads.
 * - Browser-safe, as the rest of spaces' models:  the editor compiles too.
 * - STATIC and instance-free on purpose:  ONE registry, made the first time it's asked.
 ****************/
export class SpellUIDefaults {
  /** `sample`, written in `language`, in Spell UI's own names;  or what's wrong with it (`SP.DefaultReading`). */
  static read(sample: SP.DefaultSample, language: string): SP.DefaultReading {
    const tag = SpellUIDefaults.canonicalTagFor(sample.tag, language)
    if (!tag) return { problem: "unknown-tag" }
    const localized = SpellUIDefaults.localizedFor(tag, language)
    const english = SpellUIDefaults.registry.localizedFor(tag)!
    const written = localized.tag
    // a Spanish page may write the English name too:  its own first
    const spec = localized.attributes.get(sample.attribute) ?? english.attributes.get(sample.attribute)
    if (!spec) {
      const attributes = [...localized.attributes.entries()]
        .filter(([, it]) => !DefaultValues.isContent(it))
        .map(([name]) => name)
      return { problem: "unknown-attribute", tag: written, attributes }
    }
    if (DefaultValues.isContent(spec)) return { problem: "content", tag: written }
    const value = SpellUIDefaults.canonicalValue(localized, spec.name, sample.value)
    const problem = DefaultValues.problemWith(spec, value)
    if (!problem) return { tag, attribute: spec.name, value }
    if (problem.takes !== "values") {
      const takes = problem.takes === "number" ? "number" : problem.takes === "text" ? "text" : "boolean"
      return { problem: "bad-value", tag: written, values: [], takes }
    }
    const values = (problem.values ?? []).map((it) => localized.names.values.get(spec.name)?.get(it) ?? it)
    return { problem: "bad-value", tag: written, values }
  }

  /**
   * The canonical tag `tag` stands for in `language`:  `ui-button` itself, `es-boton`, or bare as spellx writes it
   * (`button`, `botón`), or `ui-` and a bare word (`ui-botón`);  `undefined` for none of Spell UI's.
   */
  private static canonicalTagFor(tag: string, language: string): string | undefined {
    if (DEFAULTS_TABLE[tag]) return tag
    const bare = withoutAccents(tag.replace(/^ui-/, ""))
    const local = SpellUIDefaults.localTags.get(withoutAccents(tag)) ?? SpellUIDefaults.localTags.get(`es-${bare}`)
    if (local) return local
    if (DEFAULTS_TABLE[`ui-${bare}`]) return `ui-${bare}`
    return language === "en" ? undefined : SpellUIDefaults.localTags.get(`${language}-${bare}`)
  }

  /** `tag`'s names in `language`:  Spanish's from the dictionary;  English (and any other) its own. */
  private static localizedFor(tag: string, language: string): LocalizedVocabulary {
    if (language === es.lang) return SpellUIDefaults.spanish.get(tag) ?? SpellUIDefaults.registry.localizedFor(tag)!
    return SpellUIDefaults.registry.localizedFor(tag)!
  }

  /** `value` as written, in canonical words:  `píldora` => `pill`, word by word for several (`básico píldora`). */
  private static canonicalValue(localized: LocalizedVocabulary, attribute: string, value: string | number | boolean) {
    if (typeof value !== "string") return value
    const name = localized.names.attributes.get(attribute) ?? attribute
    return SpellUIDefaults.registry.canonicalize(localized.tag, name, value)?.value ?? value
  }

  ////////////////
  // ## The registry
  ////////////////

  /** Every tag's vocabulary, cut down to its attributes, registered once. */
  private static get registry(): Vocabulary {
    if (SpellUIDefaults.made) return SpellUIDefaults.made
    const registry = new Vocabulary()
    for (const [tag, attributes] of Object.entries(DEFAULTS_TABLE)) {
      const vocabulary = { tag, noun: tag, attributes, events: [], slots: [], parts: [], states: [], texts: [] }
      registry.register(vocabulary as unknown as ComponentVocabulary)
    }
    return (SpellUIDefaults.made = registry)
  }

  /** Every tag's Spanish names, by canonical tag. */
  private static get spanish(): Map<string, LocalizedVocabulary> {
    return (SpellUIDefaults.spanishMade ??= SpellUIDefaults.registry.define(es.lang, es))
  }

  /** Each Spanish tag, without accents (`es-boton`) => its canonical tag. */
  private static get localTags(): Map<string, string> {
    if (SpellUIDefaults.localTagsMade) return SpellUIDefaults.localTagsMade
    const tags = new Map<string, string>()
    for (const [canonical, localized] of SpellUIDefaults.spanish) tags.set(withoutAccents(localized.tag), canonical)
    return (SpellUIDefaults.localTagsMade = tags)
  }

  /** The registry, once made. */
  private static made: Vocabulary | undefined
  /** The Spanish names, once made. */
  private static spanishMade: Map<string, LocalizedVocabulary> | undefined
  /** The Spanish tags, once made. */
  private static localTagsMade: Map<string, string> | undefined
}
