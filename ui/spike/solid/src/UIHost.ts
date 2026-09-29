import type { ElementDefinition } from "./ElementDefinition"
import type { UIElement } from "./UIElement"

/**
 * `HTMLElement`, or a stand-in outside a browser, so modules that define hosts can be IMPORTED during SSR
 * (the classes are never constructed there).
 */
const BaseElement = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement

/**
 * Base class of every element's HOST -- the `BaseElement` `component-register` extends.
 * - Owns what lives as long as the element, not one connection:  the shadow root (with `delegatesFocus`,
 *   attached HERE, before the library's `renderRoot` getter would attach a plain one), `ElementInternals`
 *   (custom states, ARIA, forms), the `ready` promise and the upgrade-property stash.
 * - The per-connection logic is a `UIElement` controller, created by the render function on every connect
 *   (`component-register` tears everything down on disconnect and re-renders on reconnect).
 * - NOTE: `connectedCallback` / `attributeChangedCallback` belong to the library's subclass;  anything that
 *   needs them goes in `ElementDefinition.register()`'s final subclass.
 */
export class UIHost extends BaseElement {
  /** Set on each defined subclass by `ElementDefinition.register()`. */
  declare static definition: ElementDefinition

  /** Shadow root option;  a component without a focusable part turns it off. */
  static delegatesFocus = true

  /** Platform internals:  states, ARIA defaults, forms. */
  readonly internals: ElementInternals

  /** Controller of the current connection, if connected. */
  controller?: UIElement<any>

  // `component-register`'s instance API, which its subclass adds
  /** Run `fn(key, value)` whenever a prop is set;  cleared on disconnect. */
  declare addPropertyChangedCallback: (fn: (key: string, value: unknown) => void) => void
  /** Run `fn` on disconnect. */
  declare addReleaseCallback: (fn: () => void) => void

  /** True while `attributeChangedCallback` runs, so the change isn't reflected back. */
  fromAttribute = false

  /** True while reflecting a property, so the attribute change isn't read back (arrays would become strings). */
  reflecting = false

  /** Resolves once the first connection has rendered with its styles adopted. */
  readonly ready: Promise<void>

  /** Resolves `ready`. */
  private resolveReady!: () => void

  /** Properties set on the element BEFORE it upgraded, see `restoreUpgradedProperties()`. */
  private upgraded?: Map<string, unknown>

  constructor() {
    super()
    const Host = this.constructor as typeof UIHost
    this.attachShadow({ mode: "open", delegatesFocus: Host.delegatesFocus })
    this.internals = this.attachInternals()
    this.ready = new Promise((resolve) => (this.resolveReady = resolve))
    this.stashUpgradedProperties()
    // capture on the host itself, so a disabled element swallows clicks before page listeners on it run
    this.addEventListener("click", this.onClickCapture, { capture: true })
  }

  /** This element's definition (names, converters). */
  get definition(): ElementDefinition {
    return (this.constructor as typeof UIHost).definition
  }

  ////////////////
  // ## States
  ////////////////

  /** Add or remove custom state `name` (`:state(name)`). */
  setState(name: string, on: boolean) {
    if (on) this.internals.states.add(name)
    else this.internals.states.delete(name)
  }

  /** Resolve `ready`;  called by the controller once it has rendered with styles. */
  markReady() {
    this.resolveReady()
  }

  ////////////////
  // ## Upgrade backstop
  ////////////////

  /**
   * Stash own properties that shadow our accessors -- set before `customElements.define()` ran, e.g. a
   * framework assigning `options` to a not-yet-upgraded element.
   * - Why:  `component-register`'s constructor assigns `undefined` to every prop key right after this,
   *   which would silently drop such values.
   */
  private stashUpgradedProperties() {
    for (const { key } of this.definition.attributes) {
      if (!Object.hasOwn(this, key)) continue
      const value = (this as unknown as Record<string, unknown>)[key]
      if (value === undefined) continue
      ;(this.upgraded ??= new Map()).set(key, value)
      delete (this as unknown as Record<string, unknown>)[key]
    }
  }

  /**
   * Re-set stashed pre-upgrade properties through the real setters (so they render and reflect).
   * - Called once, right after the first `connectedCallback`.
   */
  restoreUpgradedProperties() {
    if (!this.upgraded) return
    const values = this.upgraded
    this.upgraded = undefined
    for (const [key, value] of values) (this as unknown as Record<string, unknown>)[key] = value
  }

  ////////////////
  // ## Events
  ////////////////

  /** Swallow clicks while the controller says the element is disabled. */
  private readonly onClickCapture = (event: MouseEvent) => {
    if (!this.controller?.isDisabled()) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}
