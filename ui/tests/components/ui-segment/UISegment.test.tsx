import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import { Painted } from "spell-ui/test-helpers/Painted"

import "spell-ui/components/ui-segment"
import "spell-ui/components/ui-parts"
import "spell-ui/components/ui-label"

/** Examples whose original fragment fails axe `heading-order` too (see `notes/report.md`). */
const HEADING_DEMOS = ["parts/examples/elements/header.html", "segment/examples/elements/variations.html"]

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-segment/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one element;  returns it with its root. */
async function render(html: string) {
  const host = await ElementFixture.render<DOMElement>(html)
  const root = host.shadowRoot!.firstElementChild as HTMLElement
  return { host, root }
}

////////////////
// ## Rendering
////////////////

describe("<ui-segment> classes", () => {
  it.each([
    ["", "ui segment"],
    ['size="small"', "ui small segment"],
    ['size="medium"', "ui segment"],
    ['color="red" inverted', "ui red inverted segment"],
    ['appearance="raised"', "ui raised segment"],
    ["", "ui segment"],
    ['appearance="stacked"', "ui stacked segment"],
    ['appearance="tall-stacked"', "ui tall stacked segment"],
    ['appearance="piled"', "ui piled segment"],
    ['appearance="vertical" placeholder', "ui placeholder vertical segment"],
    // the old names (epic ui-gaps P4), and the new
    ['appearance="circular basic" padding="compact" clearing', "ui compact clearing circular basic segment"],
    ['padding="lg"', "ui very padded segment"],
    ['appearance="tall-stacked raised"', "ui tall stacked raised segment"],
    ['align="center"', "ui center aligned segment"],
    ['attach="top" seamless', "ui top attached seamless segment"],
    ["loading disabled", "ui disabled loading segment"],
    ['scrolling="long" resizable', "ui resizable long scrolling segment"]
  ])("<ui-segment %s>", async (attributes, classes) => {
    const { root } = await render(`<ui-segment ${attributes}>x</ui-segment>`)
    expect(root.className).toBe(classes)
    expect(root.getAttribute("part")).toBe("segment")
  })
})

