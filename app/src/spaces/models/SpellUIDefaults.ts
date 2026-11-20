import { withoutAccents } from "spell/util/string"
import { SP } from "spell/parser/spell"
import {
  DefaultValues,
  SharedVocabulary,
  ValueSets,
  Vocabulary,
  type ComponentVocabulary,
  type LocalizedVocabulary
} from "spell/ui/vocabulary"
import { DEFAULTS_TABLE } from "spell/ui/vocabulary/defaults.generated"
import { HOOKS_TABLE } from "spell/ui/vocabulary/hooks.generated"
import { es } from "spell/ui/components/components.es"

/** The attribute kinds written by their name alone, `fluid`, `disabled`:  they take no value. */
const BARE_KINDS: readonly string[] = ["keyOnly", "boolean"]

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
   * One attribute, written in `language` on one of Spell UI's tags, in Spell UI's own names, checking nothing
   * (the pack's `readAttribute()`, epic `language` P53):  what `<acción>` draws its `<ui-button>` with.
   * - `({ tag: "ui-button", attribute: "tamano", value: "grande" }, "es")` => `{ attribute: "size", value: "large" }`
   * - A look's word written bare, as a switch:  `basico` => `{ attribute: "basic", value: true }`,
   *   which the tag takes for its `appearance` (a `multiple` attribute's words only).
   * - `undefined` for a tag or attribute Spell UI doesn't know (`class`, `aria-label`):  taken as written.
   */
  static readAttribute(sample: SP.DefaultSample, language: string): SP.AttributeReading | undefined {
    const tag = SpellUIDefaults.canonicalTagFor(sample.tag, language)
    if (!tag) return undefined
    const localized = SpellUIDefaults.localizedFor(tag, language)
    const english = SpellUIDefaults.registry.localizedFor(tag)!
    const spec = localized.attributes.get(sample.attribute) ?? english.attributes.get(sample.attribute)
    if (spec) return { attribute: spec.name, value: SpellUIDefaults.canonicalValue(localized, spec.name, sample.value) }
    if (sample.value !== true) return undefined
    // a look's word written bare (`appearance`'s, a `multiple`):  the tag's switch of that name
    const word = withoutAccents(sample.attribute)
    for (const [attribute, words] of localized.values) {
      if (english.attributes.get(attribute)?.kind !== "multiple") continue
      for (const [written, canonical] of words)
        if (withoutAccents(written) === word) return { attribute: canonical, value: true }
    }
    return undefined
  }

  /**
   * The name `language` writes Spell UI's attribute `attribute` by on `tag` (the pack's `attributeNameFor()`,
   * epic `language` P61):  `("es-modal", "heading", "es")` => `"encabezado"`.
   * - `tag` as `canonicalTagFor()` takes it;  `undefined` for a tag Spell UI doesn't have, or an attribute it doesn't name.
   */
  static attributeNameFor(tag: string, attribute: string, language: string): string | undefined {
    const canonical = SpellUIDefaults.canonicalTagFor(tag, language)
    if (!canonical) return undefined
    const english = SpellUIDefaults.registry.localizedFor(canonical)!
    if (!english.attributes.has(attribute)) return undefined
    return SpellUIDefaults.localizedFor(canonical, language).names.attributes.get(attribute) ?? attribute
  }

  /**
   * The attributes of Spell UI's tag `tag`, as `language` writes them on it (the pack's `help()`, epic `editor` P28):
   * each attribute's name, the words it takes and whether it takes none (`bare`), the shared ones too (`disabled`),
   * with what `describe()` says of it.
   * - `tag` as `canonicalTagFor()` takes it:  bare (`button`, `botón`), or as a page writes it.
   * - Not the ones a program hands rich data (`kind: "json"`):  no drawing writes those as text.
   * - `undefined` for a tag Spell UI doesn't have.
   */
  static attributesOf(
    tag: string,
    language: string,
    describe: (tag: string, attribute: string) => string | undefined
  ): SP.ComponentAttributeHelp[] | undefined {
    const canonical = SpellUIDefaults.canonicalTagFor(tag, language)
    if (!canonical) return undefined
    const localized = SpellUIDefaults.localizedFor(canonical, language)
    const english = SpellUIDefaults.registry.localizedFor(canonical)!
    return SharedVocabulary.attributesFor(english.vocabulary)
      .filter((spec) => spec.kind !== "json")
      .map((spec) => {
        const set = ValueSets.setFor(spec)
        const words = localized.names.values.get(spec.name)
        const values = set ? ValueSets.get(set).map((value) => words?.get(value) ?? value) : []
        const name = localized.names.attributes.get(spec.name) ?? spec.name
        const description = describe(canonical, spec.name)
        const bare = BARE_KINDS.includes(spec.kind)
        const picker = pickerFor(spec.kind, set)
        return { name, values, ...(description && { description }), ...(bare && { bare }), ...(picker && { picker }) }
      })
  }

  /**
   * Spell UI's tag `tag` as a Spell type is built on it, in `language` (the pack's `viewBaseFor()`):
   * `<ui-tree>` for `a "netlist column" is a ui tree view`.
   * - `tag` as `canonicalTagFor()` takes it, `tree`, `árbol`.
   * - Its own attributes, each by the name and words `language` writes on it, with Spell UI's own when they differ:
   *   Spanish's `apariencia`, `columnas` => `appearance`, `columns`.
   * - Its hooks (`hooks.generated.ts`), in `language`'s words:  its dictionary's, else English's.
   * - `undefined` for a tag Spell UI doesn't have.
   */
  static viewBaseFor(tag: string, language: string): SP.ComponentViewBase | undefined {
    const canonical = SpellUIDefaults.canonicalTagFor(tag, language)
    if (!canonical) return undefined
    const localized = SpellUIDefaults.localizedFor(canonical, language)
    const english = SpellUIDefaults.registry.localizedFor(canonical)!
    const attributes = english.vocabulary.attributes.map((spec): SP.ComponentViewAttribute => {
      const name = localized.names.attributes.get(spec.name) ?? spec.name
      const words = localized.names.values.get(spec.name)
      const values = Array.isArray(spec.values) ? (spec.values as readonly string[]) : undefined
      const written = values?.map((value) => words?.get(value) ?? value)
      // only where the language's words differ from Spell UI's own
      const differs = values?.some((value, index) => written![index] !== value)
      const valueOutputs = differs
        ? Object.fromEntries(values!.map((value, index) => [written![index], value]))
        : undefined
      return {
        name,
        ...(name !== spec.name && { output: spec.name }),
        ...(written && { values: written }),
        ...(valueOutputs && { valueOutputs })
      }
    })
    const translated = language === es.lang ? es.components?.[canonical]?.hooks : undefined
    const hooks = (HOOKS_TABLE[canonical] ?? []).map(({ name, words }) => ({
      name,
      words: translated?.[name] ?? words
    }))
    return { tag: canonical, attributes, hooks }
  }

  /** Each of Spell UI's tags in `language`, bare as a drawing writes it (`button`, `botón`), with its canonical tag. */
  static tagsIn(language: string): { tag: string; canonical: string }[] {
    const canonicals = Object.keys(DEFAULTS_TABLE)
    if (language !== es.lang) return canonicals.map((canonical) => ({ tag: canonical.replace(/^ui-/, ""), canonical }))
    return canonicals.flatMap((canonical) => {
      const tag = SpellUIDefaults.spanish.get(canonical)?.tag.replace(/^es-/, "")
      return tag ? [{ tag: es.tags?.[canonical] ?? tag, canonical }] : []
    })
  }

  /**
   * The canonical tag `tag` stands for in `language`:  `ui-button` itself, `es-boton`, or bare as a drawing writes it
   * (`button`, `botón`), or `ui-` and a bare word (`ui-botón`);  `undefined` for none of Spell UI's.
   */
  static canonicalTagFor(tag: string, language: string): string | undefined {
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

/**
 * How an attribute's value is picked in an editor (epic `editor` T61), by what Spell UI says it takes:
 * - its values the hues (`color`):  a palette, each hue drawn in its theme colour, in `ValueSets.hues`' order
 * - kind `icon` (`icon`, `icono`):  the icon picker
 * - anything else:  none, its words typed or listed
 */
function pickerFor(kind: string, set: ReturnType<typeof ValueSets.setFor>): SP.ComponentValuePicker | undefined {
  if (kind === "icon") return { kind: "icon" }
  if (set !== HUES) return undefined
  return { kind: "color", colors: ValueSets.get(HUES).map((hue) => `var(--ui-${hue}, gray)`) }
}

/** The value set of colours, which a palette picks from. */
const HUES = "hues"
