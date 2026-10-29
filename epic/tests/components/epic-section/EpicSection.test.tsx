import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { E, UI } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { expandAllUnder } from "spell/epic/components/epic-item/Fold"

import "spell/ui/components/ui-section"
// the gear menus (I166)
import "spell/ui/components/ui-dropdown"
import "spell/ui/components/ui-button"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-item"
import "spell/epic/components/epic-commit"
import "spell/epic/components/epic-event"
import "spell/epic/components/epic-aside"

/** Fixture parts the test server serves:  `fixtures/` beside this file, by its URL path. */
const FIXTURES = new URL("fixtures", import.meta.url).pathname

/** A folding element's host, with its source API. */
type FoldHost = E.DOMElement & { load(): Promise<void> }

/** `host`'s inner `<ui-section>`. */
function inner(host: Element): E.DOMElement {
  return host.shadowRoot!.querySelector("ui-section") as E.DOMElement
}

/** The fold button of `host`'s inner section. */
function toggle(host: Element): HTMLButtonElement {
  return inner(host).shadowRoot!.querySelector('[part~="toggle"]') as HTMLButtonElement
}

/** `host`'s gear (I166), drawn. */
async function gearOf(host: Element): Promise<E.DOMElement> {
  const gear = host.shadowRoot!.querySelector<E.DOMElement>('[part~="gear"]')!
  await gear.ready
  return gear
}

/** Each entry of `gear`'s menu, `<text>:  on` (ticked) or `off`. */
function gearEntries(gear: Element): string[] {
  return Array.from(
    gear.querySelectorAll("ui-item"),
    (item) => `${item.textContent!.trim()}:  ${item.getAttribute("icon") === "check" ? "on" : "off"}`
  )
}

/** Open `gear`'s menu and pick the entry saying `text`, as a person does. */
async function pickGear(gear: E.DOMElement, text: string) {
  gear.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click()
  await ElementFixture.tick()
  const rows = Array.from(gear.shadowRoot!.querySelectorAll<HTMLElement>('[part~="item"]'))
  rows.find((row) => row.textContent!.includes(text))!.click()
  await ElementFixture.tick()
  await ElementFixture.tick()
}

/** An ⌥-click (Alt-click) on `element`:  everything inside too (I161). */
function altClick(element: Element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
}

/** The title text of `host`, as drawn:  its inner section's header, through every slot. */
function titleText(host: Element): string {
  const header = inner(host).shadowRoot!.querySelector('[part~="header"]')!
  return flatText(header).replace(/\s+/g, " ").trim()
}

/** `node`'s text in the FLAT tree:  a slot's assigned nodes (else its fallback), a host's shadow root. */
function flatText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
  if (!(node instanceof Element)) return ""
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes()
    return (assigned.length ? assigned : Array.from(node.childNodes)).map(flatText).join("")
  }
  return Array.from((node.shadowRoot ?? node).childNodes, flatText).join("")
}

/** Render `html`, wait for it and its inner sections. */
async function render(html: string): Promise<FoldHost> {
  const root = await ElementFixture.render<FoldHost>(html)
  const host = root.localName === "epic-section" ? root : root.querySelector<FoldHost>("epic-section")!
  await ElementFixture.settle(host.parentElement!)
  for (const fold of [host, ...host.parentElement!.querySelectorAll("epic-section")]) await inner(fold)?.ready
  await ElementFixture.tick()
  return host
}

afterEach(() => {
  UI.sources.forget()
})

