import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-state-filter"

/** Its chips, as they read:  `state:count`, `+` while pressed. */
function chips(host: Element): string[] {
  return Array.from(
    host.shadowRoot!.querySelectorAll<HTMLButtonElement>("button"),
    (chip) => `${chip.dataset.state}:${chip.textContent}${chip.getAttribute("aria-pressed") === "true" ? "+" : ""}`
  )
}

/** Its `state` chip. */
function chip(host: Element, state: string): HTMLButtonElement {
  return host.shadowRoot!.querySelector<HTMLButtonElement>(`button[data-state="${state}"]`)!
}

afterEach(() => vi.restoreAllMocks())

describe("<epic-state-filter>", () => {
  test("a chip per state with any, in the filter's order, its colour;  all solid with no `shown`;  axe", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="recent:3 attention:1 old:0 progress:2"></epic-state-filter>`
    )
    // `progress` has no chip:  it counts in the one blue badge (Owen, 2026-10-25:  "just need one blue badge for all things submitted")
    expect(chips(host)).toEqual(["attention:1+", "recent:3+"])
    expect(host.shadowRoot!.querySelector(".marked")!.textContent).toBe("2")
    // `handled` counts in the one grey chip, with `old` (Owen, 2026-10-26:  "why are there two grey pills?")
    const grey = await ElementFixture.render(`<epic-state-filter counts="old:3 handled:2 open:1"></epic-state-filter>`)
    expect(chips(grey)).toEqual(["open:1+", "old:5+"])
    expect(chip(host, "attention").dataset.color).toBe("red")
    expect(chip(host, "attention").title).toBe("1 needs attention:  show only these\n⌥-click:  show only these")
    expect(host.shadowRoot!.querySelector('[part~="base"]')!.getAttribute("role")).toBe("group")
    await expectAccessible(host)
  })

  // epic `epic-engine` I157, recoloured in I170 (Owen, 2026-10-29:  "this doesn't match our other colors")
  test("a phase's states (`phases`):  Owen's order and colours, scheduled dotted, working in the blue badge", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter phases counts="old:40 recent:2 scheduled:5 progress:1 updated:3 attention:1" ` +
        `shown="attention updated scheduled progress"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["attention:1+", "updated:3+", "scheduled:5+", "recent:2", "old:40"])
    const looks = ["attention", "updated", "scheduled", "recent", "old"].map(
      (state) =>
        `${chip(host, state).dataset.color}${chip(host, state).dataset.fill ? ` ${chip(host, state).dataset.fill}` : ""}`
    )
    expect(looks).toEqual(["red", "orange", "blue dotted", "green", "grey"])
    // working counts in the one blue badge, as an item's `progress`
    const badge = host.shadowRoot!.querySelector<HTMLElement>(".marked")!
    expect([badge.textContent, badge.title]).toEqual([
      "1",
      "1 with Claude:  under way, being worked on, or marked in this pass"
    ])
    expect(chip(host, "attention").title).toBe(
      "1 need you:  a plan to accept, or a choice open:  hide these\n⌥-click:  show only these"
    )
    expect(chip(host, "updated").title).toBe("3 changed since you looked:  hide these\n⌥-click:  show only these")
    expect(chip(host, "scheduled").title).toBe("5 scheduled, not running yet:  hide these\n⌥-click:  show only these")
    expect(chip(host, "recent").title).toBe("2 done in the last 3 days:  show these too\n⌥-click:  show only these")
    expect(chip(host, "old").title).toBe("40 done a while ago:  show these too\n⌥-click:  show only these")
    // the dotted chip:  its outline dotted, never filled, its count in its blue
    const dotted = getComputedStyle(chip(host, "scheduled"))
    expect([dotted.borderTopStyle, dotted.backgroundColor, dotted.color === dotted.borderTopColor]).toEqual([
      "dotted",
      "rgba(0, 0, 0, 0)",
      true
    ])
    // without `phases`, the same names are an item's:  its own words, no dotted chip
    const items = await ElementFixture.render(`<epic-state-filter counts="attention:1 recent:2"></epic-state-filter>`)
    expect(chip(items, "attention").title).toBe("1 needs attention:  show only these\n⌥-click:  show only these")
    await expectAccessible(host)
  })

  test('`shown` presses those;  `""` presses none;  no counts, nothing drawn', async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="open:2 recent:1" shown="recent"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["open:2", "recent:1+"])
    expect(chip(host, "open").title).toBe("2 open, still undecided:  show everything\n⌥-click:  show only these")
    host.setAttribute("shown", "")
    await ElementFixture.settle()
    expect(chips(host)).toEqual(["open:2", "recent:1"])
    const empty = await ElementFixture.render(`<epic-state-filter></epic-state-filter>`)
    expect(empty.shadowRoot!.querySelector("button")).toBeNull()
  })

  test("a click says what was picked and what should show next, by the one rule;  it filters nothing itself", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="attention:1 open:2 recent:3"></epic-state-filter>`
    )
    const heard = vi.fn()
    host.addEventListener("epic-state-changed", (event) => heard((event as CustomEvent).detail))
    chip(host, "open").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["open"], how: "click" })
    // controlled:  still all pressed until its owner sets `shown`
    expect(chips(host)).toEqual(["attention:1+", "open:2+", "recent:3+"])
    host.setAttribute("shown", "open")
    await ElementFixture.settle()
    chip(host, "attention").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "attention", shown: ["attention", "open"], how: "click" })
    chip(host, "open").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["attention", "open", "recent"], how: "click" })
  })

  // epic `epic-engine` I166 (Owen, 2026-10-29:  "if I option-click on one of those badges, turn just that one on")
  test('an ⌥-click shows ONLY its state, whatever showed:  `how: "only"`', async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="attention:1 open:2 recent:3" shown="attention open"></epic-state-filter>`
    )
    const heard = vi.fn()
    host.addEventListener("epic-state-changed", (event) => heard((event as CustomEvent).detail))
    // hidden:  a plain click would show it too
    altClick(chip(host, "recent"))
    expect(heard).toHaveBeenLastCalledWith({ state: "recent", shown: ["recent"], how: "only" })
    // showing, with another:  a plain click would hide it
    altClick(chip(host, "open"))
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["open"], how: "only" })
    // the grey chip is `old` and `handled` both
    const grey = await ElementFixture.render(`<epic-state-filter counts="open:1 old:1 handled:2"></epic-state-filter>`)
    grey.addEventListener("epic-state-changed", (event) => heard((event as CustomEvent).detail))
    altClick(chip(grey, "old"))
    expect(heard).toHaveBeenLastCalledWith({ state: "old", shown: ["old", "handled"], how: "only" })
  })

  // epic `epic-engine` P43 (Owen, 2026-10-25:  "a blue badge with dotted outline to the left")
  test("`marked`:  a solid blue badge first, left of the chips, not a button;  alone when no chip is left;  axe", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="open:2 recent:1" shown="recent" marked="3"></epic-state-filter>`
    )
    const badge = host.shadowRoot!.querySelector<HTMLElement>('[part~="marked"]')!
    expect(badge.localName).toBe("span")
    expect(badge.parentElement!.firstElementChild).toBe(badge)
    expect([badge.textContent, badge.title]).toEqual(["3", "3 with Claude:  marked in this pass, or being worked on"])
    expect(getComputedStyle(badge).borderTopStyle).toBe("solid")
    expect(getComputedStyle(badge).color).toBe("rgb(255, 255, 255)")
    expect(chips(host)).toEqual(["open:2", "recent:1+"])
    await expectAccessible(host)
    // every item marked:  the badge alone;  none marked, no badge
    host.setAttribute("counts", "")
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector('[part~="marked"]')!.textContent).toBe("3")
    expect(chips(host)).toEqual([])
    host.setAttribute("counts", "open:2")
    host.setAttribute("marked", "0")
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelector('[part~="marked"]')).toBeNull()
  })
})

describe("<epic-hidden-note>", () => {
  test("`3 hidden · show all`, its tooltip;  a click asks to show all;  axe", async () => {
    const host = await ElementFixture.render(`<epic-hidden-note count="3"></epic-hidden-note>`)
    const button = host.shadowRoot!.querySelector("button")!
    expect([button.textContent, button.title]).toEqual(["3 hidden · show all", "Show everything:  clear the filter"])
    const heard = vi.fn()
    host.addEventListener("epic-all-showing", heard)
    button.click()
    expect(heard).toHaveBeenCalledOnce()
    await expectAccessible(host)
  })
})

/** An ⌥-click (Alt-click) on `element`. */
function altClick(element: Element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
}
