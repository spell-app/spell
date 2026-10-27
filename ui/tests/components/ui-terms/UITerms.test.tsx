import { describe, expect, it } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell-ui/components/ui-terms"
import "spell-ui/components/ui-label"

/** Render `html` in a 600px box;  each term's label and value boxes. */
async function terms(html: string) {
  const wrapper = await ElementFixture.render<HTMLElement>(`<div style="width: 600px">${html}</div>`)
  await ElementFixture.settle()
  const host = wrapper.querySelector<DOMElement>("ui-terms")!
  const rows = [...wrapper.querySelectorAll<DOMElement>("ui-term")].map((term) => ({
    term,
    label: term.shadowRoot!.querySelector<HTMLElement>("[part~=label]")!,
    value: term.shadowRoot!.querySelector<HTMLElement>("[part~=value]")!
  }))
  return { host, rows }
}

describe("<ui-terms>", () => {
  it("draws each term's label and value, from attributes or written inside", async () => {
    const { rows } = await terms(
      `<ui-terms><ui-term label="Suit" value="hearts"></ui-term>` +
        `<ui-term><b slot="label">Rank</b>queen</ui-term></ui-terms>`
    )
    expect(rows[0]!.label.textContent).toBe("Suit")
    expect(rows[0]!.value.textContent).toBe("hearts")
    expect(rows[1]!.term.textContent).toContain("queen")
    expect([rows[0]!.label.getAttribute("role"), rows[0]!.value.getAttribute("role")]).toEqual(["term", "definition"])
  })

  it("lines the values up in one column", async () => {
    const { rows } = await terms(
      `<ui-terms><ui-term label="A" value="1"></ui-term><ui-term label="A much longer label" value="2"></ui-term></ui-terms>`
    )
    const lefts = rows.map(({ value }) => Math.round(value.getBoundingClientRect().left))
    expect(lefts[0]).toBe(lefts[1])
    expect(rows[0]!.term.matches(":state(in-terms)")).toBe(true)
  })

  it('`direction="horizontal"`:  the terms side by side', async () => {
    const { rows } = await terms(
      `<ui-terms direction="horizontal"><ui-term label="Score" value="42"></ui-term><ui-term label="Moves" value="17"></ui-term></ui-terms>`
    )
    const [first, second] = rows.map(({ term }) => term.getBoundingClientRect())
    expect(Math.round(second!.top)).toBe(Math.round(first!.top))
    expect(second!.left).toBeGreaterThan(first!.right)
    expect(rows[0]!.term.matches(":state(in-row)")).toBe(true)
  })

  it("is accessible", async () => {
    const { host } = await terms(`<ui-terms><ui-term label="Suit" value="hearts"></ui-term></ui-terms>`)
    await expectAccessible(host)
  })
})
