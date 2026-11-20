import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-tree"
import "spell/ui/components/ui-table"
import "spell/ui/components/ui-segment"
import "spell/ui/components/ui-card"
import "spell/ui/components/ui-graph"
import "spell/ui/components/ui-code"
import "spell/ui/components/ui-json"
import "spell/ui/components/ui-flyout"
import "spell/ui/components/ui-modal"
import "spell/ui/components/ui-embed"
import "spell/ui/components/ui-markdown"
import "spell/ui/components/ui-list"

/****************
 * The shared `height`, `min-height` and `max-height`, and `resizable`'s sizes, on each of the eleven widgets that
 * take them (`SharedHeights.css`, `MoveAndResize`;  epic `old-console-redo` P2).
 ****************/

/** Each widget's tag, and what goes inside it;  `visible` for the ones that start hidden. */
const WIDGETS: readonly (readonly [tag: string, inside: string, attributes?: string])[] = [
  ["ui-tree", ""],
  ["ui-table", "<table><tr><td>a</td></tr></table>"],
  ["ui-segment", "x"],
  ["ui-card", "x"],
  ["ui-graph", ""],
  ["ui-code", "let a = 1"],
  ["ui-json", ""],
  ["ui-flyout", "x", 'visible position="left"'],
  ["ui-modal", "x", "visible"],
  ["ui-embed", ""],
  ["ui-markdown", "x"]
]

/** Render one widget with `attributes`;  returns it, and the box it sizes (its own, or its shadow root's top box). */
/** One row of `WIDGETS`:  `it.each()` spreads it into loose arguments, so the tests gather it back. */
type Widget = (typeof WIDGETS)[number]

async function render([tag, inside, own = ""]: Widget, attributes: string) {
  const host = await ElementFixture.render<DOMElement>(`<${tag} ${own} ${attributes}>${inside}</${tag}>`)
  await ElementFixture.settle()
  const box =
    getComputedStyle(host).display === "contents"
      ? ([...host.shadowRoot!.children].find((child) => !child.matches("slot, style, link")) as HTMLElement)
      : host
  return { host, box }
}

describe("height, min-height, max-height", () => {
  it.each(WIDGETS)(
    "<%s height>:  its box is that tall;  max-height caps it, min-height holds it",
    async (...widget) => {
      const { host, box } = await render(widget as unknown as Widget, 'height="123px"')
      expect(host.matches(":state(height)")).toBe(true)
      expect(box.getBoundingClientRect().height).toBeCloseTo(123, 0)
      host.setAttribute("max-height", "80px")
      await ElementFixture.settle()
      expect(box.getBoundingClientRect().height).toBeCloseTo(80, 0)
      host.removeAttribute("max-height")
      host.setAttribute("min-height", "150px")
      await ElementFixture.settle()
      expect(box.getBoundingClientRect().height).toBeCloseTo(150, 0)
      host.removeAttribute("height")
      host.removeAttribute("min-height")
      await ElementFixture.settle()
      expect(["height", "min-height"].some((name) => host.matches(`:state(${name})`))).toBe(false)
    }
  )

  it("only on the widgets that take them:  a list doesn't", async () => {
    const list = await ElementFixture.render<DOMElement>(`<ui-list height="123px"><ui-item>a</ui-item></ui-list>`)
    await ElementFixture.settle()
    expect(list.matches(":state(height)")).toBe(false)
    expect(list.style.getPropertyValue("--_ui-height")).toBe("")
  })
})

describe("resizable", () => {
  it.each(WIDGETS)("<%s resizable>:  only the sizes it names", async (...widget) => {
    const { host, box: own } = await render(widget as unknown as Widget, 'resizable="height"')
    // a table resizes its scroller (below)
    const box = host.shadowRoot!.querySelector<HTMLElement>(".scroller") ?? own
    expect([
      box.style.resize,
      host.matches(":state(resizable-height)"),
      host.matches(":state(resizable-width)")
    ]).toEqual(["vertical", true, false])
    host.setAttribute("resizable", "width")
    await ElementFixture.settle()
    expect(box.style.resize).toBe("horizontal")
    host.setAttribute("resizable", "width, height")
    await ElementFixture.settle()
    expect(box.style.resize).toBe("both")
    host.removeAttribute("resizable")
    await ElementFixture.settle()
    expect([box.style.resize, host.matches(":state(resizable-height)")]).toEqual(["", false])
  })

  it.each([
    ["ui-segment", "vertical"],
    ["ui-tree", "both"]
  ])("bare on <%s>:  its family's own, %s", async (tag, resize) => {
    const widget = WIDGETS.find(([name]) => name === tag)!
    const { box } = await render(widget, "resizable")
    expect(box.style.resize).toBe(resize)
  })

  it("a table resizes its scroller, which fills a height", async () => {
    const widget = WIDGETS.find(([name]) => name === "ui-table")!
    const { host } = await render(widget, 'resizable scrolling="short"')
    const scroller = host.shadowRoot!.querySelector<HTMLElement>(".scroller")!
    expect(scroller.style.resize).toBe("vertical")
    expect(host.style.resize).toBe("")
  })
})
