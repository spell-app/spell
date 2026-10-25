import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-epic/components/epic-actions"

// epic `epic-engine` P45 (Owen, 2026-10-25):  "You should be creating web elements for the things inside an
// <epic-phase> ... e.g. <epic-actions>"
describe("<epic-actions>", () => {
  /**
   * An actions row before a paragraph, holding two buttons;  the gap down to the paragraph measured and handed in as
   * the docs runtime does (`alignBlockActions()`).
   */
  async function row(attributes = ""): Promise<{ row: HTMLElement; block: HTMLElement }> {
    const root = await ElementFixture.render(
      `<div style="width: 400px; padding: 1px 0"><epic-actions ${attributes} style="--spell-block-head: 30px">` +
        `<button aria-label="Comment">C</button><button aria-label="Expand">E</button></epic-actions>` +
        `<p style="margin: 12px 0; height: 40px">A paragraph.</p></div>`
    )
    const actions = root.querySelector<HTMLElement>("epic-actions")!
    const block = root.querySelector("p")!
    const gap = block.getBoundingClientRect().top - actions.getBoundingClientRect().top
    actions.style.setProperty("--spell-block-gap", `${gap}px`)
    await ElementFixture.tick()
    return { row: actions, block }
  }

  test("a line of no height, its buttons in order over its block's top right corner, 2px in;  passes axe", async () => {
    const { row: actions, block } = await row()
    expect(actions.getBoundingClientRect().height).toBe(0)
    const box = actions.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
    const [first, second] = Array.from(actions.querySelectorAll("button"), (button) => button.getBoundingClientRect())
    const edge = block.getBoundingClientRect()
    expect(box.getBoundingClientRect().top - edge.top).toBeCloseTo(2, 1)
    expect(edge.right - second!.right).toBeCloseTo(2, 1)
    expect(first!.right).toBeLessThanOrEqual(second!.left)
    await expectAccessible(actions)
  })

  test("`head-row`:  its buttons centred on the table's header row (`--spell-block-head`)", async () => {
    const { row: actions, block } = await row("head-row")
    const box = actions.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!.getBoundingClientRect()
    expect(box.top).toBeCloseTo(block.getBoundingClientRect().top, 1)
    expect(box.height).toBeCloseTo(30, 1)
  })
})
