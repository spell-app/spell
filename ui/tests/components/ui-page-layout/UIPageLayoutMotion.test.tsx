import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { ShadowTree } from "spell/ui/test-helpers/ShadowTree"
import type { DOMPageLayoutElement } from "spell/ui/components/ui-page-layout"

import "spell/ui/components/ui-page-layout"
import "spell/ui/components/ui-site-nav"

/** A navigation for the drawer. */
const NAV = `<ui-site-nav slot="drawer" current="/a" pages='[{ "title": "A", "href": "/a", "icon": "home" }, { "title": "B", "href": "/b", "icon": "film" }]'></ui-site-nav>`

/** A wide page layout, its drawer only its icons (or all of it), drawn;  `animation` on it when given. */
async function compactLayout(animation?: string, drawer = "compact"): Promise<DOMPageLayoutElement> {
  const attributes = (animation ? ` animation="${animation}"` : "") + (drawer ? ` drawer="${drawer}"` : "")
  const layout = await ElementFixture.render<DOMPageLayoutElement>(
    `<ui-page-layout${attributes} style="width: 900px; height: 400px">${NAV}<p>The page</p></ui-page-layout>`
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

/** Rest the pointer on its compact drawer, and wait for it to open (half a second). */
async function peek(layout: DOMPageLayoutElement) {
  box(layout, "drawer").dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }))
  await expect.poll(() => layout.matches(":state(open)"), { timeout: 1500 }).toBe(true)
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

  // epic `mockup` C1 on J161 (Owen:  "Expanded menu should be the entire height of the page to match the collapsed
  // sidebar"):  it dropped to its rows' height the moment it started closing
  test("compact, its box is the column's whole height open, and while it shrinks back", async () => {
    const layout = await compactLayout()
    const height = () => box(layout, "drawer-box").getBoundingClientRect().height
    const column = box(layout, "drawer").getBoundingClientRect().height
    expect(column).toBeCloseTo(400, 0)
    expect(height()).toBeLessThan(column)
    await peek(layout)
    await ShadowTree.settle(layout)
    expect(height()).toBeCloseTo(column, 0)
    box(layout, "drawer").dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }))
    await expect.poll(() => layout.matches(":state(open)")).toBe(false)
    await new Promise(requestAnimationFrame)
    expect(box(layout, "drawer-box").getBoundingClientRect().width).toBeGreaterThan(
      box(layout, "drawer").getBoundingClientRect().width
    )
    expect(height()).toBeCloseTo(column, 0)
    // ... its rows' height once it's back
    await expect.poll(height).toBeLessThan(column)
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

  // epic `mockup` I32 (Owen:  "don't hide the text or indent until animation gets all the way to the left")
  test("narrowing to its icons, the navigation keeps all of it, clipped and still, till the column is narrow", async () => {
    const layout = await compactLayout(undefined, "")
    const nav = layout.querySelector("ui-site-nav")!
    const iconLeft = () => {
      const item = nav.shadowRoot!.querySelector("ui-tree-item")!
      const icon = item.querySelector('[slot="icon"]') ?? item.shadowRoot!.querySelector(".icon")!
      return (icon.shadowRoot?.querySelector(".icon") ?? icon).getBoundingClientRect().left
    }
    const before = iconLeft()
    layout.toggleDrawer()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    expect(layout.matches(":state(moving)")).toBe(true)
    expect(nav.hasAttribute("collapsed")).toBe(false)
    expect(box(layout, "drawer").getAnimations().length).toBeGreaterThan(0)
    expect(iconLeft()).toBeCloseTo(before, 1)
    await expect.poll(() => nav.hasAttribute("collapsed")).toBe(true)
    expect(layout.matches(":state(moving)")).toBe(false)
    expect(box(layout, "drawer").getBoundingClientRect().width).toBeLessThan(120)
  })

  test('`animation="none"`, it switches to its icons at once', async () => {
    const layout = await compactLayout("none", "")
    layout.toggleDrawer()
    // its icons measured just before the next paint;  no move to wait for, so they show before the one after
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    await ShadowTree.settle(layout)
    expect(layout.querySelector("ui-site-nav")!.hasAttribute("collapsed")).toBe(true)
  })
})
