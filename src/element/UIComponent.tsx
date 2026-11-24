/*! Derived from `@solidjs/element` and `component-register`:  MIT licence, (c) Ryan Carniato. */
import {
  Errored,
  Show,
  createEffect,
  createMemo,
  createRenderEffect,
  getOwner,
  runWithOwner,
  untrack,
  type Accessor
} from "solid-js"
import { insert, isServer, type JSX } from "@solidjs/web"

// Import directly to avoid circular import
import { protoMerged } from "spell/util/decorators"
import { PLATFORMS, platformsIn } from "spell/util/platform"
import { E } from "spell/element"
// Import directly to avoid circular import
import { DOMElement, type TagSetup } from "./DOMElement"
import { controlled, cssState, on, onChange, state, untracked } from "./Reactive"
// a leaf of its own (Solid only), not part of `E`
import { ShadowEvents } from "./ShadowEvents"

/****************
 * ### `UIComponent`
 * The base class of every component, in every set:  Spell UI's, the epics', the app's, the brand's, a space's.
 *
 * Each `<ui-button>`, etc on a page gets ONE instance of its UIComponent's subclass (`UIButton`)
 * which decides what the element shows and how it behaves.  This is the base for those subclasses.
 *
 * - **DOMElement**: `component.domElement` (`DOMElement.ts`) is a subclass of the *browser's* `HTMLElement`,
 *   and is the object that the browser and all frameworks actually interact with.
 *
 *   For the most part this will be the base `DOMElement` class --
 *   subclasses of `UIComponent` which need extra functionality in the DOM will have a custom `DOMElement` subclass.
 *
 *   The custom element mechanism in the browser "upgrades" `<ui-button>`
 *   from *its* `HTMLElement` to *our* `DOMElement` automatically when we `define()` a component.
 *
 *   `domElement.component` is the link from the DOM back to this class.
 *
 * - **Custom element**:
 *   - the DOM element is the browser's side:  DOM API `connectedCallback()`, the attributes, the shadow root
 *   - this class is Solid's side:  it builds the component, renders it inside its own Solid root,
 *     and catches what it throws (see "Mounting" and "Errors and fallback")
 *
 * - **Lifecycle events** reach the component as methods (`onConnect()`, `onFormReset()` ...):  see "Lifecycle".
 *
 * - **Vocabulary**:  `UIButton.en.ts` (named for its language) names EVERYTHING the tag uses
 *   (attributes and their values, events, slots, parts, states, texts).
 *   Code never writes those names as strings:  it reads them from the vocabulary,
 *   so a translated tag (`<es-boton>`) runs the same code.
 *
 * - **State**:  fields that change over time are declared with a decorator, and read and written like a field:
 *   ```ts
 *   @state accessor isOpen = false     // this.isOpen = true;  if (this.isOpen) ...
 *   ```
 *   A read is always up to date, even right after a write;  JSX will update the view as the value changes.
 *   The decorators (`@state`, `@controlled`, `@derived`, `@cssState`, `@aria`, `@onChange`,
 *   `@whileConnected`, `@watches`, `@on`, `@untracked`) are in `Reactive.ts`.
 *
 * - **Attributes**:  every DOM element attribute has a getter/setter on the component,
 *   under its name in camelCase:  `this.size`, `this.closeIcon`.
 *   The value is already converted (`"true"` => `true`).
 *
 *   A class declares them for TypeScript with one line below it:
 *   `export interface UIButton extends E.AttributeValues<typeof buttonVocabulary> {}`.
 *
 * - **Base classes** (this one, `FormComponent`, `LoadableComponent` ...) never use a member name
 *   that any vocabulary uses for an attribute, or the member would hide that attribute's getter:
 *   - `elementDefinition`, not `definition` (an attribute of `<ui-table>`).
 *   `Reactive.test.tsx` checks every vocabulary against them.
 *
 * - **Lifecycle**:
 *   1. The HTML source includes the tag:  `UIButton.define()` (see "Defining the element")
 *   2. The first time the element is "connected" (DOM API `connectedCallback()`), `mount()` builds its component,
 *      then calls `onMount()`, which calls `render()` to return content for the shadow root;  then `onConnect()`
 *   3. The content shows once the runtime (`UI`) has loaded and the class's style sheets are in,
 *      so nothing flashes unstyled -- when the `component.isReady`.
 *   4. Moving the element keeps its component;  it ends only with `domElement.dispose()`
 *   5. If anything throws, a form control shows its plain-DOM fallback instead, any other element its children
 *      (see "Errors and fallback")
 *
 * - Solid 2 has one rule worth knowing here:  NEVER change state while Solid is drawing.
 *   That means inside `render()`, a getter, or the first function of an effect.
 *
 *   Change state in event handlers, `@onChange` methods, or after an `await`.
 *   (A decorated member's write won't throw there, but it's late.)
 *
 * - Subclasses fill in *Hooks* and set what's marked "Class setting:" with `@proto static`.
 *   It's all documented here once, so an override that only fills it in needs no docstring of its own.
 *   - Most settings are keys of ONE object, `elementSetup` (style sheets included), set with `@protoMerged static`:
 *     a subclass states only the keys it changes (`{ delegatesFocus: false }`).
 ****************/
export abstract class UIComponent<V extends E.ComponentVocabulary = E.ComponentVocabulary> {
  ////////////////
  // ## Vocabulary
  ////////////////

  /**
   * Every piece of human language the tag uses:
   *  its tag, attributes, events, slots, parts, states and texts, from `UI<Name>.en.ts`.
   * - No default:  each component sets its own (`@proto static vocabulary = buttonVocabulary`).
   * - Set on the class, not on each element:
   *   `define()` needs it before any element exists,
   *   and the runtime keeps the same object (Spell UI's `UI.vocabulary`).
   */
  declare vocabulary: V

  /**
   * The vocabulary as built for one actual tag, by `define()`:  the names this element really uses.
   * - Translated names:  a translated tag (`<es-boton>`) gets its own spelling of each attribute and event.
   * - How each attribute's text converts to a value, and how the classes are built.
   * - Its `.vocabulary` is the same object as `vocabulary` above.
   * - Not called `definition`, because `<ui-table>` has an attribute by that name
   *   (base classes never use an attribute's name).
   */
  readonly elementDefinition: E.ElementDefinition

  /** The `part` attribute value for the vocabulary's part `name` (translated on a translated tag). */
  partForName(name: E.PartName<V>): string {
    return this.elementDefinition.part(name)
  }

  /** The slot name for the vocabulary's slot `name` (translated on a translated tag). */
  slotForName(name: E.SlotName<V>): string {
    return this.elementDefinition.slot(name)
  }

  /**
   * The text for `key` in the page's language (the runtime's texts:  Spell UI's `UI.i18n`), with `params` filled in.
   * - Looked up for THIS component:  another component's text under the same key never shows here.
   */
  translationForKey(key: E.TextKey<V>, params?: Record<string, string | number>): string {
    return E.SpellSolid.settings.words.text(key, params, this.vocabulary.tag)
  }

  ////////////////
  // ## The DOM element
  ////////////////

  /**
   * The DOM element itself, the `<ui-button>` in the page:
   * a `DOMElement`, or the subclass `elementSetup.DOMElement` names.
   * - `domElement.component` points back to this object.
   * - A subclass that uses its DOM element class's own members says which class it is, as a type only:
   *   `declare readonly domElement: DOMFormControl` (`FormComponent`).
   */
  readonly domElement: DOMElement

  /**
   * Built once per element, the first time the element is connected (`UIComponent.mount()`).
   * - Two arguments in a row, not one object:  the server render (`spell/ui/static`) builds components the same way.
   * - It runs while Solid is drawing:  don't change state here (see the class docs).
   */
  constructor(domElement: DOMElement, definition: E.ElementDefinition) {
    this.domElement = domElement
    this.elementDefinition = definition
    domElement.component = this
    this.appContext = isServer ? null : UIComponent.appContextFor(domElement)
    this.internalState = { classInput: definition.classInput((name) => this.classValue(name as E.AttributeName<V>)) }
    this.isConnected = isServer || domElement.isConnected
    // the class's constant ARIA, on the server too:  short names (`live`) to `internals` properties (`ariaLive`)
    for (const [name, text] of Object.entries(this.elementSetup.aria) as [E.AriaName, string][])
      domElement.internals[E.AriaNames[name]] = text
    // on the server there are no style sheets to wait for:  draw at once
    const { runtime } = E.SpellSolid.settings
    this.isReady = isServer || runtime.isLoaded
    if (isServer) return
    this.startListeners()
    if (!this.isReady) void runtime.load().then(() => this.onRuntimeLoaded())
  }

  ////////////////
  // ## Lifecycle
  //
  // In the order they're called:
  // 1. the constructor (above), on the element's first connect
  // 2. `onMount()`, right after it, which calls `render()`
  // 3. `onConnect()`:  every time the element is added to a page, the first time included
  // 4. `onRuntimeLoaded()`, once, if the runtime (`UI`) wasn't loaded yet:  the content shows then
  // 5. form controls only, as the browser reports them:
  //    `onFormAssociated()`, `onFormDisabled()`, `onFormReset()`, `onFormStateRestore()`
  // 6. `onDisconnect()`:  every time it's removed;  the component stays for the next connect
  // -  `onMove()`:  instead of 6 then 3, when the page moves it with `moveBefore()`
  //
  // - The DOM element calls 3, 5 and 6 as the browser reports each event
  //   (DOM API `connectedCallback()`, the form callbacks ...).
  // - Each is a hook:  override the ones you need.
  // - The base class's own work is in `onMount()`, `onConnect()`, `onDisconnect()`, `onMove()` and `onFormDisabled()`:
  //   an override of those calls `super`.
  ////////////////

