/// <reference types="@vitest/browser-playwright" />

import { cdp } from "vitest/browser"

/**
 * Chrome's REAL accessibility tree for an element, through the Chrome DevTools Protocol -- what a screen
 * reader gets, which axe (a DOM linter) can't tell:  e.g. whether a `display: contents` host with an
 * `ElementInternals` role is in the tree at all.
 * - Test-only, chromium-only.  The CDP session belongs to the PAGE, and the test runs in an iframe, so the
 *   element is marked (`data-ax`) and found across the page's iframes and every shadow root in them.
 */
export class AXTree {
  /** Role, name and ignored flag of `element`'s accessibility node. */
  static async node(element: Element): Promise<AXSummary> {
    const mark = String(++AXTree.count)
    element.setAttribute(MARK, mark)
    const session = cdp()
    await session.send("Accessibility.enable")
    const { result } = await session.send("Runtime.evaluate", {
      expression: `(() => {
        const selector = '[${MARK}="${mark}"]'
        const find = (root) => {
          const found = root.querySelector(selector)
          if (found) return found
          for (const node of root.querySelectorAll("*")) {
            const inner = node.shadowRoot && find(node.shadowRoot)
            if (inner) return inner
          }
        }
        for (const frame of document.querySelectorAll("iframe")) {
          const found = frame.contentDocument && find(frame.contentDocument)
          if (found) return found
        }
      })()`
    })
    element.removeAttribute(MARK)
    const { nodes } = await session.send("Accessibility.getPartialAXTree", {
      objectId: result.objectId,
      fetchRelatives: false
    })
    const node = nodes[0]
    return {
      role: String(node?.role?.value ?? ""),
      name: String(node?.name?.value ?? ""),
      ignored: !!node?.ignored
    }
  }

  /** Marks handed out so far. */
  private static count = 0
}

/** Attribute marking the element to look up. */
const MARK = "data-ax"

/** What `AXTree.node()` reports. */
export type AXSummary = {
  /** computed role, e.g. `image`, `generic`, `none` */
  role: string
  /** computed accessible name */
  name: string
  /** left out of the tree (`aria-hidden`, `display: none` ...) */
  ignored: boolean
}
