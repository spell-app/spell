import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * The style sheets every shadow root adopts:  for each distinct sheet, its size, its rules, how many roots adopt it,
 * and how many custom properties it declares;  and the CSS adopted per root, on average (`adoptedCharsPerRoot`).
 * - And how much of each sheet the page uses (`coverage`;  epic `solid-2-final` P4):  the browser's rule-usage
 *   tracking over the load, the share of each of Spell UI's registered sheets whose rules matched anything.
 *   Its numbers size the family sheets' rewrite (Lean Spell UI CSS).
 */
export class SheetsMeasure {
  /** `page` under `profile`. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<SheetsResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    try {
      const usage = await SheetsMeasure.trackRules(browser)
      await browser.load({ quietMs: 2000 })
      const counted = await browser.page.evaluate(adoptedSheets)
      return { page, profile, ...counted, coverage: await usage.finish() }
    } finally {
      await browser.close()
    }
  }

  /**
   * Start the browser's rule-usage tracking, before the page loads;  `finish()` stops it and says, for each sheet
   * Spell UI registered (`UI.styles`, by name), its size and the share of it whose rules matched anything.
   * - A sheet is known by its text:  the browser gives each constructed sheet's text, the page each name's.
   * - Biggest first;  sheets the page didn't register (a `<link>`) left out.
   */
  private static async trackRules(browser: PerfBrowser): Promise<{ finish(): Promise<SheetCoverage[]> }> {
    const { cdp, page } = browser
    const sheetIds: string[] = []
    cdp.on("CSS.styleSheetAdded", ({ header }) => {
      if (header.isConstructed) sheetIds.push(header.styleSheetId)
    })
    await cdp.send("DOM.enable")
    await cdp.send("CSS.enable")
    await cdp.send("CSS.startRuleUsageTracking")
    return {
      async finish() {
        const { ruleUsage } = await cdp.send("CSS.stopRuleUsageTracking")
        const names = await page.evaluate(registeredSheets)
        const rulesBySheet = new Map<string, typeof ruleUsage>()
        for (const rule of ruleUsage) {
          const rules = rulesBySheet.get(rule.styleSheetId)
          if (rules) rules.push(rule)
          else rulesBySheet.set(rule.styleSheetId, [rule])
        }
        const byName = new Map<string, SheetCoverage>()
        for (const id of sheetIds) {
          const text = await cdp
            .send("CSS.getStyleSheetText", { styleSheetId: id })
            .then((result) => result.text)
            .catch(() => "")
          const name = names[text]
          if (!name || byName.has(name)) continue
          const usedChars = usedCharsOf(rulesBySheet.get(id) ?? [])
          byName.set(name, { name, chars: text.length, usedShare: text.length ? round(usedChars / text.length) : 0 })
        }
        return [...byName.values()].sort((one, other) => other.chars - one.chars)
      }
    }
  }
}

/**
 * The characters of the rules the browser saw matching, each counted once:  only the innermost rules, as a grouping
 * rule's range (`@layer`, `@media`) holds its rules'.
 */
function usedCharsOf(rules: Array<{ startOffset: number; endOffset: number; used: boolean }>): number {
  const ranges = rules.filter((rule) => rule.used)
  const isGroup = (outer: (typeof ranges)[number]) =>
    ranges.some(
      (inner) =>
        inner !== outer &&
        inner.startOffset >= outer.startOffset &&
        inner.endOffset <= outer.endOffset &&
        (inner.startOffset !== outer.startOffset || inner.endOffset !== outer.endOffset)
    )
  const leaves = new Map<number, number>()
  for (const range of ranges) if (!isGroup(range)) leaves.set(range.startOffset, range.endOffset - range.startOffset)
  return [...leaves.values()].reduce((total, chars) => total + chars, 0)
}

/** `value` to two decimals. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * In the page:  each sheet Spell UI registered, text => name.
 * - MUST stay self-contained:  Playwright sends its source
 * - Reads the registry's own record of each name's text (`UI.styles`, its private `texts`):  a measurement, not API.
 */
function registeredSheets(): Record<string, string> {
  const styles = (globalThis as { UI?: { styles?: unknown } }).UI?.styles as { texts?: Map<string, string> } | undefined
  const names: Record<string, string> = {}
  for (const [name, text] of styles?.texts ?? []) names[text] = name
  return names
}

/**
 * In the page:  every shadow root's adopted sheets, counted.
 * - MUST stay self-contained:  Playwright sends its source
 */
function adoptedSheets(): Omit<SheetsResult, "page" | "profile" | "coverage"> {
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

/** How much of one registered sheet the page used:  its name, its size, the share of it that matched anything. */
export type SheetCoverage = { name: string; chars: number; usedShare: number }

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
  /** each registered sheet's use, biggest first */
  coverage: SheetCoverage[]
}
