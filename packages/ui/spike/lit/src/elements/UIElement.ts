import { LitElement, type PropertyValues } from "lit"

import { proto } from "$/util"
import { ClassBuilder } from "$/elements"
import { loadUI, RUNTIME_KEY, type RuntimeGlobal, type UIRuntime } from "$/runtime"
import { type ComponentVocabulary, type Dictionary, type LocalizedVocabulary, Vocabulary } from "$/vocabulary"

import {
  ERROR_EVENT,
  ERRORED_STATE,
  type DeclaredProps,
  type EmitOptions,
  type EventName,
  type FallbackClass,
  type PartName,
  type SheetEntry,
  type SlotName,
  type TextKey
} from "./elements.types"
import { PartOwners } from "./PartOwners"
import { VocabularyProperties, type VocabularyDeclaration } from "./VocabularyProperties"

/**
 * Lit base class for every `ui-*` element in the spike.
 * - Attributes come FROM THE VOCABULARY:  `class UIButton extends UIElement.for(buttonVocabulary)` declares one
 *   reactive property per vocabulary attribute (see `VocabularyProperties`) and types them all
 *   (`VocabularyProps`), so no component spells an attribute name.
 * - Shadow root via `createRenderRoot()`, `delegatesFocus` from `@proto static delegatesFocus`.
 * - Styles:  NOT Lit's `static styles`.  The shared `UI` runtime owns every sheet (`UI.styles`), so on connect
 *   the element awaits `UI.load()` and adopts foundation + `@proto static sheets` + utilities + app sheet.
 *   The FIRST render waits for the runtime too (`scheduleUpdate()`), so nothing paints unstyled.
 * - `attachInternals()` always:  custom states (`setState()`), ARIA, and `internals.form` for form-associated
 *   subclasses.
 * - Helpers read names through the vocabulary:  `emit("ui-change")` dispatches the LOCALIZED event on a
 *   translated element, `partName("icon")` adds the localized part, `slotName("icon")` is the localized slot.
 * - Controlled properties (`transition()`):  event first, then the change -- unless the event was cancelled
 *   or the host wrote the property from inside its handler, which wins (React-style revert).
 * - Upgrade backstop:  Lit's own `__saveInstanceProperties()` already deletes and replays properties a
 *   framework set before the element was defined, for every declared property.  Nothing to add.
 * - Registration (`define()`) also records the tag with `PartOwners` (owner context) and queues the
 *   vocabulary's `texts` for `UI.i18n`, registered once the runtime is in.
 * - Every `slotchange` in the shadow root is reported to `PartOwners`, so re-slotted parts find their owner.
 * - Failure:  a throw anywhere in an update (`willUpdate()`, `render()`, `updated()` ...) is caught;  the element
 *   logs it once, dispatches a cancelable `ui-error`, gets `:state(errored)`, shows its family's native fallback
 *   (`@proto static Fallback`) and never renders again -- see `failed()`.
 */
export class UIElement extends LitElement {
  /** canonical vocabulary;  installed on the prototype by `for()` */
  declare vocabulary: ComponentVocabulary
  /** localized names when registered under a translated tag by `define(tag, dictionary)` */
  declare localized: LocalizedVocabulary | undefined
  /** vocabulary property declarations, by property name;  installed by `declareVocabulary()` */
  declare declarations: ReadonlyMap<string, VocabularyDeclaration>
  /** shadow root delegates focus to its first focusable element (buttons, comboboxes) */
  declare delegatesFocus: boolean
  /** sheets to register and adopt, in cascade order after the foundation */
  declare sheets: readonly SheetEntry[]
  /** a generic content part (`ContentPart`):  transparent to other parts' owner lookup */
  declare contentPart: boolean
  /** forward the host's `aria-label` into the shadow root (see `ariaLabelled`), e.g. icon-only buttons */
  declare forwardsAriaLabel: boolean
  /**
   * Native fallback shown when an update throws (`$/components/<name>/<name>.fallback.ts`);  none => a bare
   * `<slot>`, so a group's children stay visible.
   * - NOTE: capitalized (a class), so it can never clash with a vocabulary attribute's property.
   */
  declare Fallback: FallbackClass | undefined

