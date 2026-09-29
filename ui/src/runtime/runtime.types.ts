/**
 * Shared types, constants and small error classes for `$/runtime`.
 * - Runtime-light:  `import type` only, so the eager barrel (`UI` accessor + `loadUI`) stays tiny
 *   and the service classes stay in the lazily-loaded chunk.
 */

import type { UIRuntime } from "./UIRuntime"

////////////////
// ## Runtime
////////////////

/**
 * Key the ONE runtime instance lives under on `globalThis`.
 * - `Symbol.for()` so two copies of `@spell/ui` on one page (duplicate bundles, micro-frontends)
 *   find each other's runtime rather than fighting over shortcuts, overlays and scroll lock.
 */
export const RUNTIME_KEY = Symbol.for("@spell/ui:runtime")

/**
 * Version of this runtime build.
 * - Compared when a second bundle finds an existing runtime, so mismatches warn in dev.
 * - TODO: inject from `package.json` at build time (vite `define`) instead of keeping it by hand.
 */
export const RUNTIME_VERSION = "0.0.1"

/** `globalThis` as seen by the runtime:  may hold the shared instance. */
export type RuntimeGlobal = typeof globalThis & {
  /** the shared runtime, once any bundle has created it */
  [RUNTIME_KEY]?: UIRuntime
}

/** Returned by every `register()` / `trap()` / `attach()` style call:  undoes it.  Safe to call twice. */
export type Disposer = () => void

/**
 * `@layer` order of the whole package, as `layers.css` declares it.
 * - Repeated at the top of any sheet the runtime builds itself, so a runtime sheet that happens to load
 *   before `layers.css` can't establish a different order.
 */
export const LAYER_ORDER = "@layer ui.reset, ui.tokens, ui.base, ui.components, ui.utilities, ui.theme, ui.app;"

/**
 * Platforms whose primary shortcut modifier is Meta (Cmd), not Ctrl.
 * - Tested against `navigator.platform`, falling back to `navigator.userAgent`.
 */
export const APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/i

////////////////
// ## Browser
////////////////

/**
 * Feature flags from `UI.browser.supports`.
 * - Every flag is `false` outside a browser (SSR), so callers never need a separate environment check.
 * - Call sites branch on THESE, NEVER on user-agent checks -- see `AGENTS.md` "Platform".
 */
export type BrowserSupports = {
  /** CSS anchor positioning (`anchor-name`, `position-area`) */
  anchorPositioning: boolean
  /** `popover` attribute + `showPopover()` */
  popover: boolean
  /** `popover="hint"` -- tooltips that don't close `auto` popovers */
  popoverHint: boolean
  /** `<dialog closedby="any">` -- light dismiss handled by the browser */
  dialogClosedBy: boolean
  /** `CloseWatcher` -- Escape AND Android back button close the top overlay */
  closeWatcher: boolean
  /** customizable `<select>` (`appearance: base-select`) */
  baseSelect: boolean
  /** `@container style(--x: 1)` */
  styleContainerQueries: boolean
  /** `@starting-style` */
  startingStyle: boolean
  /** `ElementInternals.states` -> `:state()` selectors */
  customStates: boolean
  /** `document.startViewTransition()` */
  viewTransitions: boolean
  /** native `Temporal` (else the polyfill plugs in -- see `I18n`) */
  temporal: boolean
  /** `interpolate-size: allow-keywords` -- animate to `height: auto` */
  interpolateSize: boolean
}

////////////////
// ## Keyboard
////////////////

/**
 * Called when a registered chord is pressed.
 * - Return `false` to say "not mine after all":  dispatch continues to the next matching registration,
 *   and the event is NOT `preventDefault()`ed.
 */
export type KeyHandler = (event: KeyboardEvent) => void | boolean

