import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-dropdown"

/**
 * Opening and closing a dropdown leaves nothing behind (epic `solid-2-final` P10, TLDR 22):
 * the page measured 30 kB, 5 nodes and 7 listeners more for each open and close.
 * - Counts every node on the page, through every shadow root, after 50 opens and closes, against after the first few:
 *   a browser test can't count listeners, so the nodes stand for what an open makes.
 */
describe("<ui-dropdown> opened and closed 50 times", () => {
  it("by a click:  the page has no more nodes than after the first few", async () => {
    const host = await ElementFixture.render<DOMElement>(DROPDOWN)
    const combobox = host.shadowRoot!.querySelector<HTMLElement>("[role=combobox]")!
    const openAndClose = async () => {
      combobox.click()
      await ElementFixture.tick()
      combobox.click()
      await ElementFixture.tick()
    }
    for (let index = 0; index < 3; index++) await openAndClose()
    const before = nodesOnThePage()
    for (let index = 0; index < 50; index++) await openAndClose()
    expect(nodesOnThePage()).toBe(before)
  })

  it("by its `open` attribute:  the same", async () => {
    const host = await ElementFixture.render<DOMElement>(DROPDOWN)
    const openAndClose = async () => {
      host.setAttribute("open", "")
      await ElementFixture.tick()
      host.removeAttribute("open")
      await ElementFixture.tick()
    }
    for (let index = 0; index < 3; index++) await openAndClose()
    const before = nodesOnThePage()
    for (let index = 0; index < 50; index++) await openAndClose()
    expect(nodesOnThePage()).toBe(before)
  })
})

/** A dropdown of three slotted items. */
const DROPDOWN = `<ui-dropdown selection placeholder="Gender">
  <ui-item value="male">Male</ui-item><ui-item value="female">Female</ui-item><ui-item value="other">Other</ui-item>
</ui-dropdown>`

/** Every node on the page, counted through every shadow root. */
function nodesOnThePage(root: Node = document): number {
  let count = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL)
  for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
    count++
    const shadow = (node as Element).shadowRoot
    if (shadow) count += nodesOnThePage(shadow)
  }
  return count
}