  @proto static localized: LocalizedVocabulary | undefined = undefined
  @proto static delegatesFocus = false
  @proto static sheets: readonly SheetEntry[] = []
  @proto static contentPart = false
  @proto static forwardsAriaLabel = false
  @proto static Fallback: FallbackClass | undefined = undefined

  /** `ElementInternals`:  states, ARIA, forms */
  readonly internals: ElementInternals

  /** properties being transitioned right now => did the host write them during the event? */
  private readonly hostWrites = new Map<PropertyKey, boolean>()

  /** Set by the first failed update (`failed()`):  the element never renders again. */
  private failure: { error: unknown } | undefined

  constructor() {
    super()
    this.internals = this.attachInternals()
    for (const [name, declaration] of this.declarations ?? []) {
      if (declaration.initial !== undefined) (this as Record<string, unknown>)[name] = declaration.initial
    }
  }

  ////////////////
  // ## Declaration
  ////////////////

  /**
   * `this` extended with one reactive property per attribute of `vocabulary`, typed by kind.
   * - `Overrides` retypes properties the vocabulary can't describe, e.g. `{ value: DropdownValue }`.
   * - Returns an intermediate class;  `class UIButton extends UIElement.for(buttonVocabulary) {}`.
   */
  static for<T extends typeof UIElement, V extends ComponentVocabulary, Overrides extends object = object>(
    this: T,
    vocabulary: V
  ): T & (new (...args: any[]) => InstanceType<T> & DeclaredProps<V, Overrides>) {
    const Declared = class extends (this as typeof UIElement) {}
    Object.defineProperty(Declared.prototype, "vocabulary", { value: vocabulary, writable: true, configurable: true })
    Declared.declareVocabulary(vocabulary)
    return Declared as never
  }

  /**
   * `createProperty()` for every attribute of `vocabulary`, under canonical or `localized` names.
   * - SIDE EFFECT:  installs `declarations` on this class's prototype.
   */
  protected static declareVocabulary(vocabulary: ComponentVocabulary, localized?: LocalizedVocabulary) {
    const declarations = VocabularyProperties.declarations(vocabulary, localized)
    for (const [name, declaration] of declarations) this.createProperty(name, declaration)
    Object.defineProperty(this.prototype, "declarations", { value: declarations, writable: true, configurable: true })
  }

