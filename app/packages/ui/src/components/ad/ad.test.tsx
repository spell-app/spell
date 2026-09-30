import { describe, expect, it } from "vitest"

import { UI } from "$/runtime"
import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import "$/components/ad"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ad/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one ad;  returns it with its root. */
async function render(html: string) {
  const host = await ElementFixture.render<UIHost>(html)
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  return { host, root }
}

describe("<ui-ad> classes", () => {
  it.each([
    ["", "ui ad"],
    ['unit="medium rectangle"', "ui medium rectangle ad"],
    ['unit="leaderboard" centered', "ui leaderboard centered ad"],
    ['unit="large mobile banner"', "ui large mobile banner ad"],
    ['unit="small square" test', "ui small square ad test"],
    ['unit="huge rectangle"', "ui ad"]
  ])("<ui-ad %s>", async (attributes, classes) => {
    const { root } = await render(`<ui-ad ${attributes}></ui-ad>`)
    expect(root.className).toBe(classes)
    expect(root.getAttribute("part")).toBe("ad")
  })
})

describe("<ui-ad> units and test", () => {
  it.each([
    ["medium rectangle", 300, 250],
    ["large rectangle", 336, 280],
    ["half page", 300, 600],
    ["small rectangle", 180, 150],
    ["vertical rectangle", 240, 400],
    ["square", 250, 250],
    ["small square", 200, 200],
    ["button", 120, 90],
    ["square button", 125, 125],
    ["small button", 120, 60],
    ["skyscraper", 120, 600],
    ["wide skyscraper", 160, 600],
    ["banner", 468, 60],
    ["vertical banner", 120, 240],
    ["top banner", 930, 180],
    ["half banner", 234, 60],
    ["leaderboard", 728, 90],
    ["large leaderboard", 970, 90],
    ["billboard", 970, 250],
    ["panorama", 980, 120],
    ["netboard", 580, 400]
  ])("sizes a %s to %i x %i", async (unit, width, height) => {
    const { root } = await render(`<ui-ad unit="${unit}"></ui-ad>`)
    const style = getComputedStyle(root)
    expect(style.width).toBe(`${width}px`)
    expect(style.height).toBe(`${height}px`)
  })

  it("shows mobile units on phone-sized viewports only", async () => {
    const { root } = await render(`<ui-ad unit="mobile leaderboard"></ui-ad>`)
    const phone = matchMedia("(width < 768px)").matches
    expect(getComputedStyle(root).display).toBe(phone ? "block" : "none")
  })

  it("draws a test ad's text:  the translated 'Ad' when bare, else its own", async () => {
    await UI.load()
    const { host, root } = await render(`<ui-ad unit="small rectangle" test></ui-ad>`)
    expect(root.dataset.text).toBe(UI.i18n.t("adTest"))
    expect(getComputedStyle(root, "::after").content).toBe(`"Ad"`)
    host.setAttribute("test", "Your ad here")
    await ElementFixture.tick()
    expect(getComputedStyle(root, "::after").content).toBe(`"Your ad here"`)
    host.removeAttribute("test")
    await ElementFixture.tick()
    expect(root.hasAttribute("data-text")).toBe(false)
    expect(root.className).toBe("ui small rectangle ad")
  })

  it("centres a centered ad", async () => {
    const holder = await ElementFixture.render(
      `<div style="width: 600px"><p>x</p><ui-ad unit="small rectangle" centered></ui-ad><p>y</p></div>`
    )
    const root = holder.querySelector<UIHost>("ui-ad")!.shadowRoot!.firstElementChild!
    const box = root.getBoundingClientRect()
    const parent = holder.getBoundingClientRect()
    expect(box.left - parent.left).toBeCloseTo(parent.right - box.right, 0)
  })
})

describe("<ui-ad> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})
