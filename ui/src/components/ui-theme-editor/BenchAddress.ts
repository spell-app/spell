import type { PageDevice, PageSchemes } from "./UIThemeEditor.types"

/****************
 * ### `BenchAddress`
 * The theme editor's view, kept in its page's ADDRESS (Owen:  "state of top tabs should be reflected in the URL bar,
 * so I can copy/paste the URL to someone else to look"):  `?theme=glass&scheme=both&swap=1&pages=epic,app&phone=1`.
 * - `theme`:  the theme it builds on;  the page's own theme menu reads the same one (`ThemePreference`)
 * - `scheme`:  `light`, `dark` or `both`;  `swap=1`:  ⇄ on (with `both`)
 * - `pages`:  the pages shown, in their order in the grid;  `phone=1`:  Phone on
 * - Read once, as the editor starts:  what it says wins over what's remembered in the browser, and is never stored.
 * - Written with `history.replaceState()` as the view changes:  no reload, no step in the history.
 *   Other parameters in the address stay as they are.
 * - Static and DOM-only:  no Solid, so it's read in the editor's field initializers.
 ****************/
export class BenchAddress {
  /** What this page's address says of the view;  each part `undefined` where it says nothing (or on a server). */
  static read(): BenchView {
    if (typeof location === "undefined") return {}
    const params = new URLSearchParams(location.search)
    const scheme = params.get(PARAMS.scheme)
    const pages = params.get(PARAMS.pages)
    return {
      theme: params.get(PARAMS.theme) || undefined,
      schemes: SCHEMES.includes(scheme as PageSchemes) ? (scheme as PageSchemes) : undefined,
      isSwapped: params.has(PARAMS.swap) ? params.get(PARAMS.swap) === ON : undefined,
      pages: pages ? pages.split(",").filter(Boolean) : undefined,
      device: params.has(PARAMS.phone) ? (params.get(PARAMS.phone) === ON ? "phone" : "desk") : undefined
    }
  }

  /**
   * Put `view` in this page's address, in place (\`history.replaceState()\`);  the same address again:  nothing.
   * - Off switches are left out (`swap`, `phone`), so a link stays short.
   */
  static write(view: Required<BenchView>): void {
    if (typeof location === "undefined") return
    const url = new URL(location.href)
    url.searchParams.set(PARAMS.theme, view.theme)
    url.searchParams.set(PARAMS.scheme, view.schemes)
    BenchAddress.setOn(url, PARAMS.swap, view.isSwapped && view.schemes === "both")
    url.searchParams.set(PARAMS.pages, view.pages.join(","))
    BenchAddress.setOn(url, PARAMS.phone, view.device === "phone")
    // commas read better than `%2C` in a link people copy
    const href = url.href.replace(/%2C/g, ",")
    if (href !== location.href) history.replaceState(history.state, "", href)
  }

  /**
   * `address` opening the theme bench with only page `page` shown (\`pages=app\`), whatever else it says.
   * - The theme menu's Theme bench:  "start with only the section you came from visible" (Owen).
   */
  static withPage(address: string, page: string): string {
    const url = new URL(address, typeof location === "undefined" ? "http://localhost" : location.href)
    url.searchParams.set(PARAMS.pages, page)
    return url.href
  }

  /** `name=1` on `url` while `isOn`, else none. */
  private static setOn(url: URL, name: string, isOn: boolean): void {
    if (isOn) url.searchParams.set(name, ON)
    else url.searchParams.delete(name)
  }
}

/** The view an address says:  each part, or `undefined` where it says nothing. */
export type BenchView = {
  /** the theme it builds on */
  theme?: string
  /** Light, Dark or Both */
  schemes?: PageSchemes
  /** ⇄ */
  isSwapped?: boolean
  /** the pages shown, by id, in their order */
  pages?: string[]
  /** desk or phone */
  device?: PageDevice
}

/** The address's parameters. */
const PARAMS = { theme: "theme", scheme: "scheme", swap: "swap", pages: "pages", phone: "phone" } as const

/** A switch that's on:  `swap=1`. */
const ON = "1"

/** The schemes the address may say. */
const SCHEMES: readonly PageSchemes[] = ["light", "dark", "both"]
