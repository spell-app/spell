import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-card"
import "spell-ui/components/ui-label"
import "spell-ui/components/ui-button"
import "spell-epic/components/epic-cards"

import type { SagaEpic } from "spell-epic/components/epic-cards/EpicCards.types"

/** An epic serving the saga:  `phases` its phases' statuses, updated today unless `updated` says otherwise. */
function epic(name: string, phases: string[], extra: Partial<SagaEpic["facts"]> = {}): SagaEpic {
  return {
    name,
    title: name.replace(/^./, (letter) => letter.toUpperCase()),
    href: `../../epics/${name}/${name}.plan.html`,
    summary: `What ${name} does.`,
    facts: { phases, updated: new Date().toISOString().slice(0, 10), ...extra }
  }
}

/** The page server's answer, as `fetch`:  `epics` for the saga. */
function answering(epics: SagaEpic[]) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify({ saga: "epics", epics })))
}

/** Render a list for saga `epics`, and wait until it has drawn its groups or its note. */
async function render() {
  const host = await ElementFixture.render(`<epic-cards saga="epics"></epic-cards>`)
  await vi.waitFor(() => expect(host.shadowRoot!.querySelector("epic-list, .note")).toBeTruthy())
  return host
}

/** Its list, `<epic-list>`, once its groups are drawn. */
async function listOf(host: Element): Promise<Element> {
  const list = host.shadowRoot!.querySelector("epic-list")!
  await vi.waitFor(() => expect(list.shadowRoot?.querySelector(".group-title")).toBeTruthy())
  return list
}

/** The groups as drawn:  each heading's group and the cards under it, in order (`order` places them). */
function groupsOf(list: Element): [string, string[]][] {
  const placed = Array.from(list.querySelectorAll("epic-card"))
    .filter((card) => getComputedStyle(card).display !== "none")
    .map((card) => [Number(getComputedStyle(card).order), card.getAttribute("epic")!] as const)
  const headings = Array.from(
    list.shadowRoot!.querySelectorAll<HTMLElement>(".group-title"),
    (title) => [Number(title.style.order), title.dataset.group!] as const
  )
  return headings.map(([at, group], i) => [
    group,
    placed
      .filter(([order]) => order > at && order < (headings[i + 1]?.[0] ?? Infinity))
      .sort((a, b) => a[0] - b[0])
      .map(([, epic]) => epic)
  ])
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("<epic-cards>", () => {
  test("asks the page server for the saga's epics;  a card each, grouped by state, by title;  axe", async () => {
    const fetched = answering([
      epic("zeta", ["done", "active"], { active: "P2 · Two" }),
      epic("alpha", ["done", "todo"]),
      epic("idea", [], { future: true }),
      epic("shipped", ["done"]),
      epic("waiting", ["done"], { urgent: ["q1"] })
    ])
    const host = await render()
    expect(fetched.mock.calls[0]![0]).toBe("/api/epics/saga?saga=epics")
    // the Epics page's own list and cards (epic `epic-engine` I39), with no Favorites group
    const list = await listOf(host)
    expect(list.hasAttribute("no-favorites")).toBe(true)
    expect(groupsOf(list)).toEqual([
      ["active", ["alpha", "zeta"]],
      ["planning", ["idea"]],
      ["urgent", ["waiting"]],
      ["done", ["shipped"]]
    ])
    const zeta = list.querySelector('epic-card[epic="zeta"]')!
    expect(zeta.getAttribute("phases")).toBe("done active")
    expect(zeta.getAttribute("active")).toBe("P2 · Two")
    expect(zeta.querySelector(":scope > a")!.getAttribute("href")).toBe("../../epics/zeta/zeta.plan.html")
    expect(zeta.querySelector(":scope > a")!.getAttribute("target")).toBe("zeta")
    expect(zeta.querySelector('[slot="description"]')!.textContent).toBe("What zeta does.")
    expect(zeta.querySelector('[slot="meta"]')!.textContent).toBe("in progress · 1/2 phases · P2 · Two")
    await expectAccessible(host)
  })

  test("a starred epic keeps its group, its star solid;  its last-worked day at its corner", async () => {
    answering([
      { ...epic("starred", ["active"]), favorite: true, worked: "2026-10-09T14:34-04:00" },
      epic("plain", ["active"])
    ])
    const list = await listOf(await render())
    expect(groupsOf(list)).toEqual([["active", ["plain", "starred"]]])
    const starred = list.querySelector('epic-card[epic="starred"]')!
    expect(starred.hasAttribute("favorite")).toBe(true)
    await vi.waitFor(() => expect(starred.shadowRoot!.querySelector(".star")!.getAttribute("icon")).toBe("star"))
    expect(starred.shadowRoot!.querySelector("time")!.getAttribute("datetime")).toBe("2026-10-09T14:34-04:00")
  })

  test("asks again when an epic page changes;  no epic names the saga:  says so", async () => {
    const fetched = answering([])
    const host = await render()
    expect(host.shadowRoot!.querySelector(".note")!.textContent).toBe(
      "No epic names this saga yet:  epic saga set <epic> epics"
    )
    fetched.mockImplementation(
      async () => new Response(JSON.stringify({ saga: "epics", epics: [epic("one", ["todo"])] }))
    )
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/epics/one/one.plan.html" } }))
    await vi.waitFor(() => expect(host.shadowRoot!.querySelector('epic-card[epic="one"]')).toBeTruthy())
    expect(host.shadowRoot!.querySelector(".note")).toBeNull()
    // a file that isn't an epic page's asks nothing
    const asked = fetched.mock.calls.length
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/guides/x.html" } }))
    await ElementFixture.tick()
    expect(fetched.mock.calls.length).toBe(asked)
  })

  test("no answer:  a note says so, nothing else drawn", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }))
    const host = await render()
    expect(host.shadowRoot!.querySelector(".note")!.textContent).toBe("Couldn't ask the page server for the epics.")
    expect(host.shadowRoot!.querySelector("epic-list")).toBeNull()
  })

  test("in the side bar's ~320px:  one column, nothing overflows", async () => {
    answering([epic("alpha", ["active"]), epic("beta", ["active"])])
    const host = await ElementFixture.render(`<div style="width: 320px"><epic-cards saga="epics"></epic-cards></div>`)
    const cards = host.querySelector("epic-cards")!
    await vi.waitFor(() => expect(cards.shadowRoot!.querySelectorAll("epic-card").length).toBe(2))
    await listOf(cards)
    expect(cards.scrollWidth).toBeLessThanOrEqual(320)
  })
})
