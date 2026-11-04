import { describe, expect, it } from "vite-plus/test"

import { type ComponentVocabulary, SharedVocabulary, ValueSets, Vocabulary } from "spell/ui/vocabulary"
import { es, sharedEs } from "spell/ui/components/components.es"

/** Every family's English vocabulary module, by path. */
const ENGLISH = import.meta.glob<Record<string, unknown>>("/src/components/*/*.en.ts", { eager: true })

/** Every family's Spanish file, by path. */
const SPANISH = import.meta.glob<Record<string, unknown>>("/src/components/*/*.es.ts", { eager: true })

/** Every component vocabulary. */
const VOCABULARIES = Object.values(ENGLISH).flatMap((module) =>
  Object.values(module).filter((value): value is ComponentVocabulary => {
    return typeof value === "object" && value !== null && "tag" in value && "attributes" in value
  })
)

/** A registry of every vocabulary, defined in Spanish:  `define()` throws on any name used twice. */
const names = new Vocabulary()
for (const vocabulary of VOCABULARIES) names.register(vocabulary)
const SPANISH_TAGS = names.define("es", es)

/** A name an author types:  ASCII, lowercase, kebab-case. */
const ASCII_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** `camelCase()`, for a DOM element's property name. */
const camelCase = (name: string) => name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())

describe("Spell UI in Spanish (`components.es.ts`)", () => {
  it("has a `UI<Name>.es.ts` beside every `UI<Name>.en.ts`, naming its tag", () => {
    const beside = (path: string) => path.replace(/\.en\.ts$/, ".es.ts")
    expect(Object.keys(ENGLISH).map(beside).sort()).toEqual(Object.keys(SPANISH).sort())
    expect(VOCABULARIES.map(({ tag }) => tag).filter((tag) => !es.tags?.[tag])).toEqual([])
  })

  it("gives every tag a Spanish tag of its own, under `es-`", () => {
    const tags = [...SPANISH_TAGS.values()].map(({ tag }) => tag)
    expect(new Set(tags).size).toBe(VOCABULARIES.length)
    expect(SPANISH_TAGS.get("ui-button")?.tag).toBe("es-boton")
  })

  it("keeps the names authors type ASCII:  tags, attributes, events, slots, parts", () => {
    const strays = [...SPANISH_TAGS.values()].flatMap(({ tag, names: localized }) =>
      [
        tag,
        ...localized.attributes.values(),
        ...localized.events.values(),
        ...localized.slots.values(),
        ...localized.parts.values()
      ].filter((name) => name !== "" && !ASCII_NAME.test(name))
    )
    expect(strays).toEqual([])
  })

  it("translates every value of every shared value set", () => {
    const sets = ["hues", "sizes", "positions", "attachments", "alignments", "verticalAlignments", "floats", "devices"]
    const missing = sets.flatMap((set) =>
      ValueSets.get(set as never)
        .filter((value) => !sharedEs.values[set as keyof typeof sharedEs.values]?.[value as never])
        .map((value) => `${set} ${value}`)
    )
    expect(missing).toEqual([])
  })

  it.each(VOCABULARIES.map(({ tag }) => [tag]))("<%s>:  every name and value round-trips", (tag) => {
    const vocabulary = names.get(tag)!
    const localized = SPANISH_TAGS.get(tag)!
    for (const spec of SharedVocabulary.attributesFor(vocabulary)) {
      const attribute = localized.names.attributes.get(spec.name)!
      expect(names.canonicalize(localized.tag, attribute)?.attribute).toBe(spec.name)
      const set = ValueSets.setFor(spec)
      if (!set || set === "widths") continue
      for (const value of ValueSets.get(set)) {
        const pair = names.localize(localized.tag, spec.name, value)!
        expect(names.canonicalize(localized.tag, pair.attribute, pair.value)).toEqual({ attribute: spec.name, value })
      }
    }
    for (const [name, spanish] of localized.names.events) expect(localized.events.get(spanish)?.name).toBe(name)
    for (const [name, spanish] of localized.names.slots) expect(localized.slots.get(spanish)?.name).toBe(name)
    for (const [name, spanish] of localized.names.parts) expect(localized.parts.get(spanish)?.name).toBe(name)
  })

  it("finds a value with accents without them, and keeps the platform's own names", () => {
    expect(names.canonicalize("es-boton", "tamano", "pequeño")).toEqual({ attribute: "size", value: "small" })
    expect(names.canonicalize("es-boton", "tamano", "pequeno")).toEqual({ attribute: "size", value: "small" })
    expect(names.localize("es-entrada", "type", "date")).toEqual({ attribute: "type", value: "date" })
    expect(names.localize("es-notificacion", "type", "warning")).toEqual({ attribute: "tipo", value: "advertencia" })
    expect(names.localize("es-boton", "animation", "fade up")).toEqual({ attribute: "animacion", value: "fade up" })
  })

  it('words `font`\'s values in Spanish, a size left a number:  `letra="negrita serifa 14"`', () => {
    expect(names.canonicalize("es-boton", "letra", "negrita serifa 14")).toEqual({
      attribute: "font",
      value: "bold serif 14"
    })
    expect(names.localize("es-texto", "font", "all-caps headline")).toEqual({
      attribute: "letra",
      value: "mayúsculas titular"
    })
    expect(names.canonicalize("es-texto", "negrita", "")).toEqual({ attribute: "bold", value: "" })
  })

  // a Spanish attribute is a property of the DOM element too (`boton.tamano`):  never one the platform has
  it("names no property the platform's elements already have", () => {
    const clashes = [...SPANISH_TAGS.values()].flatMap(({ tag, names: localized }) =>
      [...localized.attributes]
        .filter(([name, spanish]) => name !== spanish && camelCase(spanish) in HTMLElement.prototype)
        .map(([, spanish]) => `<${tag} ${spanish}>`)
    )
    expect(clashes).toEqual([])
  })

  it("carries each tag's texts and the shared ones", () => {
    expect(es.texts?.close).toBe("Cerrar")
    const missing = VOCABULARIES.flatMap(({ tag, texts }) =>
      texts.filter(({ key }) => !es.components?.[tag]?.texts?.[key]).map(({ key }) => `${tag} ${key}`)
    )
    expect(missing).toEqual([])
  })
})
