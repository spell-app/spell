/*! Derived from `@solidjs/element` and `component-register`:  MIT licence, (c) Ryan Carniato. */
import { E } from "spell/element"

/****************
 * ### `HotDefinitions`
 * Hot replacement of a set's elements:  an edited component re-renders every live element in place,
 * keeping the element objects, their attributes and their property values.
 * - Two users:
 *   - `yarn dev`:  loaded into every component barrel, before its `define()` calls run,
 *     by the kit's Vite plugin (`src/element-tools/HotElements.ts`), which Spell UI's `vite.config.ts` adds
 *   - a page that swaps in a REBUILT COMPONENT PACK instead of reloading (epic `epic-engine` I116):
 *     Spell UI's `PackHotSwap` installs it as the page's bundle loads, before any pack defines;
 *     the pack's `define()` runs again, and only the families whose sources changed are swapped (`keeps`)
 * - Not in the `spell/element` barrel:  only the pages and builds that swap pay for it.
 * - SIDE EFFECT:
 *   `install()` wraps `UIComponent.define`, and hooks into every DOM element made (`DOMElement.hotReloadHooks`).
 * - Why:  `define()` is idempotent per tag, so a barrel re-run by HMR would return the OLD element class.
 *   - The wrapper records every tag's class and dictionary.
 *   - When a DIFFERENT class of the SAME name defines a known tag (its module was re-evaluated),
 *     that class takes over EVERY tag the old one had, the translated aliases (`es-boton`) included.
 * - The platform can't define a tag twice, so each tag's DOM element class STAYS,
 *   and what it reads is swapped in place (`redefine()`):
 *   its definition, its properties, how it builds its component.
 *   - What the platform read once at definition, and how a new version gets round it
 *     (epic `epic-engine` I171:  every epic page reloaded at a merge that added attributes):
 *     - observed attributes:  one it doesn't observe is watched on each element instead (`watchAttributes()`);
 *       one dropped is still reported, and ignored
 *     - a new version of the family's DOM element class (its pack ran again):  laid under the tag's class in place
 *       of the old one, when the platform's lifecycle callbacks stay the same
 *   - Anything else it read (DOM API `formAssociated`, another base class, a lifecycle callback, shadow root
 *     options):  `update()` reloads the page.
 * - Then the barrel's `import.meta.hot.accept()` calls `update()`,
 *   which re-renders every live element of the swapped classes.
 *   - Their component-internal state (a query, an open menu) resets;  their attributes and properties don't.
 * - Also:
 *   - English texts the edit changed reach the page's runtime, Spell UI's `UI.i18n`
 *     (`define()` never overwrites a registered text)
 *   - `updateStyle()` re-registers a component sheet whose `?inline` CSS changed
 * - NOTE: a vocabulary whose tag was renamed defines the NEW tag;  instances of the old one keep the old class.
 * - A changed vocabulary is swapped into the runtime, which re-resolves its translated names from it
 *   (Spell UI's `UI.vocabulary.replace()`).
 * - Imports the package through `spell/element`, as a component file does:  it's loaded into component barrels,
 *   and NOTHING in the package imports it (it's not in the `spell/element` barrel).
 * - STATIC and instance-free on purpose:  ONE record of definitions per page, as `customElements` is.
 * - Began as the old `solid-element` package's hot reload, merged into its one user (epic `spell-element`, Q11).
 ****************/
export class HotDefinitions {
  /** Wrap `UIComponent.define`, and hook into every DOM element made;  idempotent. */
  static install() {
    if (HotDefinitions.original) return
    HotDefinitions.original = E.UIComponent.define
    E.UIComponent.define = function (this: E.UIComponentClass, tag?: string, dictionary?: E.Dictionary) {
      return HotDefinitions.define(this, tag, dictionary)
    }
    E.DOMElement.hotReloadHooks = {
      created: (domElement) => HotDefinitions.track(domElement),
      valueSet: (domElement, key, source) => {
        let sources = HotDefinitions.sources.get(domElement)
        if (!sources) HotDefinitions.sources.set(domElement, (sources = {}))
        sources[key] = source
      }
    }
  }

