import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UISpace } from "spell/ui/components/ui-space"

import "spell/ui/components/ui-stack"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-space/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A 20px box. */
const BOX = `<span style="display: inline-block; flex: none; vertical-align: top; width: 20px; height: 20px"></span>`

/** `html` in a 300px wrapper of 20px lines, settled;  the boxes of its `span`s and its `<ui-space>`s. */
async function layout(html: string) {
  const wrapper = await ElementFixture.render<HTMLElement>(`<div style="width: 300px; line-height: 20px">${html}</div>`)
  await ElementFixture.settle()
  const rects = (selector: string) => [...wrapper.querySelectorAll(selector)].map((el) => el.getBoundingClientRect())
  return { wrapper, boxes: rects("span"), spaces: rects("ui-space") }
}

describe("<ui-space>", () => {
  it("bare:  a line break, with no size of its own", async () => {
    const { boxes, spaces } = await layout(`${BOX}<ui-space></ui-space>${BOX}`)
    expect(boxes[1]!.top).toBe(boxes[0]!.bottom)
    expect(boxes[1]!.left).toBe(boxes[0]!.left)
    expect(spaces[0]!.width).toBe(0)
    expect(spaces[0]!.height).toBe(0)
  })

  it("`inline`:  a gap in the line, a space's width (0.25em, 4px) by default", async () => {
    const { boxes } = await layout(`${BOX}<ui-space inline></ui-space>${BOX}`)
    expect(boxes[1]!.top).toBe(boxes[0]!.top)
    expect(boxes[1]!.left - boxes[0]!.right).toBe(4)
  })

  it.each([
    ["20", 20],
    ["xs", 8],
    ["md", 16],
    ["xl", 32],
    ["none", 0],
    ["3em", 48]
  ])('`inline width="%s"`:  %ipx', async (width, gap) => {
    const { boxes } = await layout(`${BOX}<ui-space inline width="${width}"></ui-space>${BOX}`)
    expect(boxes[1]!.left - boxes[0]!.right).toBe(gap)
  })

  it('`height="lg"`:  a band of blank space between the lines (24px)', async () => {
    const { boxes } = await layout(`${BOX}<ui-space height="lg"></ui-space>${BOX}`)
    expect(boxes[1]!.top - boxes[0]!.bottom).toBe(24)
  })

  it("`fluid`:  takes the room left in a row", async () => {
    const { boxes, spaces } = await layout(
      `<ui-stack direction="horizontal" spacing="none" fluid>${BOX}<ui-space fluid></ui-space>${BOX}</ui-stack>`
    )
    expect(spaces[0]!.width).toBe(260)
    expect(boxes[1]!.right).toBe(boxes[0]!.left + 300)
  })

  it('`grow` and `grow="2"`:  the second takes twice the room of the first', async () => {
    const { spaces } = await layout(
      `<ui-stack direction="horizontal" spacing="none" fluid>${BOX}<ui-space grow></ui-space>${BOX}` +
        `<ui-space grow="2"></ui-space>${BOX}</ui-stack>`
    )
    expect(spaces[0]!.width).toBe(80)
    expect(spaces[1]!.width).toBe(160)
  })

  it("`fluid` shrinks, a fixed width doesn't:  a 400px space in a 300px row", async () => {
    const row = (attributes: string) =>
      `<ui-stack direction="horizontal" spacing="none" fluid><ui-space width="400" ${attributes}></ui-space>${BOX}</ui-stack>`
    const { spaces: fluid } = await layout(row("fluid"))
    expect(fluid[0]!.width).toBe(280)
    const { spaces: fixed } = await layout(row(""))
    expect(fixed[0]!.width).toBe(400)
    const { spaces: noShrink } = await layout(row(`fluid shrink="0"`))
    expect(noShrink[0]!.width).toBe(400)
  })

  it.each(Object.entries(EXAMPLES))("example %s is accessible", async (_path, html) => {
    const host = await ElementFixture.render<HTMLElement>(html)
    await ElementFixture.settle()
    await expectAccessible(host)
  })
})

describe("UISpace.lengthFor()", () => {
  it.each([
    ["20", "20px"],
    ["1.5", "1.5px"],
    ["md", "var(--ui-space-m)"],
    ["none", "0"],
    ["2em", "2em"],
    ["50%", "50%"],
    ["", undefined],
    [undefined, undefined],
    ["1px; color: red", undefined]
  ])("%s => %s", (value, length) => {
    expect(UISpace.lengthFor(value)).toBe(length)
  })
})

describe("UISpace.factorFor()", () => {
  it.each([
    ["", 1],
    ["true", 1],
    ["2", 2],
    ["0.5", 0.5],
    ["false", 0],
    ["wide", undefined],
    [undefined, undefined]
  ])("%s => %s", (value, factor) => {
    expect(UISpace.factorFor(value)).toBe(factor)
  })
})
