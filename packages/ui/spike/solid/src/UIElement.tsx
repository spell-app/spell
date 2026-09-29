import { Show, createEffect, createErrorBoundary, createMemo, createSignal, untrack, type Accessor } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { proto } from "$/util"
import { RUNTIME_KEY, UI, type RuntimeGlobal } from "$/runtime"
import type { ClassInput } from "$/elements"
import type { ComponentVocabulary, Dictionary } from "$/vocabulary"

import type {
  AttributeName,
  AttributeValues,
  CamelCase,
  EventName,
  PartName,
  RawProps,
  SlotName,
  StateName,
  TextKey
} from "./spike.types"
import { Controlled } from "./Controlled"
import { ElementDefinition } from "./ElementDefinition"
import { PartContext } from "./PartContext"
import { UIHost } from "./UIHost"

/**
 * Base CONTROLLER of every component:  one instance per connection, created by the render function
 * `withSolid` calls, holding the component's signals, memos and handlers as fields and methods.
 * - Why a class around a render function:  the library's unit is a function `(props, { element }) => JSX`;
 *   a class keeps the repo's conventions (`@proto static` defaults, methods over loose helpers, one exported
 *   class per file) and gives `this.attrs` / `this.emit()` / `this.classes()` to every component.
 * - `attrs`:  converted, canonical attribute values, one memo each (`ElementDefinition.values()`).
 * - `classes()`:  `ClassBuilder.build()` in a memo, over `classValue()` (overridable, e.g. for controlled state).
 * - Styles:  `await UI.load()`, then the class's sheets (`@proto static styles`) are registered once and adopted
 *   into the shadow root;  content renders only then (`loaded()`), so there's no unstyled flash.
 * - Lifecycle:  the constructor may create signals / memos / effects for its OWN fields;  effects that call
 *   overridable methods are created in `mount()`, after every subclass field exists.
 * - NOTE: Solid 2 forbids signal writes inside an owned scope (component body, memo, effect compute).  Write
 *   from event handlers, promise callbacks or host callbacks only.
 */
export abstract class UIElement<V extends ComponentVocabulary = ComponentVocabulary> {
  declare vocabulary: V
  declare styles: Readonly<Record<string, string>>
  declare Host: typeof UIHost
  declare isPart: boolean

  /** Sheets to adopt after the foundation, by registry name => CSS text, in order. */
  @proto static styles: Readonly<Record<string, string>> = {}

  /** Host base class;  `FormElement` swaps in `FormHost`. */
  @proto static Host = UIHost

  /** A generic content part:  transparent to other parts' owner lookups (`PartContext`).  `ContentPart` sets it. */
  @proto static isPart = false

  /**
   * Wrap every element's render in its own error boundary, so one element's error disables THAT element
   * instead of halting reactivity for the page.  A switch only so `REPORT.md` can measure the cost.
   */
  static isolateErrors = true

  /** The element. */
  readonly host: UIHost

  /** Names and converters for this tag. */
  readonly definition: ElementDefinition

  /** Raw props from `withSolid`, keyed by property key. */
  readonly props: RawProps

  /** Converted canonical attribute values;  reading one tracks it. */
  readonly attrs: AttributeValues<V>

  /** Fomantic class string of the component's root. */
  readonly classes: Accessor<string>

  /** Runtime loaded and sheets adopted. */
  readonly loaded: Accessor<boolean>

  /** Sets `loaded`. */
  private readonly setLoaded: (value: boolean) => void

