import type { ComplexAttributeConverter, PropertyDeclaration } from "lit"

import { camelCase } from "$/util"
import {
  type AttributeSpec,
  type ComponentVocabulary,
  Converters,
  type LocalizedVocabulary,
  ValueSets
} from "$/vocabulary"

import { RESERVED_PROPERTIES } from "./elements.types"

/**
 * Turns a `ComponentVocabulary` into Lit property declarations, so a component NEVER spells an attribute name.
 * - One declaration per attribute:  `attribute` is the vocabulary name (or its localized name), the converter
 *   comes from the attribute's kind, primitives reflect, `json` is a property only.
 * - Converters are the library-neutral `Converters` (`yes` / `no` booleans, validated enums with "did you mean").
 * - `useDefault` for attributes with a non-`undefined` starting value (booleans, enums with a `default`,
 *   numbers with a `default`):  the default isn't reflected, and removing the attribute restores it.
 *   NEVER for an `undefined` start:  Lit records the FIRST change as the default and swallows it.
 * - A localized vocabulary (`UIElement.define("ie-boton", dictionary)`) wraps each converter:  localized
 *   value => canonical on the way in, canonical => localized when reflecting.  Properties stay canonical.
 */
export class VocabularyProperties {
  /**
   * Declarations for every attribute of `vocabulary`, keyed by property name.
   * - `localized` renames attributes and maps values;  omit it for the canonical element.
   */
  static declarations(
    vocabulary: ComponentVocabulary,
    localized?: LocalizedVocabulary
  ): Map<string, VocabularyDeclaration> {
    const declarations = new Map<string, VocabularyDeclaration>()
    for (const spec of vocabulary.attributes) {
      const attribute = localized?.names.attributes.get(spec.name) ?? spec.name
      const json = spec.kind === "json"
      const initial = VocabularyProperties.initialValue(spec)
      const canonical = VocabularyProperties.converter(spec, attribute)
      declarations.set(VocabularyProperties.propertyName(spec, vocabulary.noun), {
        spec,
        initial,
        attribute: json ? false : attribute,
        reflect: !json && (spec.reflect ?? true),
        useDefault: initial !== undefined,
        converter: localized ? VocabularyProperties.localize(canonical, spec, localized) : canonical
      })
    }
    return declarations
  }

  /**
   * JS property name of `spec`:  its `property`, else `camelCase(name)`.
   * - A name `HTMLElement` already has (`style`, `hidden`, `title` ...) gets the component's `noun` in front
   *   (`iconStyle`, `dividerHidden`):  a Lit accessor named `style` would replace the host's
   *   `CSSStyleDeclaration` for every framework and devtool.  The ATTRIBUTE keeps its vocabulary name.
   * - Mirrored at the type level by `PropertyName` (`elements.types.ts`).
   */
  static propertyName(spec: AttributeSpec, noun: string): string {
    const name = spec.property ?? camelCase(spec.name)
    return (RESERVED_PROPERTIES as readonly string[]).includes(name)
      ? `${camelCase(noun)}${name[0]!.toUpperCase()}${name.slice(1)}`
      : name
  }

  /**
   * Value a fresh element starts with, or `undefined` for none.
   * - keyOnly / boolean / keyOrValueAndKey => `false`, so reads never see `undefined`
   * - otherwise the vocabulary's `default`
   */
  static initialValue(spec: AttributeSpec): unknown {
    if (spec.default !== undefined && spec.default !== null) return spec.default
    if (spec.kind === "keyOnly" || spec.kind === "boolean" || spec.kind === "keyOrValueAndKey") return false
    return undefined
  }

  ////////////////
  // ## Converters
  ////////////////

  /** Canonical converter for `spec`'s kind;  `attribute` is the name it's read under (`disabled="disabled"`). */
  static converter(spec: AttributeSpec, attribute: string): ComplexAttributeConverter {
    const options = { attribute: spec.name }
    switch (spec.kind) {
      case "keyOnly":
      case "boolean":
        return {
          fromAttribute: (value) => Converters.boolean(value, attribute),
          toAttribute: (value: boolean) => Converters.booleanToAttribute(value)
        }
      case "keyOrValueAndKey":
        return {
          fromAttribute: (value) => Converters.keyOrValue(value, ValueSets.of(spec), options),
          toAttribute: (value: string | boolean) =>
            typeof value === "string" ? value : Converters.booleanToAttribute(value)
        }
      case "number":
        return {
          fromAttribute: (value) => Converters.number(value),
          toAttribute: (value: number | undefined) => (value === undefined ? null : String(value))
        }
      case "json":
        return { fromAttribute: (value) => Converters.json(value) }
      case "string":
      case "width":
      case "multiple":
        return {
          fromAttribute: (value) => value ?? undefined,
          toAttribute: (value: unknown) => VocabularyProperties.text(value)
        }
      default: {
        // size, color, valueAndKey, textAlign, verticalAlign, enum:  validated against their value set
        const set = ValueSets.of(spec)
        return {
          fromAttribute: (value) => (set ? Converters.enumValue(value, set, options) : (value ?? undefined)),
          toAttribute: (value: unknown) => VocabularyProperties.text(value)
        }
      }
    }
  }

  /** `canonical` wrapped to read and write `localized`'s names for `spec`'s values. */
  private static localize(
    canonical: ComplexAttributeConverter,
    spec: AttributeSpec,
    localized: LocalizedVocabulary
  ): ComplexAttributeConverter {
    const forward = localized.values.get(spec.name)
    const inverse = localized.names.values.get(spec.name)
    const booleans = VocabularyProperties.booleans(localized)
    return {
      fromAttribute(value, type) {
        let text = value
        if (text != null) {
          const key = text.trim().toLowerCase()
          text = forward?.get(key) ?? booleans.get(key) ?? text
        }
        return canonical.fromAttribute!(text, type)
      },
      toAttribute(value, type) {
        const text = canonical.toAttribute!(value, type) as string | null | undefined
        return typeof text === "string" && text ? (inverse?.get(text) ?? text) : text
      }
    }
  }

  /** Localized boolean words => canonical (`si` => `yes`), gathered once per localized vocabulary. */
  private static booleans(localized: LocalizedVocabulary): Map<string, string> {
    let words = VocabularyProperties.booleanWords.get(localized)
    if (words) return words
    words = new Map()
    for (const values of localized.values.values()) {
      for (const [name, canonical] of values) if (ValueSets.has("booleans", canonical)) words.set(name, canonical)
    }
    VocabularyProperties.booleanWords.set(localized, words)
    return words
  }

  /** Cache for `booleans()`. */
  private static booleanWords = new WeakMap<LocalizedVocabulary, Map<string, string>>()

  /** Reflected text of a primitive, `null` (remove) for nothing. */
  private static text(value: unknown): string | null {
    if (value === undefined || value === null || value === false || value === "") return null
    if (Array.isArray(value)) return value.join(",")
    return typeof value === "string" ? value : typeof value === "number" ? String(value) : null
  }
}

/** A Lit declaration plus the vocabulary facts `UIElement` needs per property. */
export type VocabularyDeclaration = PropertyDeclaration & {
  /** the attribute it came from */
  spec: AttributeSpec
  /** starting value set in the constructor, `undefined` for none */
  initial: unknown
}