  /** The wrapped `define()`:  record, re-define on a new version of a class, else as declared. */
  static define(
    Class: E.UIComponentClass,
    tag?: string,
    dictionary?: E.Dictionary
  ): CustomElementConstructor | undefined {
    const original = HotDefinitions.original!
    // no settings yet:  the original waits for them, and runs this again then (`SpellSolid.whenInstalled()`)
    if (!E.SpellSolid.isInstalled) return original.call(Class, tag, dictionary)
    const resolved = new E.ElementDefinition(Class.prototype.vocabulary, { tag, dictionary }).tag
    const known = HotDefinitions.tags.get(resolved)
    if (!known) {
      HotDefinitions.tags.set(resolved, { Class, tag, dictionary })
      return original.call(Class, tag, dictionary)
    }
    const defined = customElements.get(resolved)
    if (!defined || known.Class === Class || known.Class.name !== Class.name)
      return original.call(Class, tag, dictionary)
    // a pack swap keeping this tag's family as it was (its sources didn't change):  the live class stays
    if (HotDefinitions.keeps?.(resolved)) return defined
    HotDefinitions.replace(known.Class, Class)
    return defined
  }

  /**
   * While a pack is swapped in (`PackHotSwap`):  whether a re-run `define()` of tag `tag` KEEPS its live class.
   * - `true`:  its family's sources didn't change, so its elements aren't re-rendered
   * - `undefined` (the default, and in `yarn dev`):  every new version of a class is swapped in
   */
  static keeps?: (tag: string) => boolean

  /** `Next` is a new version of `Previous`:  re-define every tag `Previous` had with it (`redefine()`). */
  static replace(Previous: E.UIComponentClass, Next: E.UIComponentClass) {
    HotDefinitions.updateSheets(Previous, Next)
    const before = Previous.prototype.vocabulary
    const after = Next.prototype.vocabulary
    if (before !== after) {
      HotDefinitions.whenRuntime(() => {
        // `register()` refuses a second vocabulary object for a tag:
        // swap the new version in, so the registration below is a no-op and localized names re-resolve
        E.SpellSolid.settings.words.registerVocabulary(after, "replace")
        HotDefinitions.updateTexts(before, after)
      })
    }
    for (const known of HotDefinitions.tags.values()) {
      if (known.Class !== Previous) continue
      known.Class = Next
      const definition = new E.ElementDefinition(Next.prototype.vocabulary, known)
      const TagClass = customElements.get(definition.tag) as E.DOMElementClass | undefined
      if (TagClass) HotDefinitions.redefine(TagClass, Next, definition)
    }
  }

  /**
   * Swap `TagClass`'s definition, properties and component (`Next`) in place,
   * or record why the platform can't take the change (`update()` then reloads the page).
   * - Each live element's values are carried over (`migrate()`).
   * - NEVER re-renders:  `update()` does, once the whole barrel has re-run.
   * - Throws, changing nothing, when a new attribute property would hide a member of the element
   *   (as a first definition would).
   */
  static redefine(TagClass: E.DOMElementClass, Next: E.UIComponentClass, definition: E.ElementDefinition) {
    E.UIComponent.register.call(Next, definition)
    const next = E.UIComponent.tagSetupFor(Next, definition)
    const Base = Next.prototype.elementSetup.DOMElement
    const reason = HotDefinitions.changeOf(TagClass, Base, next)
    if (reason) {
      HotDefinitions.pending.refused.push({ tag: definition.tag, reason })
      return
    }
    // dry run on a stand-in with the new chain:  a clash throws BEFORE anything changed
    const Probe = class extends Base {} as unknown as E.DOMElementClass
    Probe.tagSetup = next
    E.DOMElement.defineProperties(Probe)
    const previous = TagClass.tagSetup.elementDefinition
    E.DOMElement.removeProperties(TagClass)
    // a new version of the family's DOM class:  the tag's class (and so every live element) inherits from it now
    if (Object.getPrototypeOf(TagClass) !== Base) {
      Object.setPrototypeOf(TagClass, Base)
      Object.setPrototypeOf(TagClass.prototype, Base.prototype)
    }
    TagClass.tagSetup = next
    E.DOMElement.defineProperties(TagClass)
    for (const domElement of HotDefinitions.liveElements(TagClass)) {
      HotDefinitions.migrate(domElement, previous, definition)
      HotDefinitions.watchAttributes(domElement)
    }
    HotDefinitions.pending.swapped.add(TagClass)
  }

