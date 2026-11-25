import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { RootLoader } from "spell/ui/components/ui-root/RootLoader"
import { ROOT_CATALOG } from "spell/ui/components/ui-root/UIRoot.catalog"
// the panel first, as a run page loads it:  NEVER import `ui-segment` up here
import "spell/ui/components/ui-split-panel"

/**
 * `<ui-segment>` panes whose family loads AFTER the split panel sized them:  each family loads by itself on its first
 * use, so a pane can still be pending, with no `display: contents` yet, as the panel looks.
 * - A file of its own:  a tag is defined once a page, and here it must start pending.
 */

/** The panel, 600 by 200:  a list at "*", what's chosen at 41%. */
let host: HTMLElement

beforeAll(async () => {
  // as a root does with Spell UI's catalog
  RootLoader.defineEarly({ "ui-segment": ROOT_CATALOG["ui-segment"]! })
  host = document
    .createRange()
    .createContextualFragment(
      `<ui-split-panel columns="*,41%" resizable style="width: 600px; height: 200px">` +
        `<ui-segment>a list</ui-segment><ui-segment>what's chosen</ui-segment></ui-split-panel>`
    ).firstElementChild as HTMLElement
  document.body.append(host)
  await (host as unknown as { ready: Promise<void> }).ready
  // the panel sizes its panes, and looks again before the next paint, while they're pending
  await new Promise((resolve) => setTimeout(resolve, 50))
  await import("spell/ui/components/ui-segment")
  await ElementFixture.settle(host)
})

afterAll(() => host.remove())

describe("<ui-split-panel>, its <ui-segment> panes set up after it", () => {
  it("gives each its box, in the sizes given, the bar between them", async () => {
    const panes = [...host.children] as HTMLElement[]
    await expect.poll(() => panes.map((pane) => pane.hasAttribute("data-split-box"))).toEqual([true, true])
    const [list, chosen] = panes.map((pane) => pane.getBoundingClientRect())
    const bar = host.shadowRoot!.querySelector('[part~="bar"]')!.getBoundingClientRect()
    // as wide as "*" and 41% of what the bar leaves:  not as wide as their words
    expect(Math.round(list.width + bar.width + chosen.width)).toBe(600)
    expect(Math.round(chosen.width)).toBe(Math.round((600 - bar.width) * 0.41))
    // list, bar, chosen:  in that order
    expect(list.right).toBeLessThanOrEqual(bar.left)
    expect(bar.right).toBeLessThanOrEqual(chosen.left)
  })
})