  /** Mirror `@proto static delegatesFocus` into Lit's `shadowRootOptions`, which SSR reads. */
  static protoDefined(name: string | symbol, value: unknown) {
    if (name === "delegatesFocus") this.shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: !!value }
  }

  ////////////////
  // ## Registration
  ////////////////

  /**
   * Register this class under its vocabulary tag, or under a translated `tag` with `dictionary`.
   * - Translated:  defines a SUBCLASS whose properties are redeclared with localized attribute names and
   *   value maps (Lit fixes `attribute:` at declaration time), and whose `emit()` / `partName()` / `slotName()`
   *   use localized names.  Everything inside stays canonical.
   * - The tag's prefix (`ie` of `ie-boton`) is the event prefix (`ie-cambio`).
   * - Idempotent:  returns the already-registered class.
   */
  static define(tag?: string, dictionary?: Dictionary): CustomElementConstructor {
    const vocabulary = this.prototype.vocabulary
    const name = tag ?? vocabulary.tag
    const existing = customElements.get(name)
    if (existing) return existing
    PartOwners.register(name, vocabulary, this.prototype.contentPart)
    UIElement.queueTexts(vocabulary)
    if (!dictionary && name === vocabulary.tag) {
      customElements.define(name, this)
      return this
    }
    const localized = {
      ...new Vocabulary().resolve(vocabulary, name.slice(0, name.indexOf("-")), dictionary),
      tag: name
    }
    const Localized = class extends this {}
    Object.defineProperty(Localized.prototype, "localized", { value: localized, writable: true, configurable: true })
    Localized.declareVocabulary(vocabulary, localized)
    customElements.define(name, Localized)
    void loadUI().then((ui) => {
      ui.vocabulary.register(vocabulary)
      ui.vocabulary.localized.set(name, localized)
    })
    return Localized
  }

  ////////////////
  // ## Lifecycle
  ////////////////

  /**
   * Open shadow root, delegating focus per `delegatesFocus`;  reuses a declarative (SSR) one.
   * - SIDE EFFECT:  reports every `slotchange` inside to `PartOwners` (it bubbles, but isn't composed).
   */
  protected override createRenderRoot() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open", delegatesFocus: this.delegatesFocus })
    root.addEventListener("slotchange", UIElement.onSlotChange)
    return root
  }

  /** Also watch the host's `aria-label` when it's forwarded. */
  static override get observedAttributes() {
    const names = super.observedAttributes
    return this.prototype.forwardsAriaLabel ? [...names, ARIA_LABEL] : names
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === ARIA_LABEL && this.forwardsAriaLabel) this.requestUpdate()
    else super.attributeChangedCallback(name, old, value)
  }

  /** Adopt sheets once the runtime is in (at once if it already is). */
  override connectedCallback() {
    super.connectedCallback()
    if (UIElement.runtime) this.adoptSheets()
    else void UIElement.loadRuntime().then(() => this.adoptSheets())
  }

  /**
   * Hold the FIRST render until the runtime has loaded, so it paints styled and can use `UI`.
   * - Every update runs through `guardedUpdate()`, so a throw becomes `failed()`, not an unhandled rejection.
   */
  protected override scheduleUpdate(): void | Promise<unknown> {
    if (UIElement.runtime) return this.guardedUpdate()
    return UIElement.loadRuntime().then(() => this.guardedUpdate())
  }

  /**
   * `super.scheduleUpdate()` (Lit's `performUpdate()`), with any throw handed to `failed()`.
   * - Catches the whole cycle:  `performUpdate()` rethrows from `willUpdate()` / `update()` / `render()` after
   *   marking the update done, and `firstUpdated()` / `updated()` throw straight through.
   */
  private guardedUpdate(): void | Promise<unknown> {
    try {
      return super.scheduleUpdate()
    } catch (error) {
      this.failed(error)
    }
  }

  /** Never again after a failure:  Lit would re-render over the fallback, and `updated()` hooks would fight it. */
  protected override shouldUpdate(changed: PropertyValues): boolean {
    return !this.failure && super.shouldUpdate(changed)
  }

  /**
   * Register this class's sheets (once) and adopt `sheetNames()` into the shadow root.
   * - Call again when `sheetNames()` changes;  a no-op before the runtime is in (connect adopts then).
   */
  protected adoptSheets() {
    const ui = UIElement.runtime
    if (!ui || !this.isConnected) return
    const constructor = this.constructor as typeof UIElement
    if (!UIElement.registered.has(constructor)) {
      for (const [name, css] of this.sheets) ui.styles.register(name, css)
      UIElement.registered.add(constructor)
    }
    ui.styles.adoptInto(this.renderRoot as ShadowRoot, this.sheetNames())
  }

  /**
   * Registered sheet names to adopt, in cascade order:  `sheets` by default.
   * - Override to add another component's sheet by NAME, e.g. a statistic's label adopts `parts`;  a name
   *   nobody registered is skipped by `UI.styles`, and picked up once it is.
   */
  protected sheetNames(): string[] {
    return this.sheets.map(([name]) => name)
  }

  ////////////////
  // ## Failure
  ////////////////

  /**
   * The first update that threw:  degrade to the family's native fallback.
   * - SIDE EFFECT:
   *   - one `console.error` naming the tag, with the cause
   *   - `:state(errored)`
   *   - a cancelable, bubbling, composed `ui-error` (`{ error }`);  an app cancelling it keeps the fallback out
   *     and gets an EMPTY shadow root to take over
   *   - unless cancelled, `Fallback.render(host, shadowRoot, error, internals)` replaces the shadow content
   *     (plain DOM, the same markup the Solid spike renders);  adopted sheets stay, so it's styled
   * - Later updates are skipped (`shouldUpdate()`), so this runs once per instance.
   */
  private failed(error: unknown) {
    if (this.failure) return
    this.failure = { error }
    console.error(`<${this.localName}> failed:`, error)
    this.setState(ERRORED_STATE, true)
    const event = new CustomEvent(ERROR_EVENT, { bubbles: true, composed: true, cancelable: true, detail: { error } })
    const root = this.renderRoot as ShadowRoot
    // cancelled:  the last good render is stale (it never updates again), so it goes too, as in the Solid spike
    if (!this.dispatchEvent(event)) root.replaceChildren()
    else if (this.Fallback) this.Fallback.render(this, root, error, this.internals)
    else root.replaceChildren(this.ownerDocument.createElement("slot"))
  }

  ////////////////
  // ## Runtime
  ////////////////

  /** The page runtime once loaded;  `undefined` before, and always under SSR. */
  static runtime: UIRuntime | undefined = (globalThis as RuntimeGlobal)[RUNTIME_KEY]

  /** In-flight load, shared by every element. */
  private static loading: Promise<UIRuntime> | undefined

  /** Classes whose sheets are registered. */
  private static readonly registered = new WeakSet<typeof UIElement>()

  /** Vocabularies whose `texts` wait for the runtime. */
  private static readonly pendingTexts: ComponentVocabulary[] = []

  /** `UI.load()`, remembering the instance so later callers stay synchronous. */
  static loadRuntime(): Promise<UIRuntime> {
    return (UIElement.loading ??= loadUI().then((ui) => {
      UIElement.runtime = ui
      UIElement.flushTexts(ui)
      return ui
    }))
  }

  /**
   * Register `vocabulary`'s English `texts` with `UI.i18n`:  now if the runtime is in, else once it loads.
   * - Doesn't load the runtime itself, so `define()` stays side-effect-light (and SSR-safe).
   */
  private static queueTexts(vocabulary: ComponentVocabulary) {
    if (!vocabulary.texts.length) return
    UIElement.pendingTexts.push(vocabulary)
    if (UIElement.runtime) UIElement.flushTexts(UIElement.runtime)
  }

  /**
   * Add every pending vocabulary's texts to the `en` pack, so `UI.i18n.t("or")` resolves through the pack
   * and a translation (`register("es", { or: "o" })`) wins over it.
   * - A key the pack already has keeps its text:  shared keys (`loading`) stay the runtime's.
   */
  private static flushTexts(ui: UIRuntime) {
    const pack: Record<string, string> = {}
    for (const vocabulary of UIElement.pendingTexts.splice(0)) {
      for (const { key, text } of vocabulary.texts) if (!ui.i18n.has(key) && !(key in pack)) pack[key] = text
    }
    if (Object.keys(pack).length) ui.i18n.register("en", pack)
  }

  ////////////////
  // ## Classes, states, names
  ////////////////

  /**
   * Fomantic class string for the current properties, via the vocabulary's `ClassBuilder`.
   * - `overrides` replaces values by CANONICAL attribute name, e.g. the labeled-button wrapper's `labeled`.
   */
  protected classes(extra?: string, overrides?: Readonly<Record<string, unknown>>): string {
    const values: Record<string, unknown> = {}
    for (const [name, declaration] of this.declarations) {
      values[declaration.spec.name] = (this as Record<string, unknown>)[name]
    }
    if (overrides) Object.assign(values, overrides)
    return UIElement.builder(this.vocabulary).build(values, { extra })
  }

  /** Turn custom state `name` (`:state(open)`) on or off. */
  protected setState(name: string, on: boolean) {
    const states = this.internals.states as Set<string> | undefined
    if (!states) return
    if (on) states.add(name)
    else states.delete(name)
  }

  /** `part` attribute for canonical part `name`, plus its localized name on a translated element. */
  protected partName(name: PartName<this["vocabulary"]>): string {
    const localized = this.localized?.names.parts.get(name)
    return localized && localized !== name ? `${name} ${localized}` : name
  }

  /** Slot name for canonical slot `name`:  localized on a translated element. */
  protected slotName(name: SlotName<this["vocabulary"]>): string {
    return this.localized?.names.slots.get(name) ?? name
  }

  /**
   * User-visible text `key`:  `UI.i18n` when it knows the key, else the vocabulary's English text.
   * - `{name}` placeholders filled from `params`.  Works before the runtime loads (and under SSR).
   */
  protected t(key: TextKey<this["vocabulary"]>, params?: Record<string, string | number>): string {
    const i18n = UIElement.runtime?.i18n
    if (i18n?.has(key)) return i18n.t(key, params)
    const text = this.vocabulary.texts.find((spec) => spec.key === key)?.text ?? key
    return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text
  }

  /**
   * The host's `aria-label`, for elements that forward it (`forwardsAriaLabel`) onto their semantic root:
   * an icon-only button or label has no text to be named by.
   */
  protected ariaLabelled(): string | undefined {
    return this.getAttribute(ARIA_LABEL) ?? undefined
  }

  /** Light-DOM children assigned to canonical slot `name` (`""` ~== default slot). */
  protected slotted(name: SlotName<this["vocabulary"]>): Element[] {
    const slot = this.slotName(name)
    // SSR:  the DOM shim has no light-DOM children, so slotted content is invisible on the server
    return [...(this.children ?? [])].filter((child) => child.slot === slot)
  }

  ////////////////
  // ## Events and controlled properties
  ////////////////

  /**
   * Dispatch canonical event `name` (localized on a translated element):  bubbling, composed.
   * - Returns false when a cancelable event was cancelled.
   */
  protected emit<D>(name: EventName<this["vocabulary"]>, detail: D, { cancelable = false }: EmitOptions = {}): boolean {
    const type = this.localized?.names.events.get(name) ?? name
    return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable }))
  }

  /**
   * A user-driven change of controlled `property` to `next`:  event first, then the change.
   * - Skipped when the event was cancelled, or when the host set `property` from its handler -- the host's
   *   value is authoritative, so `el.value = old` in a `ui-change` handler reverts the UI.
   * - Returns true when `next` was applied.
   */
  protected transition<K extends keyof this>(
    property: K,
    next: this[K],
    event: EventName<this["vocabulary"]>,
    detail: object,
    options: EmitOptions = {}
  ): boolean {
    this.hostWrites.set(property, false)
    let allowed = false
    try {
      allowed = this.emit(event, detail, options)
    } finally {
      if (this.hostWrites.get(property)) allowed = false
      this.hostWrites.delete(property)
    }
    if (allowed) this[property] = next
    return allowed
  }

  /** Notice host writes to properties inside `transition()`. */
  override requestUpdate(...args: Parameters<LitElement["requestUpdate"]>) {
    const [name] = args
    if (name !== undefined && this.hostWrites.has(name)) this.hostWrites.set(name, true)
    super.requestUpdate(...args)
  }

  /** Changed CANONICAL attribute names in `changed`, for subclasses that care. */
  protected changedAttributes(changed: PropertyValues): Set<string> {
    const names = new Set<string>()
    for (const key of changed.keys()) {
      const spec = this.declarations.get(String(key))?.spec
      if (spec) names.add(spec.name)
    }
    return names
  }

  ////////////////
  // ## Internals
  ////////////////

  /** `ClassBuilder` per vocabulary, built once. */
  private static builder(vocabulary: ComponentVocabulary): ClassBuilder {
    let builder = UIElement.builders.get(vocabulary)
    if (!builder) UIElement.builders.set(vocabulary, (builder = new ClassBuilder(vocabulary)))
    return builder
  }

  /** Cache for `builder()`. */
  private static readonly builders = new WeakMap<ComponentVocabulary, ClassBuilder>()

  /** Report a slot's new assignment to `PartOwners`;  shared by every shadow root. */
  private static onSlotChange(event: Event) {
    const slot = event.target
    if (slot instanceof HTMLSlotElement) PartOwners.reslotted(slot.assignedElements({ flatten: true }))
  }
}

/** Platform attribute forwarded by `forwardsAriaLabel` elements. */
const ARIA_LABEL = "aria-label"