  /**
   * Why `TagClass` can't take `next`, or `undefined` if it can.
   * - The platform read these ONCE, by DOM API `customElements.define()` or by the constructor of elements that
   *   already exist.
   * - Observed attributes changing is fine:  `watchAttributes()` hears the new ones.
   * - `Base`, the DOM element class `next` names:  the tag's own base, or a NEW VERSION of it (`isNewVersionOf()`)
   */
  static changeOf(TagClass: E.DOMElementClass, Base: E.AnyDOMElementClass, next: E.TagSetup): string | undefined {
    HotDefinitions.observedByPlatform(TagClass)
    const Previous = Object.getPrototypeOf(TagClass) as E.AnyDOMElementClass
    if (Previous !== Base && !HotDefinitions.isNewVersionOf(Base, Previous)) return "DOM element class changed"
    const formAssociated = !!(TagClass as unknown as { formAssociated?: boolean }).formAssociated
    if (formAssociated !== next.isAFormControl) return "formAssociated changed"
    if (JSON.stringify(TagClass.tagSetup.shadowRootInit) !== JSON.stringify(next.shadowRootInit)) {
      return "shadow root options changed"
    }
    return undefined
  }

  /**
   * Is `Next` a new version of DOM element class `Previous`, which a tag's class can inherit from instead?
   * - the same names, class by class, down to a class both share (`E.DOMElement`):  their module ran again
   *   (a component pack swapped in)
   * - and every DOM API lifecycle callback the same function:  the platform kept the ones it found at definition,
   *   so a new one would never run
   */
  static isNewVersionOf(Next: E.AnyDOMElementClass, Previous: E.AnyDOMElementClass): boolean {
    let next: Function | null = Next
    let previous: Function | null = Previous
    while (next !== previous) {
      if (!next || !previous || next === E.DOMElement || next.name !== previous.name) return false
      next = Object.getPrototypeOf(next) as Function | null
      previous = Object.getPrototypeOf(previous) as Function | null
    }
    const nextPrototype = Next.prototype as unknown as Record<string, unknown>
    const previousPrototype = Previous.prototype as unknown as Record<string, unknown>
    return LIFECYCLE_CALLBACKS.every((name) => nextPrototype[name] === previousPrototype[name])
  }

  /**
   * Finish a hot update:  re-render the live elements of every class swapped since the last call;
   * or, if a re-definition was refused, log it and `hot.invalidate()` (Vite then reloads the page).
   * - The Vite plugin calls it from each barrel's `import.meta.hot.accept()`.
   * - A pack swap calls it with no `hot`:  it reloads the page itself on a refusal (`PackHotSwap`).
   */
  static update(hot?: HotContext): HotUpdateResult {
    const refused = HotDefinitions.pending.refused.splice(0)
    const swapped = [...HotDefinitions.pending.swapped]
    HotDefinitions.pending.swapped.clear()
    if (refused.length) {
      const message = refused.map(({ tag, reason }) => `<${tag}>: ${reason}, full reload`).join("\n")
      E.SpellSolid.settings.warn("HotDefinitions", message)
      hot?.invalidate(message)
      return { reloaded: [], refused }
    }
    for (const TagClass of swapped) {
      for (const domElement of HotDefinitions.liveElements(TagClass)) HotDefinitions.reload(domElement)
    }
    return { reloaded: swapped.map((TagClass) => TagClass.tagSetup.elementDefinition.tag), refused }
  }

  /**
   * The style sheets `Next` changed from `Previous`'s, re-registered by name:  the elements' shadow roots already
   * adopted them, and the runtime replaces their rules in place (`styles.register()`).
   * - Why:  a sheet registers once per name, so a new class's changed text never reached the page (a pack swap)
   */
  private static updateSheets(Previous: E.UIComponentClass, Next: E.UIComponentClass) {
    const before = Previous.prototype.elementSetup.styleSheets ?? {}
    for (const [name, css] of Object.entries(Next.prototype.elementSetup.styleSheets ?? {})) {
      if (before[name] !== css) HotDefinitions.whenRuntime(() => E.SpellSolid.settings.styles.register(name, css))
    }
  }

  /**
   * A component sheet's `?inline` CSS changed:  re-register it by name (`UIButton.css` => `button`).
   * - The name is the file's, without `UI`, in kebab-case (`UITreeDiagram.css` => `tree-diagram`):
   *   elements register their sheets by that bare name (`elementSetup = { styleSheets: { button: buttonCSS } }`).
   * - A second sheet (`UIDimmer.page.css`) or a sheet registered under another name isn't matched:
   *   an edit to it shows after a page reload.
   * - The runtime's `styles.register()` replaces the rules of the sheet every shadow root already adopted:
   *   no re-render (Spell UI's `Styles.register()`).
   * - Registered even if no element used it yet, so a later `adoptStyleSheets()` finds the new text
   *   (Spell UI's `UI.styles.registerOnce()` only registers names that are missing).
   */
  static updateStyle(this: void, id: string, css: string) {
    const stem = /(?:^|\/)UI([A-Za-z0-9]+)\.css(?:\?|$)/.exec(id)?.[1]
    if (!stem) return
    const name = stem.replace(/(?<=.)([A-Z])/g, "-$1").toLowerCase()
    HotDefinitions.whenRuntime(() => E.SpellSolid.settings.styles.register(name, css))
  }