describe("<epic-section>", () => {
  test("a REPORT:  titled its own, UNNUMBERED, on the section band;  the sections after it keep their numbers", async () => {
    const host = await render(
      `<div><epic-section id="overnight" kind="report" title="Overnight · 2026-10-04"><p>The night.</p></epic-section>` +
        `<epic-section id="phases" kind="phases"></epic-section></div>`
    )
    const phases = host.parentElement!.querySelector<FoldHost>("#phases")!
    expect([titleText(host), titleText(phases)]).toEqual(["Overnight · 2026-10-04", "1. Phases"])
    expect((host as unknown as { contentsEntry: unknown }).contentsEntry).toEqual({ label: "Overnight · 2026-10-04" })
    expect(getComputedStyle(host).getPropertyValue("--_epic-fold-band")).toBe(
      getComputedStyle(phases).getPropertyValue("--_epic-fold-band")
    )
    await expectAccessible(host)
  })

  test("draws its numbered title, no tooltip;  starts FOLDED, a grey rule under its title bar and no gap below", async () => {
    const host = await render(
      `<div><epic-section id="phases" kind="phases"></epic-section>` +
        `<epic-section id="decisions" kind="questions"><p>An item</p></epic-section></div>`
    )
    const questions = host.parentElement!.querySelector<FoldHost>("#decisions")!
    expect(titleText(host)).toBe("1. Phases")
    expect(titleText(questions)).toBe("2. Questions")
    expect(inner(questions).hasAttribute("info")).toBe(false)
    expect(host.matches(":state(open)")).toBe(false)
    expect(inner(host).getAttribute("open")).toBe("false")
    // the rule is the title bar's, in the page's column, never the host's edge to edge (r42)
    const style = getComputedStyle(host)
    const bar = getComputedStyle(inner(host).shadowRoot!.querySelector("[part~=title]")!)
    expect({ rule: bar.borderBottomWidth, hostRule: style.borderBottomWidth, gap: style.marginBottom }).toEqual({
      rule: "1px",
      hostRule: "0px",
      gap: "0px"
    })
  })

  test("a click on its title goes through the host's cancelable `ui-opening`;  open, a gap below and no rule", async () => {
    const host = await render(`<epic-section id="decisions" kind="questions"><p>An item</p></epic-section>`)
    const opens: boolean[] = []
    let veto = true
    host.addEventListener("ui-opening", (event) => {
      opens.push(event.cancelable)
      if (veto) event.preventDefault()
    })
    toggle(host).click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
    veto = false
    toggle(host).click()
    await ElementFixture.tick()
    expect(opens).toEqual([true, true])
    expect(host.matches(":state(open)")).toBe(true)
    expect(inner(host).getAttribute("open")).not.toBe("false")
    const style = getComputedStyle(host)
    expect({ rule: style.borderBottomStyle, gap: style.marginBottom }).toEqual({ rule: "none", gap: "28px" })
    await expectAccessible(host)
  })

  test("shows its prose through its slots:  an Overview sub-section's title, markup and all", async () => {
    const host = await render(
      `<epic-section id="o2" kind="overview-part" open><span slot="title">The <code>x</code> API</span><p>Hello</p></epic-section>`
    )
    expect(titleText(host)).toBe("1.1 The x API")
    expect(host.querySelector("p")!.assignedSlot).not.toBeNull()
  })

  test("an Overview sub-section's status cards from Claude (P13) go to its `status` slot, after its prose", async () => {
    const host = await render(
      `<epic-section id="o2" kind="overview-part" title="Why" open>` +
        `<epic-status slot="status" state="done" at="2026-10-08 14:20"><p>Said more</p></epic-status><p>Prose</p>` +
        `</epic-section>`
    )
    const [prose, card] = [host.querySelector(":scope > p")!, host.querySelector("epic-status")!]
    expect(card.assignedSlot!.name).toBe("status")
    expect(
      prose.assignedSlot!.compareDocumentPosition(card.assignedSlot!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  test("loads its `source` part into its LIGHT children the first time it opens, and fires `ui-loaded`", async () => {
    const host = await render(`<epic-section id="log" kind="log" source="${FIXTURES}/part.html"></epic-section>`)
    const loads: string[] = []
    host.addEventListener("ui-loaded", (event) => loads.push((event as CustomEvent<{ source: string }>).detail.source))
    expect(host.querySelector("p.body")).toBeNull()
    toggle(host).click()
    await host.load()
    await ElementFixture.tick()
    expect(host.querySelector(":scope > p.body")!.textContent).toBe("A body, from its part file.")
    expect(loads).toEqual([`${FIXTURES}/part.html`])
    expect(host.matches(":state(loaded)")).toBe(true)
    expect(inner(host).getAttribute("open")).not.toBe("false")
  })

  test("a part that can't load says so, in place of the body", async () => {
    const host = await render(`<epic-section id="log" kind="log" source="${FIXTURES}/missing.html"></epic-section>`)
    host.addEventListener("ui-error", () => undefined)
    toggle(host).click()
    await host.load().catch(() => undefined)
    await ElementFixture.tick()
    await ElementFixture.tick()
    const note = host.shadowRoot!.querySelector('[part~="note"]')
    expect(note?.textContent).toBe(`Couldn't load ${FIXTURES}/missing.html.`)
    expect(host.matches(":state(error)")).toBe(true)
  })

  test("an item section with no items says None yet", async () => {
    const host = await render(`<epic-section id="todos" kind="todos" open></epic-section>`)
    expect(host.shadowRoot!.querySelector('[part~="empty"]')?.textContent).toBe("None yet")
  })

  // epic `epic-engine` I166 (Owen, 2026-10-29:  "we can change the 'expand all' to a gear icon which shows menu")
  test("the Phases title's GEAR, last on its row:  its menu shows or hides each phase's files and checks", async () => {
    const host = await render(`<epic-section id="phases" kind="phases" open></epic-section>`)
    const base = host.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
    const gear = await gearOf(host)
    expect(host.shadowRoot!.querySelector("button.toggle")).toBeNull()
    expect(gear.title).toBe("Settings for every phase")
    expect(gear.closest('[part~="tools"]')!.lastElementChild).toBe(gear)
    expect(gearEntries(gear)).toEqual(["Show each phase's files:  off", "Show each phase's checks:  off"])
    // nothing ticked:  the check's column still kept (Owen, 2026-10-29:  "Menu should have space in the left where the
    // check should go, even if nothing checked")
    gear.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click()
    await ElementFixture.tick()
    const firstRow = gear.shadowRoot!.querySelector<HTMLElement>('[part~="item"]')!
    const indent = firstRow.querySelector(".text")!.getBoundingClientRect().left - firstRow.getBoundingClientRect().left
    expect(indent).toBeGreaterThan(30)
    gear.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click()
    await ElementFixture.tick()
    expect(base.style.getPropertyValue("--epic-files-display")).toBe("")
    await pickGear(gear, "Show each phase's files")
    expect(base.style.getPropertyValue("--epic-files-display")).toBe("block")
    expect(gearEntries(gear)).toEqual(["Show each phase's files:  on", "Show each phase's checks:  off"])
    // a check when on, blank when off, the words lined up (Owen, 2026-10-29:  "Should be blank when off, checkmark
    // when on")
    gear.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click()
    await ElementFixture.tick()
    const rows = Array.from(gear.shadowRoot!.querySelectorAll<HTMLElement>('[part~="item"]'))
    await vi.waitFor(() => expect(rows[0]!.querySelector(".icon svg")).not.toBeNull())
    expect(rows[1]!.querySelector(".icon")).toBeNull()
    const lefts = rows.map((row) => Math.round(row.querySelector(".text")!.getBoundingClientRect().left))
    expect(lefts[0]).toBe(lefts[1])
    gear.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click()
    await ElementFixture.tick()
    // the toggles' old key:  a choice made with them holds
    expect(JSON.parse(localStorage.getItem(`epic-phase-fields:${location.pathname}`)!)).toEqual({ files: true })
    // picked again (the dropdown keeps no value):  off
    await pickGear(gear, "Show each phase's files")
    expect(base.style.getPropertyValue("--epic-files-display")).toBe("")
    // a click on it never folds the section
    expect(host.matches(":state(open)")).toBe(true)
    await expectAccessible(host)
  })

  test("a link into it (`#hash` on an id in its `part-ids`) opens it and loads its part", async () => {
    const host = await render(
      `<epic-section id="o3" kind="overview-part" title="Linked" source="${FIXTURES}/part.html" part-ids="deep"></epic-section>`
    )
    location.hash = "#deep"
    await new Promise((resolve) => window.addEventListener("hashchange", resolve, { once: true }))
    await host.load()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(true)
    expect(host.querySelector("#deep")).not.toBeNull()
    history.replaceState(null, "", location.pathname + location.search)
  })
})

////////////////
// ## Counts, the state filter, Plan changes (P10)
////////////////

/** Questions in `states` (`status:state`), ids `q1`, `q2` ... */
function questions(states: string[]): string {
  const items = states.map((pair, at) => {
    const [status, state] = pair.split(":")
    return `<epic-item id="q${at + 1}" title="Q ${at + 1}" status="${status}"${state ? ` state="${state}"` : ""}></epic-item>`
  })
  return `<epic-section id="decisions" kind="questions" open>${items.join("")}</epic-section>`
}

/** `host`'s state chips, as drawn (its `<epic-state-filter>`'s buttons). */
function chipButtons(host: Element): HTMLButtonElement[] {
  const filter = host.shadowRoot!.querySelector('[part~="filter"] epic-state-filter')
  return Array.from(filter?.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? [])
}

/** `host`'s `state` chip. */
function chip(host: Element, state: string): HTMLButtonElement {
  return chipButtons(host).find((button) => button.dataset.state === state)!
}

/** `host`'s state chips, as drawn:  `state` => pressed. */
function chips(host: Element): Record<string, boolean> {
  return Object.fromEntries(
    chipButtons(host).map((button) => [button.dataset.state!, button.getAttribute("aria-pressed") === "true"])
  )
}

/** The line under `host`'s filtered list (its `<epic-hidden-note>`'s button). */
function hiddenNote(host: Element): HTMLButtonElement {
  return host.shadowRoot!.querySelector('[part~="hidden-note"]')!.shadowRoot!.querySelector("button")!
}

/** The ids of `host`'s items that show. */
function shownIds(host: Element): string[] {
  return Array.from(host.querySelectorAll("epic-item"))
    .filter((item) => getComputedStyle(item).display !== "none")
    .map((item) => item.id)
}

// Owen, 2026-10-29 (epic `epic-engine` I155):  "epic log ... doesn't auto expand with 'expand all'"
describe("<epic-section kind=log> stays folded", () => {
  test("the page's expand-all opens every section but the Log, and nothing inside it;  its own expand() still opens it", async () => {
    const host = await render(
      `<div><epic-section id="decisions" kind="questions"><p>An item</p></epic-section>` +
        `<epic-section id="log" kind="log"><epic-section id="inside" kind="overview-part"></epic-section></epic-section></div>`
    )
    const wrap = host.parentElement!
    const log = wrap.querySelector<FoldHost>("#log")!
    const isOpen = (id: string) => wrap.querySelector(`#${id}`)!.matches(":state(open)")
    expect(expandAllUnder(wrap)).toBe(1)
    await ElementFixture.tick()
    expect([isOpen("decisions"), isOpen("log"), isOpen("inside")]).toEqual([true, false, false])
    expect((log.component as unknown as { expand(): boolean }).expand()).toBe(true)
    await ElementFixture.tick()
    expect(isOpen("log")).toBe(true)
  })
})

// epic `epic-engine` P52:  the Log is the epic's change log
describe("<epic-section kind=log> the change log", () => {
  test("its commits newest first, always shown;  its review lines (<epic-event>) not drawn", async () => {
    const host = await render(
      `<epic-section id="log" kind="log">` +
        `<epic-commit sha="aaaaaaa" at="2026-10-20T12:00-04:00">first</epic-commit>` +
        `<epic-event at="2026-10-20T12:30-04:00">P1 active</epic-event>` +
        `<epic-commit sha="bbbbbbb" at="2026-10-20T13:00-04:00">second</epic-commit>` +
        `</epic-section>`
    )
    ;(host.component as unknown as { expand(): boolean }).expand()
    await ElementFixture.tick()
    const [first, second] = Array.from(host.querySelectorAll("epic-commit"))
    expect([getComputedStyle(first!).display, getComputedStyle(second!).display]).toEqual(["block", "block"])
    expect(getComputedStyle(host.querySelector("epic-event")!).display).toBe("none")
    // newest on top
    expect(second!.getBoundingClientRect().top).toBeLessThan(first!.getBoundingClientRect().top)
  })
})

describe("<epic-section> counts and state filter", () => {
  afterEach(() => {
    localStorage.removeItem(`spell-item-state:${location.pathname}`)
  })

  // an item section shows no badge:  its chips say the numbers (Owen, 2026-10-10);  the count still follows, for the toolbar
  test("its count is `open/all`, follows an item's status as it changes, and items coming;  no badge on its title", async () => {
    const host = await render(questions(["open", "decided", "done", "open"]))
    const count = () =>
      (host as FoldHost & { contentsEntry?: { count?: { open: number; total: number } } }).contentsEntry?.count
    expect(inner(host).getAttribute("badge")).toBeNull()
    expect(count()).toMatchObject({ open: 2, total: 4 })
    host.querySelector("#q1")!.setAttribute("status", "decided")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(count()).toMatchObject({ open: 1, total: 4 })
    host.insertAdjacentHTML("beforeend", `<epic-item id="q5" title="Q 5" status="open"></epic-item>`)
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(count()).toMatchObject({ open: 2, total: 5 })
    expect(inner(host).getAttribute("badge")).toBeNull()
  })

  test("its host's `contentsEntry` (the page's rail):  label, kind icon and count, read as they are NOW", async () => {
    const host = await render(questions(["open:attention", "decided", "done"]))
    const entry = () => (host as FoldHost & { contentsEntry?: unknown }).contentsEntry
    // `attention`:  what needs Owen, the red count on the rail (Q20)
    expect(entry()).toEqual({
      label: "1. Questions",
      icon: "file circle question",
      count: { open: 1, total: 3, attention: 1, replied: 0, running: 0 }
    })
    // right after a change, before any memo or observer has caught up:  what the live update reads
    host.querySelector("#q1")!.setAttribute("status", "decided")
    host.querySelector("#q1")!.setAttribute("state", "recent")
    expect(entry()).toMatchObject({ count: { open: 0, total: 3, attention: 0 } })
    // `replied` (orange:  Claude answered with options, Owen's turn to pick) needs him too (Owen, 2026-10-09)
    host.querySelector("#q2")!.setAttribute("state", "replied")
    expect(entry()).toMatchObject({ count: { attention: 1 } })
    const part = await render(`<epic-section id="o2" kind="overview-part" title="Why"><p>Prose.</p></epic-section>`)
    expect((part as FoldHost & { contentsEntry?: unknown }).contentsEntry).toEqual({ label: "1.1 Why" })
  })

  // the Phases section's `1/2` went with its chips (epic `epic-engine` I157):  they say the numbers
  test("phases count too (open:  not done), for the rail;  no section has a badge", async () => {
    const host = await render(
      `<div><epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="active"></epic-phase></epic-section>` +
        `<epic-section id="todos" kind="todos"></epic-section>` +
        `<epic-section id="log" kind="log"></epic-section></div>`
    )
    const sections = host.parentElement!.querySelectorAll("epic-section")
    expect(Array.from(sections, (section) => inner(section).getAttribute("badge"))).toEqual([null, null, null])
    const entry = (host as FoldHost & { contentsEntry?: { count?: unknown } }).contentsEntry
    expect(entry?.count).toMatchObject({ open: 1, total: 2, running: 1 })
    // the done phase has no `done-at`:  grey;  the active one in the blue badge, no chip
    expect(chips(host)).toEqual({ old: true })
  })

  test("a chip per state its items are in, with how many, all solid;  no filter icon;  passes axe", async () => {
    const host = await render(questions(["open:attention", "open:open", "decided:old", "open"]))
    expect(chips(host)).toEqual({ attention: true, open: true, old: true })
    const counts = chipButtons(host).map((button) => button.textContent)
    expect(counts).toEqual(["1", "2", "1"])
    expect(
      host.shadowRoot!.querySelector('[part~="filter"] epic-state-filter')!.shadowRoot!.querySelector("svg")
    ).toBeNull()
    const open = chip(host, "open")
    expect(open.title).toBe("2 open, still undecided:  show only these\n⌥-click:  show only these")
    expect(getComputedStyle(open).backgroundColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    await expectAccessible(host)
  })

  test("Owen's rule:  all on, a click shows only that;  a hidden one shows too;  a shown one hides;  the last one, all again", async () => {
    const host = await render(questions(["open:attention", "open:open", "decided:recent", "open:open"]))
    const click = async (state: string) => {
      chip(host, state).click()
      await ElementFixture.tick()
    }
    await click("open")
    expect(chips(host)).toEqual({ attention: false, open: true, recent: false })
    expect(shownIds(host)).toEqual(["q2", "q4"])
    expect(hiddenNote(host).textContent).toBe("2 hidden · show all")
    // hidden, outlined:  no fill
    const red = chip(host, "attention")
    expect(getComputedStyle(red).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    expect(red.title).toBe("1 needs attention:  show these too\n⌥-click:  show only these")
    await click("attention")
    expect(chips(host)).toEqual({ attention: true, open: true, recent: false })
    await click("open")
    expect(shownIds(host)).toEqual(["q1"])
    await click("attention")
    expect(chips(host)).toEqual({ attention: true, open: true, recent: true })
    expect(shownIds(host)).toEqual(["q1", "q2", "q3", "q4"])
    // everything showing is remembered as no choice:  a state that comes later shows too
    expect(JSON.parse(localStorage.getItem(`spell-item-state:${location.pathname}`)!)).toEqual({})
  })

  // epic `epic-engine` I166 (Owen, 2026-10-29:  "if I option-click on one of those badges, turn just that one on")
  test("an ⌥-click on a chip shows ONLY its state, whatever showed;  remembered as a click's is", async () => {
    const host = await render(questions(["open:attention", "open:open", "decided:recent", "open:open"]))
    chip(host, "open").click()
    await ElementFixture.tick()
    chip(host, "attention").click()
    await ElementFixture.tick()
    expect(chips(host)).toEqual({ attention: true, open: true, recent: false })
    // showing, with another:  a plain click would hide it
    altClick(chip(host, "open"))
    await ElementFixture.tick()
    expect(chips(host)).toEqual({ attention: false, open: true, recent: false })
    expect(shownIds(host)).toEqual(["q2", "q4"])
    // hidden:  a plain click would show it too
    altClick(chip(host, "recent"))
    await ElementFixture.tick()
    expect(chips(host)).toEqual({ attention: false, open: false, recent: true })
    expect(shownIds(host)).toEqual(["q3"])
    expect(JSON.parse(localStorage.getItem(`spell-item-state:${location.pathname}`)!)).toEqual({
      decisions: ["recent"]
    })
    hiddenNote(host).click()
    await ElementFixture.tick()
  })

  test("remembered per page;  a choice its states have left hides the list, and says so", async () => {
    const host = await render(questions(["open:attention", "open:open"]))
    chip(host, "attention").click()
    await ElementFixture.tick()
    expect(JSON.parse(localStorage.getItem(`spell-item-state:${location.pathname}`)!)).toEqual({
      decisions: ["attention"]
    })
    host.remove()
    const again = await render(questions(["open:attention", "open:open"]))
    expect(shownIds(again)).toEqual(["q1"])
    // the red one answered:  nothing left to show, and the line says how to get it back
    again.querySelector("#q1")!.setAttribute("state", "recent")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(shownIds(again)).toEqual([])
    const note = hiddenNote(again)
    expect(note.textContent).toBe("2 hidden · show all")
    note.click()
    await ElementFixture.tick()
    expect(shownIds(again)).toEqual(["q1", "q2"])
  })

  test("`replied` (orange, Owen's turn to pick):  its own chip", async () => {
    const host = await render(questions(["open:replied", "open:open", "open:attention"]))
    expect(chips(host)).toEqual({ attention: true, replied: true, open: true })
    expect(chip(host, "replied").getAttribute("data-color")).toBe("orange")
  })

  // epic `epic-engine` I161 (Owen, 2026-10-29:  "holding down option is 'expand all'"):  no toggle-all button in the row
  test("⌥-click on its chevron, folded:  it and everything inside open, parts loading;  open, all fold again", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="active" source="${FIXTURES}/phase-part.html"></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="todo"><p>Later.</p></epic-phase></epic-section>`
    )
    expect(host.shadowRoot!.querySelector('[part~="toggle-all"]')).toBeNull()
    // the chevron's tooltip says what ⌥ does;  its name stays the label
    expect(toggle(host).title).toBe("Open this section\n⌥-click:  open everything inside")
    const opened: string[] = []
    host.addEventListener("ui-opening", (event) => opened.push((event.target as Element).id))
    altClick(toggle(host))
    // the phase's part loads, then the item in it opens, then its aside
    await vi.waitFor(() => expect(host.querySelector("epic-aside")?.matches(":state(open)")).toBe(true))
    const phases = Array.from(host.querySelectorAll("epic-phase"))
    const everything = () =>
      [host, ...phases, host.querySelector("epic-item")!].map((each) => each.matches(":state(open)"))
    expect(everything()).toEqual([true, true, true, true])
    // each a click's open:  the page remembers the blocks' and items' folds by these
    expect(opened).toEqual(["phases", "p1", "p2", "q7"])
    await ElementFixture.tick()
    expect(toggle(host).title).toBe("Close this section\n⌥-click:  fold everything inside")
    // open:  ⌥-click folds everything inside, then itself
    altClick(toggle(host))
    await ElementFixture.tick()
    expect([...everything(), host.querySelector("epic-aside")!.matches(":state(open)")]).toEqual([
      false,
      false,
      false,
      false,
      false
    ])
    await expectAccessible(host)
  })

  test("⌥+Enter on its focused chevron:  the same as ⌥-click", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="active"><p>Do it.</p></epic-phase></epic-section>`
    )
    const button = toggle(host)
    button.focus()
    await userEvent.keyboard("{Alt>}{Enter}{/Alt}")
    await ElementFixture.tick()
    expect([host, host.querySelector("epic-phase")!].map((each) => each.matches(":state(open)"))).toEqual([true, true])
    await userEvent.keyboard("{Alt>} {/Alt}")
    await ElementFixture.tick()
    expect([host, host.querySelector("epic-phase")!].map((each) => each.matches(":state(open)"))).toEqual([
      false,
      false
    ])
  })

  test("its title row's empty space folds it too, and shows the pointer (I161);  a plain click opens only it", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="active"><p>Do it.</p></epic-phase></epic-section>`
    )
    const heading = inner(host).shadowRoot!.querySelector<HTMLElement>('[part~="heading"]')!
    // the fold button is as wide as what it draws:  the rest of the row is the heading's empty space
    expect(toggle(host).getBoundingClientRect().right).toBeLessThan(heading.getBoundingClientRect().right - 40)
    expect([getComputedStyle(heading).cursor, getComputedStyle(toggle(host)).cursor]).toEqual(["pointer", "pointer"])
    heading.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await ElementFixture.tick()
    expect([host.matches(":state(open)"), host.querySelector("epic-phase")!.matches(":state(open)")]).toEqual([
      true,
      false
    ])
    altClick(heading)
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
  })

  test("no Plan changes box above the phases (Owen, 2026-10-11):  an older doc's copies show nowhere", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases" open>` +
        `<epic-updated slot="changes" at="2026-10-07 10:00" phase="1" of="2">Split it.</epic-updated>` +
        `<epic-phase id="p1" title="One" status="active"></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="todo"></epic-phase></epic-section>`
    )
    expect(host.shadowRoot!.querySelector('[part~="changes"]')).toBeNull()
    expect(host.querySelector("epic-updated")!.assignedSlot).toBeNull()
  })
})

// epic `epic-workflow` P25:  the page's own buttons in the title row, where the docs runtime puts the bullhorn too
describe("<epic-section> actions slot", () => {
  // P25:  the page's own buttons at the title's end, before its tools and its fold
  test('`slot="actions"`:  at the title\'s end, BEFORE its tools;  the chevron at its start;  a click never folds it', async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases"><button slot="actions" aria-label="Copy">C</button></epic-section>`
    )
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    const tools = host.shadowRoot!.querySelector('[part~="tools"]')!
    expect(tools.contains(button.assignedSlot)).toBe(true)
    const gear = await gearOf(host)
    const chevron = inner(host).shadowRoot!.querySelector('[part~="fold-icon"]')!
    const [b, own, fold] = [button, gear, chevron].map((each) => each.getBoundingClientRect())
    expect([b.right <= own.left + 0.5, fold.right <= b.left + 0.5]).toEqual([true, true])
    button.click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
    toggle(host).click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(true)
    // the slotted button isn't a child:  an item section holding only it still says None yet
    const empty = await render(
      `<epic-section id="todos" kind="todos" open><button slot="actions">C</button></epic-section>`
    )
    expect(empty.shadowRoot!.querySelector('[part~="empty"]')?.textContent).toBe("None yet")
  })
})