  /**
   * Set the element up and return its content, which `mount()` puts into the shadow root.
   * - Called once, by `mount()`, right after the constructor.
   * - SIDE EFFECTS:
   *   - adopts the class's style sheets into the shadow root (if the runtime has loaded),
   *     and the element's own `:host` rule (`hostLayout`)
   *   - keeps the element's `:state()`s in step with its `@cssState` members, `elementSetup.cssStates`
   *     and `cssStates()`;  for a state two classes of the chain name, the subclass's member wins
   *   - starts the `@onChange` and `@whileConnected` methods, the `@aria` members' effect,
   *     and the `@watches` methods' watch
   *   - follows `parent`, where the vocabulary declares it (`ParentLink`)
   *   - re-adopts the style sheets when `styleSheetNames` changes
   * - Not in the constructor, because a subclass's fields don't exist yet while the base constructor runs.
   * - Hook:  an override starts its own effects, then returns `super.onMount()`.
   */
  onMount(): JSX.Element {
    if (!isServer && untrack(() => this.isReady)) this.adoptStyleSheets()
    // a RENDER effect, so a getter that throws shows the element's fallback (a plain effect would only log it)
    const decorated = E.Reactive.cssStatesOf(this, this.elementSetup.cssStates)
    createRenderEffect(
      () => {
        const states: Record<string, boolean | undefined> = { ...this.fontStates, ...this.cssStates() }
        for (const { member, state: name } of decorated) states[name] = !!(this as Record<PropertyKey, unknown>)[member]
        return states
      },
      (states) => {
        for (const [name, isOn] of Object.entries(states)) this.domElement.setState(name, !!isOn)
      }
    )
    E.Reactive.startEffects(this)
    this.followParent()
    this.followHostLayout()
    // the names joined into one string, so the effect can tell "same names" from "new names"
    const separator = " "
    createEffect(
      () => this.styleSheetNames.join(separator),
      (names) => {
        if (untrack(() => this.isReady)) {
          E.SpellSolid.settings.styles.adoptInto(
            this.domElement.renderRoot,
            names ? names.split(separator) : [],
            this.vocabulary
          )
        }
      },
      { defer: true }
    )
    const { canRenderUnstyled } = this.elementSetup
    // `untrack`:  `<Show>` evaluates its children in a TRACKED computation,
    // so a reactive read in `render()`'s body (outside its JSX) would run it again and rebuild the whole view;
    // it runs ONCE
    return <Show when={canRenderUnstyled || this.isReady}>{untrack(() => this.render())}</Show>
  }

  /**
   * Hook:  the element was added to a page;  the first time right after `onMount()`.
   * - Keeps `isConnected` in step, a microtask later:
   *   the element may be connected while the app's Solid is drawing, when state can't change yet.
   * - A part re-checks which element it belongs to (`PartContext`).
   * - It may run while Solid is drawing:
   *   defer a state change (`E.afterSolidUpdate()`), or write an `ownedWrite` member.
   */
  onConnect() {
    const { domElement } = this
    E.afterSolidUpdate(() => (this.isConnected = domElement.isConnected))
    E.PartContext.connected(domElement)
  }

  /** The runtime has loaded:  adopt the style sheets, then show the content. */
  private onRuntimeLoaded() {
    this.adoptStyleSheets()
    this.isReady = true
  }

  /** Hook (form controls only):  the element's form owner changed (`null`:  none);  default nothing. */
  onFormAssociated(_form: HTMLFormElement | null) {}

  /**
   * Hook (form controls only):  a `<fieldset disabled>` around the element started or stopped disabling it.
   * - Keeps `formIsDisabled` in step;  a microtask later when it arrives while Solid is drawing.
   */
  onFormDisabled(disabled: boolean) {
    if (getOwner()) E.afterSolidUpdate(() => (this.formIsDisabled = disabled))
    else this.formIsDisabled = disabled
  }

  /** Hook (form controls only):  the form was reset:  restore the starting value;  default nothing. */
  onFormReset() {}

  /**
   * Hook (form controls only):  the browser restored a value (back / forward cache, autofill);  default nothing.
   * - `mode`:  `"restore"` or `"autocomplete"`.
   */
  onFormStateRestore(_state: File | string | FormData | null, _mode: string) {}

  /**
   * Hook:  the page moved the element with `moveBefore()` (DOM API `connectedMoveCallback()`).
   * - It stayed connected:  no `onDisconnect()`, no `onConnect()`, so nothing set up while connected starts again.
   * - A part re-checks which element it belongs to (`PartContext`):  a move can change it.
   * - It may run while Solid is drawing (Solid moves a node holding the focus with `moveBefore()`).
   */
  onMove() {
    E.PartContext.connected(this.domElement)
  }

  /** Hook:  the element was removed from its page.  The component stays, for the next connect. */
  onDisconnect() {
    const { domElement } = this
    E.afterSolidUpdate(() => (this.isConnected = domElement.isConnected))
  }

  ////////////////
  // ## Element setup
  ////////////////

