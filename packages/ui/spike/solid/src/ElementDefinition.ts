import { register } from "component-register"
import { withSolid } from "@solidjs/element"
import { createMemo } from "solid-js"

import { camelCase } from "$/util"
import { ClassBuilder } from "$/elements"
import {
  Converters,
  ValueSets,
  Vocabulary,
  type ComponentVocabulary,
  type Dictionary,
  type LocalizedVocabulary
} from "$/vocabulary"

import type { RawProps, RegisterPropDefinition, ResolvedAttribute } from "./spike.types"
import type { UIHost } from "./UIHost"

/**
 * Everything `@solidjs/element` / `component-register` need to know about ONE registered tag, derived from a
 * `ComponentVocabulary` (+ an optional translation `Dictionary`) -- so a component never spells an attribute,
 * event, slot or part name.
 * - Props definition:  one entry per vocabulary attribute, keyed by the (localized) camelCase property name,
 *   `attribute` = the (localized) attribute name, `parse: false` + `reflect: false` -- this class converts
 *   (`Converters`, yes/no aware) and reflects (`true` => `""`, NEVER `"true"` / `"false"`) instead.
 * - Values:  localized values (`rojo`) are canonicalized BEFORE conversion, so `ClassBuilder` and the component
 *   only ever see canonical English (`red`).
 * - `register()` defines the element:  `register(tag, props, { BaseElement })(withSolid(render))`, which is what
 *   `customElement()` does minus the base-class option it doesn't expose.  The library's class is captured
 *   (not defined) and subclassed once more for the upgrade-property backstop.
 * - One instance per tag;  the canonical tag and each translated alias get their own.
 */
export class ElementDefinition {
  /** Canonical vocabulary. */
  readonly vocabulary: ComponentVocabulary

  /** Names under this tag's prefix + dictionary. */
  readonly localized: LocalizedVocabulary

  /** Tag this definition registers, e.g. `ui-button` or `ie-boton`. */
  readonly tag: string

  /** Class-grammar builder for the canonical vocabulary. */
  readonly builder: ClassBuilder

  /** Every attribute, in vocabulary order. */
  readonly attributes: readonly ResolvedAttribute[]

  /** Resolved attribute by canonical name (`allow-additions`). */
  private readonly byName = new Map<string, ResolvedAttribute>()

  /** Resolved attribute by property key (`allowAdditions`, or a localized key). */
  private readonly byKey = new Map<string, ResolvedAttribute>()

  /** Resolved attribute by the (localized) attribute name authors write. */
  private readonly byAttribute = new Map<string, ResolvedAttribute>()

  /** Private registry, so `canonicalize()` can map multi-word values for THIS tag without the runtime. */
  private readonly names = new Vocabulary()

  constructor(vocabulary: ComponentVocabulary, { tag, dictionary }: ElementDefinitionProps = {}) {
    this.vocabulary = vocabulary
    const prefix = tag ? tag.slice(0, tag.indexOf("-")) : undefined
    this.names.register(vocabulary)
    const localized = this.names.define(prefix, dictionary).get(vocabulary.tag)!
    this.localized = localized
    // a tag the dictionary doesn't name (an English alias, `ui-later`) is fine:  names still resolve by prefix
    this.tag = tag ?? localized.tag
    this.builder = new ClassBuilder(vocabulary)
    this.attributes = vocabulary.attributes.map((spec) => {
      const attribute = localized.names.attributes.get(spec.name) ?? spec.name
      const canonicalKey = spec.property ?? camelCase(spec.name)
      const key = this.safeKey(attribute === spec.name ? canonicalKey : camelCase(attribute))
      const reflect = spec.kind !== "json" && spec.reflect !== false
      const resolved: ResolvedAttribute = { spec, attribute, key, canonicalKey, reflect }
      this.byName.set(spec.name, resolved)
      this.byKey.set(key, resolved)
      this.byAttribute.set(attribute, resolved)
      return resolved
    })
  }

  ////////////////
  // ## Names
  ////////////////

  /** Attribute resolved from canonical `name`;  throws on a name the vocabulary doesn't have. */
  attribute(name: string): ResolvedAttribute {
    const attribute = this.byName.get(name)
    if (!attribute) throw new Error(`<${this.tag}>: no attribute ${JSON.stringify(name)} in the vocabulary`)
    return attribute
  }