/** Where `element`'s first line of text starts, from the viewport top:  its first character's box. */
function firstLineTop(element: Element): number {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, (node) =>
    node.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  )
  const text = walker.nextNode()!
  const range = document.createRange()
  range.setStart(text, text.textContent!.search(/\S/))
  range.setEnd(text, text.textContent!.search(/\S/) + 1)
  return range.getBoundingClientRect().top
}

/** Which corners of each item's line in `host` are rounded:  `{ q1: "top", q2: "", q4: "top bottom" ... }`. */
function roundedEnds(host: Element): Record<string, string> {
  const ends: Record<string, string> = {}
  for (const item of host.querySelectorAll("epic-item")) {
    if (getComputedStyle(item).display === "none") continue
    const line = getComputedStyle(item.shadowRoot!.querySelector("[part~='line']")!)
    // an open item's bottom is its drawer's (I105), its line rounded all round too
    const end = item.hasAttribute("open")
      ? getComputedStyle(item.shadowRoot!.querySelector("[part~='details']")!)
      : line
    const top = parseFloat(line.borderTopLeftRadius) > 0 && parseFloat(line.borderTopRightRadius) > 0
    const bottom = parseFloat(end.borderBottomLeftRadius) > 0 && parseFloat(end.borderBottomRightRadius) > 0
    ends[item.id] = [top && "top", bottom && "bottom"].filter(Boolean).join(" ")
  }
  return ends
}

