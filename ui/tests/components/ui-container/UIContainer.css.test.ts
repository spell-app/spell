import { describe, expect, it, onTestFinished } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { foundationCSS } from "spell/ui/styles"

import { Sheets } from "spell/ui/test-helpers/Sheets"

import { containerVocabulary } from "spell/ui/components/ui-container/UIContainer.en"

import gridCSS from "spell/ui/components/ui-grid/UIGrid.css?inline"
import containerCSS from "spell/ui/components/ui-container/UIContainer.css?inline"
import containerRaw from "spell/ui/components/ui-container/UIContainer.css?raw"

/**
 * `UIContainer.css` on its own, before any element exists:  the sheet's source rules and the computed widths of the
 * light-DOM examples at each page breakpoint (the test resizes the viewport and restores it).
 * - Sheets are adopted into the document per test and removed again.
 */

/** Every example fragment, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", {
  base: "/src/components/ui-container",
  query: "?raw",
  import: "default",
  eager: true
})

/** `!important`s the sheet is allowed, each documented where it's used:  none. */
const ALLOWED_IMPORTANT = 0

////////////////
// ## Source
////////////////

describe("UIContainer.css source", () => {
  it("never uses rem", () => {
    expect(Sheets.withoutComments(containerRaw)).not.toMatch(/\d(\.\d+)?rem\b/)
  })

  it(`uses !important exactly ${ALLOWED_IMPORTANT} times`, () => {
    expect(Sheets.withoutComments(containerRaw).match(/!important/g) ?? []).toHaveLength(ALLOWED_IMPORTANT)
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(containerRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("container"))).toBe(true)
  })

  it("parses with replaceSync and inlines the page breakpoints", () => {
    for (const css of [containerCSS, containerRaw]) expect(Sheets.selectors(css).length).toBeGreaterThan(15)
    expect(containerCSS).not.toContain("--ui-computer")
    expect(containerCSS).toMatch(/width\s*>=\s*992px|min-width:\s*992px/)
  })

  it("covers every class word the vocabulary can emit", () => {
    // `columns` makes no class on the box:  the inner grid's, which the grid's own sheet styles
    const attributes = containerVocabulary.attributes.filter(({ name }) => name !== "columns")
    for (const phrase of Sheets.classPhrases({ ...containerVocabulary, attributes }))
      expect(Sheets.covers(containerRaw, phrase), phrase).toBe(true)
  })
})

////////////////
// ## Examples
////////////////

describe("UIContainer.css examples", () => {
  it.each([
    [600, "mobile"],
    [800, "tablet"],
    [1000, "computer"],
    [1300, "large monitor"]
  ])("sizes containers at %ipx (%s)", async (width) => {
    await resize(width)
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(EXAMPLES["./examples/types.html"]!)
    const box = root.querySelector<HTMLElement>('.ui.container[class="ui container"]')!
    const outer = box.parentElement!.getBoundingClientRect()
    const inner = box.getBoundingClientRect()
    const expected = width < 768 ? outer.width - 32 : width < 992 ? 723 : width < 1200 ? 933 : 1127
    expect(inner.width).toBeCloseTo(Math.min(expected, outer.width), 0)
    expect(Math.abs(inner.left - outer.left - (outer.right - inner.right))).toBeLessThan(1)
    const text = root.querySelector<HTMLElement>(".ui.text.container")!
    expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(700)
    expect(parseFloat(getComputedStyle(text).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(box).fontSize))
  })

  it("widens wide and grid containers, fills fluid ones", async () => {
    await resize(1180)
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(EXAMPLES["./examples/variations.html"]!)
    const width = (selector: string) => root.querySelector<HTMLElement>(selector)!.getBoundingClientRect().width
    const page = root.getBoundingClientRect().width
    expect(width(".ui.wide.container")).toBeCloseTo(Math.min(933 * 1.2, page), 0)
    expect(width(".ui.grid.container:not(.relaxed)")).toBeCloseTo(933 + 32, 0)
    expect(width(".ui.very.relaxed.grid.container")).toBeCloseTo(933 + 80, 0)
    const fluid = root.querySelector<HTMLElement>(".ui.fluid.container")!
    expect(fluid.getBoundingClientRect().width).toBeCloseTo(fluid.parentElement!.getBoundingClientRect().width, 0)
  })

  it("aligns, justifies and scrolls", () => {
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(EXAMPLES["./examples/variations.html"]!)
    const style = (selector: string) => getComputedStyle(root.querySelector(selector)!)
    expect(style(".ui.center.aligned.container").textAlign).toBe("center")
    expect(style(".ui.right.aligned.container").textAlign).toBe("right")
    expect(style(".ui.justified.container").textAlign).toBe("justify")
    expect(style(".ui.justified.container").hyphens).toBe("auto")
    const capped = style("[class*='very short scrolling']")
    expect(capped.overflowY).toBe("auto")
    expect(parseFloat(capped.maxHeight)).toBeLessThan(parseFloat(style(".ui.resizable.scrolling.container").height))
  })
})