  constructor(host: UIHost, definition: ElementDefinition, props: RawProps) {
    this.host = host
    this.definition = definition
    this.props = props
    host.controller = this
    this.attrs = definition.values(props)
    const classInput = this.classInput()
    // `lazy`:  memos compute EAGERLY in Solid 2, and this one calls overridable methods that read subclass
    // fields, which don't exist yet while this constructor runs
    this.classes = createMemo(() => definition.builder.build(classInput, { extra: this.extraClasses() }), {
      lazy: true
    })
    // on the server (the SSR probe) there are no sheets to adopt:  render at once
    const loaded = isServer || (RUNTIME_KEY in globalThis && !!(globalThis as RuntimeGlobal)[RUNTIME_KEY])
    const [isLoaded, setLoaded] = createSignal(loaded)
    this.loaded = isLoaded
    this.setLoaded = setLoaded
    host.addPropertyChangedCallback((key: string, value: unknown) => {
      if (!host.fromAttribute) definition.reflect(host, key, value)
    })
    if (isServer) return
    const onSlotChange = (event: Event) => PartContext.slotChanged(event.target as HTMLSlotElement)
    host.shadowRoot!.addEventListener("slotchange", onSlotChange)
    host.addReleaseCallback(() => host.shadowRoot!.removeEventListener("slotchange", onSlotChange))
    if (!loaded) void UI.load().then(() => this.onLoaded())
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The component's shadow content;  runs once per connection, after styles are adopted. */
  abstract render(): JSX.Element

  /**
   * Create the effects that call overridable methods, then return the content.  Called by the render function.
   * - Host states follow `hostStates()`;  `ready` resolves once content has rendered with styles.
   */
  mount(): JSX.Element {
    // adopted HERE when the runtime was already loaded:  `sheetNames()` is overridable and may read subclass
    // fields, which don't exist yet while the base constructor runs
    if (!isServer && untrack(this.loaded)) this.adoptStyles()
    createEffect(
      () => this.hostStates(),
      (states) => {
        for (const [name, on] of Object.entries(states)) this.host.setState(name, !!on)
      }
    )
    createEffect(
      () => this.loaded(),
      (loaded) => {
        if (loaded) queueMicrotask(() => this.host.markReady())
      }
    )
    createEffect(
      () => this.sheetNames().join(" "),
      () => {
        if (untrack(this.loaded)) UI.styles.adoptInto(this.host.shadowRoot!, this.sheetNames())
      },
      { defer: true }
    )
    return <Show when={this.loaded()}>{this.render()}</Show>
  }

  /**
   * Registry names of the sheets to adopt now, in order;  default every `styles` entry.
   * - Tracked:  an element whose sheets depend on context (a label owned by a statistic adds `parts.css`)
   *   overrides it, and the root re-adopts when it changes.
   */
  protected sheetNames(): string[] {
    return Object.keys(this.styles)
  }

  /** Extra classes after the noun, e.g. `icon` for an icon-only button. */
  protected extraClasses(): string | undefined {
    return undefined
  }

  /** Value `ClassBuilder` sees for canonical attribute `name`;  default the converted attribute. */
  protected classValue(name: AttributeName<V>): unknown {
    const key = this.definition.attribute(name).canonicalKey as keyof AttributeValues<V>
    return this.attrs[key]
  }

  /**
   * Classes for a SECOND root from chosen attribute values, e.g. the wrapper of a labeled button.
   * - Keys are canonical attribute names, type-checked against the vocabulary.
   */
  protected buildClasses(values: Partial<Record<AttributeName<V>, unknown>>, extra?: string): string {
    return this.definition.builder.build(values, { extra })
  }

  /** Custom states to set on the host;  default none. */
  protected hostStates(): Partial<Record<StateName<V>, boolean>> {
    return {}
  }

  /** True when the element can't be used;  the host swallows clicks then. */
  isDisabled(): boolean {
    return false
  }

  /**
   * Auto-controlled state for attribute `name` (see `Controlled`):  the host's property when set, else internal.
   * - MUST be called from a field initializer or constructor (it creates a signal).
   */
  protected controlled<N extends AttributeName<V>>(
    name: N,
    initial: AttributeValues<V>[CamelCase<N> & keyof AttributeValues<V>]
  ): Controlled<AttributeValues<V>[CamelCase<N> & keyof AttributeValues<V>]> {
    const { key, canonicalKey } = this.definition.attribute(name)
    type Value = AttributeValues<V>[CamelCase<N> & keyof AttributeValues<V>]
    return new Controlled<Value>({
      host: this.host,
      key,
      raw: () => this.props[key],
      value: () => this.attrs[canonicalKey as keyof AttributeValues<V>] as Value,
      initial
    })
  }

  /** `ClassBuilder` input:  getters over `classValue()`, so the classes memo tracks exactly what it reads. */
  private classInput(): ClassInput {
    const input: Record<string, unknown> = {}
    for (const { spec } of this.definition.attributes) {
      Object.defineProperty(input, spec.name, {
        get: () => this.classValue(spec.name as AttributeName<V>),
        enumerable: true
      })
    }
    return input
  }

  ////////////////
  // ## Names
  ////////////////

  /** `part` attribute for canonical part `name`. */
  part(name: PartName<V>): string {
    return this.definition.part(name)
  }

  /** Localized slot name for canonical `name`. */
  slot(name: SlotName<V>): string {
    return this.definition.slot(name)
  }

  /** Text for `key` in the current locale, via `UI.i18n`. */
  text(key: TextKey<V>, params?: Record<string, string | number>): string {
    return UI.i18n.t(key, params)
  }

  ////////////////
  // ## Events
  ////////////////

  /**
   * Dispatch vocabulary event `name` from the host:  `bubbles`, `composed`, `cancelable` as the vocabulary says.
   * - Returns false when a cancelable event was vetoed (`preventDefault()`).
   */
  emit(name: EventName<V>, detail: object): boolean {
    const spec = this.definition.vocabulary.events.find((event) => event.name === name)
    const event = new CustomEvent(this.definition.event(name), {
      bubbles: true,
      composed: true,
      cancelable: !!spec?.cancelable,
      detail
    })
    return this.host.dispatchEvent(event)
  }

  ////////////////
  // ## Styles
  ////////////////

  /** Runtime arrived:  adopt, show content. */
  private onLoaded() {
    this.adoptStyles()
    this.setLoaded(true)
  }

  /** Register this class's sheets once, then adopt foundation + sheets into the shadow root. */
  private adoptStyles() {
    if (!SHEETS.has(this.styles)) {
      SHEETS.add(this.styles)
      for (const [name, css] of Object.entries(this.styles)) if (!UI.styles.has(name)) UI.styles.register(name, css)
    }
    UI.styles.adoptInto(
      this.host.shadowRoot!,
      untrack(() => this.sheetNames())
    )
  }

  ////////////////
  // ## Definition
  ////////////////

  /**
   * Define this component under its vocabulary's tag, or under a translated alias:
   * `UIButton.define("ie-boton", es)` registers `<ie-boton primario color="rojo">` with localized
   * attribute / property / event names mapping onto the same controller.
   * - Idempotent per tag;  returns the element class.
   */
  static define(this: UIElementClass, tag?: string, dictionary?: Dictionary): CustomElementConstructor {
    const { vocabulary, Host, isPart } = this.prototype
    const definition = new ElementDefinition(vocabulary, { tag, dictionary })
    PartContext.define(vocabulary, definition.tag, isPart)
    UIElement.registerTexts(vocabulary)
    return definition.register(
      (props, { element }) =>
        untrack(() => UIElement.isolate(element, () => new this(element, definition, props).mount())),
      Host
    )
  }

  /**
   * `render()` inside an error boundary (`createErrorBoundary`):  an error thrown while constructing, rendering
   * or updating this element empties ITS shadow root, sets `:state(errored)` and logs, and every other element
   * keeps working.
   * - Without it, one uncaught error halts Solid's scheduler for the whole page (`[REACTIVITY_HALTED]`).
   * - SIDE EFFECT:  resolves `host.ready`, so waiting code doesn't hang on a failed element.
   */
  private static isolate(host: UIHost, render: () => JSX.Element): JSX.Element {
    if (!UIElement.isolateErrors) return render()
    return createErrorBoundary(render, (error: Accessor<unknown>) => {
      const cause = error()
      if (!FAILED.has(host)) {
        FAILED.add(host)
        console.error(`<${host.localName}> failed and is disabled:`, cause)
      }
      host.setState(ERRORED, true)
      host.markReady()
      return undefined
    }) as unknown as JSX.Element
  }

  /**
   * Register `vocabulary` with `UI.vocabulary` and its English texts with `UI.i18n` when the class is DEFINED,
   * not on first connect, so `UI.i18n.t()` and translations see them before any instance exists.
   * - Loads the runtime if it isn't yet;  idempotent per vocabulary.
   */
  private static registerTexts(vocabulary: ComponentVocabulary) {
    if (isServer || TEXTS.has(vocabulary)) return
    TEXTS.add(vocabulary)
    if ((globalThis as RuntimeGlobal)[RUNTIME_KEY]) register()
    else void UI.load().then(register)

    /** Hand the vocabulary and its texts to the runtime;  keeps texts a translation registered earlier. */
    function register() {
      UI.vocabulary.register(vocabulary)
      const texts: Record<string, string> = {}
      for (const { key, text } of vocabulary.texts) if (!UI.i18n.has(key)) texts[key] = text
      UI.i18n.register("en", texts)
    }
  }
}

/** A concrete `UIElement` subclass, as `define()` sees it. */
export type UIElementClass = {
  new (host: UIHost, definition: ElementDefinition, props: RawProps): UIElement<any>
  prototype: UIElement<any>
}

/** `styles` maps whose sheets are registered with the runtime. */
const SHEETS = new WeakSet<object>()

/** Vocabularies whose texts are registered (or queued) with the runtime. */
const TEXTS = new WeakSet<ComponentVocabulary>()

/** Hosts whose failure was logged already. */
const FAILED = new WeakSet<UIHost>()

/** State an element enters when its render failed (see `isolate()`). */
const ERRORED = "errored"
