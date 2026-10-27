import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { BreadcrumbDividerTokens } from "spell/ui/components/components.types"
import { UI } from "spell/ui/runtime"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import { BreadcrumbDivider } from "spell/ui/components/ui-breadcrumbs/BreadcrumbDivider"

import "spell/ui/components/ui-breadcrumbs"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-breadcrumbs/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Three sections, the last one current. */
const TRAIL =
  `<ui-breadcrumb link="#home">Home</ui-breadcrumb>` +
  `<ui-breadcrumb link="#store">Store</ui-breadcrumb>` +
  `<ui-breadcrumb selected link="#shirt">T-Shirt</ui-breadcrumb>`

/** Render a breadcrumb;  returns it, its `<nav>` and its section elements. */
async function breadcrumb(attributes = "", sections = TRAIL) {
  const host = await ElementFixture.render<DOMElement>(`<ui-breadcrumbs ${attributes}>${sections}</ui-breadcrumbs>`)
  const nav = host.shadowRoot!.querySelector<HTMLElement>("[part~=breadcrumb]")!
  return { host, nav, sections: [...host.querySelectorAll<DOMElement>("ui-breadcrumb")] }
}

/** A section's `[part~=section]` root. */
function sectionOf(host: Element): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>("[part~=section]")!
}

/** A section's own divider. */
function dividerOf(host: Element): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>("[part~=divider]")!
}

/** Generated content of a section's divider. */
function dividerText(host: Element): string {
  return getComputedStyle(dividerOf(host), "::before").content
}

////////////////
// ## Classes and markup
////////////////

describe("<ui-breadcrumbs> classes and markup", () => {
  it.each([
    ["", "ui breadcrumb"],
    ['size="large"', "ui large breadcrumb"],
    ['size="medium"', "ui breadcrumb"],
    ["inverted", "ui inverted breadcrumb"],
    ['inverted="no"', "ui breadcrumb"]
  ])("<ui-breadcrumbs %s>", async (attributes, classes) => {
    const { nav } = await breadcrumb(attributes)
    expect(nav.className).toBe(classes)
  })

  it("is a labelled <nav> landmark around an <ol> its sections are items of", async () => {
    const { nav, sections } = await breadcrumb()
    expect(nav.localName).toBe("nav")
    expect(nav.getAttribute("aria-label")).toBe("Breadcrumb")
    const list = nav.querySelector("[part~=list]")!
    expect(list.localName).toBe("ol")
    expect(list.querySelector("slot")).not.toBeNull()
    for (const section of sections) expect(section.internals.role).toBe("listitem")
  })

  it("names the landmark with the element's aria-label:  two trails on a page need distinct names", async () => {
    const { host, nav } = await breadcrumb('aria-label="Store trail"')
    expect(nav.getAttribute("aria-label")).toBe("Store trail")
    host.removeAttribute("aria-label")
    await expect.poll(() => nav.getAttribute("aria-label")).toBe("Breadcrumb")
  })
})

////////////////
// ## <ui-breadcrumb>
////////////////

describe("<ui-breadcrumb>", () => {
  it("renders a link with href, text without, and the active one as the current page", async () => {
    const { sections } = await breadcrumb(
      "",
      `<ui-breadcrumb link="#a" target="_top">A</ui-breadcrumb>` +
        `<ui-breadcrumb>B</ui-breadcrumb>` +
        `<ui-breadcrumb selected link="#c">C</ui-breadcrumb>`
    )
    const [a, b, c] = sections.map(sectionOf)
    expect(a!.localName).toBe("a")
    expect(a!.className).toBe("section")
    expect(a!.getAttribute("href")).toBe("#a")
    expect(a!.getAttribute("target")).toBe("_top")
    expect(a!.hasAttribute("aria-current")).toBe(false)
    expect(b!.localName).toBe("span")
    expect(b!.className).toBe("section")
    expect(b!.hasAttribute("aria-current")).toBe(false)
    // active wins over href:  the current page is never a link
    expect(c!.localName).toBe("span")
    expect(c!.className).toBe("active section")
    expect(c!.getAttribute("aria-current")).toBe("page")
    expect(sections[2]!.matches(":state(selected)")).toBe(true)
  })

  it("moves aria-current with `selected`", async () => {
    const { sections } = await breadcrumb()
    sections[2]!.removeAttribute("selected")
    sections[1]!.setAttribute("selected", "")
    await ElementFixture.tick()
    expect(sectionOf(sections[1]!).getAttribute("aria-current")).toBe("page")
    expect(sectionOf(sections[2]!).localName).toBe("a")
    expect(sectionOf(sections[2]!).hasAttribute("aria-current")).toBe(false)
  })

  it("renders its own divider first:  empty, hidden from assistive tech", async () => {
    const { sections } = await breadcrumb()
    const [divider, section] = [...sections[1]!.shadowRoot!.children]
    expect(divider!.getAttribute("part")).toBe("divider")
    expect(divider!.className).toBe("divider")
    expect(divider!.getAttribute("aria-hidden")).toBe("true")
    expect(divider!.childNodes).toHaveLength(0)
    expect(section!.getAttribute("part")).toBe("section")
  })
})

////////////////
// ## Dividers
////////////////