// Owen, 2026-10-24:  "With lists like this, tops and bottoms should always be rounded"
// epic `epic-engine` I157 (Owen, 2026-10-29):  "In phases header, would be cool to have badges for
// 'undone|updated|complete' -- e.g. 49 phases in this plan are a lot to scroll past";  recoloured in I170
describe("<epic-section kind=phases> state chips", () => {
  /** `minutes` ago, as the tool writes a time (`2026-10-29T10:05`, local). */
  function minutesAgo(minutes: number): string {
    const at = new Date(Date.now() - minutes * 60_000)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
  }

  afterEach(() => {
    localStorage.removeItem(`spell-item-state:${location.pathname}`)
  })

  /** Phases `p1`, `p2` ... by `specs`:  each its attributes (`status="done"`, `plan="waiting"` ...). */
  function phases(specs: string[], open: number[] = []): string {
    const each = specs.map(
      (spec, at) =>
        `<epic-phase id="p${at + 1}" title="Phase ${at + 1}" ${spec}${open.includes(at + 1) ? " open" : ""}><p>Body ${at + 1}.</p></epic-phase>`
    )
    return `<epic-section id="phases" kind="phases" open>${each.join("")}</epic-section>`
  }

  /** The ids of `host`'s phases that show. */
  function shownPhases(host: Element): string[] {
    return Array.from(host.querySelectorAll("epic-phase"))
      .filter((phase) => getComputedStyle(phase).display !== "none")
      .map((phase) => phase.id)
  }

  // epic `epic-engine` I170 (Owen, 2026-10-29:  "The order, one chip per phase:  red, orange, blue (working), dotted
  // blue, green, grey")
  test("a chip per state, the first that holds:  red, orange, blue (badge), dotted blue, green, grey;  axe", async () => {
    const hourAgo = minutesAgo(60)
    const weekAgo = minutesAgo(7 * 24 * 60)
    const host = await render(
      phases([
        `status="done" done-at="${hourAgo}"`,
        `status="done" done-at="${weekAgo}"`,
        `status="done"`,
        // done:  its updates are no news
        `status="done" done-at="${hourAgo}" to-see="up1@${hourAgo}"`,
        `status="active"`,
        `status="todo" plan="waiting"`,
        `status="todo" plan="accepted" choices-open="1"`,
        // waiting for the Accept AND changed:  red first
        `status="active" plan="waiting" to-see="up2@${hourAgo}"`,
        // changed AND under way:  orange first
        `status="active" plan="accepted" to-see="up3@${hourAgo}"`,
        `status="todo" plan="accepted" changes="1"`,
        // its update quiet (3 days):  no news
        `status="todo" plan="accepted" to-see="up4@${weekAgo}"`,
        `status="todo" plan="accepted"`,
        `status="todo"`
      ])
    )
    expect(chips(host)).toEqual({ attention: true, updated: true, scheduled: true, recent: true, old: true })
    expect(chipButtons(host).map((button) => `${button.dataset.state}:${button.textContent}`)).toEqual([
      "attention:3",
      "updated:2",
      "scheduled:3",
      "recent:2",
      "old:2"
    ])
    expect(
      chipButtons(host).map((button) => [button.dataset.color, button.dataset.fill ?? ""].join(" ").trim())
    ).toEqual(["red", "orange", "blue dotted", "green", "grey"])
    // the one under way in the filter's blue badge;  the toolbar's Phases badges:  3 red, 1 blue
    const filter = host.shadowRoot!.querySelector('[part~="filter"] epic-state-filter')!
    expect(filter.shadowRoot!.querySelector(".marked")!.textContent).toBe("1")
    const entry = (host as FoldHost & { contentsEntry?: { count?: unknown } }).contentsEntry
    expect(entry?.count).toMatchObject({ attention: 3, running: 1 })
    // each phase's status circle the colour of its chip
    const circle = (id: string) =>
      host.querySelector(`#${id}`)!.shadowRoot!.querySelector<HTMLElement>('[part~="status"]')!
    expect(["p1", "p2", "p5", "p6", "p9", "p12"].map((id) => circle(id).dataset.state)).toEqual([
      "recent",
      "old",
      "progress",
      "attention",
      "updated",
      "scheduled"
    ])
    const colorOf = (state: string) => getComputedStyle(chip(host, state)).borderTopColor
    expect(getComputedStyle(circle("p6")).color).toBe(colorOf("attention"))
    expect(getComputedStyle(circle("p9")).color).toBe(colorOf("updated"))
    // the scheduled chip is filled, its dots lighter:  the circle wears its fill
    expect(getComputedStyle(circle("p12")).color).toBe(getComputedStyle(chip(host, "scheduled")).backgroundColor)
    expect(getComputedStyle(circle("p1")).color).toBe(colorOf("recent"))
    expect(getComputedStyle(circle("p2")).color).toBe(colorOf("old"))
    // scheduled:  a dotted circle, as its chip's outline
    expect(getComputedStyle(circle("p12").querySelector("svg")!).borderTopStyle).toBe("dotted")
    // the doc pass never asks for an Accept, as its own buttons don't
    const docs = await render(
      `<epic-section id="phases" kind="phases"><epic-phase id="p1" title="Doc Review" status="todo" plan="waiting"></epic-phase></epic-section>`
    )
    expect(chips(docs)).toEqual({ scheduled: true })
    await expectAccessible(host)
  })

  test("Owen's rule filters the phases:  only scheduled hides the rest, says so, marks them, and is remembered", async () => {
    const host = await render(phases([`status="done"`, `status="done"`, `status="todo"`, `status="todo" changes="1"`]))
    chip(host, "scheduled").click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(chips(host)).toEqual({ updated: false, scheduled: true, old: false })
    expect(shownPhases(host)).toEqual(["p3"])
    expect(hiddenNote(host).textContent).toBe("3 hidden · show all")
    expect(Array.from(host.querySelectorAll("[data-epic-filtered]"), (phase) => phase.id)).toEqual(["p1", "p2", "p4"])
    expect(JSON.parse(localStorage.getItem(`spell-item-state:${location.pathname}`)!)).toEqual({
      phases: ["scheduled"]
    })
    // a phase finished:  it leaves the filter's view as it changes state
    host.querySelector("#p3")!.setAttribute("status", "done")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(shownPhases(host)).toEqual([])
    hiddenNote(host).click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(shownPhases(host)).toEqual(["p1", "p2", "p3", "p4"])
    expect(host.querySelectorAll("[data-epic-filtered]").length).toBe(0)
  })

  test("not the page toolbar's:  its `stateFilter` is none, so the toolbar's chips stay the items'", async () => {
    const host = await render(phases([`status="done"`, `status="todo"`]))
    expect((host as FoldHost & { stateFilter?: unknown }).stateFilter).toBeUndefined()
    expect((host as FoldHost & { chipCounts?: string }).chipCounts).toBe("old:1 scheduled:1")
  })

  // EpicSection.runs.css used to step over 2 hidden phases at most
  test("runs stay right with 40 done phases hidden in a row:  the next one showing after an open one is rounded on top", async () => {
    const specs = [
      `status="todo"`,
      ...Array.from({ length: 40 }, () => `status="done"`),
      `status="todo"`,
      `status="todo"`
    ]
    const host = await render(phases(specs, [1]))
    chip(host, "scheduled").click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(shownPhases(host)).toEqual(["p1", "p42", "p43"])
    const ends: Record<string, string> = {}
    for (const id of ["p1", "p42", "p43"]) {
      const phase = host.querySelector(`#${id}`)!
      const section = phase.shadowRoot!.querySelector("ui-section")!
      const title = getComputedStyle(section.shadowRoot!.querySelector("[part~='title']")!)
      const top = parseFloat(title.borderTopLeftRadius) > 0
      const bottom = parseFloat(title.borderBottomLeftRadius) > 0
      ends[id] = [top && "top", bottom && "bottom"].filter(Boolean).join(" ")
    }
    expect(ends).toEqual({ p1: "top bottom", p42: "top", p43: "bottom" })
  })
})