  ////////////////
  // ## Live elements
  ////////////////

  /**
   * Remember `domElement` as a live element of its class;  weak, so tracking never keeps an element alive.
   * - an element made after its tag took a new attribute the platform doesn't observe hears it too
   *   (`watchAttributes()`)
   */
  static track(domElement: E.DOMElement) {
    const TagClass = domElement.constructor as E.DOMElementClass
    let refs = HotDefinitions.live.get(TagClass)
    if (!refs) HotDefinitions.live.set(TagClass, (refs = new Set()))
    refs.add(new WeakRef(domElement))
    if (HotDefinitions.unobserved(TagClass).length) HotDefinitions.watchAttributes(domElement, "replay")
  }

  /**
   * The attributes the platform observes for `TagClass`:  fixed when it was defined.
   * - read the first time a new version comes (`changeOf()`), before its definition changes:
   *   `observedAttributes` reads the CURRENT definition (`DOMElement`), not what the platform took
   */
  static observedByPlatform(TagClass: E.DOMElementClass): string[] {
    let names = HotDefinitions.platformObserved.get(TagClass)
    if (!names) HotDefinitions.platformObserved.set(TagClass, (names = [...TagClass.observedAttributes]))
    return names
  }

  /** The attributes `TagClass`'s current definition observes and the platform doesn't (`watchAttributes()`). */
  static unobserved(TagClass: E.DOMElementClass): string[] {
    const platform = HotDefinitions.platformObserved.get(TagClass)
    if (!platform || !TagClass.tagSetup) return []
    return E.DOMElement.observedAttributesFor(TagClass.tagSetup.elementDefinition).filter(
      (name) => !platform.includes(name)
    )
  }

  /**
   * Hear the attributes `domElement`'s tag observes now and the platform doesn't (a new version added them), as
   * DOM API `attributeChangedCallback()` would:  a `MutationObserver` on the element calls it.
   * - after the platform's reports:  a mutation observer's callback runs in a microtask
   * - `replay`:  report the ones it has already too (an element made after the swap, its markup's attributes)
   * - none left:  stops listening
   */
  static watchAttributes(domElement: E.DOMElement, replay?: "replay") {
    const names = HotDefinitions.unobserved(domElement.constructor as E.DOMElementClass)
    HotDefinitions.watchers.get(domElement)?.disconnect()
    HotDefinitions.watchers.delete(domElement)
    if (!names.length) return
    const watcher = new MutationObserver((records) => {
      for (const { attributeName, oldValue } of records) {
        if (attributeName)
          domElement.attributeChangedCallback(attributeName, oldValue, domElement.getAttribute(attributeName))
      }
    })
    watcher.observe(domElement, { attributes: true, attributeFilter: names, attributeOldValue: true })
    HotDefinitions.watchers.set(domElement, watcher)
    if (!replay) return
    queueMicrotask(() => {
      for (const name of names) {
        const text = domElement.getAttribute(name)
        if (text !== null) domElement.attributeChangedCallback(name, null, text)
      }
    })
  }

  /** Every element of `TagClass` still in memory, connected or not. */
  static liveElements(TagClass: E.DOMElementClass): E.DOMElement[] {
    const refs = HotDefinitions.live.get(TagClass)
    const found: E.DOMElement[] = []
    for (const ref of refs ?? []) {
      const domElement = ref.deref()
      if (domElement) found.push(domElement)
      else refs!.delete(ref)
    }
    return found
  }

  /**
   * Dispose `domElement`'s component and, if connected, build and render its class's CURRENT component.
   * - Kept:  the element, its attributes, its property values (`attributeValues`), its shadow root and adopted sheets.
   * - Lost:  state inside the component.
   * - Clears DOM API `:state(errored)`, so an element whose render failed recovers with the next good component.
   * - A detached element is only disposed:  it renders the current component on its next connect.
   */
  static reload(domElement: E.DOMElement) {
    domElement.dispose()
    domElement.renderRoot.textContent = ""
    domElement.setState(E.ERRORED_STATE, false)
    if (domElement.isConnected) domElement.connectedCallback()
  }