describe("<ui-breadcrumbs> dividers", () => {
  it("draws `/` between sections by default, none before the first", async () => {
    const { sections } = await breadcrumb()
    expect(getComputedStyle(dividerOf(sections[0]!)).display).toBe("none")
    expect(dividerText(sections[1]!)).toBe('"/"')
    expect(dividerText(sections[2]!)).toBe('"/"')
  })

  it("publishes `divider` as a CSS string token, only when it isn't the default", async () => {
    const { host, nav, sections } = await breadcrumb('divider="›"')
    expect(nav.style.getPropertyValue(BreadcrumbDividerTokens.text)).toBe('"›"')
    expect(dividerText(sections[1]!)).toBe('"›"')
    host.removeAttribute("divider")
    await expect.poll(() => nav.style.getPropertyValue(BreadcrumbDividerTokens.text)).toBe("")
    expect(dividerText(sections[1]!)).toBe('"/"')
  })

  it("leaves the token to a theming wrapper without `divider`", async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div style='--ui-breadcrumb-divider: "|"'><ui-breadcrumbs>${TRAIL}</ui-breadcrumbs></div>`
    )
    expect(dividerText(wrapper.querySelectorAll("ui-breadcrumb")[1]!)).toBe('"|"')
  })

  it("does not reflect a default `divider` onto the element", async () => {
    const { host } = await breadcrumb()
    expect(host.hasAttribute("divider")).toBe(false)
  })

  it('lets an explicit `divider="/"` override a theming wrapper', async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div style='--ui-breadcrumb-divider: "|"'><ui-breadcrumbs divider="/">${TRAIL}</ui-breadcrumbs></div>`
    )
    expect(dividerText(wrapper.querySelectorAll("ui-breadcrumb")[1]!)).toBe('"/"')
  })

  it("escapes a divider as CSS text", async () => {
    const { sections } = await breadcrumb(`divider='"'`)
    expect(dividerText(sections[1]!)).toBe('"\\""')
  })

  it("publishes `divider-icon` as a mask image + the icon layout, once the glyph loads", async () => {
    const { host, nav, sections } = await breadcrumb('divider-icon="chevron right"')
    await expect.poll(() => nav.style.getPropertyValue(BreadcrumbDividerTokens.layout)).toBe("icon")
    const data = (await (await UI.load()).icons.get("chevron right"))!
    expect(nav.style.getPropertyValue(BreadcrumbDividerTokens.icon)).toBe(BreadcrumbDivider.svgUrl(data))
    const before = getComputedStyle(dividerOf(sections[1]!), "::before")
    expect(before.content).toBe('""')
    expect(before.maskImage).toContain("data:image/svg+xml")
    host.removeAttribute("divider-icon")
    await expect.poll(() => nav.style.getPropertyValue(BreadcrumbDividerTokens.layout)).toBe("")
    expect(nav.style.getPropertyValue(BreadcrumbDividerTokens.icon)).toBe("")
  })
})

////////////////
// ## Tokens from outside
////////////////

describe("<ui-breadcrumbs> tokens from outside", () => {
  const RED = "rgb(255, 0, 0)"

  /** The `<nav>`'s computed text colour. */
  function color(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=breadcrumb]")!).color
  }

  it("takes a token set on the element", async () => {
    const { host } = await breadcrumb(`style="--ui-breadcrumb-color: ${RED}"`)
    expect(color(host)).toBe(RED)
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-breadcrumb-color: ${RED}"><div><ui-breadcrumbs>${TRAIL}</ui-breadcrumbs></div></section>`
    )
    expect(color(wrapper.querySelector("ui-breadcrumbs")!)).toBe(RED)
  })

  it("takes a token set through `::part(breadcrumb)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(breadcrumb) { --ui-breadcrumb-color: ${RED} }</style>` +
        `<ui-breadcrumbs class="themed">${TRAIL}</ui-breadcrumbs></div>`
    )
    expect(color(wrapper.querySelector("ui-breadcrumbs")!)).toBe(RED)
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-breadcrumb-color", RED)
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-breadcrumb-color")
    })
    const { host } = await breadcrumb()
    expect(color(host)).toBe(RED)
  })

  it("owner tokens:  one set on the breadcrumb or above it reaches its sections", async () => {
    const { sections } = await breadcrumb(`style="--ui-breadcrumb-divider-color: ${RED}"`)
    expect(getComputedStyle(dividerOf(sections[1]!)).color).toBe(RED)
    const wrapper = await ElementFixture.render(
      `<div style="--ui-breadcrumb-link-color: ${RED}"><ui-breadcrumbs>${TRAIL}</ui-breadcrumbs></div>`
    )
    expect(getComputedStyle(sectionOf(wrapper.querySelector("ui-breadcrumb")!)).color).toBe(RED)
  })

  it("variations:  `inverted` swaps the colour, winning over the base token", async () => {
    const { host } = await breadcrumb(`inverted style="--ui-breadcrumb-color: ${RED}"`)
    expect(color(host)).not.toBe(RED)
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-breadcrumbs> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})

////////////////
// ## `link`, and its old name `href`
//
// Owen's request r1 (epic `ui-gaps` P3):  `href` became `link`, still read under its old name.
////////////////

describe("<ui-breadcrumb> link", () => {
  it.each(["link"])("%s draws a real link", async (name) => {
    const element = await ElementFixture.render(`<ui-breadcrumb NAME="#there">Go</ui-breadcrumb>`.replace("NAME", name))
    expect(element.shadowRoot!.querySelector("a")?.getAttribute("href")).toBe("#there")
  })
})
