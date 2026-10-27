import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-mark"
import "spell/epic/components/epic-page"
import "spell/epic/components/epic-item"

/** `<epic-mark>`'s chip in its shadow root. */
function chipOf(mark: Element): HTMLElement {
  return mark.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
}

/** A page holding items in these states, and `marks` after them. */
function page(marks: string): string {
  return (
    `<epic-page epic="demo" title="Demo"><epic-section id="decisions" kind="questions">` +
    `<epic-item id="j9" title="Which colours?" status="open" state="attention"></epic-item>` +
    `<epic-item id="q9" title="Which names?" status="decided"></epic-item>` +
    `<epic-item id="i9" title="A dropped idea" status="canceled"></epic-item>` +
    `</epic-section><p>${marks}</p></epic-page>`
  )
}

// epic `epic-engine` P45 (Owen, 2026-10-25):  "`<epic-mark link>` for rendering the I126 mark"
describe("<epic-mark>", () => {
  test("its item's id in capitals, a link landing on it, the item's title its tooltip;  passes axe", async () => {
    const root = await ElementFixture.render(page(`<epic-mark item="j9" link></epic-mark>`))
    const mark = root.querySelector("epic-mark")!
    const chip = chipOf(mark)
    expect(chip.localName).toBe("a")
    expect([chip.textContent, chip.getAttribute("href"), chip.title]).toEqual(["J9", "#j9", "Which colours?"])
    await expectAccessible(mark)
  })

  test("in its item's state colour:  `state`, else its status's (decided green, canceled grey)", async () => {
    const root = await ElementFixture.render(
      page(`<epic-mark item="j9" link></epic-mark> <epic-mark item="Q9"></epic-mark> <epic-mark item="i9"></epic-mark>`)
    )
    const chips = Array.from(root.querySelectorAll("epic-mark"), chipOf)
    expect(chips.map((chip) => chip.dataset.state)).toEqual(["attention", "recent", "old"])
    // without `link`, the chip alone
    expect(chips[1]!.localName).toBe("span")
    // each state its own colour, from the page's tokens
    const fills = new Set(chips.map((chip) => getComputedStyle(chip).backgroundColor))
    expect(fills.size).toBe(3)
  })

  test("follows its item:  a state changed on the page recolours it", async () => {
    const root = await ElementFixture.render(page(`<epic-mark item="j9" link></epic-mark>`))
    root.querySelector("#j9")!.setAttribute("state", "progress")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(chipOf(root.querySelector("epic-mark")!).dataset.state).toBe("progress")
  })

  test("an id the page doesn't have:  `:state(missing)`, the accent colour, saying so", async () => {
    const root = await ElementFixture.render(page(`<epic-mark item="t4" link></epic-mark>`))
    const mark = root.querySelector("epic-mark")!
    expect(mark.matches(":state(missing)")).toBe(true)
    expect(chipOf(mark).dataset.state).toBeUndefined()
    expect(chipOf(mark).title).toBe("Not on this page:  T4")
  })
})