  /**
   * Property key for `key`, renamed when it would shadow a NATIVE `HTMLElement` member:  `style` => `iconStyle`,
   * `hidden` => `dividerHidden`.
   * - Why:  `component-register` defines an accessor per prop on the element class, so a vocabulary attribute
   *   named `style` would replace `element.style` (a `CSSStyleDeclaration`) for every framework and author.
   * - The ATTRIBUTE keeps its name;  the vocabulary should set `property` for these (see REPORT.md).
   * - SIDE EFFECT (dev only):  warns once per rename.
   */
  private safeKey(key: string): string {
    if (typeof HTMLElement === "undefined" || !(key in HTMLElement.prototype)) return key
    const renamed = `${camelCase(this.vocabulary.noun)}${key.charAt(0).toUpperCase()}${key.slice(1)}`
    if (import.meta.env?.DEV) {
      console.warn(
        `<${this.vocabulary.tag}>: attribute property ${JSON.stringify(key)} shadows HTMLElement.${key}; using ${renamed}`
      )
    }
    return renamed
  }

  /** Attribute resolved from property `key`, if any. */
  attributeForKey(key: string): ResolvedAttribute | undefined {
    return this.byKey.get(key)
  }

  /** Localized event name, e.g. `ui-change` => `ie-cambio`. */
  event(name: string): string {
    return this.localized.names.events.get(name) ?? name
  }

  /** Localized slot name;  `""` stays the default slot. */
  slot(name: string): string {
    return this.localized.names.slots.get(name) ?? name
  }

  /** `part` attribute value:  the canonical part, plus the localized one when it differs (see `PartSpec`). */
  part(name: string): string {
    const localized = this.localized.names.parts.get(name) ?? name
    return localized === name ? name : `${name} ${localized}`
  }

  ////////////////
  // ## Values
  ////////////////

  /**
   * Converted, canonical values over `props`:  one lazy memo per attribute, exposed as getters keyed by
   * camelCase CANONICAL name (`AttributeValues<V>`).
   * - MUST be called under an owner (the component's root), since it creates memos.
   */
  values<T>(props: RawProps): T {
    const values = {} as Record<string, unknown>
    for (const attribute of this.attributes) {
      const memo = createMemo(() => this.convert(attribute, props[attribute.key]), { lazy: true })
      Object.defineProperty(values, attribute.canonicalKey, { get: memo, enumerable: true })
    }
    return values as T
  }

  /**
   * Raw property / attribute value => canonical, typed value, per `spec.kind`.
   * - absent => `spec.default` (converted), else the kind's empty value
   * - SIDE EFFECT (dev only):  enum converters warn about unknown values, with a suggestion
   */
  convert(attribute: ResolvedAttribute, raw: unknown): unknown {
    const { spec } = attribute
    const value = this.canonicalValue(attribute, raw ?? spec.default ?? undefined)
    const where = { attribute: attribute.attribute, tag: this.tag }
    switch (spec.kind) {
      case "keyOnly":
      case "boolean":
        return Converters.boolean(value as string | boolean | null | undefined, attribute.attribute)
      case "keyOrValueAndKey":
        return Converters.keyOrValue(value as string | boolean | null | undefined, ValueSets.of(spec), where)
      case "size":
      case "color":
      case "enum":
      case "valueAndKey":
      case "textAlign":
      case "verticalAlign": {
        const set = ValueSets.of(spec)
        if (value == null || value === "") return undefined
        return set ? Converters.enumValue(ElementDefinition.text(value), set, where) : ElementDefinition.text(value)
      }
      case "number":
        return Converters.number(value as string | number | null | undefined)
      case "json":
        return Converters.json(value)
      case "width":
      case "multiple":
        return value == null || value === "" ? undefined : (value as string | number)
      default:
        return value == null ? undefined : Array.isArray(value) ? value : ElementDefinition.text(value)
    }
  }

  /** Localized value => canonical (`rojo` => `red`, `movil tableta` => `mobile tablet`);  others unchanged. */
  private canonicalValue(attribute: ResolvedAttribute, value: unknown): unknown {
    if (typeof value !== "string" || !this.localized.values.has(attribute.spec.name)) return value
    return this.names.canonicalize(this.localized.tag, attribute.attribute, value)?.value ?? value
  }

  ////////////////
  // ## Reflection
  ////////////////

