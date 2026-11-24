import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-container"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-container/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

////////////////
// ## Classes and layout
////////////////

describe("<ui-container> classes and layout", () => {
  it.each([
    ["", "ui container"],
    ["text", "ui text container"],
    ['text="no"', "ui container"],
    ['fluid="yes"', "ui fluid container"],
    ["wide", "ui wide container"],
    // the old names (epic ui-gaps P4), and the new
    ['grid spacing="xl"', "ui very relaxed gridded container very-relaxed"],
    ['grid spacing="lg"', "ui relaxed gridded container"],
    // epic `language` T119:  a segment's padding, size and inverted;  `columns` makes no class on the box
    ['padding="small"', "ui lightly padded container"],
    ['padding="lg"', "ui very padded container very-padded"],
    ['size="small" inverted', "ui small inverted container"],
    ['columns="7" spacing="xs"', "ui very compact container very-compact"],
    ['scrolling="very short" resizable', "ui resizable very short scrolling container very-short very-short-scrolling"],
    ['width="20em"', "ui set-width container"]
  ])("<ui-container %s>", async (attributes, classes) => {
    const host = await ElementFixture.render<DOMElement>(`<ui-container ${attributes}><p>x</p></ui-container>`)
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    expect(root.className).toBe(classes)
    expect(root.localName).toBe("div")
    expect(root.querySelector("slot")).not.toBeNull()
  })

  // epic `language` T119:  Solitaire's board, `<container padding="small" columns="7" spacing="xs">`
  it("lays its children out as a grid of `columns`, with the grid's own gutters", async () => {
    const host = await ElementFixture.render<DOMElement>(
      `<ui-container padding="small" columns="7" spacing="xs">${"<div>x</div>".repeat(14)}</ui-container>`
    )
    const box = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    const grid = host.shadowRoot!.querySelector<HTMLElement>("[part~=grid]")!
    expect(grid.className).toBe("ui very compact seven column grid seven-column very-compact")
    expect(grid.querySelector("slot")).not.toBeNull()
    expect(getComputedStyle(host).display).toBe("contents")
    expect(getComputedStyle(box).paddingLeft).toBe("16px")

    const cells = [...host.children] as HTMLElement[]
    const tops = new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().top)))
    expect(tops.size).toBe(2)
    const width = grid.getBoundingClientRect().width
    expect(cells[0]!.getBoundingClientRect().width).toBeCloseTo(width / 7, 0)
    // `xs`:  the grid's very compact gutter, half of 0.5em each side
    expect(getComputedStyle(cells[0]!).paddingLeft).toBe("4px")

    host.removeAttribute("columns")
    await host.ready
    expect(host.shadowRoot!.querySelector("[part~=grid]")).toBeNull()
    expect(box.querySelector("slot")).not.toBeNull()
  })

  it("is a segment's dark scheme when `inverted`, and sizes its text with `size`", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-container inverted size="large"><p>x</p></ui-container>`)
    const box = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    const style = getComputedStyle(box)
    expect(style.colorScheme).toBe("dark")
    expect(style.getPropertyValue("--ui-inverted").trim()).toBe("1")
    expect(getComputedStyle(host.querySelector("p")!).colorScheme).toBe("dark")
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(parseFloat(style.fontSize)).toBeGreaterThan(rootSize)
  })

  // epic `language` T76:  Calculator and Tic-Tac-Toe were 20em boxes, with a style sheet only to say so
  it("takes a width of its own, any CSS length, centred;  never wider than the page", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-container width="20em"><p>x</p></ui-container>`)
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    const style = getComputedStyle(root)
    expect(style.width).toBe(`${20 * parseFloat(getComputedStyle(document.documentElement).fontSize)}px`)
    expect(style.marginLeft).toBe(style.marginRight)
    expect(style.maxWidth).toBe("100%")

    host.setAttribute("width", "320px")
    await host.ready
    expect(getComputedStyle(root).width).toBe("320px")
    host.removeAttribute("width")
    await host.ready
    expect(root.className).toBe("ui container")
    expect(root.style.getPropertyValue("--_container-set-width")).toBe("")
  })

  it("centres a fixed width on wide pages", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-container><p>x</p></ui-container>`)
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=container]")!
    const style = getComputedStyle(root)
    expect(style.marginLeft).toBe(style.marginRight)
  })
})

////////////////
// ## Tokens from outside
////////////////

describe("<ui-container> tokens from outside", () => {
  /** The inner box's max width. */
  function measure(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=container]")!).maxWidth
  }

  /** The element under test. */
  const MARKUP = `<ui-container text>Text</ui-container>`

  it("takes a token set on the element", async () => {
    const host = await ElementFixture.render(
      MARKUP.replace("<ui-container", `<ui-container style="--ui-container-text-width: 500px"`)
    )
    expect(measure(host)).toBe("500px")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-container-text-width: 500px"><div>${MARKUP}</div></section>`
    )
    expect(measure(wrapper.querySelector("ui-container")!)).toBe("500px")
  })

  it("takes a token set through `::part(container)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(container) { --ui-container-text-width: 500px }</style>${MARKUP.replace("<ui-container", '<ui-container class="themed"')}</div>`
    )
    expect(measure(wrapper.querySelector("ui-container")!)).toBe("500px")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-container-text-width", "500px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-container-text-width")
    })
    const host = await ElementFixture.render(MARKUP)
    expect(measure(host)).toBe("500px")
  })

  it("keeps its defaults when nothing is set", async () => {
    const host = await ElementFixture.render(MARKUP)
    const probe = await ElementFixture.render(`<span style="max-width: 700px"></span>`)
    expect(measure(host)).toBe(getComputedStyle(probe).maxWidth)
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-container> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})
