import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell-ui/components/ui-text"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-text/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-text>`;  returns it with its root. */
async function text(html: string) {
  const host = await ElementFixture.render<DOMElement>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=text]")!
  return { host, root }
}

////////////////
// ## Rendering
////////////////

describe("<ui-text> classes", () => {
  it.each([
    ["", "ui text"],
    ['size="large"', "ui large text"],
    ['size="medium"', "ui text"],
    ['color="red"', "ui red text"],
    ['state="error"', "ui error text"],
    ['color="red" inverted', "ui red inverted text"],
    ['inverted="no"', "ui text"],
    ['disabled="yes"', "ui disabled text"],
    ['size="huge" color="blue" state="warning" disabled', "ui huge blue warning disabled text"]
  ])("<ui-text %s>", async (attributes, classes) => {
    const { root } = await text(`<ui-text ${attributes}>Words</ui-text>`)
    expect(root.localName).toBe("span")
    expect(root.className).toBe(classes)
    expect(root.querySelector("slot")).not.toBeNull()
  })

  it("follows attribute changes", async () => {
    const { host, root } = await text(`<ui-text color="red">Words</ui-text>`)
    host.setAttribute("color", "green")
    await ElementFixture.tick()
    expect(root.className).toBe("ui green text")
  })
})

describe("<ui-text> states and looks", () => {
  it("sets :state(disabled)", async () => {
    const { host } = await text(`<ui-text disabled>x</ui-text>`)
    expect(host.matches(":state(disabled)")).toBe(true)
    host.removeAttribute("disabled")
    await ElementFixture.tick()
    expect(host.matches(":state(disabled)")).toBe(false)
  })

  it("flows inline:  the element has no box, the span is sized against the surrounding text", async () => {
    const { host, root } = await text(`<ui-text size="huge">x</ui-text>`)
    expect(getComputedStyle(host).display).toBe("contents")
    expect(getComputedStyle(root).display).toBe("inline")
    const surrounding = Number.parseFloat(getComputedStyle(host.parentElement!).fontSize)
    expect(Number.parseFloat(getComputedStyle(root).fontSize)).toBeCloseTo(surrounding * 4, 0)
  })

  it("paints a hue different from uncoloured text", async () => {
    const { root: plain } = await text(`<ui-text>x</ui-text>`)
    const { root: red } = await text(`<ui-text color="red">x</ui-text>`)
    expect(getComputedStyle(red).color).not.toBe(getComputedStyle(plain).color)
  })
})

////////////////
// ## Tokens
////////////////

describe("<ui-text> tokens from outside", () => {
  /** The inner box's opacity. */
  function measure(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=text]")!).opacity
  }

  /** The element under test. */
  const MARKUP = `<ui-text disabled>Off</ui-text>`

  it("takes a token set on the element", async () => {
    const host = await ElementFixture.render(
      MARKUP.replace("<ui-text", `<ui-text style="--ui-text-disabled-opacity: 0.25"`)
    )
    expect(measure(host)).toBe("0.25")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-text-disabled-opacity: 0.25"><div>${MARKUP}</div></section>`
    )
    expect(measure(wrapper.querySelector("ui-text")!)).toBe("0.25")
  })

  it("takes a token set through `::part(text)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(text) { --ui-text-disabled-opacity: 0.25 }</style>${MARKUP.replace("<ui-text", '<ui-text class="themed"')}</div>`
    )
    expect(measure(wrapper.querySelector("ui-text")!)).toBe("0.25")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-text-disabled-opacity", "0.25")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-text-disabled-opacity")
    })
    const host = await ElementFixture.render(MARKUP)
    expect(measure(host)).toBe("0.25")
  })

  it("keeps its defaults when nothing is set", async () => {
    const host = await ElementFixture.render(MARKUP)
    const probe = await ElementFixture.render(`<span style="opacity: var(--ui-disabled-opacity)"></span>`)
    expect(measure(host)).toBe(getComputedStyle(probe).opacity)
  })

  it("variations:  a size reads its ratio token", async () => {
    const host = await ElementFixture.render(
      `<div style="font-size: 16px"><ui-text size="large" style="--ui-text-size-large: 3">Big</ui-text></div>`
    )
    const root = host.querySelector("ui-text")!.shadowRoot!.querySelector("[part~=text]")!
    expect(getComputedStyle(root).fontSize).toBe("48px")
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-text> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})

////////////////
// ## Links and letters
//
// The shared `link` and `font` (epic `ui-gaps` P3).
////////////////

describe("<ui-text> link and font", () => {
  it("draws a real link with `link`, in its `target`, that the keyboard reaches", async () => {
    const { host, root } = await text(`<ui-text link="help.html" target="_blank">the help</ui-text>`)
    expect(root.localName).toBe("a")
    expect([root.getAttribute("href"), root.getAttribute("target")]).toEqual(["help.html", "_blank"])
    expect(root.tabIndex).toBe(0)
    await expectAccessible(host)
  })

  it("draws each `font` word as its HTML element, outermost first", async () => {
    const { root } = await text(`<ui-text font="italic bold highlight">free</ui-text>`)
    expect(root.querySelector("strong > em > mark > slot")).not.toBe(null)
  })

  it("follows a change of `font`", async () => {
    const { host, root } = await text(`<ui-text font="bold">free</ui-text>`)
    host.setAttribute("font", "code")
    await ElementFixture.settle()
    expect([root.querySelector("strong"), root.querySelector("code > slot")]).toEqual([null, expect.anything()])
  })
})

describe("<ui-text paragraph> and <ui-link>", () => {
  it("`paragraph`:  a `<p>`, a block with the body's line height and a line's space under it", async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div><ui-text paragraph>One.</ui-text><ui-text paragraph>Two.</ui-text></div>`
    )
    await ElementFixture.settle()
    const [first, second] = [...wrapper.querySelectorAll("ui-text")].map((host) =>
      host.shadowRoot!.querySelector<HTMLElement>("[part~=text]")!
    )
    expect(first!.localName).toBe("p")
    expect(getComputedStyle(first!).display).toBe("block")
    expect(second!.getBoundingClientRect().top).toBeGreaterThan(first!.getBoundingClientRect().bottom)
    expect(getComputedStyle(second!).marginBlockEnd).toBe("0px")
  })

  it("`paragraph` with `link`:  a link inside the paragraph", async () => {
    const { root } = await text(`<ui-text paragraph link="help.html">the help</ui-text>`)
    expect(root.localName).toBe("p")
    expect(root.querySelector("a")!.getAttribute("href")).toBe("help.html")
  })

  it("`disabled` drops the link", async () => {
    const { root } = await text(`<ui-text link="help.html" disabled>the help</ui-text>`)
    expect(root.localName).toBe("span")
  })

  it("`<ui-link>`:  a link of its own, in the text's look", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-link link="help.html" font="bold">help</ui-link>`)
    await ElementFixture.settle()
    const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=text]")!
    expect([root.localName, root.className, root.getAttribute("href")]).toEqual(["a", "ui text", "help.html"])
    expect(root.querySelector("strong > slot")).not.toBe(null)
    await expectAccessible(host)
  })

  it("`<ui-link disabled>`:  no longer a link", async () => {
    const host = await ElementFixture.render<DOMElement>(`<ui-link link="help.html" disabled>help</ui-link>`)
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector("[part~=text]")!.localName).toBe("span")
  })
})