/** Options for `Keyboard.register()`. */
export type KeyRegistrationOptions = {
  /** only fire when the event's composed path includes this element (e.g. the component's host) */
  target?: EventTarget
  /** `preventDefault()` a handled event;  default `true` */
  preventDefault?: boolean
  /** `stopPropagation()` a handled event;  default `false` */
  stopPropagation?: boolean
  /** fire whatever scope is on top of the stack, e.g. an app-wide command palette shortcut */
  global?: boolean
  /** fire even when focus is in an `<input>` / `<textarea>` / contenteditable without a modifier */
  inEditable?: boolean
}

/** Scope at the bottom of `Keyboard`'s stack:  page-level shortcuts, active when no overlay is open. */
export const PAGE_SCOPE = "page"

////////////////
// ## Overlays
////////////////

/** What kind of top-layer thing an overlay entry is;  sets defaults for the entry's other options. */
export type OverlayKind = "modal" | "flyout" | "popover" | "toast" | "dimmer"

/**
 * Why `Overlays` asked an entry to dismiss itself.
 * - `escape`:  Escape key or `CloseWatcher` close request (Android back button)
 * - `outside`:  click that both started and ended outside the overlay
 * - `close-all`:  `Overlays.closeAll()`
 */
export type DismissReason = "escape" | "outside" | "close-all"

/**
 * An overlay registered with `Overlays.open()`.
 * - The component owns the entry object and passes the SAME object to `close()`.
 * - Defaults by `kind`:
 *   - `closeOnEscape`:  `true` except `toast`
 *   - `closeOnOutsideClick`:  `true` for `popover` / `flyout` / `dimmer`, `false` for `modal` / `toast`
 *   - `modal` (scroll lock + keyboard scope):  `true` for `modal` / `flyout` / `dimmer`
 */
export type OverlayEntry = {
  /** host element;  anything in its composed subtree counts as "inside" */
  element: Element
  /** sets defaults, see above */
  kind: OverlayKind
  /**
   * named pool:  only the topmost entry of each pool is checked for outside clicks.
   * - default `"default"`;  toasts use `"toast"` so a toast never steals a modal's outside click
   */
  pool?: string
  /** Escape / close request dismisses this entry when it's the topmost Escape-handling entry */
  closeOnEscape?: boolean
  /** a click outside dismisses this entry when it's the topmost entry in its pool */
  closeOnOutsideClick?: boolean
  /** lock page scroll while open (reference counted) */
  modal?: boolean
  /** restore focus to what had it before `open()`;  default `true` */
  restoreFocus?: boolean
  /** also counts as inside, e.g. the button that toggles a dropdown, so clicking it doesn't dismiss-then-reopen */
  anchor?: Element
  /**
   * Asked to dismiss.  The entry decides:  usually fire a cancelable `ui-close`, then `Overlays.close(entry)`.
   * - NOTE: `Overlays` never closes an entry by itself;  it only asks.
   */
  onDismiss: (reason: DismissReason) => void | Promise<void>
}

/** Class on `<html>` while any `modal` overlay is open;  `Overlays` registers the rule that uses it. */
export const SCROLL_LOCK_CLASS = "ui-scroll-locked"

/**
 * Minimal `CloseWatcher` shape.
 * - Declared here because TypeScript's DOM lib doesn't ship it yet.
 */
export type CloseWatcherLike = EventTarget & {
  /** stop watching;  no further events */
  destroy(): void
}

/** `CloseWatcher` constructor, read off `globalThis` only when `UI.browser.supports.closeWatcher`. */
export type CloseWatcherConstructor = new (options?: { signal?: AbortSignal }) => CloseWatcherLike

////////////////
// ## Focus
////////////////

/** Which arrow keys move a `RovingTabindex`. */
export type RovingOrientation = "horizontal" | "vertical" | "both"

/** Options for `RovingTabindex.attach()`. */
export type RovingOptions = {
  /** default `"vertical"` */
  orientation?: RovingOrientation
  /** ArrowDown on the last item moves to the first;  default `true` */
  wrap?: boolean
  /** starting item, default the one with `tabindex="0"` or `aria-selected="true"`, else the first */
  activeIndex?: number
  /** called when arrows / Home / End / focus move the active item */
  onChange?: (item: HTMLElement, index: number) => void
}

