import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-stack"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-stack/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Three 50px boxes in a stack with `attributes`, in a 600px wrapper. */
async function stack(attributes = "") {
  const wrapper = await ElementFixture.render<HTMLElement>(
    `<div style="width: 600px"><ui-stack ${attributes}>` +
      `<div style="width: 50px; height: 50px"></div><div style="width: 50px; height: 20px"></div>` +
      `<div style="width: 50px; height: 50px"></div></ui-stack></div>`
  )
  await ElementFixture.settle()
  const host = wrapper.querySelector<HTMLElement>("ui-stack")!
  const boxes = [...host.children].map((child) => child.getBoundingClientRect())
  return { host, boxes, box: host.getBoundingClientRect() }
}

describe("<ui-stack>", () => {
  it("is a column, its children 1em (16px) apart", async () => {
    const { boxes } = await stack()
    expect(boxes[1]!.top - boxes[0]!.bottom).toBe(16)
    expect(boxes[1]!.left).toBe(boxes[0]!.left)
  })

  it('`direction="horizontal"`:  a row, centred on its middle', async () => {
    const { boxes } = await stack(`direction="horizontal"`)
    expect(boxes[1]!.left - boxes[0]!.right).toBe(16)
    expect(boxes[1]!.top + 10).toBe(boxes[0]!.top + 25)
  })

  it.each([
    ["none", 0],
    ["xs", 8],
    ["sm", 12],
    ["lg", 24],
    ["xl", 32]
  ])('`spacing="%s"`:  %ipx', async (spacing, gap) => {
    const { boxes } = await stack(`spacing="${spacing}"`)
    expect(boxes[1]!.top - boxes[0]!.bottom).toBe(gap)
  })

  it('`justify="between"`:  the first child at the start, the last at the end', async () => {
    const { boxes, box } = await stack(`direction="horizontal" justify="between" fluid`)
    expect(boxes[0]!.left).toBe(box.left)
    expect(boxes[2]!.right).toBe(box.right)
  })

  it('`align="center"`:  a column\'s children centred across it', async () => {
    const { boxes, box } = await stack(`align="center"`)
    expect(boxes[0]!.left - box.left).toBe(box.right - boxes[0]!.right)
  })

  it("`wrap`:  a row too long for its box wraps", async () => {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div style="width: 100px"><ui-stack direction="horizontal" wrap align="start">` +
        `<div style="width: 60px; height: 10px"></div><div style="width: 60px; height: 10px"></div></ui-stack></div>`
    )
    await ElementFixture.settle()
    const [first, second] = [...wrapper.querySelectorAll("ui-stack > div")].map((child) =>
      child.getBoundingClientRect()
    )
    expect(second!.top).toBeGreaterThan(first!.top)
  })

  it.each(Object.entries(EXAMPLES))("example %s is accessible", async (_path, html) => {
    const host = await ElementFixture.render<HTMLElement>(html)
    await ElementFixture.settle()
    await expectAccessible(host)
  })
})

describe("<ui-stack> and its Spell UI children", () => {
  it("drops a child's own outside margins:  two headers in a row sit level", async () => {
    await import("spell/ui/components/ui-parts")
    const host = await ElementFixture.render<HTMLElement>(
      `<ui-stack direction="horizontal" justify="between"><ui-header level="3">Go back</ui-header>` +
        `<ui-header level="3">Go forward</ui-header></ui-stack>`
    )
    await ElementFixture.settle()
    const [first, second] = [...host.querySelectorAll("ui-header")].map(
      (header) => header.shadowRoot!.querySelector<HTMLElement>("[part~=header]")!.getBoundingClientRect().top
    )
    expect(Math.round(second!)).toBe(Math.round(first!))
  })

  it("only for its own children:  a header inside a child keeps its margins", async () => {
    await import("spell/ui/components/ui-segment")
    const host = await ElementFixture.render<HTMLElement>(
      `<ui-stack><ui-segment><p>x</p><ui-header level="3">Inside</ui-header></ui-segment></ui-stack>`
    )
    await ElementFixture.settle()
    const root = host.querySelector("ui-header")!.shadowRoot!.querySelector<HTMLElement>("[part~=header]")!
    expect(parseFloat(getComputedStyle(root).marginBlockStart)).toBeGreaterThan(0)
  })

  it("in a row, a `fluid` child takes the room left:  a task's title field fills it (epic `language` T57)", async () => {
    await import("spell/ui/components/ui-input")
    await import("spell/ui/components/ui-checkbox")
    await import("spell/ui/components/ui-label")
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div style="width: 400px"><ui-stack direction="horizontal" spacing="sm">` +
        `<ui-checkbox aria-label="Done"></ui-checkbox><ui-input aria-label="Task" fluid></ui-input>` +
        `<ui-label size="tiny">high</ui-label></ui-stack></div>`
    )
    await ElementFixture.settle()
    const host = wrapper.querySelector("ui-stack")!
    const input = host.querySelector("ui-input")!.getBoundingClientRect()
    const label = host.querySelector("ui-label")!.shadowRoot!.querySelector("[part~=label]")!.getBoundingClientRect()
    expect([input.width > 250, Math.round(label.right)]).toEqual([true, Math.round(host.getBoundingClientRect().right)])
  })

  it("in a wrapping row, a `fluid` stack takes the room left beside a picture, and wraps under it when there's none (epic `language` T88)", async () => {
    const row = (width: number) =>
      `<div style="width: ${width}px"><ui-stack direction="horizontal" wrap align="start">` +
      `<div style="width: 200px; height: 200px"></div>` +
      `<ui-stack fluid><div style="width: 50px; height: 50px"></div></ui-stack></ui-stack></div>`
    const wide = await ElementFixture.render<HTMLElement>(row(600))
    await ElementFixture.settle()
    const [picture, details] = [...wide.querySelector("ui-stack")!.children].map((child) =>
      child.getBoundingClientRect()
    )
    // beside it, the rest of the row:  600 - 200 - 16
    expect([details.top === picture.top, Math.round(details.width)]).toEqual([true, 384])
    const narrow = await ElementFixture.render<HTMLElement>(row(200))
    await ElementFixture.settle()
    const [picture2, details2] = [...narrow.querySelector("ui-stack")!.children].map((child) =>
      child.getBoundingClientRect()
    )
    expect([details2.top >= picture2.bottom, Math.round(details2.width)]).toEqual([true, 200])
  })

  it("in a column, a `fluid` child keeps its height", async () => {
    await import("spell/ui/components/ui-input")
    const host = await ElementFixture.render<HTMLElement>(
      `<ui-stack style="height: 300px"><ui-input aria-label="Task" fluid></ui-input></ui-stack>`
    )
    await ElementFixture.settle()
    expect(host.querySelector("ui-input")!.getBoundingClientRect().height).toBeLessThan(100)
  })
})
