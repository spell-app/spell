import { proto } from "$/util"

import { RUNTIME_KEY, RUNTIME_VERSION, type RuntimeGlobal, type ToastHandle, type ToastOptions } from "./runtime.types"
import { Api } from "./Api"
import { Browser } from "./Browser"
import { Focus } from "./Focus"
import { I18n } from "./I18n"
import { Ids } from "./Ids"
import { Keyboard } from "./Keyboard"
import { Modals } from "./Modals"
import { Overlays } from "./Overlays"
import { Styles } from "./Styles"
import { Toasts } from "./Toasts"
import { Transitions } from "./Transitions"
import { load } from "./load"

/**
 * The shared `UI` runtime:  ONE instance per page, holding every service as a readonly field.
 * - Why one:  keyboard scopes, the overlay stack, scroll lock and the stylesheet registry only work if every
 *   component on the page talks to the SAME instance -- including components from a second copy of the
 *   package (duplicate bundles, micro-frontends).  So the instance lives on `globalThis[RUNTIME_KEY]`
 *   and `UIRuntime.instance` reuses whatever is there.
 * - Loaded lazily:  components call `UI.load()` (see `load.ts`) from `connectedCallback`, which
 *   dynamic-imports THIS module once, so the runtime is its own chunk and pages pay for it only when a
 *   component actually connects.
 * - Constructs outside a browser too (SSR):  services touch the DOM only when used.
 * - NOTE: `Vocabulary` and the foundation stylesheets are wired in by their own sub-systems
 *   (`$/vocabulary`, `$/styles`), which register into `UI.styles` / the runtime after load.
 */
export class UIRuntime {
  /** this build's version;  a runtime from another bundle may differ */
  declare readonly version: string
  @proto static version = RUNTIME_VERSION

  /** feature flags and sniffing */
  readonly browser = new Browser()
  /** unique ids for ARIA wiring */
  readonly ids = new Ids()
  /** shortcut registry with scopes */
  readonly keyboard = new Keyboard({ apple: this.browser.isApple })
  /** focus helpers that cross shadow roots */
  readonly focus = new Focus()
  /** constructable stylesheet registry + `#ui-app-stylesheet` */
  readonly styles = new Styles()
  /** top-layer stack:  Escape, outside clicks, scroll lock, focus restore */
  readonly overlays = new Overlays({
    keyboard: this.keyboard,
    focus: this.focus,
    browser: this.browser,
    styles: this.styles
  })
  /** keyframe catalogue runner */
  readonly transitions = new Transitions({ browser: this.browser })
  /** strings and `Intl` formatting */
  readonly i18n = new I18n()
  /** programmatic toasts (provider registered by `ui-toast`) */
  readonly toasts = new Toasts()
  /** promise dialogs (provider registered by `ui-modal`) */
  readonly modals = new Modals()
  /** `fetch` with URL templates and throttling */
  readonly api = new Api()

  /** Resolves once every service is constructed and the runtime is published on `globalThis`. */
  readonly ready: Promise<void>

  constructor() {
    this.ready = Promise.resolve()
  }

  /**
   * THE runtime for this page:  the one on `globalThis[RUNTIME_KEY]`, created on first access.
   * - A second bundle's `UIRuntime` class finds the first bundle's instance here;  a version mismatch warns in dev.
   */
  static get instance(): UIRuntime {
    const global = globalThis as RuntimeGlobal
    const existing = global[RUNTIME_KEY]
    if (existing) {
      if (import.meta.env.DEV && existing.version !== RUNTIME_VERSION) {
        console.warn(`@spell/ui: runtime ${existing.version} already loaded;  this bundle is ${RUNTIME_VERSION}.`)
      }
      return existing
    }
    return (global[RUNTIME_KEY] = new UIRuntime())
  }

  /**
   * Load (if needed) and return the page runtime, once `ready`.
   * - Same as `UI.load()` / `loadUI()`;  here for callers that already hold the class.
   */
  static load(): Promise<UIRuntime> {
    return load()
  }

  /** Resolve with this runtime once `ready`;  what `UI.load()` returns once the chunk is in. */
  async load(): Promise<this> {
    await this.ready
    return this
  }

  /** Shortcut for `toasts.show()`, the Fomantic `$.toast({...})` spelling. */
  toast(options: ToastOptions): ToastHandle {
    return this.toasts.show(options)
  }
}