  /**
   * Class setting:  how the class's custom element is set up, as ONE object (`ElementSetup` documents each key):
   * its style sheets, the `:state()`s that mirror an attribute, form control, focus, slots, part, DOM element class,
   * fallback, unstyled first paint, whether it's a root, ARIA,
   * and what the shared `disabled`, `loading`, `visible` and `animation` do for it.
   * - A subclass states only the keys it changes:
   *   `@E.protoMerged static elementSetup = { delegatesFocus: false } satisfies Partial<E.ElementSetup>`
   *   (`satisfies`, so a misspelt key fails TypeScript).
   * - Each class's object is chained to its base class's (`@protoMerged`):
   *   a key it doesn't state is read from the base's,
   *   so `CheckControl`'s `{ DOMElement: DOMCheckElement }` keeps the `{ isAFormControl: true }` of `FormComponent`.
   * - Read keys by name (`this.elementSetup.styleSheets`, `Class.prototype.elementSetup` outside an instance):
   *   a spread or `Object.keys()` of the whole object sees only its own class's keys.
   * - Key by key:  a key a subclass states replaces its base's whole,
   *   so a subclass's `styleSheets` replace its base's;  spread the base's to add to them
   *   (`styleSheets: { ...UISection.prototype.elementSetup.styleSheets, panel: panelCSS }`).
   * - `vocabulary` stays a setting of its own.
   */
  declare elementSetup: E.ElementSetup
  @protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: {},
    cssStates: [],
    isAFormControl: false,
    delegatesFocus: true,
    slotAssignment: "named",
    isAPart: false,
    DOMElement: DOMElement,
    Fallback: undefined,
    canRenderUnstyled: false,
    root: false,
    aria: {},
    disabled: "unusable",
    loading: "loader",
    error: "look",
    link: "click",
    resizable: "both",
    visible: "shown",
    // the runtime's (Spell UI's `"fade"`):  read as an element shows or hides, by then installed
    get animation() {
      return E.SpellSolid.settings.motion.defaultAnimation
    }
  }

  ////////////////
  // ## Shared words:  link, font, tooltip, label
  //
  // Four more attributes every element takes (`SharedVocabulary`;  epic `ui-gaps` P3, Owen's request r1),
  // unless its vocabulary declares its own of that name:
  // - `link` (and `target`):  where a click goes (`elementSetup.link`);  `:state(linked)`
  // - `font`:  how its letters look, several words at once (`font="bold italic"`):  `:state(font-bold)` ...;
  //   a family (`font="serif"`);  a size in pixels, `font="14"`, or with its line height, `font="10/20"`
  // - `tooltip`:  the browser's own tooltip, its `title`
  // - `label`:  its accessible name, `aria-label`
  ////////////////

  /**
   * The shared `link`:  where a click on the element goes (`elementSetup.link`).
   * - `undefined` without one, or where the family declares its own `link` (a card's look, until epic `ui-gaps` P4).
   */
  @cssState("linked")
  get sharedLink(): string | undefined {
    return this.sharedText(LINK)
  }

  /**
   * The shared `target`:  where the element's `link` opens (`_blank`, a window's name).
   * - A family that draws its own `<a>` for `link` gives it this `target`.
   * - `undefined` without one, or where the family declares its own `target`.
   */
  get sharedTarget(): string | undefined {
    return this.sharedText(TARGET)
  }

  /**
   * Where the element's own `<a>` goes:  its `link` (the family's own attribute, or the shared one),
   * unless the element is disabled (`isMarkedDisabled`).
   * - For a family that draws its own link (`elementSetup.link` is `"its own"`, or a `link` of its own):
   *   its `<a>`'s `href`, `linkTarget` its `target`.
   * - `undefined` without a `link`, with an empty one (a card's bare `link` is a look), or while disabled:
   *   the family draws no `href`, and a disabled link says `aria-disabled` itself.
   */
  get linkTo(): string | undefined {
    const link = E.Reactive.attributeValue(this, LINK)
    return typeof link === "string" && link !== "" && !this.isMarkedDisabled ? link : undefined
  }

  /**
   * Where `linkTo` opens (`_blank`, a window's name):  its `target`, the family's own or the shared one.
   * - `undefined` while it links nowhere.
   */
  get linkTarget(): string | undefined {
    if (!this.linkTo) return undefined
    const target = E.Reactive.attributeValue(this, TARGET)
    return typeof target === "string" && target !== "" ? target : undefined
  }

  /**
   * The words of the shared `font` (`bold italic serif`), as `:state(font-<word>)`s:  every word its spec lists,
   * on or off;  and `:state(font-size)` while it holds a size (`sharedFontSize`).
   * - Empty where the family declares its own `font`.
   */
  get fontStates(): Record<string, boolean> {
    if (!this.elementDefinition.takesShared(FONT)) return {}
    const written = new Set((this.sharedText(FONT) ?? "").split(/\s+/))
    const { values } = this.elementDefinition.attribute(FONT).spec
    const words = Array.isArray(values) ? values : [...written].filter((word) => !FONT_SIZE.test(word))
    return {
      ...Object.fromEntries(words.filter(Boolean).map((word) => [`${FONT}-${word}`, written.has(word)])),
      [FONT_SIZE_STATE]: this.sharedFontSize !== undefined
    }
  }

  /**
   * The size the shared `font` says, in pixels:  `font="14"` => `"14"`, `font="bold 10/20"` => `"10/20"`
   * (a 10px font on 20px lines);  `undefined` without one.
   * - Text, so `onFontSizeChanged()` runs only when it changes.
   */
  get sharedFontSize(): string | undefined {
    return this.sharedText(FONT)
      ?.split(/\s+/)
      .find((word) => FONT_SIZE.test(word))
  }

  /**
   * The shared `font`'s size changed:  the element's `--ui-font-size` (and `--ui-line-height`, with a leading),
   * which every component's sizes are worked out from, and `:state(font-size)` sets as its own font size.
   * - SIDE EFFECT:  writes them in the element's `style`;  removes them again once `font` has no size.
   */
  @onChange("sharedFontSize", { writesDOMElement: true })
  protected onFontSizeChanged(fontSize: string | undefined) {
    const { style } = this.domElement
    const [, size, leading] = fontSize?.match(FONT_SIZE) ?? []
    if (size) style.setProperty(FONT_SIZE_TOKEN, `${size}px`)
    else if (this.internalState.wroteFontSize) style.removeProperty(FONT_SIZE_TOKEN)
    // the leading as a ratio of the size, as `--ui-line-height` always is (`1.5`)
    if (size && leading) style.setProperty(LINE_HEIGHT_TOKEN, String(Number(leading) / Number(size)))
    else if (this.internalState.wroteFontSize) style.removeProperty(LINE_HEIGHT_TOKEN)
    this.internalState.wroteFontSize = !!size
  }

  /**
   * The shared `shadow`:  the hue of a hard shadow behind its letters (`shadow="yellow"`);  `:state(shadow)`.
   * - `undefined` without one, or where the family declares its own `shadow`.
   */
  @cssState("shadow")
  get sharedShadow(): string | undefined {
    return this.sharedText(SHADOW)
  }

  /**
   * The shared `shadow` changed:  its hue, as `--_ui-shadow-color` (the theme's `--ui-<hue>`), which `reset.css`
   * draws under `:state(shadow)`.
   * - SIDE EFFECT:  writes it in the element's `style`;  removes it again once `shadow` is gone.
   */
  @onChange("sharedShadow", { writesDOMElement: true })
  protected onShadowChanged(hue: string | undefined) {
    const { style } = this.domElement
    if (hue) style.setProperty(SHADOW_COLOR_TOKEN, `var(--ui-${hue})`)
    else if (this.internalState.wroteShadow) style.removeProperty(SHADOW_COLOR_TOKEN)
    this.internalState.wroteShadow = !!hue
  }

  /**
   * The shared `width`, `min-width` and `max-width`, and `height`, `min-height` and `max-height` where the
   * vocabulary takes them (`heights`):  any CSS lengths, by name;  each `undefined`
   * without one.
   * - A new record each time:  only the six attributes are read, so `onSizesChanged()` runs only when one changes.
   */
  get sharedSizes(): SharedSizes {
    return Object.fromEntries(SIZES.map((name) => [name, this.sharedText(name)])) as SharedSizes
  }

  /**
   * The shared sizes changed, or the element's style sheets arrived:  its box's own width and height where it sits.
   * - Each as a custom property (`--_ui-width`, `--_ui-height` ...) and a state (`:state(width)` ...), which
   *   `reset.css` draws:  on the element itself where it draws a box, else on its shadow root's top-level boxes
   *   (`:state(sized-inside)`).
   * - Which it is, the element's computed `display`:  so only once its sheets are in (`isReady`).
   * - `height="fluid"`:  no length, but `:state(fluid-height)`, which `SharedHeights.css`
   *   draws as taking what's left of its parent's height (Fomantic's `fluid`, a container's full size).
   * - SIDE EFFECT:  writes them in the element's `style` and states;  removes them again once they're gone.
   * - Not on a server:  the static render draws no sizes.
   */
  @onChange("sharedSizes", "isReady", { writesDOMElement: true })
  protected onSizesChanged(sizes: SharedSizes, isReady: boolean) {
    if (isServer) return
    const { domElement, internalState } = this
    const isSized = SIZES.some((name) => sizes[name] !== undefined)
    if (!isSized && !internalState.wroteSizes) return
    for (const name of SIZES) {
      // `height="fluid"` is no length:  its own state instead (`:state(fluid-height)`)
      const size = name === "height" && sizes[name] === FLUID ? undefined : sizes[name]
      if (size !== undefined) domElement.style.setProperty(`--_ui-${name}`, size)
      else domElement.style.removeProperty(`--_ui-${name}`)
      domElement.setState(name, size !== undefined)
    }
    domElement.setState(FLUID_HEIGHT_STATE, sizes.height === FLUID)
    const isContents = isSized && isReady && getComputedStyle(domElement).display === "contents"
    domElement.setState(SIZED_INSIDE_STATE, isContents)
    internalState.wroteSizes = isSized
  }

  /** The shared `tooltip`:  the browser's own tooltip, written as the element's `title`. */
  get sharedTooltip(): string | undefined {
    return this.sharedText(TOOLTIP)
  }

  /** Its error's words, as its tooltip, while the base class shows its error look (`showsErrorLook`). */
  get errorTooltip(): string | undefined {
    return this.showsErrorLook ? this.sharedErrorText : undefined
  }

  /** The shared `label`:  the element's accessible name (`aria-label`). */
  get sharedLabel(): string | undefined {
    return this.sharedText(LABEL)
  }

  /**
   * `tooltip` or `label` changed:  the element's `title`, and its accessible name.
   * - `title` only while `tooltip` says, or once it said:  a page's own `title` is left alone otherwise.
   * - The accessible name only where `label` is the shared one:  a family's own `label` means something else
   *   (a field's label, a statistic's), and names it its own way.
   */
  @onChange("sharedTooltip", "sharedLabel", "errorTooltip", { writesDOMElement: true })
  protected onSharedWordsChanged(
    ownTooltip: string | undefined,
    label: string | undefined,
    errorTooltip: string | undefined
  ) {
    const { domElement, internalState } = this
    // its error's words, where the base class shows its error (`showsErrorLook`) and it has no tooltip of its own
    const tooltip = ownTooltip ?? errorTooltip
    if (tooltip !== undefined) domElement.setAttribute("title", tooltip)
    else if (internalState.wroteTitle) domElement.removeAttribute("title")
    internalState.wroteTitle = tooltip !== undefined
    if (this.elementDefinition.takesShared(LABEL)) domElement.internals.ariaLabel = label ?? null
  }

  /**
   * A click on the element goes to its `link`, where `elementSetup.link` is `"click"`.
   * - Not when the click was a control's of its own inside:  a button, a link, a field.
   * - Not while it's disabled, nor when someone called `preventDefault()`.
   */
  @on("click")
  protected onSharedLinkClick(event: MouseEvent) {
    const link = this.sharedLink
    if (!link || this.elementSetup.link !== "click" || this.isDisabled || event.defaultPrevented) return
    if (E.OwnControls.isClicked(event, { upTo: this.domElement })) return
    this.followLink(link, this.sharedTarget)
  }

  /**
   * Hook:  go to `link`, in `target` if there is one (`_blank`, a window's name).
   * - SIDE EFFECT:  leaves the page, or opens a window.
   * - Tests override it, rather than leave their page.
   */
  protected followLink(link: string, target: string | undefined) {
    if (target && target !== "_self") window.open(link, target)
    else window.location.assign(link)
  }

  /** A shared attribute's text, where the element takes it and it isn't empty;  else `undefined`. */
  private sharedText(name: string): string | undefined {
    if (!this.elementDefinition.takesShared(name)) return undefined
    // by its camelCase key, as every attribute value is kept (`min-width` => `minWidth`)
    const value = E.Reactive.attributeValue(this, E.camelCase(name))
    return typeof value === "string" && value !== "" ? value : undefined
  }

  ////////////////
  // ## Moved and resized
  //
  // Two more shared attributes (`SharedVocabulary`;  epic `mockup` P14, J35):  `movable` and `resizable`
  // (`MoveAndResize`).
  // - `movable`:  bare or `both`, `horizontally`, `vertically`.
  // - `resizable`:  the sizes people drag, `width`, `height` or `width, height`;
  //   bare, the family's own (`elementSetup.resizable`:  a segment's and a table's, their height).
  //   - ONE resize for every family:  the browser's grip on its box, the element's own or, for a
  //     `display: contents` element, its shadow root's top box (`resizeBox`).
  //   - `:state(resizable-width)` / `:state(resizable-height)` say which, so a family's sheet can let its box
  //     grow past a cap of its own (a scrolling segment's `max-height`) or fill the size dragged.
  // - A family that declares its own `resizable` keeps it (`<ui-split-panel>`, `<ui-diagram-node>`):
  //   the shared one is only where the vocabulary has none.
  ////////////////

  /** Which way people may move it (the shared `movable`);  `undefined`:  they can't. */
  get sharedMovable(): E.MoveWay | undefined {
    if (!this.elementDefinition.takesShared(MOVABLE)) return undefined
    return E.MoveAndResize.wayOf(E.Reactive.attributeValue(this, MOVABLE))
  }

  /** Which way people may resize it (the shared `resizable`);  `undefined`:  they can't. */
  get sharedResizable(): E.MoveWay | undefined {
    if (!this.elementDefinition.takesShared(RESIZABLE)) return undefined
    return E.MoveAndResize.resizeWayOf(E.Reactive.attributeValue(this, RESIZABLE), this.elementSetup.resizable)
  }

  /** People may drag its width:  `:state(resizable-width)`. */
  @cssState("resizable-width")
  get resizesWidth(): boolean {
    const way = this.sharedResizable
    return way === "both" || way === "horizontally"
  }

  /** People may drag its height:  `:state(resizable-height)`. */
  @cssState("resizable-height")
  get resizesHeight(): boolean {
    const way = this.sharedResizable
    return way === "both" || way === "vertically"
  }

  /**
   * Hook:  the box `resizable` resizes.
   * - Default:  the element itself where it draws a box;  else (`display: contents`) the first box at the top of its
   *   shadow root (a segment's, a card's, a modal's `<dialog>`).
   * - Read once its sheets are in, so its `display` is known.
   */
  protected get resizeBox(): HTMLElement {
    const { domElement } = this
    if (getComputedStyle(domElement).display !== "contents") return domElement
    const top = [...(domElement.shadowRoot?.children ?? [])].find(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.matches(NOT_A_BOX)
    )
    return top ?? domElement
  }

  /**
   * While it's connected, people may move and resize it the ways its shared `movable` and `resizable` say.
   * - Resizing waits for its sheets (`isReady`):  which box it resizes depends on its `display`.
   * - SIDE EFFECT:  `MoveAndResize` writes its `style`, and listens for presses on it;  the cleanup stops both.
   * - Never on a server, where nothing connects.
   */
  @onChange("isConnected", "isReady", "sharedMovable", "sharedResizable", { writesDOMElement: true })
  protected moveAndResize(
    isConnected: boolean,
    isReady: boolean,
    move: E.MoveWay | undefined,
    resize: E.MoveWay | undefined
  ) {
    if (!isConnected || isServer || (!move && !resize)) return
    if (resize && !isReady) return
    return E.MoveAndResize.start(this.domElement, { move, resize, box: resize ? this.resizeBox : undefined })
  }

  ////////////////
  // ## Parent
  //
  // `parent`, where the vocabulary declares it:  an element written anywhere on the page joins the container with
  // that id, as if nested there (`ParentLink`).  Spell UI's `<ui-tab>`, `<ui-step>` and `<ui-section>` take it.
  ////////////////

  /**
   * While connected with a `parent`, join that container;  its cleanup stops waiting for it.
   * - Only for a tag whose vocabulary declares `parent`:  no effect for any other.
   * - Never on a server, where nothing connects.
   */
  private followParent() {
    const { domElement, elementDefinition } = this
    if (isServer || !elementDefinition.takesAttribute(PARENT)) return
    const parentLink = new E.ParentLink({ domElement, attribute: elementDefinition.localAttribute(PARENT) })
    const joining = createMemo(() =>
      this.isConnected ? (E.Reactive.attributeValue(this, PARENT) as string | undefined) : undefined
    )
    createEffect(joining, (id) => {
      return parentLink.follow(id)
    })
  }

  ////////////////
  // ## Its own `:host` rule
  ////////////////

  /**
   * Hook:  the declarations of the element's own `:host` rule, worked out from its attributes
   * (`gap: var(--ui-space-m);  flex-direction: row`);  default none.
   * - Written into ONE sheet adopted into its shadow root, never into its `style` attribute:  that's the page's.
   * - Tracked:  written again whenever what it reads changes.
   * - So a layout tag says only its declarations:  Spell UI's `<ui-stack>`, `<ui-cell>`, `<ui-terms>`, `<ui-root>`.
   * - Not on a server:  no style sheets there.
   */
  protected get hostLayout(): string | undefined {
    return undefined
  }

  /**
   * Keep the sheet of `hostLayout` current, for a class that works one out (it overrides the hook).
   * - The sheet is the page's ONE sheet for those declarations, shared by value (`HostLayoutSheets`):
   *   200 stacks with the same attributes adopt one sheet, not 200 (epic `solid-2-final` P4).
   * - New declarations swap the root's sheet for theirs;  none, and it has none.
   * - Spell UI's `UI.styles` keeps it when it adopts the class's own sheets again (a sheet it didn't make).
   */
  private followHostLayout() {
    if (isServer || !UIComponent.overrides(this, "hostLayout")) return
    const root = this.domElement.renderRoot
    const declarations = createMemo(() => this.hostLayout ?? "")
    createEffect(declarations, (text) => {
      if (!text) return
      const sheet = HostLayoutSheets.take(text)
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
      // before the next declarations, and as the element is disposed
      return () => {
        HostLayoutSheets.release(text)
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((each) => each !== sheet)
      }
    })
  }

  /**
   * Does `component`'s class (below `UIComponent`) define `member` itself, overriding the base's hook?
   * - Static:  a question about the class chain, asked once per element as it mounts.
   */
  private static overrides(component: UIComponent, member: string): boolean {
    for (
      let at = Object.getPrototypeOf(component);
      at && at !== UIComponent.prototype;
      at = Object.getPrototypeOf(at)
    ) {
      if (Object.hasOwn(at, member)) return true
    }
    return false
  }

  ////////////////
  // ## AppContext
  ////////////////

  /**
   * The value an app handed its `ui-*` elements;  `null` when none:
   * the `appContext` property of the nearest root around this element (crossing shadow roots):
   * a `<ui-root>`, or any other root (`elementSetup.root`:  `<spell-viewer>`).
   * - `<ui-root appContext={value}>` in a Solid app, `root.appContext = value` anywhere else.
   * - Read once, when this object is built.
   * - Why not a Solid context:  each element draws in a Solid root of its own, with no parent,
   *   so a Solid app's providers don't reach inside `ui-*` tags (epic `spell-element`, Q9).
   * - Spell UI's framework check uses it to prove an app's value reaches inside custom elements
   *   (`packages/ui/tools/frameworks/solid/identity.js`).
   */
  readonly appContext: unknown

  /** The `appContext` of the nearest root around `domElement` (a translated tag too), else `null`. */
  private static appContextFor(domElement: DOMElement): unknown {
    let node: Node | null = domElement.parentNode
    while (node) {
      const { localName } = node as Element
      if (localName && UIComponent.isRootTag(localName)) return (node as AppContextHolder).appContext ?? null
      // a shadow root (nodeType 11) continues at its host;  NEVER read `host` elsewhere (`<a>.host` is a URL part)
      node = node.parentNode ?? (node.nodeType === 11 ? (node as ShadowRoot).host : null)
    }
    return null
  }

  /**
   * Is `localName` a root's tag?
   * - One whose class says `elementSetup.root` (`<ui-root>`, a translation of it, `<spell-viewer>`)
   * - or `<ui-root>` before its family has loaded:  an app may set its `appContext` that early
   */
  private static isRootTag(localName: string): boolean {
    return localName === ROOT_TAG || UIComponent.rootTags.has(localName)
  }

  /** Every defined tag whose class says `elementSetup.root`:  `register()` adds them.  Page-wide. */
  private static readonly rootTags = new Set<string>()

  ////////////////
  // ## Attributes
  //
  // Every vocabulary attribute also has a getter/setter on the component,
  // which may be reformulated to read as English.
  //
  // `<button disabled>` => `isDisabled` = getter/setter pair
  ////////////////

  /**
   * The element's attributes exactly as the DOM has them:  raw text, `null` when absent.
   * - Use it for attributes NOT in the vocabulary (`attributes["aria-label"]`),
   *   or for a vocabulary attribute's raw text (`attributes.value`, to reset a form field).
   * - For vocabulary attributes, prefer their getters (`this.size`):  converted and typed.
   * - Pass the English name:  on a translated tag it reads that tag's spelling (`valor` for `value`).
   * - Tracked:  JSX or an effect that reads `attributes["aria-label"]` runs again when that attribute changes.
   * - Protected:  outside code reads the element's own attributes.
   */
  protected get attributes(): Readonly<Record<string, string | null>> {
    const { elementDefinition } = this
    return E.Reactive.attributesOf(this, this.domElement, (name) => elementDefinition.localAttribute(name))
  }

  ////////////////
  // ## Reactive members
  ////////////////

  /**
   * One ACCESSOR per member, under the same name:  `this.$.isOpen` is a function that returns `this.isOpen`.
   * - An accessor is how Solid hands around "a value that may change":
   *   a function you call to read it.
   *   Calling it inside JSX or an effect subscribes to it, so they update when it changes.
   * - Everyday code just reads `this.isOpen`, which is already reactive.
   * - Use `$` only for a Solid API that wants the function itself:
   *   `createMemo(this.$.isOpen)`, `<Show when={this.$.isOpen}>`.
   */
  get $(): E.Accessors<this> {
    return E.Reactive.accessorsOf(this)
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * Hook:  what the element shows:  the content of its shadow DOM, as JSX.
   * - Runs ONCE.
   *   Later changes happen inside the JSX, as the members it reads change;  `render()` itself never runs again.
   * - It runs while Solid is drawing, so it must NEVER change state:  no `this.isOpen = ...` here.
   */
  abstract render(): JSX.Element

  ////////////////
  // ## Readiness
  ////////////////

  /**
   * Is the element in the document?
   * - Updated a microtask after it connects or disconnects:
   *   that can happen while the app's Solid is drawing, when state can't change yet.
   */
  @state accessor isConnected = false

  /**
   * Ready to show:  the runtime (`UI`) has loaded, and this element's style sheets are in its shadow root.
   * - The content shows only then (unless `elementSetup.canRenderUnstyled`).
   * - Not the same as a source element's loading (`LoadableComponent.loadStatus`):
   *   this is the element itself being styled and drawn.
   */
  @state accessor isReady = false

  /** Once ready:  resolve `domElement.ready`, a microtask later, after the content has drawn with its styles. */
  @onChange("isReady")
  protected onReadyChanged(isReady: boolean) {
    if (isReady) E.afterSolidUpdate(() => this.domElement.markReady())
  }

  ////////////////
  // ## StyleSheets
  //
  // The component's own sheets are a key of its setup, `elementSetup.styleSheets` (`ElementSetup` documents it).
  ////////////////

  /**
   * Hook:  the names of the `elementSetup.styleSheets` to adopt right now, in order.
   * - Default:  all of them.
   * - Override it when the sheets depend on where the element sits:
   *   a `<ui-label>` inside a `<ui-statistic>` adds `UIParts.css`.
   * - The shadow root re-adopts when it changes.
   * - The server render reads it too, to scope each sheet to the elements that use it.
   */
  get styleSheetNames(): string[] {
    return Object.keys(this.elementSetup.styleSheets)
  }

  /**
   * Register this class's sheets with the runtime (the ones it doesn't have yet),
   * then adopt them into the shadow root.
   */
  @untracked
  private adoptStyleSheets() {
    const { styles } = E.SpellSolid.settings
    styles.registerOnce(this.elementSetup.styleSheets)
    styles.adoptInto(this.domElement.renderRoot, this.styleSheetNames, this.vocabulary)
  }

  ////////////////
  // ## Shared states:  disabled, loading
  //
  // Every element takes `disabled` and `loading`, though its vocabulary may not name them
  // (`SharedVocabulary`), and the platform's own `inert`:
  // - `disabled`:  `:state(disabled)` always;  the rest per family (`elementSetup.disabled`):
  //   by default unusable, with everything inside inert
  // - `loading`:  `:state(loading)` always;  by default a loader over it (`elementSetup.loading`)
  // - `error`:  `:state(failed)` always;  by default the error look, its words its tooltip (`elementSetup.error`)
  // - `inert` is the platform's, unstyled
  // - `visible`, `hidden` and `animation`:  "Shown or hidden", below
  ////////////////

  /**
   * Is `disabled` set:  its attribute, or (a form control) a `<fieldset disabled>` around it?
   * - `:state(disabled)` follows it, whatever disabled means for the family.
   * - Not `isDisabled`:  an element whose disabled is only a look (`<ui-icon>`) is marked disabled, yet usable.
   */
  @cssState("disabled")
  get isMarkedDisabled(): boolean {
    return E.Reactive.attributeValue(this, "disabled") === true || this.formIsDisabled
  }

  /**
   * Hook:  is the element unusable right now?
   * - Default:  `isMarkedDisabled`, where `elementSetup.disabled` is `"unusable"`;  never where it's `"its own"`.
   * - While it's true, the DOM element swallows clicks (`DOMElement`).
   * - A family whose disabled is unusable ITS own way says so here:
   *   the form controls (`FormComponent`), `<ui-button>`, `<ui-step>`, `<ui-item>` ...
   */
  get isDisabled(): boolean {
    return this.elementSetup.disabled === "unusable" && this.isMarkedDisabled
  }

  /** Can the element be used right now?  The opposite of `isDisabled`. */
  get isEnabled(): boolean {
    return !this.isDisabled
  }

  /**
   * Is a `<fieldset disabled>` around this element disabling it?
   * - Form controls only (`elementSetup.isAFormControl`).
   */
  @state accessor formIsDisabled = false

  /**
   * Is `loading` set?
   * - `:state(loading)` follows it, whatever loading means for the family.
   * - `true` only:  `<ui-root loading="Fetching…">` is a message, and its own (`elementSetup.loading`).
   */
  @cssState("loading")
  get isMarkedLoading(): boolean {
    return E.Reactive.attributeValue(this, "loading") === true
  }

  /**
   * Is `error` set, bare or with its words (`error="The server didn't answer"`)?
   * - `:state(failed)` follows it, whatever failing means for the family (`elementSetup.error`).
   * - Only the SHARED one:  a family with an `error` of its own (a field's line under its control) means that.
   */
  @cssState("failed")
  get isMarkedFailed(): boolean {
    if (!this.elementDefinition.takesShared(ERROR)) return false
    const value = E.Reactive.attributeValue(this, ERROR)
    return value !== undefined && value !== null && value !== false
  }

  /** The shared `error`'s words;  `undefined` bare, or with none. */
  get sharedErrorText(): string | undefined {
    if (!this.elementDefinition.takesShared(ERROR)) return undefined
    const value = E.Reactive.attributeValue(this, ERROR)
    return typeof value === "string" && value !== "" ? value : undefined
  }

  /**
   * Is the base class giving the element its error look (`elementSetup.error` is `"look"`)?
   * - `:state(failed-look)`, which `reset.css` draws.
   */
  @cssState("failed-look")
  get showsErrorLook(): boolean {
    return this.elementSetup.error === "look" && this.isMarkedFailed
  }

  /**
   * Is the base class drawing its loader over the element (`elementSetup.loading` is `"loader"`)?
   * - `:state(busy)`, which `reset.css` draws a spinner for.
   */
  @cssState("busy")
  get showsLoader(): boolean {
    return this.elementSetup.loading === "loader" && this.isMarkedLoading
  }

  /**
   * Is everything inside the element inert right now, the base class's way?
   * - `:state(dimmed)`, which `reset.css` dims.
   * - Disabled where `elementSetup.disabled` is `"unusable"`, or loading where `elementSetup.loading` is `"loader"`.
   * - Inert:  its shadow content (and so what's slotted into it) can't be clicked, focused or typed in,
   *   and leaves the accessibility tree.
   */
  @cssState("dimmed")
  get hasInertContent(): boolean {
    return (this.elementSetup.disabled === "unusable" && this.isMarkedDisabled) || this.showsLoader
  }

  /**
   * A shared state changed (ONE effect for all of them, as every element has it):
   * - ARIA on the DOM element, its content inert or not,
   *   and focus inside moves on to the next focusable element.
   * - ARIA only where the base class owns that state:
   *   a family with a disabled or loading of its own sets its own.
   * - Inert from ALL of them at once (`hasInertContent`:  disabled the base class's way, or its loader);
   *   and it clears only the boxes IT made inert,
   *   so a family's own (`<ui-form loading>`'s veil) stays (epic `spell-element`, I10).
   * - On a server:  the ARIA only, once.
   */
  @onChange("hasInertContent", "isDisabled", "showsLoader", "isReady", "showsErrorLook", { writesDOMElement: true })
  protected onSharedStatesChanged(
    hasInertContent: boolean,
    isDisabled: boolean,
    showsLoader: boolean,
    isReady: boolean
  ) {
    const { domElement, elementSetup, internalState } = this
    if (elementSetup.disabled === "unusable") domElement.internals.ariaDisabled = isDisabled ? "true" : null
    if (elementSetup.loading === "loader") domElement.internals.ariaBusy = showsLoader ? "true" : null
    if (elementSetup.error === "look" && elementSetup.isAFormControl)
      domElement.internals.ariaInvalid = this.showsErrorLook ? "true" : null
    if (isServer || !isReady) return
    if (!hasInertContent) {
      // never touch the content of an element that was never inert:  most never are
      for (const box of internalState.madeInert ?? []) box.inert = false
      internalState.madeInert = undefined
      return
    }
    E.SpellSolid.settings.focus.moveOutOf(domElement)
    const madeInert = (internalState.madeInert ??= [])
    for (const child of domElement.renderRoot.children) {
      const box = child as HTMLElement
      if (box.inert) continue
      box.inert = true
      madeInert.push(box)
    }
  }

  ////////////////
  // ## Only on some platforms:  on-platform
  //
  // The shared `on-platform` (epic `mockup` T53):  the element shows only on the devices it names,
  // `phone`, `tablet`, `desktop` (`spell/util/platform`), e.g. `on-platform="desktop,tablet"`.
  // - This class only turns the list into states:  `:state(on-platform)`, and `:state(on-<platform>)` for each.
  // - `reset.css` does the hiding, in a media query per platform:
  //   so it follows a resize or a turn of the device at once, with no script running.
  // - Not the same as `hidden`:  `visible` still says `true`, and turning the device round may show it.
  ////////////////

  /** The shared `on-platform`'s list, as written;  `undefined`:  every platform. */
  get sharedPlatforms(): string | undefined {
    return this.sharedText(ON_PLATFORM)
  }

  /**
   * `on-platform` changed:  its states, which `reset.css` hides it by.
   * - SIDE EFFECT:  sets the element's states;  clears them again once the list is gone.
   * - Not on a server:  the static render shows it everywhere.
   */
  @onChange("sharedPlatforms", { writesDOMElement: true })
  protected onPlatformsChanged(list: string | undefined) {
    const { domElement, internalState } = this
    const platforms = platformsIn(list)
    if (isServer || (!platforms && !internalState.wrotePlatforms)) return
    domElement.setState(ON_PLATFORM, !!platforms)
    for (const platform of PLATFORMS) domElement.setState(`on-${platform}`, !!platforms?.has(platform))
    internalState.wrotePlatforms = !!platforms
  }

  ////////////////
  // ## Shown or hidden:  visible, hidden, animation
  //
  // `visible` and the platform's `hidden` are ONE fact, opposites;
  // the DOM element keeps the two names in step (`DOMElement`, "Shown or hidden"), and this class runs each change:
  // - `isVisible` is the fact, controlled;  `elementSetup.visible` what it is when the page writes neither name
  // - a change runs `onVisibleChange()` with `animationToRun`:  by default on the shadow root's top-level boxes;
  //   a family overrides it to show and hide its own way (a dialog's `showModal()` / `close()`)
  // - while a hide runs, `:state(hiding)` keeps the element on screen (`reset.css`);  `:state(hidden)` once it ends
  // - at once before the element first draws, and wherever motion is off (`animation="none"`, reduced motion)
  ////////////////

  /**
   * Is the element shown?  `el.visible`, which is always `!el.hidden`.
   * - Controlled:  `this.isVisible = false` hides it, as `el.visible = false` or `el.hidden = true` do.
   * - A person's action asks first, with an event the page may cancel:
   *   `this.requestChange("isVisible", false, () => this.send("ui-closing", { visible: false }))`.
   * - What it is when the page writes neither name:  `elementSetup.visible`.
   */
  @controlled("visible")
  accessor isVisible = true

  /**
   * Hidden, once its animation has run:  `:state(hidden)`.
   * - What hides it is the `hidden` attribute (`reset.css`):  this state is for a family's own CSS
   *   (`:host(:not(:state(hidden)))`, "shown or on its way out").
   */
  @cssState("hidden")
  get isHidden(): boolean {
    return !this.isVisible && !this.isHiding
  }

  /**
   * Is a hide running right now?  `:state(hiding)`:
   * the `hidden` attribute is already set, and `reset.css` keeps the element on screen until it ends.
   */
  @cssState("hiding")
  @state
  accessor isHiding = false

  /**
   * The animation `visible` / `hidden` run right now:  the first of these that applies.
   * 1. `"none"` when motion is off:
   *    - the element's own `animation="none"`
   *    - `none` from around it, so an element inside can't turn motion back on:
   *      `--ui-motion: none`, which `<ui-root animation="none">`, any element's `animation="none"` or a page's CSS sets
   *    - or the person's reduced-motion setting
   * 2. the element's own `animation` (`<ui-modal animation="fly down">`, `el.animation = "scale"`)
   * 3. its family's default, `elementSetup.animation`, which is `"fade"` unless the family says otherwise
   * - Untracked:  read as a change runs, never followed.
   */
  @untracked
  get animationToRun(): E.ElementAnimation {
    const own = E.Reactive.attributeValue(this, "animation") as E.ElementAnimation | undefined
    if (own === E.NO_ANIMATION || this.isMotionOff) return E.NO_ANIMATION
    return own ?? this.elementSetup.animation
  }

  /**
   * Is the element's own `animation` `none`?  `:state(still)`:
   * `reset.css` sets `--ui-motion: none` on it, which everything inside inherits (a translated tag's too).
   */
  @cssState("still")
  get isStill(): boolean {
    return E.Reactive.attributeValue(this, "animation") === E.NO_ANIMATION
  }

  /**
   * Is motion off around the element:  `--ui-motion: none` reaching it, or the person's reduced-motion setting?
   * - Read from the element's computed style:
   *   custom properties pass into shadow roots, so every element below sees it.
   */
  private get isMotionOff(): boolean {
    const { motion } = E.SpellSolid.settings
    if (motion.isReduced) return true
    const { domElement } = this
    if (!domElement.isConnected) return false
    return getComputedStyle(domElement).getPropertyValue(motion.property).trim() === E.NO_ANIMATION
  }

  /**
   * Hook:  show or hide what the element draws, as `visible` changes;  resolves once it's done.
   * - `animation`:  the one to run (Fomantic's name, `"fade up"`), or `"none"`:  at once.
   *   - `"none"` when the element first draws, so nothing animates in as a page loads;
   *     and wherever motion is off (`animationToRun`).
   *   - An attention animation (`shake`) shows and hides at once too.
   * - While a hide runs, the element stays on screen (`:state(hiding)`);  it's hidden once the promise settles.
   * - Default:  `animation` in or out on the boxes at the top of the shadow root,
   *   through the runtime (Spell UI's `UI.transitions`).
   *   - Why not the element:  most `ui-*` DOM elements are `display: contents`, with no box of their own.
   *   - An element whose shadow root is only a `<slot>` shows and hides at once.
   * - Override it to show and hide your own way (a dialog's `showModal()` / `close()`).
   *   - Called once the element first draws, then on each change.
   *   - A later change may start before this one ends:  check `isVisible` before acting late.
   * - MUST NOT throw:  a throw is logged, and the change just ends.
   */
  protected async onVisibleChange(visible: boolean, animation: E.ElementAnimation): Promise<void> {
    const { internalState } = this
    // a box the family hides itself (`hidden` on it) is left alone;  one an earlier hide animated out comes back
    const animatedOut = internalState.animatedOut ?? []
    const boxes = [...this.domElement.renderRoot.children].filter(
      (child): child is HTMLElement =>
        child.localName !== "slot" && (!(child as HTMLElement).hidden || animatedOut.includes(child as HTMLElement))
    )
    internalState.animatedOut = undefined
    const { motion } = E.SpellSolid.settings
    if (animation === E.NO_ANIMATION || motion.isAttention(animation)) {
      if (visible) for (const box of boxes) motion.reveal(box)
      return
    }
    if (!visible) internalState.animatedOut = boxes
    await Promise.all(boxes.map((box) => motion.animate(box, animation, visible)))
  }

  /**
   * `visible` changed, or the element first drew:  run `onVisibleChange()`.
   * - The first time (once `isReady`) with `"none"`;  then with `animationToRun`.
   */
  @onChange("isVisible", "isReady")
  protected onVisibleOrReadyChanged(isVisible: boolean, isReady: boolean) {
    if (!isReady) return
    const { internalState } = this
    const isFirst = internalState.wasVisible === undefined
    if (!isFirst && internalState.wasVisible === isVisible) return
    internalState.wasVisible = isVisible
    const animation = isFirst ? E.NO_ANIMATION : this.animationToRun
    // once this update's done:  `:state(hiding)` written here would draw everything reading it twice (I98)
    E.afterSolidUpdate(() => void this.runVisibleChange(isVisible, animation))
  }

  /**
   * Run `onVisibleChange()`, with `:state(hiding)` on while a hide animates;  a later run takes over.
   * - NEVER throws:  a hook that throws is logged, and the change ends.
   */
  private async runVisibleChange(visible: boolean, animation: E.ElementAnimation) {
    const { internalState } = this
    const run = (internalState.visibleRun = (internalState.visibleRun ?? 0) + 1)
    this.isHiding = !visible && animation !== E.NO_ANIMATION
    try {
      await this.onVisibleChange(visible, animation)
    } catch (error) {
      E.SpellSolid.settings.warn(
        `<${this.domElement.localName}>.onVisibleChange()`,
        "failed;  the change ends here",
        error
      )
    }
    if (internalState.visibleRun === run) this.isHiding = false
  }

  ////////////////
  // ## Classes
  ////////////////

  /**
   * The `class` of the top box in the element's shadow DOM, in Fomantic's class names:  `ui small primary button`.
   * - Built from the attributes (through `classValue()`), then `extraClass`, then the noun (`classNoun`).
   */
  get rootClass(): string {
    const { extraClass: extra, classNoun: noun } = this
    return this.elementDefinition.builder.build(this.internalState.classInput, { extra, noun })
  }

  /**
   * Hook:  classes to add just before the noun;  default none.
   * - `UIButton`'s adds `icon` to a button that shows only an icon (`ui primary button` => `ui primary icon button`):
   *   ```ts
   *   protected get extraClass(): string | undefined {
   *     if (!this.hasIcon || this.animated) return undefined
   *     return !this.hasText ? UIT.ICON_CLASS : undefined
   *   }
   *   ```
   * - For a class that follows STATE rather than one attribute;
   *   a class that follows an attribute comes from the vocabulary (`classValue()`).
   */
  protected get extraClass(): string | undefined {
    return undefined
  }

  /**
   * Hook:  the last class word;  default the vocabulary's `noun`.
   * - For an element Fomantic draws as ANOTHER noun:
   *   `<ui-tab>`'s pane is a segment (`ui bottom attached tab segment`),
   *   so `UITab` says `segment` here, and `tab` in `extraClass`.
   */
  protected get classNoun(): string | undefined {
    return undefined
  }

  /**
   * Hook:  the value used for attribute `name` when building the classes.
   * - Default:  the attribute's own value.
   * - Override it when a class must follow state rather than the attribute:
   *   a button's `active` class follows `isActive`, which a click can change without touching the attribute.
   */
  protected classValue(name: E.AttributeName<V>): unknown {
    return E.Reactive.attributeValue(this, this.elementDefinition.attribute(name).key)
  }

  /**
   * Classes for a SECOND box, from attribute values you choose:  e.g. the wrapper of a button with a label beside it.
   * - Keys are the vocabulary's attribute names, type-checked.
   */
  protected wrapperClass(values: Partial<Record<E.AttributeName<V>, unknown>>, extra?: string): string {
    return this.elementDefinition.builder.build(values, { extra })
  }

  /**
   * What only this class uses inside (`InternalState`):
   * ONE field, so it adds one name to the component, not many.
   */
  private readonly internalState: InternalState

  ////////////////
  // ## CSS states
  ////////////////

  /**
   * Hook:  `:state()`s for the element worked out in code, when no single member can carry one with `@cssState`.
   * - Default none.
   * - Keys are the vocabulary's state names.
   * - Prefer `@cssState("open")` on the member the state follows.
   * - Not `elementSetup.cssStates`, the list of states that only mirror an attribute:  same name, another thing.
   * - If it throws, the element shows its fallback, as when `render()` throws.
   */
  protected cssStates(): Partial<Record<E.StateName<V>, boolean>> {
    return {}
  }

  ////////////////
  // ## Controlled state
  //
  // A `@controlled` member follows an attribute that the USER can change too (a dropdown's `open`):
  // the page's value when the page set one, else the element's own.
  ////////////////

  /**
   * The user wants to change the `@controlled` accessor named `memberName` to `next`:
   * `this.requestChange("isOpen", true, () => this.send("ui-opening", { open: true }))`.
   * - `memberName`:  the name of an accessor ON THIS COMPONENT
   *   (`isOpen`, declared `@controlled("open") accessor isOpen`),
   *   not the DOM element's property (`open`), which it follows.
   * - First `announce()` sends the event;  it returns false if the page cancelled it.
   * - Then `next` is written to the element's property, unless the event was cancelled,
   *   or the page set the property itself while handling it (the page's value wins).
   * - Returns true when `next` was applied.
   */
  requestChange<K extends keyof this & string>(memberName: K, next: this[K], announce: () => boolean): boolean {
    return E.Reactive.requestChange(this, memberName, next, announce)
  }

  /**
   * Is the `@controlled` accessor named `memberName` (`"value"`) reading the PAGE's value right now,
   * rather than the element's own?
   * - A `@controlled` accessor reads its attribute's value when the page gave it one, else its own starting value.
   *   Take a dropdown's `value`:
   *   - `<ui-dropdown>`, `value` never set:  `this.value` is the element's own;  `isControlledByPage("value")` is false
   *   - `<ui-dropdown value="b">`, or `dropdown.value = "b"` from a framework:  `this.value` is the page's `"b"`;  true
   * - So:  true while the attribute's value isn't `undefined`.
   * - What it's for:  the dropdown, select and search keep the page's starting value, to restore on a form reset.
   */
  isControlledByPage(memberName: keyof this & string): boolean {
    return E.Reactive.isControlledByPage(this, memberName)
  }

  ////////////////
  // ## Events
  ////////////////

  /**
   * Listen for event `type` on the element (or on `options.target`), for the element's whole life.
   * - The listener is removed when the element is disposed (`domElement.dispose()`),
   *   NOT when it's moved or disconnected:  the element keeps working after a move.
   * - A method listening from the start is `@E.on("command") onCommand(event)` instead:
   *   the constructor adds it through `on()`, and it runs untracked.
   *   - Call `on()` itself for a listener added later, or under a condition.
   * - For a listener that should stop sooner, use your own `AbortController`;  for one call only, `{ once: true }`.
   */
  protected on<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: E.OnOptions
  ): void
  protected on(type: string, listener: (event: Event) => void, options?: E.OnOptions): void
  protected on(type: string, listener: (event: Event) => void, { target, ...options }: E.OnOptions = {}) {
    const listeners = (this.internalState.listeners ??= UIComponent.abortedOnDispose(this.domElement))
    ;(target ?? this.domElement).addEventListener(type, listener, { ...options, signal: listeners.signal })
  }

  /**
   * An `AbortController` aborted when `domElement` is disposed:  `on()`'s, for every listener it adds.
   * - How:  the DOM's own way to remove listeners in a group (DOM API `addEventListener(type, listener, { signal })`,
   *   in every browser since 2021, nothing to do with Solid).
   * - Each `on()` passes its `signal`;  `abort()` removes every listener added with it, so nothing keeps a list.
   */
  private static abortedOnDispose(domElement: DOMElement): AbortController {
    const listeners = new AbortController()
    domElement.addReleaseCallback(() => listeners.abort())
    return listeners
  }

  /**
   * Add the class's `@on` methods as listeners, base class first, through `on()`:  constructor only, in a browser.
   * - Each looks its method up when the event comes, and runs it inside `untrack()`.
   */
  private startListeners() {
    const self = this as unknown as Record<PropertyKey, (event: Event) => unknown>
    for (const { method, type, options } of E.Reactive.listenersOf(this)) {
      const target = options.target && this.domElement[options.target]
      this.on(type, (event) => untrack(() => self[method]!(event)), { ...options, target })
    }
  }

  /** A slot's content changed:  the parts in it may belong to another element now (`PartContext`). */
  @on("slotchange", { target: "renderRoot" })
  protected onSlotChangeForParts(event: Event) {
    E.PartContext.slotChanged(event.target as HTMLSlotElement)
  }

  /**
   * Send the vocabulary's event `name` from the element, with `detail`.
   * - It bubbles, and crosses shadow roots.
   * - It's cancelable when the vocabulary says so;  then it returns false if a listener cancelled it.
   * - On a translated tag, the event goes out under that tag's name for it.
   */
  send(name: E.EventName<V>, detail: object): boolean {
    const spec = this.elementDefinition.vocabulary.events.find((event) => event.name === name)
    const event = new CustomEvent(this.elementDefinition.event(name), {
      bubbles: true,
      composed: true,
      cancelable: !!spec?.cancelable,
      detail
    })
    return this.domElement.dispatchEvent(event)
  }

  ////////////////
  // ## Mounting
  ////////////////

  /**
   * Build `Class`'s component for `domElement` and draw it into its shadow root:
   * what the DOM element's first connect does (`TagSetup.mountComponent`).
   * - In a Solid root of its OWN (`Reactive.ownRoot()`):
   *   it lives until `domElement.dispose()`, whatever happens around it.
   *   - So a Solid app's context doesn't reach inside (`appContext` does that).
   * - Inside an error boundary (Solid's `<Errored>`), always:  see "Errors and fallback".
   * - A shadow root the server drew (`domElement.serverDrawing`):  see "Server-drawn shadow roots".
   * - Released with the DOM element:  the root is disposed, the shadow root emptied.
   */
  private static mount(
    Class: E.UIComponentClass,
    definition: E.ElementDefinition,
    domElement: DOMElement,
    Fallback: E.FallbackClass | undefined
  ) {
    const drawing = domElement.serverDrawing
    // a server's drawing shows meanwhile, styled:  the component waits for the runtime, as its first render needs it
    const { runtime } = E.SpellSolid.settings
    if (drawing && !runtime.isLoaded) {
      runtime
        .load()
        .then(() => UIComponent.mountLater(Class, definition, domElement, Fallback))
        .catch((error: unknown) => console.error(`<${domElement.localName}>:  the runtime didn't load`, error))
      return
    }
    E.Reactive.ownRoot((dispose) => {
      const root = domElement.renderRoot
      domElement.addReleaseCallback(() => {
        ShadowEvents.unregister(root)
        root.textContent = ""
        dispose()
      })
      const view = UIComponent.boundary(Class, definition, domElement, Fallback)
      domElement.takeServerDrawing()
      ShadowEvents.register(root)
      insert(root, view)
      if (!drawing) return
      domElement.restoreServerFocus()
      // its own custom states are set by the time the page paints:  the server's stand-in for them goes
      domElement.removeAttribute(UIComponent.SERVER_STATES)
    })
  }

  /**
   * The attribute a server drawing writes the element's custom states into (`in-card` ...), and its sheets select
   * beside `:state()`:  a page can't set custom states before a script runs.
   * - Spell UI's static render writes it, and the sheets it links say `:is(:state(x), [data-ui-states~="x"])`.
   */
  static readonly SERVER_STATES = "data-ui-states"

  /** `mount()`, put off from the first connect:  then the connect's own step, `onConnect()`, if it's still connected. */
  private static mountLater(
    Class: E.UIComponentClass,
    definition: E.ElementDefinition,
    domElement: DOMElement,
    Fallback: E.FallbackClass | undefined
  ) {
    UIComponent.mount(Class, definition, domElement, Fallback)
    if (domElement.isConnected) domElement.component?.onConnect()
  }

  /**
   * `Class`'s component, built and drawn inside its error boundary:  `<Errored>`, called as a function.
   * - `children` is a GETTER, so the component is built inside the boundary.
   */
  private static boundary(
    Class: E.UIComponentClass,
    definition: E.ElementDefinition,
    domElement: DOMElement,
    Fallback: E.FallbackClass | undefined
  ): JSX.Element {
    return Errored({
      get children() {
        return untrack(() => new Class(domElement, definition).onMount())
      },
      fallback: (error: Accessor<unknown>) => {
        const cause = error()
        const showsFallback = runWithOwner(null, () => UIComponent.onError(domElement, cause))
        return showsFallback ? UIComponent.renderFallback(domElement, cause, Fallback) : undefined
      }
    })
  }

  ////////////////
  // ## Server-drawn shadow roots
  //
  // A page drawn on the server (Spell UI's static render, its shadow output) holds each element's shadow root
  // already, as a declarative `<template shadowrootmode>`:  it paints before any script (epic `solid-2-final` P16).
  // - Meanwhile it shows as the server drew it, styled by the sheets the server linked.
  // - When the element starts, it waits for the runtime, as every first render does (`mount()`),
  //   then draws again in place of the server's drawing, in the same task:  nothing flashes, nothing moves,
  //   and the focus moves to the element in the same place (`DOMElement.takeServerDrawing()`).
  // - Its custom states, which a page can't set before a script runs, came as an attribute (`SERVER_STATES`).
  // - The server's sheets go once its own are in (`DOMElement.markReady()`).
  // - Not hydrated:  Solid's hydration worked, but was slower than drawing again (epic `solid-2-final` J62).
  ////////////////

  ////////////////
  // ## Errors and fallback
  //
  // When an element breaks (its constructor, `render()` or an effect throws):
  // - its error boundary (`mount()`) catches the error and calls `onError()`, then `renderFallback()`
  // - the element shows a plain-DOM stand-in (a native `<button>`, `<select>` ...):  `elementSetup.Fallback`
  // - the rest of the page keeps working
  //
  // Every element has its own boundary, always:
  // - without one, an error halts Solid for the whole page (`[REACTIVITY_HALTED]`)
  // - a container's boundary can't catch it instead:
  //   each element's Solid root has no parent (epic `spell-element`, Q8)
  ////////////////

  /**
   * An error escaped this element's constructor, `render()` or an effect.
   * - SIDE EFFECTS:
   *   - DOM API `:state(errored)` on the element
   *   - logs one `console.error` naming the tag
   *   - sends a cancelable `ui-error` event (`{ error }`):  an app that cancels it keeps the fallback away
   *   - resolves `domElement.ready`, and drops this broken object
   * - Returns whether the element shows its fallback:  false when the app cancelled `ui-error`.
   * - Called outside Solid's drawing (`runWithOwner(null)`), so it may change state.
   */
  private static onError(domElement: DOMElement, error: unknown): boolean {
    domElement.setState(E.ERRORED_STATE, true)
    console.error(`<${domElement.localName}> failed:`, error)
    domElement.component = undefined
    domElement.markReady()
    const event = new CustomEvent(E.ERROR_EVENT, { bubbles: true, composed: true, cancelable: true, detail: { error } })
    return domElement.dispatchEvent(event)
  }

  /**
   * Show the fallback in the shadow root:  `Fallback.render(...)`, or a bare `<slot>` when there's none.
   * - Done a microtask LATER:  Solid clears what the broken render had inserted, which would wipe it out;
   *   and some fallbacks (the dropdown's) must already be in place to attach their validity messages.
   * - The fallback is disposed with the element.
   * - Called by the error boundary (`mount()`) after this object broke (or was never built).
   */
  private static renderFallback(
    domElement: DOMElement,
    error: unknown,
    Fallback: E.FallbackClass | undefined
  ): undefined {
    E.afterSolidUpdate(() => {
      const root = domElement.renderRoot
      const handle = Fallback
        ? Fallback.render({ domElement, root, error, internals: domElement.internals })
        : (root.replaceChildren(domElement.ownerDocument.createElement("slot")), undefined)
      if (handle) domElement.addReleaseCallback(() => handle.dispose())
    })
    return undefined
  }

  ////////////////
  // ## Defining the element
  //
  // These are called on the component CLASS, before any element exists:
  // - `define()`:  what a component's `index.ts` calls (`UIButton.define()`),
  //   and what an app calls for a translated tag (`UIButton.define("es-boton", es)`)
  // - `register()`:  the records `define()` starts with;  the server render calls it alone
  // - `tagSetupFor()`:  what the tag's DOM element class carries;  hot reload swaps it in (`HotDefinitions`)
  ////////////////

  /** What the whole page has defined, like `customElements`:  ONE record, for every component class. */
  static readonly registry: E.ComponentRegistry = {
    definitions: new Map(),
    components: new Map(),
    vocabularies: new WeakSet()
  }

  /**
   * Make this component a custom element, under its vocabulary's tag or a translated one.
   * - `UIButton.define("es-boton", es)` registers `<es-boton primario color="rojo">`:
   *   its translated attribute, property and event names all reach the same component.
   * - Does nothing for a tag already defined;  a tag a root defined EARLY is attached instead (`DOMElement.attach()`).
   * - Returns the element class.
   * - Returns `undefined` while the page's runtime hasn't installed its settings yet (`SpellSolid`):
   *   then the tag is defined as they're installed.
   * - throws a `TypeError` on a name in `elementSetup.cssStates` the tag has no attribute or member for (a typo)
   * - throws a `TypeError` when a tag defined early no longer matches its root's catalog (`DOMElement.attach()`)
   */
  static define(
    this: E.UIComponentClass,
    tag?: string,
    dictionary?: E.Dictionary
  ): CustomElementConstructor | undefined {
    if (!E.SpellSolid.isInstalled) {
      E.SpellSolid.whenInstalled(() => void UIComponent.define.call(this, tag, dictionary))
      return undefined
    }
    UIComponent.completeVocabulary(this)
    const definition = new E.ElementDefinition(this.prototype.vocabulary, { tag, dictionary })
    const existing = customElements.get(definition.tag)
    // defined early by a root, its family loading now:  attach it ("Defined early", `DOMElement`)
    const isEarly = DOMElement.isEarly(existing)
    if (existing && !isEarly) return existing
    // record it, make the tag's own DOM element class on `elementSetup.DOMElement`, and define it (DOM API)
    UIComponent.register.call(this, definition)
    // after `register()`, which puts each attribute's getter on the prototype
    const strays = this.prototype.elementSetup.cssStates.filter((state) => !(E.camelCase(state) in this.prototype))
    if (strays.length) {
      throw new TypeError(
        `UIComponent.define():  <${definition.tag}>'s elementSetup.cssStates names ${strays.join(", ")}, ` +
          "which it has no attribute or member for;  fix the name, or give the class that member"
      )
    }
    const tagSetup = UIComponent.tagSetupFor(this, definition)
    if (isEarly) {
      DOMElement.attach(existing, this.prototype.elementSetup.DOMElement, tagSetup)
      return existing
    }
    const Class = DOMElement.subclassForTag(this.prototype.elementSetup.DOMElement, tagSetup)
    customElements.define(definition.tag, Class)
    return Class
  }

  /**
   * Give `Class`'s vocabulary an empty list for each list it leaves out:  `events`, `slots`, `parts`, `states`, `texts`.
   * - So a subclass's small vocabulary, written by hand or in JavaScript, defines:
   *   one with no `slots` crashed `Vocabulary.resolve()` ("vocabulary.slots is not iterable").
   * - SIDE EFFECT:  fills them in on the vocabulary itself;  a frozen one is copied onto `Class` instead.
   */
  private static completeVocabulary(Class: E.UIComponentClass): void {
    const vocabulary = Class.prototype.vocabulary as Partial<Record<(typeof VOCABULARY_LISTS)[number], unknown[]>>
    const missing = VOCABULARY_LISTS.filter((list) => !vocabulary[list])
    if (!missing.length) return
    const lists = Object.fromEntries(missing.map((list) => [list, []]))
    if (!Object.isFrozen(vocabulary)) Object.assign(vocabulary, lists)
    else {
      const value = { ...Class.prototype.vocabulary, ...lists }
      Object.defineProperty(Class.prototype, "vocabulary", { value, configurable: true, writable: true })
    }
  }

  /**
   * What the DOM element class of `definition`'s tag carries, for component class `Class`:
   * its definition, shadow root options, whether it's a form control, and how to build its component.
   */
  static tagSetupFor(Class: E.UIComponentClass, definition: E.ElementDefinition): TagSetup {
    const { delegatesFocus, slotAssignment, isAFormControl, Fallback, visible } = Class.prototype.elementSetup
    return {
      elementDefinition: definition,
      shadowRootInit: { mode: "open", delegatesFocus, slotAssignment },
      isAFormControl,
      visible,
      mountComponent: (domElement) => UIComponent.mount(Class, definition, domElement, Fallback)
    }
  }

  /**
   * Record `definition` for the page, WITHOUT defining a custom element.
   * - Adds it to `registry.definitions` and to the parts registry (`PartContext.define()`),
   *   hands its vocabulary and English texts to the runtime,
   *   and puts a getter for each attribute on the class (`Reactive.installAttributeGetters()`).
   * - `define()` starts with it;  the server render calls it alone, since node has no `customElements`.
   */
  static register(this: E.UIComponentClass, definition: E.ElementDefinition) {
    const { vocabulary } = this.prototype
    UIComponent.registry.definitions.set(definition.tag, definition)
    UIComponent.registry.components.set(definition.tag, this)
    if (this.prototype.elementSetup.root) UIComponent.rootTags.add(definition.tag)
    E.PartContext.define({
      vocabulary,
      tag: definition.tag,
      isAPart: this.prototype.elementSetup.isAPart,
      isConditionalOwner: "isOwnerOf" in this.prototype,
      isSeeThrough: "letsPartsThrough" in this.prototype
    })
    // Hand the vocabulary to the runtime (Spell UI's `UI.vocabulary`), and its English texts to its `UI.i18n`:
    // - when the class is DEFINED, not when its first element connects,
    //   so translations can find them before any element exists
    // - the texts are English DEFAULTS for this component only:
    //   any other text registered for the key (an app's own English, a translation) wins,
    //   and two components may use the same key (`label`) for different words
    // - once per vocabulary;  the runtime is loaded first if it hasn't loaded yet
    // - on the server, never loads the runtime (that needs the browser's `CSSStyleSheet`):
    //   it registers only with the one the server render installed (`ServerRuntime`)
    const { runtime, words } = E.SpellSolid.settings
    const isRuntimeLoaded = runtime.isLoaded
    // so the runtime can define this class under the page's languages too (Spell UI's `defineComponents()`)
    const define: E.ComponentDefiner = (tag, dictionary) => UIComponent.define.call(this, tag, dictionary)
    if (!UIComponent.registry.vocabularies.has(vocabulary) && (isRuntimeLoaded || !isServer)) {
      UIComponent.registry.vocabularies.add(vocabulary)
      if (isRuntimeLoaded) handOver()
      else void runtime.load().then(handOver)
    }
    E.Reactive.installAttributeGetters(
      this.prototype,
      definition.attributes.map(({ key, spec }) => ({ key, name: spec.name }))
    )

    /** Hand the vocabulary and its English texts to the runtime. */
    function handOver() {
      // on the server, editing a vocabulary makes a new object for the same tag:  replace the old one
      words.registerVocabulary(vocabulary, isServer ? "replace" : "register", define)
      const texts: Record<string, string> = {}
      for (const { key, text } of vocabulary.texts) texts[key] = text
      words.registerTexts(texts, vocabulary.tag)
    }
  }

  ////////////////
  // ## Reflection
  ////////////////

  /**
   * This component's whole vocabulary, for code that wants to look at it:  `UIButton.describe().topics`.
   * - Tag, attributes (kinds, values, defaults), events, slots, parts, states, texts, descriptions, `topics`, `aka`.
   * - The same object the element itself reads.
   * - Every tag's summary at once:
   *   Spell UI's `ComponentDefinitions` (`packages/ui/components/ComponentDefinitions.ts`).
   */
  static describe<T extends { prototype: { vocabulary: E.ComponentVocabulary } }>(
    this: T
  ): T["prototype"]["vocabulary"] {
    return this.prototype.vocabulary
  }
}

