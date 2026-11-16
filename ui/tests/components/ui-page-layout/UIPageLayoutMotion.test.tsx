import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import type { DOMPageLayoutElement } from "spell/ui/components/ui-page-layout"

import "spell/ui/components/ui-page-layout"
import "spell/ui/components/ui-site-nav"

/** A navigation for the drawer. */
const NAV = `<ui-site-nav slot="drawer" current="/a" pages='[{ "title": "A", "href": "/a", "icon": "home" }, { "title": "B", "href": "/b", "icon": "film" }]'></ui-site-nav>`

/** A wide page layout, its drawer only its icons, drawn;  `animation` on it when given. */
async function compactLayout(animation?: string): Promise<DOMPageLayoutElement> {
  const attribute = animation ? ` animation="${animation}"` : ""
  const layout = await ElementFixture.render<DOMPageLayoutElement>(
    `<ui-page-layout drawer="compact"${attribute} style="width: 900px; height: 400px">${NAV}<p>The page</p></ui-page-layout>`
  )
  await ShadowTree.settle(layout)
  return layout
}

/** Its box `part`. */
function box(layout: Element, part: string): HTMLElement {
  return layout.shadowRoot!.querySelector<HTMLElement>(`[part~="${part}"]`)!
}

/** What moves in its drawer's box, and in its drawer's column, as `change` runs. */
async function movesAs(layout: DOMPageLayoutElement, change: () => void | Promise<void>): Promise<string[]> {
  await change()
  await ShadowTree.settle(layout)
  return [box(layout, "drawer-box"), box(layout, "drawer")].flatMap((element) =>
    (element.getAnimations() as CSSTransition[]).map((move) => `${element.className} ${move.transitionProperty}`)
  )
}

/** Rest the pointer on its compact drawer, and wait for it to open. */
async function peek(layout: DOMPageLayoutElement) {
  box(layout, "drawer").dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
  await expect.poll(() => layout.matches(":state(open)")).toBe(true)
}

// epic `mockup` I25 (Owen:  "Menu should animate when flying out")
describe("<ui-page-layout>:  motion", () => {
  test("compact, its box grows out over the page as it opens and back as it closes;  the column stays put", async () => {
    const layout = await compactLayout()
    const column = box(layout, "drawer").getBoundingClientRect().width
    expect((await movesAs(layout, () => peek(layout))).sort()).toEqual(["drawer-box box-shadow", "drawer-box width"])
    const closing = await movesAs(layout, async () => {
      box(layout, "drawer").dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }))
      await expect.poll(() => layout.matches(":state(open)")).toBe(false)
    })
    expect(closing).toContain("drawer-box width")
    // ... the page beside it not moving
    expect(box(layout, "drawer").getBoundingClientRect().width).toBeCloseTo(column, 0)
  })

  test("`toggleDrawer()` widens the column from its icons to all of it, and narrows it back", async () => {
    const layout = await compactLayout()
    const widening = await movesAs(layout, async () => {
      layout.toggleDrawer()
      await new Promise(requestAnimationFrame)
    })
    expect(widening).toContain("drawer width")
    const width = box(layout, "drawer").getBoundingClientRect().width
    expect(width).toBeLessThan(200)
    expect(await movesAs(layout, () => layout.toggleDrawer())).toContain("drawer width")
  })

  test('`animation="none"` stills it', async () => {
    const layout = await compactLayout("none")
    expect(await movesAs(layout, () => peek(layout))).toEqual([])
  })
})