  /**
   * Reflect property `key`'s new `value` onto `host`'s attribute.
   * - Booleans:  `""` or removed;  `keyOrValueAndKey`:  `""` for bare, else the value;  arrays:  comma-joined.
   * - Canonical values are written LOCALIZED (`red` => `rojo` on `<ie-boton>`).
   * - No-op when the attribute already holds that text, which also breaks the
   *   property => attribute => property loop.
   */
  reflect(host: UIHost, key: string, value: unknown) {
    const attribute = this.byKey.get(key)
    if (!attribute?.reflect) return
    const text = this.attributeText(attribute, value)
    if (host.getAttribute(attribute.attribute) === text) return
    host.reflecting = true
    try {
      if (text === null) host.removeAttribute(attribute.attribute)
      else host.setAttribute(attribute.attribute, text)
    } finally {
      host.reflecting = false
    }
  }

  /** Attribute text for `value`, or `null` to remove it. */
  private attributeText(attribute: ResolvedAttribute, value: unknown): string | null {
    const { spec } = attribute
    if (spec.kind === "keyOnly" || spec.kind === "boolean") {
      return Converters.booleanToAttribute(Converters.boolean(value as string | boolean | null | undefined))
    }
    if (value == null || value === false) return null
    if (value === true) return ""
    if (Array.isArray(value)) return value.join(",")
    const text = ElementDefinition.text(value)
    return this.localized.names.values.get(spec.name)?.get(text) ?? text
  }

  ////////////////
  // ## Registration
  ////////////////

  /**
   * Define `this.tag` as a custom element rendering `render`, on top of `Host`;  returns the defined class.
   * - `component-register`'s `register()` builds `class CustomElement extends Host` and would call
   *   `customElements.define()` itself;  a capturing registry takes the class instead, so it can be subclassed
   *   once more (upgrade backstop, attribute-origin flag) and defined here.
   * - Static `formAssociated` comes through inheritance from `Host`.
   */
  register(render: ElementRender, Host: typeof UIHost): CustomElementConstructor {
    const existing = customElements.get(this.tag)
    if (existing) return existing
    const props: Record<string, RegisterPropDefinition> = {}
    for (const { key, attribute } of this.attributes) {
      props[key] = { value: undefined, attribute, notify: false, reflect: false, parse: false }
    }
    const capture = new CapturingRegistry()
    register(this.tag, props, {
      BaseElement: Host,
      customElements: capture as unknown as CustomElementRegistry
    })(withSolid(render as never))
    const Registered = capture.captured as unknown as RegisteredHost
    const byAttribute = this.byAttribute
    const name = ElementDefinition.className(this.tag)
    const Defined = {
      [name]: class extends Registered {
        connectedCallback() {
          super.connectedCallback()
          this.restoreUpgradedProperties()
        }

        attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
          if (this.reflecting) return
          this.fromAttribute = true
          try {
            // HACK: `component-register` ignores a removal when the property is falsy -- and a bare boolean
            // attribute's raw value is `""`, so `removeAttribute("disabled")` would never reach the element
            const key = byAttribute.get(name)?.key
            const self = this as unknown as Record<string, unknown>
            if (newValue === null && key && self[key] === "") self[key] = null
            else super.attributeChangedCallback(name, oldValue, newValue)
          } finally {
            this.fromAttribute = false
          }
        }
      }
    }[name]!
    ;(Defined as unknown as typeof UIHost).definition = this
    customElements.define(this.tag, Defined)
    return Defined
  }

  /** A primitive as attribute / class text;  anything else as JSON (never `[object Object]`). */
  private static text(value: unknown): string {
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    return JSON.stringify(value)
  }

  /** Readable class name for `tag`, e.g. `ui-button` => `UiButton`, kept by `keepNames` for devtools. */
  private static className(tag: string) {
    const camel = camelCase(tag)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }
}

/** Constructor props for `ElementDefinition`. */
export type ElementDefinitionProps = {
  /** Tag to register;  default the vocabulary's.  Its prefix (`ie`) also prefixes events. */
  tag?: string
  /** Translation;  default English identity. */
  dictionary?: Dictionary
}

/** The render function `withSolid` wraps. */
export type ElementRender = (props: RawProps, options: { element: UIHost }) => unknown

/** `component-register`'s element class, as our `register()` subclasses it. */
type RegisteredHost = new () => UIHost & {
  connectedCallback(): void
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void
}

/**
 * Stand-in `CustomElementRegistry` for `component-register`'s `register()`:  holds on to the class instead of
 * defining it.
 */
class CapturingRegistry {
  /** Class `define()` was handed. */
  captured?: CustomElementConstructor

  /** Nothing is ever defined here. */
  get(): undefined {
    return undefined
  }

  /** Keep the class. */
  define(_tag: string, constructor: CustomElementConstructor) {
    this.captured = constructor
  }
}
