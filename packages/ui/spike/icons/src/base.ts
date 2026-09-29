/** Icon style sets Font Awesome 7 Free ships. */
export type Variant = "solid" | "regular" | "brands"

/** Origin-relative root the per-icon assets are served from;  `globalThis.__ICON_BASE__` overrides (CDN, other bundle). */
export function iconBase(): string {
  return (globalThis as { __ICON_BASE__?: string }).__ICON_BASE__ ?? "/"
}

/** Absolute URL of `path` under `iconBase()`, e.g. `assetUrl("svg/solid/user.svg")`. */
export function assetUrl(path: string): string {
  return new URL(iconBase() + path, document.baseURI).href
}

/** `window.__iconPainted`:  `performance.now()` of each icon's first frame after its glyph was ready. */
type PaintLog = { __iconPainted?: number[] }

/**
 * Shared sheet:  the `ui-icon` box rules from `src/components/icon/icon.css`, trimmed to what these experiments need.
 * - `.glyph` is the mask variant's stand-in for `<svg>`:  same 1em height, `currentColor` fill.
 */
const SHEET = new CSSStyleSheet()
SHEET.replaceSync(`
  :host { display: contents; }
  :host([hidden]) { display: none; }
  span.ui.icon {
    box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: 1.18em; height: 1em; line-height: 1; vertical-align: -0.125em; font-style: normal; color: inherit;
  }
  .ui.icon > svg { display: block; flex: none; width: auto; height: 1em; max-width: 100%; fill: currentColor; overflow: visible; }
  .ui.icon > .glyph {
    display: block; flex: none; width: 100%; height: 1em; background: currentColor;
    mask: var(--x-icon) center / contain no-repeat;
  }
`)

/**
 * Base of every `x-icon-<variant>` element:  open shadow root, `<span class="ui icon" part="icon">`, and the
 * accessibility contract of `ui-icon`.
 * - Attributes:  `name` (canonical Font Awesome name), `variant` (`solid` default), `label` (accessible name).
 * - Accessible name lives on the HOST via `ElementInternals`:  `label` => `role=img` + `aria-label`, else `aria-hidden`.
 * - Subclasses only say how to put the glyph into the box (`render()`).
 * - SIDE EFFECT: pushes `performance.now()` onto `window.__iconPainted` two frames after each render settles --
 *   `measure.ts` reads that log.
 */
export abstract class IconBase extends HTMLElement {
  static observedAttributes = ["name", "variant", "label"]

  readonly #internals = this.attachInternals()
  readonly #box: HTMLSpanElement
  /** Bumped per render request so a slow, stale load never overwrites a newer one. */
  #generation = 0

  constructor() {
    super()
    const root = this.attachShadow({ mode: "open" })
    root.adoptedStyleSheets = [SHEET]
    this.#box = document.createElement("span")
    this.#box.className = "ui icon"
    this.#box.setAttribute("part", "icon")
    root.append(this.#box)
  }

  connectedCallback(): void {
    this.#update()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#update()
  }

  /** Puts the glyph for `name` in `variant` into `box`;  resolves when it is ready to paint (may reject on 404). */
  protected abstract render(box: HTMLSpanElement, name: string, variant: Variant): Promise<void>

  #update(): void {
    const label = this.getAttribute("label")
    this.#internals.role = label ? "img" : null
    this.#internals.ariaLabel = label
    this.#internals.ariaHidden = label ? null : "true"
    const name = this.getAttribute("name")
    if (!name) return
    const variant = (this.getAttribute("variant") ?? "solid") as Variant
    const generation = ++this.#generation
    this.render(this.#box, name, variant).then(
      () => {
        if (generation === this.#generation) IconBase.markPainted()
      },
      (error: unknown) => console.error(`x-icon: ${name} (${variant}) failed`, error)
    )
  }

  /** Logs a paint two frames from now:  the first rAF runs before the frame, the second after it was presented. */
  static markPainted(): void {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const log = window as unknown as PaintLog
        ;(log.__iconPainted ??= []).push(performance.now())
      })
    )
  }

  /** `<svg>` markup for a `[width, height, path]` tuple, same shape as `Icons.svgString()`. */
  static svgString(width: number, height: number, path: string): string {
    return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`
  }
}
