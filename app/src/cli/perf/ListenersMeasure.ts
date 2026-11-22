import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * Who holds the page's event listeners:  Chrome's `DOMDebugger.getEventListeners` on every element (through shadow
 * roots), every shadow root, the document and the window;  totals by event type and by tag.
 */
export class ListenersMeasure {
  /** `page` under `profile`. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<ListenersResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    try {
      await browser.load({ quietMs: 2000 })
      const { cdp } = browser
      const count = await browser.page.evaluate(() => {
        const all: EventTarget[] = [window, document]
        const walk = (root: Document | ShadowRoot) => {
          for (const element of root.querySelectorAll("*")) {
            all.push(element)
            if (element.shadowRoot) {
              all.push(element.shadowRoot)
              walk(element.shadowRoot)
            }
          }
        }
        walk(document)
        Object.assign(window, { __targets: all })
        return all.length
      })
      const byType: Record<string, number> = {}
      const byTag: Record<string, number> = {}
      let total = 0
      for (let index = 0; index < count; index++) {
        const { result } = await cdp.send("Runtime.evaluate", { expression: `window.__targets[${index}]` })
        if (!result.objectId) continue
        const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId })
        await cdp.send("Runtime.releaseObject", { objectId: result.objectId })
        if (!listeners.length) continue
        const label =
          result.className === "ShadowRoot" ? "#shadow-root" : (result.description?.split(/[.#[]/)[0] ?? "?")
        total += listeners.length
        byTag[label] = (byTag[label] ?? 0) + listeners.length
        for (const listener of listeners) byType[listener.type] = (byType[listener.type] ?? 0) + 1
      }
      return { page, profile, targets: count, total, byType: topOf(byType), byTag: topOf(byTag) }
    } finally {
      await browser.close()
    }
  }
}

/** The 20 biggest of `counts`, biggest first. */
function topOf(counts: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((one, other) => other[1] - one[1])
      .slice(0, 20)
  )
}

/** Every listener on the page:  how many targets were asked, the total, and the biggest by type and by tag. */
export type ListenersResult = {
  page: PerfPageName
  profile: PerfProfileName
  targets: number
  total: number
  byType: Record<string, number>
  byTag: Record<string, number>
}
