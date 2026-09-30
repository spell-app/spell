import { describe, expect, it } from "vitest"

import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import "$/components/icon"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/icon/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-icon>`;  returns it with its root span. */
async function icon(html: string) {
  const host = await ElementFixture.render<UIHost>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=icon]")!
  return { host, root }
}

describe("<ui-icon> classes", () => {
  it.each([
    ["", "ui icon"],
    ['size="large"', "ui large icon"],
    ['size="medium"', "ui icon"],
    ['color="red"', "ui red icon"],
    ["circular inverted", "ui circular inverted icon"],
    ['circular="no"', "ui icon"],
    ['bordered="yes"', "ui bordered icon"],
    ["disabled loading", "ui disabled loading icon"],
    ["fitted link", "ui fitted link icon"],
    ["flipped", "ui flipped icon"],
    ['flipped="vertically"', "ui vertically flipped icon"],
    ["rotated", "ui rotated icon"],
    ['rotated="counterclockwise"', "ui counterclockwise rotated icon"],
    ["corner", "ui corner icon"],
    ['corner="top left"', "ui top left corner icon"],
    ['size="huge" color="blue" rotated="halfway"', "ui huge blue halfway rotated icon"]
  ])("<ui-icon %s>", async (attributes, classes) => {
    const { root } = await icon(`<ui-icon name="house" ${attributes}></ui-icon>`)
    expect(root.className).toBe(classes)
  })

  it("draws the svg for `name`, and a new one when it changes", async () => {
    const { host, root } = await icon(`<ui-icon name="house"></ui-icon>`)
    await expect.poll(() => root.querySelector("svg path")).not.toBeNull()
    const first = root.querySelector("svg path")!.getAttribute("d")
    host.setAttribute("name", "check circle")
    await expect.poll(() => root.querySelector("svg path")?.getAttribute("d")).not.toBe(first)
    expect(root.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true")
  })

  it("draws the set `variant` names;  `outline` ~== variant=regular, and `element.style` stays native", async () => {
    const { host: solid } = await icon(`<ui-icon name="heart"></ui-icon>`)
    const { host: regular } = await icon(`<ui-icon name="heart" variant="regular"></ui-icon>`)
    const { host: outline } = await icon(`<ui-icon name="heart" outline style="color: red"></ui-icon>`)
    const path = (host: UIHost) => host.shadowRoot!.querySelector("svg path")?.getAttribute("d")
    await expect.poll(() => [solid, regular, outline].every((host) => !!path(host))).toBe(true)
    expect(path(solid)).not.toBe(path(regular))
    expect(path(outline)).toBe(path(regular))
    expect((regular as unknown as { variant: string }).variant).toBe("regular")
    expect(outline.style).toBeInstanceOf(CSSStyleDeclaration)
    expect(outline.style.color).toBe("red")
  })

  it("sets `:state(disabled)` / `:state(loading)`", async () => {
    const { host } = await icon(`<ui-icon name="spinner" loading disabled></ui-icon>`)
    expect(host.matches(":state(loading)")).toBe(true)
    expect(host.matches(":state(disabled)")).toBe(true)
  })
})

describe("<ui-icon> accessibility", () => {
  it("is hidden without a label, an image with one", async () => {
    const { host } = await icon(`<ui-icon name="house"></ui-icon>`)
    expect(host.internals.ariaHidden).toBe("true")
    expect(host.internals.role).toBeNull()
    host.setAttribute("label", "Home")
    await ElementFixture.tick()
    expect(host.internals.role).toBe("img")
    expect(host.internals.ariaLabel).toBe("Home")
    expect(host.internals.ariaHidden).toBeNull()
  })

  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } })
  })
})

describe("<ui-icons>", () => {
  it("renders the group and puts direct children in `:state(in-icons)`", async () => {
    const group = await ElementFixture.render<UIHost>(
      `<ui-icons size="huge" label="Add user"><ui-icon name="user"></ui-icon><ui-icon name="plus" corner="top right"></ui-icon></ui-icons>`
    )
    const root = group.shadowRoot!.querySelector("[part~=icons]")!
    expect(root.className).toBe("ui huge icons")
    expect(root.querySelector("slot")).not.toBeNull()
    expect(group.internals.role).toBe("img")
    const [base, corner] = group.querySelectorAll<UIHost>("ui-icon")
    expect(base!.matches(":state(in-icons)")).toBe(true)
    expect(corner!.matches(":state(in-icons)")).toBe(true)
    expect(corner!.shadowRoot!.querySelector("[part~=icon]")!.className).toBe("ui top right corner icon")
    // positioned by the group:  the corner's root is absolutely positioned against the group's root
    expect(getComputedStyle(corner!.shadowRoot!.querySelector("[part~=icon]")!).position).toBe("absolute")
  })

  it("doesn't claim an icon that isn't a direct child, nor a standalone one", async () => {
    const root = await ElementFixture.render(
      `<div><ui-icons><span><ui-icon name="user"></ui-icon></span></ui-icons><ui-icon name="user"></ui-icon></div>`
    )
    for (const element of root.querySelectorAll("ui-icon")) expect(element.matches(":state(in-icons)")).toBe(false)
  })

  it("follows an icon moved into and out of a group", async () => {
    const root = await ElementFixture.render(`<div><ui-icons></ui-icons><ui-icon name="user"></ui-icon></div>`)
    const group = root.querySelector("ui-icons")!
    const child = root.querySelector("ui-icon")!
    group.append(child)
    await ElementFixture.settle(root)
    expect(child.matches(":state(in-icons)")).toBe(true)
    root.append(child)
    await ElementFixture.settle(root)
    expect(child.matches(":state(in-icons)")).toBe(false)
  })
})