describe("<epic-section> runs of item lines, rounded at their ends", () => {
  afterEach(() => {
    localStorage.removeItem(`spell-item-state:${location.pathname}`)
  })

  /** Owen's 7 questions, each with details;  `open` ones unfolded. */
  function seven(open: number[], states?: string[]): string {
    const items = Array.from({ length: 7 }, (_, at) => {
      const n = at + 1
      const state = states?.[at] ?? "open"
      return `<epic-item id="q${n}" title="Q ${n}" status="open" state="${state}"${open.includes(n) ? " open" : ""}><p>Q ${n}'s details.</p></epic-item>`
    })
    return `<epic-section id="decisions" kind="questions" open>${items.join("")}</epic-section>`
  }

  // an unfolded item ENDS its run, the line above touching it (Owen, 2026-10-25:  "Don't put space at the top of open
  // sections, just below");  the next line starts one
  test("Q3 and Q4 unfolded:  Q1 top, Q3 bottom, Q4 both, Q5 top, Q7 bottom", async () => {
    const host = await render(seven([3, 4]))
    expect(roundedEnds(host)).toEqual({
      q1: "top",
      q2: "",
      q3: "bottom",
      q4: "top bottom",
      q5: "top",
      q6: "",
      q7: "bottom"
    })
    // no rule above a run's rounded top (Owen, 2026-10-24);  the rules between lines inside a run stay
    const ruled = Array.from(host.querySelectorAll("epic-item"))
      .filter((item) => getComputedStyle(item).borderTopStyle !== "none")
      .map((item) => item.id)
    expect(ruled).toEqual(["q2", "q3", "q6", "q7"])
  })

  test("follows folding:  all folded is one run;  a click on a line splits it there", async () => {
    const host = await render(seven([]))
    expect(roundedEnds(host)).toEqual({ q1: "top", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "bottom" })
    host.querySelector<HTMLElement>("#q5")!.shadowRoot!.querySelector<HTMLElement>("[part~='line']")!.click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.querySelector("#q5")!.hasAttribute("open")).toBe(true)
    expect(roundedEnds(host)).toEqual({
      q1: "top",
      q2: "",
      q3: "",
      q4: "",
      q5: "bottom",
      q6: "top",
      q7: "bottom"
    })
  })

  test("only the lines showing count:  a run ends at the last one the filter leaves", async () => {
    // q6 and q7 red;  showing only yellow, q5 is the list's last line
    const host = await render(seven([3], ["open", "open", "open", "open", "open", "attention", "attention"]))
    chip(host, "open").click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(roundedEnds(host)).toEqual({ q1: "top", q2: "", q3: "bottom", q4: "top", q5: "bottom" })
  })

  // by position, with sibling selectors, the filter's hidden items marked (epic `epic-engine` P45;  Owen, 2026-10-25:
  // "generic CSS, using sibling selectors ... rather than with explicit ids")
  test("a run starts after an unfolded line even with hidden lines between;  the hidden ones marked, not by id", async () => {
    // q4 red:  showing only yellow hides it, between unfolded q3 and q5
    const host = await render(seven([3], ["open", "open", "open", "attention", "open", "open", "open"]))
    chip(host, "open").click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(roundedEnds(host)).toEqual({ q1: "top", q2: "", q3: "bottom", q5: "top", q6: "", q7: "bottom" })
    const filtered = Array.from(host.querySelectorAll("[data-epic-filtered]"), (item) => item.id)
    expect(filtered).toEqual(["q4"])
    expect(host.shadowRoot!.querySelector("style")?.textContent ?? "").not.toContain("::slotted(#")
    // shown again:  the mark comes off
    chip(host, "attention").click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.querySelectorAll("[data-epic-filtered]").length).toBe(0)
  })
})

