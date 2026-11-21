import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-state-filter"

/** Its chips, as they read:  `state:count`, `+` while pressed. */
function chips(host: Element): string[] {
  return Array.from(
    host.shadowRoot!.querySelectorAll<HTMLButtonElement>("button:not(.marked)"),
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
    const quiet = await ElementFixture.render(
      `<epic-state-filter counts="handed:2 progress:1 quiet:3 old:1 requested:1"></epic-state-filter>`
    )
    // One Color Each (epic `epic-engine` P63):  a Do this in the blue badge, calm calls in the grey chip;  light orange
    // drawn as orange (I347:  "Lump the light orange icons in with the orange")
    expect(quiet.shadowRoot!.querySelector(".marked")!.textContent).toBe("3")
    expect(chip(quiet, "old").textContent).toBe("4")
    expect(chip(quiet, "requested").dataset.color).toBe("orange")
    // with orange too:  ONE orange chip, counting both, led by `replied`
    const oranges = await ElementFixture.render(
      `<epic-state-filter counts="replied:4 requested:2 open:8"></epic-state-filter>`
    )
    expect(chips(oranges)).toEqual(["replied:6+", "open:8+"])
    expect(chip(oranges, "replied").dataset.tooltip).toContain("6 ")
    const grey = await ElementFixture.render(`<epic-state-filter counts="old:3 handled:2 open:1"></epic-state-filter>`)
    expect(chips(grey)).toEqual(["open:1+", "old:5+"])
    expect(chip(host, "attention").dataset.color).toBe("red")
    expect(chip(host, "attention").dataset.tooltip).toBe("1 urgent\nHide these · ⌥-click:  only these")
    expect(host.shadowRoot!.querySelector('[part~="base"]')!.getAttribute("role")).toBe("group")
    await expectAccessible(host)
  })

  // epic `epic-engine` I157, recoloured in I170 (Owen, 2026-10-29:  "this doesn't match our other colors");  ONE blue
  // badge in I260 (Owen, 2026-11-11:  "These should just be one set, confusing to have 2 blues")
  test("a phase's states (`phases`):  Owen's order and colours;  under way AND scheduled in the one blue badge", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter phases counts="old:40 recent:2 scheduled:5 progress:1 updated:3 attention:1" ` +
        `shown="attention updated scheduled progress"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["attention:1+", "updated:3+", "recent:2", "old:40"])
    const looks = ["attention", "updated", "recent", "old"].map((state) => chip(host, state).dataset.color)
    expect(looks).toEqual(["red", "orange", "green", "grey"])
    // working and scheduled count in the one blue badge, pressed while they show
    const badge = host.shadowRoot!.querySelector<HTMLElement>(".marked")!
    expect([badge.textContent, badge.dataset.tooltip, badge.getAttribute("aria-pressed")]).toEqual([
      "6",
      "6 under way, scheduled or marked\nHide these · ⌥-click:  only these",
      "true"
    ])
    expect(chip(host, "attention").dataset.tooltip).toBe("1 blocked on a choice\nHide these · ⌥-click:  only these")
    expect(chip(host, "updated").dataset.tooltip).toBe("3 changed since you looked\nHide these · ⌥-click:  only these")
    expect(chip(host, "recent").dataset.tooltip).toBe(
      "2 done in the last 3 days\nShow these too · ⌥-click:  only these"
    )
    expect(chip(host, "old").dataset.tooltip).toBe("40 done a while ago\nShow these too · ⌥-click:  only these")
    // only scheduled phases, none under way:  the badge still counts them, and its click toggles them
    const scheduled = await ElementFixture.render(
      `<epic-state-filter phases counts="scheduled:4 old:2" shown="old"></epic-state-filter>`
    )
    const blue = scheduled.shadowRoot!.querySelector<HTMLElement>(".marked")!
    expect([blue.textContent, blue.getAttribute("aria-pressed")]).toEqual(["4", "false"])
    const picks: unknown[] = []
    scheduled.addEventListener("epic-state-changed", (event) => picks.push((event as CustomEvent).detail.shown))
    blue.click()
    expect(picks).toEqual([["scheduled", "old", "handled", "quiet"]])
    // without `phases`, the same names are an item's:  its own words
    const items = await ElementFixture.render(`<epic-state-filter counts="attention:1 recent:2"></epic-state-filter>`)
    expect(chip(items, "attention").dataset.tooltip).toBe("1 urgent\nHide these · ⌥-click:  only these")
    await expectAccessible(host)
  })

  // epic `epic-engine` I263 (Owen, 2026-11-13:  "This is confusing -- two orange pills on top")
  test("phases:  ONE chip a colour:  waiting and updated one orange, paused and done long ago one grey", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter phases counts="waiting:1 updated:1 recent:1 paused:1 old:71"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["waiting:2+", "paused:72+", "recent:1+"])
    expect(chip(host, "waiting").dataset.tooltip).toBe(
      "2 with a plan to accept;  changed since you looked\nHide these · ⌥-click:  only these"
    )
    const picks: unknown[] = []
    host.addEventListener("epic-state-changed", (event) => picks.push((event as CustomEvent).detail.shown))
    chip(host, "waiting").click()
    chip(host, "paused").click()
    altClick(chip(host, "paused"))
    expect(picks).toEqual([
      ["paused", "old", "recent", "handled", "quiet"],
      ["waiting", "updated", "recent"],
      ["paused", "old", "handled", "quiet"]
    ])
  })

  test('`shown` presses those;  `""` presses none;  no counts, nothing drawn', async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="open:2 recent:1" shown="recent"></epic-state-filter>`
    )
    expect(chips(host)).toEqual(["open:2", "recent:1+"])
    expect(chip(host, "open").dataset.tooltip).toBe("2 undecided\nShow everything · ⌥-click:  only these")
    host.setAttribute("shown", "")
    await ElementFixture.settle()
    expect(chips(host)).toEqual(["open:2", "recent:1"])
    const empty = await ElementFixture.render(`<epic-state-filter></epic-state-filter>`)
    expect(empty.shadowRoot!.querySelector("button")).toBeNull()
    // one colour is all there is:  the tooltip doesn't claim to hide it
    const alone = await ElementFixture.render(`<epic-state-filter counts="open:2"></epic-state-filter>`)
    expect(chip(alone, "open").dataset.tooltip).toBe("2 undecided\nNothing else to show · ⌥-click:  only these")
  })

  test("a click says what was picked and what should show next, by the one rule;  it filters nothing itself", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="attention:1 open:2 recent:3"></epic-state-filter>`
    )
    const heard = vi.fn()
    host.addEventListener("epic-state-changed", (event) => heard((event as CustomEvent).detail))
    chip(host, "open").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["attention", "recent"], how: "click" })
    // controlled:  still all pressed until its owner sets `shown`
    expect(chips(host)).toEqual(["attention:1+", "open:2+", "recent:3+"])
    host.setAttribute("shown", "open")
    await ElementFixture.settle()
    chip(host, "attention").click()
    expect(heard).toHaveBeenLastCalledWith({ state: "attention", shown: ["attention", "open"], how: "click" })
    chip(host, "open").click()
    // the last one showing:  the next one instead
    expect(chip(host, "open").dataset.tooltip).toBe("2 undecided\nShow the next ones instead · ⌥-click:  only these")
    expect(heard).toHaveBeenLastCalledWith({ state: "open", shown: ["recent"], how: "click" })
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
    expect(heard).toHaveBeenLastCalledWith({ state: "old", shown: ["old", "handled", "quiet"], how: "only" })
  })

  // epic `epic-engine` P43 (Owen, 2026-10-25:  "a blue badge with dotted outline to the left")
  test("`marked`:  the blues' chip, first, a toggle:  solid on, outlined off;  alone when no chip is left;  axe", async () => {
    const host = await ElementFixture.render(
      `<epic-state-filter counts="open:2 recent:1" marked="3"></epic-state-filter>`
    )
    const badge = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="marked"]')!
    expect(badge.localName).toBe("button")
    expect(badge.parentElement!.firstElementChild).toBe(badge)
    expect([badge.textContent, badge.dataset.tooltip]).toEqual([
      "3",
      "3 with Claude\nHide these · ⌥-click:  only these"
    ])
    expect(badge.getAttribute("aria-pressed")).toBe("true")
    expect(getComputedStyle(badge).borderTopStyle).toBe("solid")
    expect(getComputedStyle(badge).color).toBe("rgb(255, 255, 255)")
    const heard = vi.fn()
    host.addEventListener("epic-state-changed", (event) => heard((event as CustomEvent).detail))
    badge.click()
    expect(heard).toHaveBeenLastCalledWith({ state: "progress", shown: ["open", "recent"], how: "click" })
    altClick(badge)
    expect(heard).toHaveBeenLastCalledWith({ state: "progress", shown: ["progress"], how: "only" })
    // the blues off:  outlined, as every chip
    host.setAttribute("shown", "recent")
    await ElementFixture.settle()
    expect(badge.getAttribute("aria-pressed")).toBe("false")
    expect(getComputedStyle(badge).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
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
  test("`3 hidden · show all`, no tooltip;  a click asks to show all;  axe", async () => {
    const host = await ElementFixture.render(`<epic-hidden-note count="3"></epic-hidden-note>`)
    const button = host.shadowRoot!.querySelector("button")!
    expect([button.textContent, button.dataset.tooltip]).toEqual(["3 hidden · show all", undefined])
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