  /**
   * Carry `domElement`'s values over to the `next` definition.
   * - Last written as a PROPERTY:  kept as is (a framework's rich data, a controlled value).
   * - Last written by its ATTRIBUTE:  converted again (a vocabulary that learned a value).
   * - New, and the element has its attribute:  converted from it.
   * - Never written:  the new starting value.
   * - Attributes the new definition dropped are dropped.
   */
  private static migrate(domElement: E.DOMElement, previous: E.ElementDefinition, next: E.ElementDefinition) {
    const sources = HotDefinitions.sources.get(domElement) ?? {}
    const values = domElement.attributeValues
    const kept: Record<string, unknown> = {}
    for (const attribute of next.attributes) {
      const isKnown = previous.attributes.some(({ key }) => key === attribute.key)
      const source = isKnown ? sources[attribute.key] : undefined
      // shown or hidden:  the `hidden` attribute holds it (`DOMElement`, "Shown or hidden")
      if (attribute.key === "visible" && next.takesShared("visible")) {
        kept[attribute.key] = !domElement.hasAttribute("hidden")
      } else if (source === "property") kept[attribute.key] = values[attribute.key]
      else if (source === "attribute" || (!isKnown && domElement.hasAttribute(attribute.attribute))) {
        kept[attribute.key] = next.convert(attribute, domElement.getAttribute(attribute.attribute))
      } else kept[attribute.key] = next.startingValue(attribute)
    }
    for (const key of Object.keys(values)) delete values[key]
    Object.assign(values, kept)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Run `task` now if the runtime is loaded, else once it is.
   * - Queued behind registrations `define()` already queued, ahead of the ones it queues next (same promise).
   */
  private static whenRuntime(task: () => void) {
    const { runtime } = E.SpellSolid.settings
    if (runtime.isLoaded) task()
    else void runtime.load().then(task)
  }

  /**
   * English texts the `next` version of a vocabulary changed, as its new defaults.
   * - Defaults sit below every registered string (Spell UI's `I18n.registerDefaults()`), so a translation still wins.
   */
  private static updateTexts(previous: E.ComponentVocabulary, next: E.ComponentVocabulary) {
    const previousTexts = new Map(previous.texts.map(({ key, text }) => [key, text]))
    const changed: Record<string, string> = {}
    for (const { key, text } of next.texts) if (previousTexts.get(key) !== text) changed[key] = text
    if (Object.keys(changed).length) E.SpellSolid.settings.words.registerTexts(changed, next.tag)
  }

  ////////////////
  // ## Page-wide registry
  ////////////////

  /** Every tag defined so far, with what defined it;  by resolved tag. */
  private static readonly tags = new Map<string, HotTag>()

  /** Live elements per tag class. */
  private static readonly live = new WeakMap<E.DOMElementClass, Set<WeakRef<E.DOMElement>>>()

  /** Where each element's attribute values last came from, by key:  `migrate()` reads it. */
  private static readonly sources = new WeakMap<E.DOMElement, Record<string, E.ValueSource>>()

  /** The attributes the platform observes, per tag class, as it defined it (`observedByPlatform()`). */
  private static readonly platformObserved = new WeakMap<E.DOMElementClass, string[]>()

  /** Each element's watcher of the attributes the platform doesn't observe (`watchAttributes()`). */
  private static readonly watchers = new WeakMap<E.DOMElement, MutationObserver>()

  /** Swaps and refusals since the last `update()`. */
  private static readonly pending = {
    swapped: new Set<E.DOMElementClass>(),
    refused: [] as HotRefusal[]
  }

  /** `UIComponent.define` as declared, once `install()` has run. */
  private static original?: typeof E.UIComponent.define
}

/** DOM API:  the lifecycle callbacks the platform reads once, as it defines a tag (`isNewVersionOf()`). */
const LIFECYCLE_CALLBACKS = [
  "connectedCallback",
  "disconnectedCallback",
  "adoptedCallback",
  "connectedMoveCallback",
  "attributeChangedCallback",
  "formAssociatedCallback",
  "formResetCallback",
  "formDisabledCallback",
  "formStateRestoreCallback"
]

/** What defined one tag:  enough to define it again with a new version of the class. */
type HotTag = {
  /** Current class. */
  Class: E.UIComponentClass
  /** `define()`'s `tag` argument, as passed. */
  tag?: string
  /** `define()`'s `dictionary` argument. */
  dictionary?: E.Dictionary
}

/** A re-definition the platform can't take:  the tag, and why. */
export type HotRefusal = { tag: string; reason: string }

/** `update()`'s result:  the tags re-rendered, or the refusals that reloaded the page. */
export type HotUpdateResult = { reloaded: string[]; refused: HotRefusal[] }

/** The part of Vite's `import.meta.hot` `update()` uses. */
export type HotContext = { invalidate(message?: string): void }

HotDefinitions.install()
