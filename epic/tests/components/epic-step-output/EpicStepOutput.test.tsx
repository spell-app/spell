import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import { ReviewClient } from "spell/epic/review"
import { StepOutputs } from "spell/epic/components/epic-step-output"

import "spell/epic/components/epic-step-output"
import "spell/epic/components/epic-phase"

/** A test's Step field:  a step with a command, one without, one with two;  and its older version's. */
const TEST = `<epic-item id="m1">
  <epic-field label="Step"><ol>
    <li>Run it:  <pre><code>spell server certificate</code></pre></li>
    <li>Open the page.</li>
    <li>Check:  <pre><code>spell server status</code></pre><pre><code>epic pages link x</code></pre></li>
  </ol></epic-field>
  <epic-original><epic-field label="Step"><ol><li><pre><code>old</code></pre></li></ol></epic-field></epic-original>
</epic-item>`

/** Every box under `root`, as `step:item` under its step's first words. */
function boxesIn(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll("epic-step-output")).map(
    (box) =>
      `${box.getAttribute("item")}:${box.getAttribute("step")}:${box.parentElement!.firstChild!.textContent!.trim()}`
  )
}

describe("StepOutputs", () => {
  test("a box last in each step with a command, numbered by its step;  none in an older version;  kept in step", async () => {
    const holder = document.createElement("div")
    holder.innerHTML = TEST
    const field = holder.querySelector<HTMLElement>("epic-field")!
    expect(StepOutputs.isTestStep(field)).toBe(true)
    expect(StepOutputs.isTestStep(holder.querySelector("epic-original epic-field")!)).toBe(false)
    StepOutputs.place(field)
    expect(boxesIn(holder)).toEqual(["m1:1:Run it:", "m1:3:Check:"])
    expect(holder.querySelector("epic-step-output")!.hasAttribute("data-spell-added")).toBe(true)
    // again:  nothing changes
    StepOutputs.place(field)
    expect(boxesIn(holder)).toEqual(["m1:1:Run it:", "m1:3:Check:"])
    expect(StepOutputs.signature(field)).toBe("1+ 3+ | 0")
    // a step put before them:  renumbered;  its command gone:  its box goes
    const list = field.querySelector("ol")!
    list.querySelector("li pre")!.remove()
    list.insertAdjacentHTML("afterbegin", "<li>First:  <pre><code>cd ~/www/spell</code></pre></li>")
    expect(StepOutputs.signature(field)).toBe("1- 4- | 1")
    StepOutputs.place(field)
    expect(boxesIn(holder)).toEqual(["m1:1:First:", "m1:4:Check:"])
  })

  test("<epic-field> puts them there as it's drawn, and as its text changes", async () => {
    const item = await ElementFixture.render(TEST)
    const field = item.querySelector<HTMLElement>("epic-field")!
    await vi.waitFor(() => expect(boxesIn(field)).toEqual(["m1:1:Run it:", "m1:3:Check:"]))
    field.querySelector("ol")!.insertAdjacentHTML("beforeend", "<li>Last:  <pre><code>ls</code></pre></li>")
    await vi.waitFor(() => expect(boxesIn(field)).toEqual(["m1:1:Run it:", "m1:3:Check:", "m1:4:Last:"]))
    expect(item.querySelector("epic-original epic-step-output")).toBeNull()
  })

  test("a Step field with no list is one step;  not a test's:  none", () => {
    const holder = document.createElement("div")
    holder.innerHTML = `<epic-item id="m2"><epic-field label="Step">Run <pre><code>x</code></pre></epic-field></epic-item>
      <epic-item id="t2"><epic-field label="Step"><pre><code>y</code></pre></epic-field></epic-item>`
    const [test, todo] = Array.from(holder.querySelectorAll<HTMLElement>("epic-field"))
    StepOutputs.place(test!)
    expect(boxesIn(holder)).toEqual(["m2:1:Run"])
    expect(StepOutputs.isTestStep(todo!)).toBe(false)
  })
})

describe("<epic-step-output>", () => {
  let fetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // a served page:  the inbox answers, each mark saved as posted
    const marks: Record<string, unknown> = {}
    fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.body) {
        const body = JSON.parse(init.body as string) as { id: string; mark: Record<string, unknown> | null }
        if (body.mark) marks[body.id] = { ...body.mark, at: "2026-11-23T10:00:00.000Z" }
        else delete marks[body.id]
      }
      const inbox = { marks, drafts: {}, now: {}, working: {}, listening: null, taken: {} }
      return new Response(JSON.stringify(url.startsWith("/api") ? inbox : ""), { status: 200 })
    })
    const client = new ReviewClient({
      page: "/epics/sample/sample.plan.html",
      server: { token: "t" },
      protocol: "http:",
      fetch: fetch as unknown as typeof globalThis.fetch,
      storage: null,
      hasItem: () => true
    })
    await client.start()
    ReviewClient.adopt(client)
  })

  afterEach(() => {
    ReviewClient.adopt(undefined)
  })

  test("a box to paste in while the page is reviewed;  what's pasted saved in the test's mark, for its step", async () => {
    const host = await ElementFixture.render(`<epic-step-output item="m1" step="2"></epic-step-output>`)
    const box = host.shadowRoot!.querySelector<HTMLElement & { value: string }>("epic-text-box")!
    expect(box.getAttribute("placeholder")).toBe("Paste what this command printed")
    expect(box.getAttribute("label")).toBe("What step 2 printed")
    box.value = "Ready"
    box.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
    box.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }))
    await vi.waitFor(() => expect(ReviewClient.forPage().outputOf("m1", 2)).toBe("Ready"))
    expect(ReviewClient.forPage().markOf("m1")).toMatchObject({
      action: "revisit",
      outputs: [{ step: 2, text: "Ready" }]
    })
  })
})
