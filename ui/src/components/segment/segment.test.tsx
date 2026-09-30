import { describe, expect, it } from "vitest"

import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import "$/components/segment"
import "$/components/parts"

/** Examples whose original fragment fails axe `heading-order` too (see `docs/report.md`). */
const HEADING_DEMOS = ["parts/examples/elements/header.html", "segment/examples/elements/variations.html"]

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/segment/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one element;  returns it with its root. */
async function render(html: string) {
  const host = await ElementFixture.render<UIHost>(html)
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  return { host, root }
}

describe("<ui-segment> classes", () => {
  it.each([
    ["", "ui segment"],
    ['size="small"', "ui small segment"],
    ['size="medium"', "ui segment"],
    ['color="red" inverted', "ui red inverted segment"],
    ["raised", "ui raised segment"],
    ['raised="no"', "ui segment"],
    ["stacked", "ui stacked segment"],
    ['stacked="tall"', "ui tall stacked segment"],
    ['piled="yes"', "ui piled segment"],
    ["vertical placeholder", "ui placeholder vertical segment"],
    ["circular compact basic clearing", "ui basic circular clearing compact segment"],
    ['padded="very"', "ui very padded segment"],
    ['floated="right"', "ui right floated segment"],
    ['text-align="center"', "ui center aligned segment"],
    ["secondary", "ui secondary segment"],
    ['attached="top"', "ui top attached segment"],
    ["attached seamless", "ui seamless attached segment"],
    ["loading disabled", "ui disabled loading segment"],
    ['fitted="horizontally"', "ui horizontally fitted segment"],
    ['scrolling="long" resizable', "ui resizable long scrolling segment"]
  ])("<ui-segment %s>", async (attributes, classes) => {
    const { root } = await render(`<ui-segment ${attributes}>x</ui-segment>`)
    expect(root.className).toBe(classes)
    expect(root.getAttribute("part")).toBe("segment")
  })
})

describe("<ui-segment> states and owner tokens", () => {
  it("sets :state(piled) and makes the host the stacking context", async () => {
    const { host } = await render(`<ui-segment piled>x</ui-segment>`)
    expect(host.matches(":state(piled)")).toBe(true)
    expect(getComputedStyle(host).zIndex).toBe("0")
    const { host: plain } = await render(`<ui-segment>x</ui-segment>`)
    expect(plain.matches(":state(piled)")).toBe(false)
  })

  it("declares --ui-inverted on its root, default included, and the dark scheme when inverted", async () => {
    const { root: plain } = await render(`<ui-segment>x</ui-segment>`)
    expect(getComputedStyle(plain).getPropertyValue("--ui-inverted").trim()).toBe("0")
    const { host, root } = await render(`<ui-segment inverted color="blue">x</ui-segment>`)
    expect(getComputedStyle(root).getPropertyValue("--ui-inverted").trim()).toBe("1")
    expect(getComputedStyle(root).colorScheme).toBe("dark")
    expect(host.matches(":state(inverted)")).toBe(true)
    host.removeAttribute("inverted")
    await ElementFixture.tick()
    expect(getComputedStyle(root).getPropertyValue("--ui-inverted").trim()).toBe("0")
  })

  it("is busy while loading, with an announcement;  aria-disabled while disabled", async () => {
    const { host, root } = await render(`<ui-segment loading disabled>x</ui-segment>`)
    expect(host.internals.ariaBusy).toBe("true")
    expect(host.internals.ariaDisabled).toBe("true")
    expect(host.matches(":state(loading)")).toBe(true)
    expect(host.matches(":state(disabled)")).toBe(true)
    expect(root.querySelector("[role=status]")!.textContent).toBe("Loading…")
    host.removeAttribute("loading")
    await ElementFixture.tick()
    expect(host.internals.ariaBusy).toBeNull()
    expect(root.querySelector("[role=status]")).toBeNull()
  })
})

describe("<ui-segments>", () => {
  it.each([
    ["", "ui segments"],
    ["horizontal equal-width", "ui equal width horizontal segments"],
    ["raised", "ui raised segments"],
    ['stacked="tall"', "ui tall stacked segments"],
    ["piled", "ui piled segments"],
    ['inverted="no"', "ui segments"]
  ])("<ui-segments %s>", async (attributes, classes) => {
    const { root } = await render(`<ui-segments ${attributes}><ui-segment>a</ui-segment></ui-segments>`)
    expect(root.className).toBe(classes)
    expect(root.getAttribute("part")).toBe("group")
  })

  it("sets :state(piled)", async () => {
    const { host } = await render(`<ui-segments piled><ui-segment>a</ui-segment></ui-segments>`)
    expect(host.matches(":state(piled)")).toBe(true)
  })
})

describe("<ui-segment> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    // `heading-order` off only where the ORIGINAL fragment breaks it identically (a page of h1 ... h6 demos)
    const headingOrder = { enabled: !HEADING_DEMOS.some((name) => path.endsWith(name)) }
    await expectAccessible(root, { rules: { "heading-order": headingOrder } })
  })
})