describe("<ui-segment> states and owner tokens", () => {
  it("sets :state(piled) and makes the host the stacking context", async () => {
    const { host } = await render(`<ui-segment appearance="piled">x</ui-segment>`)
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

  it("follows a dark page;  resets to light only inside an inverted one", async () => {
    const page = await ElementFixture.render<HTMLElement>(
      `<div class="ui-dark"><ui-segment>Plain</ui-segment><ui-segment inverted><ui-segment>Nested</ui-segment></ui-segment></div>`
    )
    const [plain, inverted, nested] = [...page.querySelectorAll<DOMElement>("ui-segment")].map(
      (host) => host.shadowRoot!.firstElementChild!
    )
    expect(getComputedStyle(plain!).colorScheme).toBe("dark")
    expect(getComputedStyle(plain!).getPropertyValue("--ui-inverted").trim()).toBe("0")
    expect(getComputedStyle(inverted!).colorScheme).toBe("dark")
    expect(getComputedStyle(nested!).colorScheme).toBe("light")
    expect(getComputedStyle(nested!).getPropertyValue("--ui-scheme").trim()).toBe("light")
    const { root: light } = await render(`<ui-segment>x</ui-segment>`)
    expect(getComputedStyle(light).getPropertyValue("--ui-scheme").trim()).not.toBe("dark")
  })

  it("inverts the members of an <ui-segments inverted>, not a segment nested in a member", async () => {
    const group = await ElementFixture.render<HTMLElement>(
      `<ui-segments inverted><ui-segment id="m">A<ui-segment id="n">Nested</ui-segment></ui-segment><ui-segment id="o">B</ui-segment></ui-segments>`
    )
    await ElementFixture.settle(group)
    const rootOf = (id: string) => group.querySelector(`#${id}`)!.shadowRoot!.firstElementChild!
    for (const id of ["m", "o"]) {
      const style = getComputedStyle(rootOf(id))
      expect(style.getPropertyValue("--ui-inverted").trim(), id).toBe("1")
      expect(style.colorScheme, id).toBe("dark")
      expect(Painted.luminance(style.backgroundColor), id).toBeLessThan(0.07)
    }
    const nested = getComputedStyle(rootOf("n"))
    expect(nested.getPropertyValue("--ui-inverted").trim()).toBe("0")
    expect(nested.colorScheme).toBe("light")
    expect(Painted.luminance(nested.backgroundColor)).toBeGreaterThan(0.45)
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

////////////////
// ## Groups
////////////////

describe("<ui-segments>", () => {
  it.each([
    ["", "ui segments"],
    ['direction="horizontal" equal-width', "ui horizontal equal width segments"],
    ['direction="horizontal" equal-width', "ui horizontal equal width segments"],
    ['appearance="raised"', "ui raised segments"],
    ['appearance="tall-stacked"', "ui tall stacked segments"],
    ['appearance="piled"', "ui piled segments"],
    ['inverted="no"', "ui segments"]
  ])("<ui-segments %s>", async (attributes, classes) => {
    const { root } = await render(`<ui-segments ${attributes}><ui-segment>a</ui-segment></ui-segments>`)
    expect(root.className).toBe(classes)
    expect(root.getAttribute("part")).toBe("group")
  })

  it("sets :state(piled)", async () => {
    const { host } = await render(`<ui-segments appearance="piled"><ui-segment>a</ui-segment></ui-segments>`)
    expect(host.matches(":state(piled)")).toBe(true)
  })

  it("keeps 1em vertical margins by its HOST's position:  the root is always its shadow root's only child", async () => {
    const wrapper = await ElementFixture.render(
      `<div><h4>Heading</h4>` +
        `<ui-segments><ui-segment>a</ui-segment></ui-segments>` +
        `<ui-segments><ui-segment>b</ui-segment></ui-segments></div>`
    )
    const [first, second] = [...wrapper.querySelectorAll("ui-segments")].map((host) =>
      getComputedStyle(host.shadowRoot!.firstElementChild!)
    )
    expect([first!.marginTop, first!.marginBottom]).toEqual(["16px", "16px"])
    expect([second!.marginTop, second!.marginBottom]).toEqual(["16px", "0px"])
  })
})

////////////////
// ## Tokens
////////////////

describe("<ui-segment> tokens from outside", () => {
  /** The segment box's top-left radius, which `--ui-segment-radius` drives. */
  function radius(host: Element): string {
    return getComputedStyle(host.shadowRoot!.firstElementChild!).borderTopLeftRadius
  }

  it("takes a token set on the HOST", async () => {
    const { root } = await render(`<ui-segment style="--ui-segment-radius: 12px">x</ui-segment>`)
    expect(getComputedStyle(root).borderTopLeftRadius).toBe("12px")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-segment-radius: 12px"><div><ui-segment>x</ui-segment></div></section>`
    )
    expect(radius(wrapper.querySelector("ui-segment")!)).toBe("12px")
  })

  it("inherits its text alignment unless it sets one (a `right aligned` grid column)", async () => {
    const wrapper = await ElementFixture.render(
      `<div style="text-align: right"><ui-segment>x</ui-segment><ui-segment align="center">y</ui-segment></div>`
    )
    const [plain, centered] = [...wrapper.querySelectorAll("ui-segment")].map(
      (host) => getComputedStyle(host.shadowRoot!.firstElementChild!).textAlign
    )
    expect(plain).toBe("right")
    expect(centered).toBe("center")
  })

  it("takes a token set through `::part(segment)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(segment) { --ui-segment-radius: 12px }</style><ui-segment class="themed">x</ui-segment></div>`
    )
    expect(radius(wrapper.querySelector("ui-segment")!)).toBe("12px")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-segment-radius", "12px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-segment-radius")
    })
    const { root } = await render(`<ui-segment>x</ui-segment>`)
    expect(getComputedStyle(root).borderTopLeftRadius).toBe("12px")
  })

  it("reaches the members of a group, set on the group:  its outer corners round, the seams stay square", async () => {
    const group = await ElementFixture.render(
      `<ui-segments style="--ui-segment-radius: 12px"><ui-segment>A</ui-segment><ui-segment>B</ui-segment></ui-segments>`
    )
    const [first, last] = [...group.querySelectorAll("ui-segment")].map((host) => host.shadowRoot!.firstElementChild!)
    expect(getComputedStyle(first!).borderTopLeftRadius).toBe("12px")
    expect(getComputedStyle(first!).borderBottomLeftRadius).toBe("0px")
    expect(getComputedStyle(last!).borderBottomLeftRadius).toBe("12px")
  })

  it("owner tokens:  an attached label covers the border width the page set", async () => {
    const { host } = await render(
      `<ui-segment style="--ui-segment-border-width: 3px"><ui-label attach="top">A</ui-label>x</ui-segment>`
    )
    await ElementFixture.settle(host)
    const label = host.querySelector("ui-label")!.shadowRoot!.querySelector("[part~=label]")!
    expect(getComputedStyle(label).top).toBe("-3px")
  })

  it("variations:  `padded` swaps the padding for its own token", async () => {
    const { root: padded } = await render(`<ui-segment padding="md" style="--ui-segment-padding: 5px">x</ui-segment>`)
    expect(getComputedStyle(padded).paddingTop).not.toBe("5px")
    const { root: themed } = await render(`<ui-segment padding="md" style="--ui-segment-padded: 5px">x</ui-segment>`)
    expect(getComputedStyle(themed).paddingTop).toBe("5px")
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-segment> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    // `heading-order` off only where the ORIGINAL fragment breaks it identically (a page of h1 ... h6 demos)
    const headingOrder = { enabled: !HEADING_DEMOS.some((name) => path.endsWith(name)) }
    await expectAccessible(root, { rules: { "heading-order": headingOrder } })
  })
})