/** Items for a `RovingTabindex`:  a selector under the container, or a function for slotted / computed items. */
export type RovingItems = string | (() => HTMLElement[])

/** Anything `Focus.focusables()` can search. */
export type FocusRoot = Element | ShadowRoot | Document

////////////////
// ## Styles
////////////////

/** CSS source for `Styles.register()`:  text (built with `replaceSync`) or an already-built sheet. */
export type StyleSource = string | CSSStyleSheet

/** Options for `Styles.register()`. */
export type StyleRegisterOptions = {
  /** also push onto `document.adoptedStyleSheets` (once), e.g. `native.css`, `layers.css` */
  page?: boolean
}

/** `id` of the ONE app stylesheet components adopt -- see `docs/runtime.md`. */
export const APP_STYLESHEET_ID = "ui-app-stylesheet"

////////////////
// ## Transitions
////////////////

/**
 * The keyframe catalogue, ported from Fomantic's `transition` module.
 * - `animations.css` MUST provide keyframes for each, selected by `data-ui-animation`,
 *   e.g. `[data-ui-animation="fade-up in"]` -- see `Transitions`.
 * - Fomantic's multi-word names are kebab-cased so the attribute stays two tokens:
 *   `"fade up"` -> `fade-up`, `"horizontal flip"` -> `flip-horizontal`.
 */
export const ANIMATION_NAMES = [
  // ### Appear / disappear -- run `in` or `out`
  "fade",
  "fade-up",
  "fade-down",
  "fade-left",
  "fade-right",
  "scale",
  "zoom",
  "drop",
  "browse",
  "browse-right",
  "fly-up",
  "fly-down",
  "fly-left",
  "fly-right",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "swing-up",
  "swing-down",
  "swing-left",
  "swing-right",
  "flip-horizontal",
  "flip-vertical",
  // ### Attention -- run `static`, visibility unchanged
  "flash",
  "shake",
  "bounce",
  "tada",
  "pulse",
  "jiggle",
  "glow"
] as const

/** One name from the keyframe catalogue, see `ANIMATION_NAMES`. */
export type AnimationName = (typeof ANIMATION_NAMES)[number]

/**
 * Which way an animation runs.
 * - `in`:  un-hides the element first
 * - `out`:  hides it (`hidden`, and `display: none` if CSS overrides `[hidden]`) once finished
 * - `static`:  attention animations (`shake`, `pulse` ...);  visibility unchanged
 */
export type AnimationDirection = "in" | "out" | "static"

/** Options for `Transitions.animate()`;  unset values come from `animations.css` tokens. */
export type AnimateOptions = {
  /** e.g. `200` (ms) or `"0.3s"`;  set as `--ui-animation-duration` on the element */
  duration?: number | string
  /** any CSS easing;  set as `--ui-animation-easing` on the element */
  easing?: string
}

////////////////
// ## I18n
////////////////

/**
 * English strings for the runtime and components -- the fallback pack every lookup ends at.
 * - `{name}` placeholders are filled by `I18n.t(key, params)`.
 * - Component-specific strings live in each component's vocabulary file;  these are the shared ones.
 */
export const EN_STRINGS = {
  close: "Close",
  cancel: "Cancel",
  ok: "OK",
  noResults: "No results found.",
  addItem: "Add {value}",
  loading: "Loading…",
  today: "Today",
  clear: "Clear",
  selectAll: "Select all",
  more: "More",
  less: "Less",
  required: "Required",
  invalid: "Invalid value"
} as const

/** A shared string key, or any string a component pack adds. */
export type I18nKey = keyof typeof EN_STRINGS | (string & {})

/** A locale's strings:  key -> text with optional `{name}` placeholders. */
export type StringPack = Partial<Record<I18nKey, string>>