/** An element holding an app's value for the `ui-*` elements inside it:  a root (`UIComponent.appContext`). */
type AppContextHolder = Element & { appContext?: unknown }

/** `<ui-root>`'s tag:  a root even before its family loads (`UIComponent.isRootTag()`). */
const ROOT_TAG = "ui-root"

/** The shared attributes' canonical names ("Shared words"). */
const LINK = "link"
const TARGET = "target"
const FONT = "font"
/**
 * A size in the shared `font`, in pixels:  `14`, or with its leading, `10/20` (a 10px font on 20px lines).
 * - Groups:  the size, then the line height.
 */
const FONT_SIZE = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/
/** The state a `font` with a size sets:  `reset.css` makes it the element's own font size. */
const FONT_SIZE_STATE = "font-size"
/** The tokens a size in `font` writes:  every set's components work their sizes out from them (Spell UI's). */
const FONT_SIZE_TOKEN = "--ui-font-size"
const LINE_HEIGHT_TOKEN = "--ui-line-height"
const SHADOW = "shadow"
/** Where the shared `shadow`'s hue goes, which `reset.css` draws under `:state(shadow)`. */
const SHADOW_COLOR_TOKEN = "--_ui-shadow-color"
/**
 * The shared sizes:  each one's state and custom property (`--_ui-width`, `--_ui-height`) has its name.
 * - The heights only where the vocabulary takes them (`heights`).
 */