// epic `epic-engine` I96, Owen, 2026-10-24:  "showed the white corners at the bottom above P29"
describe("<epic-section kind=phases> runs of phase title rows", () => {
  // open, a phase is a drawer under its title (I115), the row above touching it, room only below (2026-10-25)
  test("P2 open:  P1 on top, P2's title at the bottom, P3 on top, P4 at the bottom;  no rule under P4", async () => {
    const phases = [1, 2, 3, 4]
      .map(
        (n) =>
          `<epic-phase id="p${n}" title="Phase ${n}" status="todo"${n === 2 ? " open" : ""}><p>Body ${n}.</p></epic-phase>`
      )
      .join("")
    const host = await render(`<epic-section id="phases" kind="phases" open>${phases}</epic-section>`)
    await ElementFixture.tick()
    const ends: Record<string, string> = {}
    for (const phase of host.querySelectorAll("epic-phase")) {
      const section = phase.shadowRoot!.querySelector("ui-section")!
      const title = getComputedStyle(section.shadowRoot!.querySelector("[part~='title']")!)
      const top = parseFloat(title.borderTopLeftRadius) > 0 && parseFloat(title.borderTopRightRadius) > 0
      const bottom = parseFloat(title.borderBottomLeftRadius) > 0 && parseFloat(title.borderBottomRightRadius) > 0
      ends[phase.id] = [top && "top", bottom && "bottom"].filter(Boolean).join(" ")
    }
    expect(ends).toEqual({ p1: "top", p2: "bottom", p3: "top", p4: "bottom" })
    expect(getComputedStyle(host.querySelector("#p4")!).borderBottomStyle).toBe("none")
    expect(getComputedStyle(host.querySelector("#p3")!).borderBottomStyle).not.toBe("none")
  })
})