////////////////
// ## A segment's padding, size and inverted (epic `language` T119)
////////////////

describe("UIContainer.css padding, size and inverted", () => {
  it.each([
    ["fitted", "0px"],
    ["lightly padded", "16px"],
    ["padded", "24px"],
    ["very padded", "48px"]
  ])("`%s` pads it %s", (classes, padding) => {
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(`<div class="ui ${classes} container">A</div>`)
    expect(getComputedStyle(root).paddingTop).toBe(padding)
    expect(getComputedStyle(root).paddingLeft).toBe(padding)
  })

  it("sizes its text, and hands its content the dark scheme", () => {
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(`<div class="ui large inverted container"><p>A</p></div>`)
    const style = getComputedStyle(root)
    expect(parseFloat(style.fontSize)).toBeGreaterThan(16)
    expect(style.colorScheme).toBe("dark")
    expect(getComputedStyle(root.firstElementChild!).colorScheme).toBe("dark")
  })

  it("leaves a plain container's text and scheme alone", () => {
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(`<div style="font-size: 10px"><div class="ui container">A</div></div>`)
    expect(getComputedStyle(root.firstElementChild!).fontSize).toBe("10px")
  })
})

////////////////
// ## Tokens
////////////////

describe("UIContainer.css tokens", () => {
  it.each([
    [500, "15em", "--ui-container-scrolling-height"],
    [800, "18em", "--ui-container-scrolling-height-tablet"],
    [1000, "24em", "--ui-container-scrolling-height-computer"],
    [2000, "30em", "--ui-container-scrolling-height-widescreen"]
  ])("at %ipx the scrolling height is %s, from %s", async (width, em, token) => {
    await resize(width)
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(
      `<div class="ui scrolling container" style="font-size: 10px">A</div>` +
        `<div class="ui scrolling container" style="font-size: 10px; ${token}: 77px">B</div>`
    )
    const plain = root as HTMLElement | null
    const themed = root.nextElementSibling as HTMLElement | null
    const scroll = (element: HTMLElement) => parseFloat(getComputedStyle(element).maxHeight)
    expect(scroll(plain!)).toBeCloseTo(parseFloat(em) * 10, 0)
    expect(scroll(themed!)).toBeCloseTo(77, 0)
  })

  it("takes a public token from a wrapper or the container itself (static markup)", () => {
    Sheets.adopt([...foundationCSS, containerCSS])
    const root = Sheets.render(
      `<div style="--ui-container-text-width: 500px"><div class="ui text container">A</div></div>` +
        `<div class="ui text container" style="--ui-container-text-font-ratio: 2">B</div>`
    )
    expect(getComputedStyle(root.firstElementChild!).maxWidth).toBe("500px")
    expect(getComputedStyle(root.nextElementSibling!).fontSize).toBe("32px")
  })
})

////////////////
// ## In shadow roots
////////////////

describe("UIContainer.css in shadow roots", () => {
  it("keeps the host out of layout and centres the root", async () => {
    await resize(1000)
    Sheets.adopt(foundationCSS)
    const host = Sheets.host(`<div class="ui container" part="container"><slot></slot></div>`, [
      ...foundationCSS,
      containerCSS
    ])
    expect(getComputedStyle(host).display).toBe("contents")
    expect(Sheets.inner(host).getBoundingClientRect().width).toBeCloseTo(933, 0)
  })

  // epic `language` T119:  the element adopts the grid's sheet first, for `columns`
  it("stays out of layout under the grid's sheet, which lays out its inner grid", async () => {
    await resize(1000)
    Sheets.adopt(foundationCSS)
    const host = Sheets.host(
      `<div class="ui gridded container" part="container"><div class="ui seven column grid" part="grid"><slot></slot></div></div>`,
      [...foundationCSS, gridCSS, containerCSS]
    )
    host.innerHTML = "<div>A</div>".repeat(7)
    expect(getComputedStyle(host).display).toBe("contents")
    const box = Sheets.inner(host)
    // the grid's rules never reach the container box:  no flex, no negative margins
    expect(getComputedStyle(box).display).toBe("block")
    expect(box.getBoundingClientRect().width).toBeCloseTo(933 + 32, 0)
    const cells = [...host.children]
    expect(new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().top))).size).toBe(1)
  })
})

/**
 * Resize the test iframe's viewport to `width` for this test.
 * - SIDE EFFECT:  restored when the test finishes.
 */
async function resize(width: number) {
  const [previousWidth, previousHeight] = [window.innerWidth, window.innerHeight]
  await page.viewport(width, 800)
  onTestFinished(() => page.viewport(previousWidth, previousHeight))
}