const SIZES = ["width", "min-width", "max-width", "height", "min-height", "max-height"] as const
/** `height="fluid"`:  takes what's left of its parent's height, drawn under `:state(fluid-height)`. */
const FLUID = "fluid"
const FLUID_HEIGHT_STATE = "fluid-height"
/** The state saying the shared sizes go on the shadow root's top-level boxes:  the element is `display: contents`. */
const SIZED_INSIDE_STATE = "sized-inside"
/** What, at the top of a shadow root, draws no box to resize (`UIComponent.resizeBox`). */
const NOT_A_BOX = "slot, style, link"
/** The shared sizes, by name:  any CSS length each, or `undefined` (`UIComponent.sharedSizes`). */
type SharedSizes = Record<(typeof SIZES)[number], string | undefined>
const TOOLTIP = "tooltip"

/** The shared `error`'s name:  failed, with its words if it has any. */
const ERROR = "error"
/** The shared `movable`:  people drag it to a new place. */
const MOVABLE = "movable"
/** The shared `resizable`:  people drag its corner to resize it. */
const RESIZABLE = "resizable"
const LABEL = "label"
/** The lists a vocabulary may leave out, each filled in empty as its tag is defined (`completeVocabulary()`). */
const VOCABULARY_LISTS = ["events", "slots", "parts", "states", "texts"] as const

