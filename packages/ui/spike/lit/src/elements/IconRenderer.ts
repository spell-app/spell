import { html, nothing, type ReactiveControllerHost, type TemplateResult } from "lit"

import { Icons, type IconStyle } from "$/icons"

/**
 * Icons in Lit templates:  `renderer.template("cloud")` => `<svg viewBox aria-hidden><path fill=currentColor d>`.
 * - Same markup as `Icons.svg()`, but as a TEMPLATE:  `Icons.svg()` returns a fresh DOM node, which Lit would
 *   swap in on every render (node identity changes) -- a template diffs to nothing when the icon is unchanged.
 * - Data loads lazily (`Icons.get()`);  until it's in, nothing renders inside the `.icon` box, which CSS
 *   sizes on its own, so arrival causes no layout shift.  The host re-renders once per loaded name.
 * - Names that don't exist are remembered and never retried.
 */
export class IconRenderer {
  /** element to re-render when data arrives */
  private readonly host: ReactiveControllerHost
  /** names (`name/style`) this host is already waiting for */
  private readonly waiting = new Set<string>()

  constructor(host: ReactiveControllerHost) {
    this.host = host
  }

  /**
   * `<svg>` template for icon `name`, or `nothing` while loading / for unknown names.
   * - `style` forces a set (`regular`, `brands`);  default inferred from the name (`Icons.resolve()`).
   */
  template(name: string | undefined, style?: IconStyle): TemplateResult | typeof nothing {
    if (!name) return nothing
    const data = Icons.peek(name, style)
    if (data) {
      const [width, height, path] = data
      return html`<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
        <path fill="currentColor" d=${path}></path>
      </svg>`
    }
    const key = style ? `${name}/${style}` : name
    if (!IconRenderer.missing.has(key) && !this.waiting.has(key)) {
      this.waiting.add(key)
      void Icons.get(name, style).then((found) => {
        this.waiting.delete(key)
        if (found) this.host.requestUpdate()
        else IconRenderer.missing.add(key)
      })
    }
    return nothing
  }

  /** Names (`name/style`) `Icons.get()` couldn't find. */
  private static readonly missing = new Set<string>()
}
