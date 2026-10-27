import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { E, UI } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/ui/components/ui-section"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-item"
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

  test("draws its numbered title, no tooltip;  starts FOLDED, with a grey rule and no gap below", async () => {
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
    const style = getComputedStyle(host)
    expect({ rule: style.borderBottomWidth, gap: style.marginBottom }).toEqual({ rule: "1px", gap: "0px" })
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

  test("an item section with no items says None yet;  the Phases toggles show the fields they name", async () => {
    const host = await render(
      `<div><epic-section id="todos" kind="todos" open></epic-section>` +
        `<epic-section id="phases" kind="phases" open></epic-section></div>`
    )
    expect(host.shadowRoot!.querySelector('[part~="empty"]')?.textContent).toBe("None yet")
    const phases = host.parentElement!.querySelector<FoldHost>("#phases")!
    const base = phases.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
    const [files] = phases.shadowRoot!.querySelectorAll<HTMLButtonElement>("button.toggle")
    expect(base.style.getPropertyValue("--epic-files-display")).toBe("")
    files!.click()
    await ElementFixture.tick()
    expect(base.style.getPropertyValue("--epic-files-display")).toBe("block")
    expect(files!.getAttribute("aria-pressed")).toBe("true")
    files!.click()
    await ElementFixture.tick()
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

  test("phases count too (open:  not done);  the log and an empty section have no badge", async () => {
    const host = await render(
      `<div><epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="done"></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="active"></epic-phase></epic-section>` +
        `<epic-section id="todos" kind="todos"></epic-section>` +
        `<epic-section id="log" kind="log"></epic-section></div>`
    )
    const sections = host.parentElement!.querySelectorAll("epic-section")
    expect(Array.from(sections, (section) => inner(section).getAttribute("badge"))).toEqual(["1/2", null, null])
    expect(host.shadowRoot!.querySelector('[part~="filter"]')).toBeNull()
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
    expect(open.title).toBe("2 open, still undecided:  show only these")
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
    expect(red.title).toBe("1 needs attention:  show these too")
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

  test("toggle-all, beside the chevron:  opens everything, then its phases fold, it stays open", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases" open>` +
        `<epic-phase id="p1" title="One" status="active" open><p>Do it.</p></epic-phase></epic-section>`
    )
    await ElementFixture.settle(host)
    const button = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="tools"] [part~="toggle-all"]')!
    // last in the title's tools:  beside the chevron
    expect(button.parentElement!.lastElementChild).toBe(button)
    // first:  everything opens;  then the same button folds what's inside
    button.click()
    await ElementFixture.tick()
    expect(button.getAttribute("aria-pressed")).toBe("true")
    button.click()
    await ElementFixture.tick()
    const phase = host.querySelector("epic-phase")!
    expect([host.matches(":state(open)"), phase.matches(":state(open)")]).toEqual([true, false])
    // folded by hand:  the toggle starts over, opening everything
    ;(host as FoldHost & { open: boolean }).open = false
    await ElementFixture.tick()
    expect(button.getAttribute("aria-pressed")).toBe("false")
  })

  // Owen, 2026-10-20:  "This should have an 'Expand all' next to collapse all"
  test("toggle-all, folded or open:  one click opens it and everything inside, parts loading", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases">` +
        `<epic-phase id="p1" title="One" status="active" source="${FIXTURES}/phase-part.html"></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="todo"><p>Later.</p></epic-phase></epic-section>`
    )
    await ElementFixture.settle(host)
    const tools = host.shadowRoot!.querySelector('[part~="tools"]')!
    // ONE button, last in the title's tools, beside the chevron
    const expand = tools.querySelector<HTMLButtonElement>('[part~="toggle-all"]')!
    expect([tools.lastElementChild === expand, tools.querySelectorAll('[part~="toggle-all"]').length]).toEqual([
      true,
      1
    ])
    expect([expand.title, expand.getAttribute("aria-label")]).toEqual([
      "Open everything in 1. Phases",
      "Open everything in 1. Phases"
    ])
    const opened: string[] = []
    host.addEventListener("ui-opening", (event) => opened.push((event.target as Element).id))
    expand.click()
    // the phase's part loads, then the item in it opens, then its aside
    await vi.waitFor(() => expect(host.querySelector("epic-aside")?.matches(":state(open)")).toBe(true))
    const phases = Array.from(host.querySelectorAll("epic-phase"))
    expect([host, ...phases, host.querySelector("epic-item")!].map((each) => each.matches(":state(open)"))).toEqual([
      true,
      true,
      true,
      true
    ])
    // each a click's open:  the page remembers the blocks' and items' folds by these
    expect(opened).toEqual(["phases", "p1", "p2", "q7"])
    // open:  the same button now folds everything inside
    await ElementFixture.tick()
    const e = expand.getBoundingClientRect()
    expect([expand.title, e.width, e.height]).toEqual(["Fold everything in 1. Phases", 24, 24])
    await expectAccessible(host)
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
  test('`slot="actions"`:  at the title\'s end, BEFORE its tools and the toggle-all;  the chevron at its start;  a click never folds it', async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases"><button slot="actions" aria-label="Copy">C</button></epic-section>`
    )
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    const tools = host.shadowRoot!.querySelector('[part~="tools"]')!
    expect(tools.contains(button.assignedSlot)).toBe(true)
    const [files] = host.shadowRoot!.querySelectorAll<HTMLButtonElement>("button.toggle")
    const chevron = inner(host).shadowRoot!.querySelector('[part~="fold-icon"]')!
    const [b, own, fold] = [button, files!, chevron].map((each) => each.getBoundingClientRect())
    expect([b.right <= own.left + 0.5, fold.right <= b.left + 0.5]).toEqual([true, true])
    button.click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
    toggle(host).click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(true)
    // open:  before the toggle-all too
    const all = host.shadowRoot!.querySelector('[part~="toggle-all"]')!
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(all.getBoundingClientRect().left + 0.5)
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