/** The shared `on-platform`, and the state saying it's set. */
const ON_PLATFORM = "on-platform"

/** The attribute naming the container an element joins ("Parent"). */
const PARENT = "parent"

/****************
 * ### `HostLayoutSheets`
 * The page's `:host` sheets for `UIComponent.hostLayout`, ONE per text of declarations, shared by every root that
 * uses it (epic `solid-2-final` P4).
 * - Counted:  a sheet no root uses any more is let go.
 * - NEVER changes a sheet's text:  other roots hold it.  A root whose declarations change takes another.
 * - Static:  page-wide, as the sheets are.
 ****************/
class HostLayoutSheets {
  /** The sheet for `declarations`, made the first time;  one more root uses it. */
  static take(declarations: string): CSSStyleSheet {
    let entry = HostLayoutSheets.byText.get(declarations)
    if (!entry) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(`:host { ${declarations} }`)
      HostLayoutSheets.byText.set(declarations, (entry = { sheet, users: 0 }))
    }
    entry.users++
    return entry.sheet
  }

  /** One root fewer uses the sheet for `declarations`;  the last one lets it go. */
  static release(declarations: string) {
    const entry = HostLayoutSheets.byText.get(declarations)
    if (entry && --entry.users <= 0) HostLayoutSheets.byText.delete(declarations)
  }

  /** declarations => their sheet, and how many roots use it */
  private static readonly byText = new Map<string, { sheet: CSSStyleSheet; users: number }>()
}

