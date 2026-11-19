import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-label"
import "spell/epic/components/epic-pills"

import type { PillEpic } from "spell/epic/components/epic-pills/EpicPills.types"

/** A running epic:  `phases` its phases' statuses, worked on and updated an hour ago unless `extra` says otherwise. */
function epic(name: string, phases: string[], extra: Partial<PillEpic> = {}): PillEpic {
  const done = phases.filter((status) => status === "done").length
  return {
    name,
    worktree: name,
    url: `/epics/${name}/${name}.plan.html`,
    title: name.replace(/^./, (letter) => letter.toUpperCase()),
    phases,
    done,
    total: phases.length,
    updated: new Date().toISOString().slice(0, 10),
    worked: new Date(Date.now() - 3_600_000).toISOString(),
    ...extra
  }
}

/** The page server's answer, as `fetch`:  `epics` running. */
function answering(epics: PillEpic[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify(epics)))
}

/** Render the pills in a box `width` wide, and wait until they've drawn their pills or their note. */
async function render(width = 560) {
  const box = await ElementFixture.render(`<div style="width: ${width}px"><epic-pills></epic-pills></div>`)
  const host = box.querySelector("epic-pills")!
  await vi.waitFor(() => expect(host.shadowRoot!.querySelector(".pill, .note")).toBeTruthy())
  return host
}

/** The pills as drawn, by epic name. */
function pillsOf(host: Element): Map<string, Element> {
  return new Map(
    Array.from(host.shadowRoot!.querySelectorAll(".pill"), (pill) => [pill.querySelector(".name")!.textContent!, pill])
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("<epic-pills>", () => {
  test("Active epics worked on this week, A to Z:  name, badges, phase or Done, agents;  axe", async () => {
    const fetched = answering([
      epic("zeta", ["done", "active"], {
        active: "P2 · Build It",
        badges: { urgent: 2, replied: 0, running: 1 },
        agents: 2
      }),
      epic("alpha", ["done", "todo"], { badges: { urgent: 0, replied: 3, running: 0 } }),
      epic("standing", ["done"], { standing: true, agents: 1 }),
      epic("stale", ["active"], { active: "P1 · Old", worked: new Date(Date.now() - 8 * 86_400_000).toISOString() }),
      epic("idea", [], { future: true }),
      epic("shipped", ["done"])
    ])
    const host = await render()
    expect(fetched.mock.calls[0]![0]).toBe("/api/epics/running?every=")
    expect(host.shadowRoot!.querySelector(".heading")!.textContent).toBe("Active epics")
    const pills = pillsOf(host)
    // not worked on this week, planning, or done:  no pill
    expect([...pills.keys()]).toEqual(["alpha", "standing", "zeta"])

    const zeta = pills.get("zeta")!
    expect(zeta.getAttribute("link")).toBe("/epics/zeta/zeta.plan.html")
    expect(zeta.getAttribute("target")).toBe("_self")
    // two colours:  ONE split circle, no number, red on the left
    const split = zeta.querySelector(".badge.split") as HTMLElement
    expect(split.textContent).toBe("")
    expect(split.style.getPropertyValue("--epic-pills-split")).toBe(
      "conic-gradient(from 180deg, var(--spell-state-attention) 0 50%, var(--spell-state-progress) 0)"
    )
    expect(zeta.querySelector(".phase")!.textContent).toBe("P2")
    expect(zeta.querySelector(".agents")!.textContent).toBe("2")
    expect(zeta.getAttribute("title")).toBe("Zeta\n2 urgent · 1 under way\nP2 · Build It\n2 agents running")

    // one colour:  its count
    const alpha = pills.get("alpha")!
    expect(alpha.querySelector(".badge.replied")!.textContent).toBe("3")
    expect(alpha.querySelector(".phase")).toBeNull()
    expect(alpha.querySelector(".agents")).toBeNull()
    expect(alpha.getAttribute("title")).toBe("Alpha\n3 to pick or review")

    // every phase done:  Done
    const standing = pills.get("standing")!
    expect(standing.querySelector(".badge")).toBeNull()
    expect(standing.querySelector(".phase.done")!.textContent).toBe("Done")
    expect(standing.getAttribute("title")).toBe("Standing\nAll phases done\n1 agent running")
    await expectAccessible(host)
  })

  test("asks again when an epic page or its agents change;  none this week:  says so", async () => {
    const fetched = answering([])
    const host = await render()
    expect(host.shadowRoot!.querySelector(".note")!.textContent).toBe("No epic has been worked on this week.")
    fetched.mockImplementation(
      async () => new Response(JSON.stringify([epic("one", ["active"], { active: "P1 · One", agents: 1 })]))
    )
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/epics/one/agents.json5" } }))
    await vi.waitFor(() => expect(pillsOf(host).has("one")).toBe(true))
    expect(host.shadowRoot!.querySelector(".note")).toBeNull()
    // a file that isn't an epic's asks nothing
    const asked = fetched.mock.calls.length
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/guides/x.html" } }))
    await ElementFixture.tick()
    expect(fetched.mock.calls.length).toBe(asked)
  })

  test("no answer:  a note says so", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }))
    const host = await render()
    expect(host.shadowRoot!.querySelector(".note")!.textContent).toBe(
      "Couldn't ask the page server for the active epics."
    )
    expect(host.shadowRoot!.querySelector(".pill")).toBeNull()
  })

  test("two columns in the side bar's card (~480px), 24px pills, nothing overflows", async () => {
    answering([
      epic("review-review", ["active"], {
        active: "P12 · Long",
        badges: { urgent: 1, replied: 1, running: 1 },
        agents: 3
      }),
      epic("data", ["active"], { active: "P3 · Short" })
    ])
    const host = await render(480)
    await vi.waitFor(() => expect(pillsOf(host).size).toBe(2))
    const boxes = [...pillsOf(host).values()].map((pill) =>
      pill.shadowRoot!.querySelector("[part~=label]")!.getBoundingClientRect()
    )
    // side by side, one row
    expect(boxes[0]!.top).toBe(boxes[1]!.top)
    expect(boxes[0]!.right).toBeLessThan(boxes[1]!.left)
    for (const box of boxes) expect(box.height).toBe(24)
    expect(host.scrollWidth).toBeLessThanOrEqual(480)
  })

  test("a card under 360px (three to a row on a laptop):  one column", async () => {
    answering([epic("alpha", ["active"]), epic("beta", ["active"])])
    const host = await render(320)
    await vi.waitFor(() => expect(pillsOf(host).size).toBe(2))
    const [first, second] = [...pillsOf(host).values()].map((pill) =>
      pill.shadowRoot!.querySelector("[part~=label]")!.getBoundingClientRect()
    )
    expect(second!.top).toBeGreaterThan(first!.top)
    expect(first!.left).toBe(second!.left)
  })
})
