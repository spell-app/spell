import type { Locator } from "playwright"
import { expect } from "vite-plus/test"

/**
 * Checks that things drawn side by side line up, for the editor's end-to-end tests (epic `editor` I327):
 * Owen, 2026-11-23:  "Would love to never have to tell you to fix vertical alignment again."
 * - `boxesIn()` measures every element matching a selector inside a scope, through shadow roots.
 * - `expectCentred()` fails when their vertical centres differ by more than half a pixel,
 *   naming each one and where it is.
 * - `expectSpanning()` fails when a box doesn't run from one edge to another, e.g. a pane as tall as two stacked ones.
 * - Plain measures, no Spell or editor knowledge:  any row of pills, buttons or icons can use them.
 */

/** One measured element:  its text (to name it in a failure) and its box, in CSS px. */
export interface Box {
  /** what it says, trimmed:  `⟨tools⟩` */
  name: string
  top: number
  bottom: number
  left: number
  right: number
  /** its vertical centre */
  centre: number
}

/** How far apart two edges or centres may be, in CSS px, and still count as lined up. */
export const ALIGNED_PX = 0.5

/** Every element matching `selector` inside `scope`, through shadow roots, measured, in document order. */
export async function boxesIn(scope: Locator, selector: string): Promise<Box[]> {
  return scope.evaluate((root, selector) => {
    const found: Element[] = []
    const walk = (node: ParentNode) => {
      for (const element of node.querySelectorAll("*")) {
        if (element.matches(selector)) found.push(element)
        if (element.shadowRoot) walk(element.shadowRoot)
      }
    }
    walk(root)
    return found.map((element) => {
      const { top, bottom, left, right } = element.getBoundingClientRect()
      return { name: (element.textContent ?? "").trim(), top, bottom, left, right, centre: (top + bottom) / 2 }
    })
  }, selector)
}

/** Fail unless every box's vertical centre is within `ALIGNED_PX` of the first's. */
export function expectCentred(boxes: Box[]): void {
  expect(boxes.length, "nothing to line up").toBeGreaterThan(1)
  const [first] = boxes
  const off = boxes
    .filter((box) => Math.abs(box.centre - first.centre) > ALIGNED_PX)
    .map((box) => `${box.name}'s centre is ${box.centre.toFixed(2)}`)
  expect(off, `not on one line with ${first.name}, centred at ${first.centre.toFixed(2)}:  ${off.join(";  ")}`).toEqual(
    []
  )
}

/** Fail unless `box` runs from `top` to `bottom`, within `ALIGNED_PX`. */
export function expectSpanning(box: Box, { top, bottom }: { top: number; bottom: number }): void {
  expect(
    Math.abs(box.top - top) <= ALIGNED_PX && Math.abs(box.bottom - bottom) <= ALIGNED_PX,
    `${box.name} runs ${box.top.toFixed(2)}-${box.bottom.toFixed(2)}, not ${top.toFixed(2)}-${bottom.toFixed(2)}`
  ).toBe(true)
}