// Owen, 2026-10-19:  "always show the full title, wrapped" (J183's "ellipsis when collapsed" before)

describe("<epic-section> title, folded and open", () => {
  test("in full, wrapped, folded and open, no tooltip;  its first line and the slot's button stay put", async () => {
    const host = await render(
      `<div style="width: 320px"><epic-section id="report-long" kind="report" title="A long title that cannot fit on one line of the narrow side bar, so it wraps, folded or open"><p>x</p><button slot="actions" aria-label="Copy">C</button></epic-section></div>`
    )
    const header = host.shadowRoot!.querySelector<HTMLElement>(".header")!
    const words = host.shadowRoot!.querySelector<HTMLElement>(".words")!
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    const lineHeight = parseFloat(getComputedStyle(words).lineHeight)
    const folded = { top: firstLineTop(words), button: button.getBoundingClientRect() }
    expect(header.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5)
    expect(words.scrollWidth).toBeLessThanOrEqual(words.clientWidth)
    expect([getComputedStyle(words).textOverflow, header.hasAttribute("title")]).toEqual(["clip", false])
    // the slot's button sits on the title's first line, not lower
    expect(button.getBoundingClientRect().top).toBeLessThan(folded.top + lineHeight)

    toggle(host).click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(true)
    expect(header.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5)
    expect(header.hasAttribute("title")).toBe(false)
    expect(firstLineTop(words)).toBeCloseTo(folded.top, 0)
    // collapse-all shows only while open (as before P25), so the slot's button keeps its height, not its x
    expect(button.getBoundingClientRect().top).toBeCloseTo(folded.button.top, 0)
  })
})
