import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-epic/components/epic-state-filter"

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
    expect(chips(host)).toEqual(["progress:2+", "attention:1+", "recent:3+"])
    expect(chip(host, "attention").dataset.color).toBe("red")
    expect(chip(host, "attention").title).toBe("1 needs attention:  show only these")
    expect(host.shadowRoot!.querySelector('[part~="base"]')!.getAttribute("role")).toBe("group")
    await expectAccessible(host)
  })

  test('`shown` presses those;  `""` presses none;  no counts, nothing drawn', async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="open:2 recent:1" shown="recent"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["open:2", "recent:1+"])
    expect(chip(host, "open").title).toBe("2 open, still undecided:  show everything")
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
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["open"] })
    // controlled:  still all pressed until its owner sets `shown`
    expect(chips(host)).toEqual(["attention:1+", "open:2+", "recent:3+"])
    host.setAttribute("shown", "open")
    await ElementFixture.settle()
    chip(host, "attention").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "attention", shown: ["attention", "open"] })
    chip(host, "open").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["attention", "open", "recent"] })
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
