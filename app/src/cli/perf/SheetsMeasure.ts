import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * The style sheets every shadow root adopts:  for each distinct sheet, its size, its rules, how many roots adopt it,
 * and how many custom properties it declares;  and the CSS adopted per root, on average (`adoptedCharsPerRoot`).
 */
export class SheetsMeasure {
  /** `page` under `profile`. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<SheetsResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    try {
      await browser.load({ quietMs: 2000 })
      const counted = await browser.page.evaluate(adoptedSheets)
      return { page, profile, ...counted }
    } finally {
      await browser.close()
    }
  }
}

/**
 * In the page:  every shadow root's adopted sheets, counted.
 * - MUST stay self-contained:  Playwright sends its source
 */
function adoptedSheets(): Omit<SheetsResult, "page" | "profile"> {
  const sheets = new Map<CSSStyleSheet, { roots: number; tags: Set<string> }>()
  let roots = 0
  const walk = (root: Document | ShadowRoot) => {
    for (const element of root.querySelectorAll("*")) {
      if (!element.shadowRoot) continue
      roots++
      for (const sheet of element.shadowRoot.adoptedStyleSheets) {
        let entry = sheets.get(sheet)
        if (!entry) sheets.set(sheet, (entry = { roots: 0, tags: new Set() }))
        entry.roots++
        entry.tags.add(element.localName)
      }
      walk(element.shadowRoot)
    }
  }
  walk(document)
  const rows: SheetRow[] = []
  for (const [sheet, entry] of sheets) {
    let chars = 0
    let rules = 0
    let customProperties = 0
    const visit = (list: CSSRuleList) => {
      for (const rule of list) {
        rules++
        chars += rule.cssText.length
        const style = (rule as CSSStyleRule).style
        if (style) for (const name of style) if (name.startsWith("--")) customProperties++
        const inner = (rule as CSSGroupingRule).cssRules
        if (inner) visit(inner)
      }
    }
    try {
      visit(sheet.cssRules)
    } catch {
      // unreadable
    }
    rows.push({ roots: entry.roots, chars, rules, customProperties, tags: [...entry.tags].slice(0, 4).join(" ") })
  }
  rows.sort((one, other) => other.roots * other.chars - one.roots * one.chars)
  const adopted = rows.reduce((total, row) => total + row.roots * row.chars, 0)
  return {
    roots,
    distinctSheets: rows.length,
    adoptedCharsPerRoot: roots ? Math.round(adopted / roots) : 0,
    sheets: rows.slice(0, 15)
  }
}

/** One distinct adopted sheet:  the roots adopting it, its size, its rules, its custom properties, a few tags. */
export type SheetRow = { roots: number; chars: number; rules: number; customProperties: number; tags: string }

/** The page's adopted sheets. */
export type SheetsResult = {
  page: PerfPageName
  profile: PerfProfileName
  roots: number
  distinctSheets: number
  adoptedCharsPerRoot: number
  sheets: SheetRow[]
}