/** `UIComponent.internalState`:  what only the base class uses inside. */
type InternalState = {
  /**
   * what `rootClass` builds from:
   * one getter per attribute, each calling `classValue()` (`ElementDefinition.classInput()`)
   */
  readonly classInput: E.ClassInput
  /** aborted when the element is disposed, removing every listener `on()` added;  made by the first `on()` */
  listeners?: AbortController
  /** the boxes the shared states made inert (disabled or loading), the only ones they clear again */
  madeInert?: HTMLElement[]
  /** the shared `tooltip` wrote the element's `title`, so a later empty one removes it again */
  wroteTitle?: boolean
  /** the shared `font`'s size wrote the element's `--ui-font-size`, so a later one without removes it again */
  wroteFontSize?: boolean
  /** the shared `shadow` wrote the element's `--_ui-shadow-color`, so a later empty one removes it again */
  wroteShadow?: boolean
  /** the shared sizes wrote the element's custom properties and states, so later empty ones clear them */
  wroteSizes?: boolean
  /** the shared `on-platform` set the element's states, so a later empty one clears them */
  wrotePlatforms?: boolean
  /** `isVisible` as `onVisibleChange()` last ran with it;  `undefined` before the element first drew */
  wasVisible?: boolean
  /** counts `onVisibleChange()` runs, so only the latest ends the hiding */
  visibleRun?: number
  /** the boxes the default `onVisibleChange()` last animated out (which `UI.transitions` left `hidden`) */
  animatedOut?: HTMLElement[]
}
