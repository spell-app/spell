import { describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/ui/components/ui-section"
import "spell/epic/components/epic-overview"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-summary"
import "spell/epic/components/epic-prompt"
import "spell/epic/components/epic-item"

/** `host`'s inner `<ui-section>`. */
function inner(host: Element): E.DOMElement {
  return host.shadowRoot!.querySelector("ui-section") as E.DOMElement
}

describe("<epic-overview>", () => {
  test("`1. Overview`:  the summary, the Kickoff prompt FOLDED, the estimate, then its sub-sections;  axe", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview" estimate="4h in all, 2h left" open>` +
        `<p slot="summary">Summary</p><blockquote slot="prompt"><p>Prompt</p></blockquote>` +
        `<epic-section id="o1" kind="overview-part" title="Structure"><p>Hello</p></epic-section></epic-overview>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    const shadow = host.shadowRoot!
    const header = inner(host).shadowRoot!.querySelector('[part~="header"] slot') as HTMLSlotElement
    expect(
      header
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent)
        .join("")
    ).toBe("1. Overview")
    const prompt = shadow.querySelector<HTMLDetailsElement>('[part~="prompt"]')!
    expect({ open: prompt.open, title: prompt.querySelector("summary")!.textContent }).toEqual({
      open: false,
      title: "Kickoff prompt"
    })
    expect(host.querySelector("blockquote")!.assignedSlot).toBe(prompt.querySelector("slot"))
    expect(shadow.querySelector('[part~="estimate"]')!.textContent!.replace(/\s+/g, " ").trim()).toBe(
      "Estimate: 4h in all, 2h left"
    )
    expect(host.querySelector('p[slot="summary"]')!.assignedSlot).not.toBeNull()
    const part = host.querySelector("epic-section")!
    await inner(part).ready
    await ElementFixture.tick()
    expect(part.shadowRoot!.querySelector(".number")!.textContent).toBe("1.1")
    await expectAccessible(host)
  })

  test("`<epic-summary>` and `<epic-prompt>` (P14) are drawn where the slots were:  summary, prompt, estimate, sub-sections", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview" estimate="4h in all, 2h left" open>` +
        `<epic-summary>Summary</epic-summary><epic-prompt><p>Prompt</p></epic-prompt>` +
        `<epic-section id="o1" kind="overview-part" title="Structure"><p>Hello</p></epic-section></epic-overview>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    const shadow = host.shadowRoot!
    const top = (element: Element) => element.getBoundingClientRect().top
    const [summary, prompt, part] = ["epic-summary", "epic-prompt", "epic-section"].map((tag) =>
      host.querySelector(tag)!
    )
    const estimate = shadow.querySelector('[part~="estimate"]')!
    expect([top(summary) < top(prompt), top(prompt) < top(estimate), top(estimate) < top(part)]).toEqual([
      true,
      true,
      true
    ])
    // the overview's own fold for an older doc's prompt isn't drawn:  `<epic-prompt>` folds itself
    expect(shadow.querySelector('[part~="prompt"]')).toBeNull()
    await expectAccessible(host)
  })

  test("an older doc's slots keep their places too:  summary, prompt, estimate, sub-sections", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview" estimate="4h" open><p slot="summary">S</p>` +
        `<blockquote slot="prompt"><p>P</p></blockquote>` +
        `<epic-section id="o1" kind="overview-part" title="Structure"><p>Hello</p></epic-section></epic-overview>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    const shadow = host.shadowRoot!
    const top = (element: Element) => element.getBoundingClientRect().top
    const [summary, prompt, estimate] = [
      host.querySelector('[slot="summary"]')!,
      shadow.querySelector('[part~="prompt"]')!,
      shadow.querySelector('[part~="estimate"]')!
    ]
    expect([
      top(summary) < top(prompt),
      top(prompt) < top(estimate),
      top(estimate) < top(host.querySelector("epic-section")!)
    ]).toEqual([true, true, true])
  })

  test("no prompt, no estimate:  neither is drawn", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview" open><p slot="summary">S</p></epic-overview>`
    )
    await ElementFixture.settle(host)
    expect(host.shadowRoot!.querySelector('[part~="prompt"], [part~="estimate"]')).toBeNull()
  })
})

// epic `epic-workflow` P25:  the page's own buttons in the title row, where the docs runtime puts the bullhorn too
describe("<epic-overview> actions slot", () => {
  // P25:  the page's own buttons at the title's end, before its fold
  test('`slot="actions"`:  at the title\'s end, the chevron at its start;  a click never folds it', async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview"><button slot="actions" aria-label="Copy">C</button></epic-overview>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    expect(button.assignedSlot?.getAttribute("name")).toBe("actions")
    const chevron = inner(host).shadowRoot!.querySelector('[part~="fold-icon"]')!
    // the chevron at the row's start (Owen, 2026-10-25:  "put it on the left"), the page's buttons at its end
    expect(chevron.getBoundingClientRect().right).toBeLessThanOrEqual(button.getBoundingClientRect().left + 0.5)
    // its title in full, folded or open:  no tooltip (Owen, 2026-10-19;  J183's tooltip before)
    expect(host.shadowRoot!.querySelector(".header")!.hasAttribute("title")).toBe(false)
    button.click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
  })
})

// epic `epic-engine` I161 (Owen, 2026-10-29:  "holding down option is 'expand all'"):  no toggle-all in the row
describe("<epic-overview> ⌥-click", () => {
  test("folded:  the page's own buttons after the chevron;  ⌥-click on the chevron opens it, its parts and items", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-overview id="overview"><button slot="actions" aria-label="Copy">C</button>` +
        `<epic-summary>Summary</epic-summary>` +
        `<epic-section id="o1" kind="overview-part" title="Structure"><p>Hello</p>` +
        `<epic-item id="q1" title="Which?" status="open"><p>Which?</p></epic-item></epic-section></epic-overview>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    expect(host.shadowRoot!.querySelector('[part~="toggle-all"]')).toBeNull()
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    const chevron = inner(host).shadowRoot!.querySelector('[part~="fold-icon"]')!
    expect(chevron.getBoundingClientRect().right).toBeLessThanOrEqual(button.getBoundingClientRect().left + 0.5)
    const toggle = inner(host).shadowRoot!.querySelector<HTMLButtonElement>('[part~="toggle"]')!
    expect(toggle.title).toBe("Open this section\n⌥-click:  open everything inside")
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
    const part = host.querySelector("epic-section")!
    const item = host.querySelector("epic-item")!
    await vi.waitFor(() => expect(item.matches(":state(open)")).toBe(true))
    expect([host.matches(":state(open)"), part.matches(":state(open)")]).toEqual([true, true])
    await expectAccessible(host)
  })
})