/** Values for `{name}` placeholders in `I18n.t()`. */
export type I18nParams = Record<string, string | number>

////////////////
// ## Toasts / Modals
////////////////

/** Options for `UI.toasts.show()`;  the toast component defines the rendering. */
export type ToastOptions = {
  /** body text */
  message: string
  /** bold first line */
  title?: string
  /** colour / state word, e.g. `"success"`, `"error"`, `"warning"`, `"info"` */
  type?: string
  /** ms before auto-dismiss;  `0` keeps it until dismissed */
  displayTime?: number
  /** e.g. `"top right"` */
  position?: string
  /** explicit id, e.g. to replace an existing toast */
  id?: string
}

/** What `UI.toasts.show()` returns. */
export type ToastHandle = {
  /** pass to `UI.toasts.dismiss()` */
  id: string
  /** resolves when the toast is gone */
  closed: Promise<void>
}

/** What the toast component registers as `Toasts.provider`. */
export type ToastProvider = {
  /** render a toast */
  show(options: ToastOptions): ToastHandle
  /** remove a toast early */
  dismiss(id: string): void
}

/** Options for `UI.modals.confirm/alert/prompt()`. */
export type ModalOptions = {
  /** header text */
  title?: string
  /** body text */
  message: string
  /** approve button text;  default `I18n` `ok` */
  okText?: string
  /** deny button text;  default `I18n` `cancel` */
  cancelText?: string
  /** `prompt()` only:  initial input value */
  value?: string
}

/** What the modal component registers as `Modals.provider`. */
export type ModalProvider = {
  /** resolves `true` on approve, `false` on deny / dismiss */
  confirm(options: ModalOptions): Promise<boolean>
  /** resolves when acknowledged */
  alert(options: ModalOptions): Promise<void>
  /** resolves with the entered text, or `null` on deny / dismiss */
  prompt(options: ModalOptions): Promise<string | null>
}

////////////////
// ## Api
////////////////

/** HTTP method for `Api.request()`. */
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

/** How `Api.request()` reads the response body. */
export type ApiResponseType = "json" | "text" | "response" | "auto"

/** Values for `{name}` / `{/name}` URL template slots. */
export type ApiUrlData = Record<string, string | number | boolean | null | undefined>

/** Options for `Api.request()`. */
export type ApiRequest = {
  /** URL template, e.g. `/api/users/{id}{/tab}` -- see `Api.url()` */
  url: string
  /** values for the URL template */
  urlData?: ApiUrlData
  /** default `GET` */
  method?: ApiMethod
  /**
   * request data
   * - `GET` / `HEAD`:  appended as query parameters
   * - otherwise:  plain objects are sent as JSON;  `FormData`, `URLSearchParams`, `Blob`, strings as-is
   */
  data?: unknown
  /**
   * ms to wait before sending;  a newer request with the same `key` inside that window supersedes this one,
   * which then rejects with an `AbortError` (Fomantic's `throttle` ~== debounce)
   */
  throttle?: number
  /** groups throttled requests;  default the URL template */
  key?: string
  /** caller's abort signal, combined with the throttle's via `AbortSignal.any` */
  signal?: AbortSignal
  /** ms before the request aborts with a `TimeoutError` */
  timeout?: number
  /** extra request headers */
  headers?: HeadersInit
  /** default `auto`:  JSON when the response says so, else text */
  responseType?: ApiResponseType
}

/**
 * Thrown by `Api.request()` for a non-2xx response.
 * - Keeps the `Response`, so callers can read a server error body.
 */
export class ApiError extends Error {
  /** HTTP status, e.g. `404` */
  readonly status: number
  /** the failed response, body unread */
  readonly response: Response

  constructor(response: Response) {
    super(`Server gave an error: ${response.status} ${response.statusText}`.trim())
    this.name = "ApiError"
    this.status = response.status
    this.response = response
  }
}
