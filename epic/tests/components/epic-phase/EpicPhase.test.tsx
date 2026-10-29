import { describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-section"
// the gear menus (I166)
import "spell/ui/components/ui-dropdown"
import "spell/ui/components/ui-button"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-update"
import "spell/epic/components/epic-item"
import "spell/epic/components/epic-mark"
import "spell/ui/components/ui-modal"
// what a request's thumbnail opens in:  `<ui-root>` loads it on a page
import "spell/ui/components/ui-zoom"

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
    (item) => `${item.textContent!.trim()}:  ${item.getAttribute("icon") === "square check" ? "on" : "off"}`
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

/** `host`'s inner `<ui-section>`. */
function inner(host: Element): E.DOMElement {
  return host.shadowRoot!.querySelector("ui-section") as E.DOMElement
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

/** Render `html`, wait for it and every inner section. */
async function render<T extends Element = E.DOMElement>(html: string, selector?: string): Promise<T> {
  const root = await ElementFixture.render<E.DOMElement>(html)
  await ElementFixture.settle(root.parentElement!)
  for (const host of root.parentElement!.querySelectorAll("epic-section, epic-phase")) await inner(host)?.ready
  await ElementFixture.tick()
  return (selector ? root.parentElement!.querySelector(selector) : root) as T
}

describe("<epic-phase>", () => {
  test("its title line:  status icon in its colour, `P5 · <title>`, the estimate as a badge;  folded", async () => {
    // `P5`:  its PLACE among the phases, never its id (stable, from its name:  epic `epic-workflow` P15)
    const before = ["One", "Two", "Three", "Four"]
      .map((title) => `<epic-phase id="p-${title.toLowerCase()}" title="${title}" status="done"></epic-phase>`)
      .join("")
    const host = await render(
      `<epic-section id="phases" kind="phases">${before}` +
        `<epic-phase id="p-drawing-elements" title="Drawing Elements" status="active" estimate="4-6h"></epic-phase>` +
        `</epic-section>`,
      "#p-drawing-elements"
    )
    const section = inner(host)
    const header = section.shadowRoot!.querySelector('[part~="header"]')!
    expect(flatText(header).replace(/\s+/g, " ").trim()).toBe("P5 · Drawing Elements")
    // the estimate just before the review buttons (Owen, 2026-10-25), not the section's badge
    expect(host.shadowRoot!.querySelector('[part~="estimate"]')?.textContent).toBe("4-6h")
    const status = host.shadowRoot!.querySelector('[part~="status"]')!
    expect({ classes: status.className, label: status.getAttribute("aria-label") }).toEqual({
      classes: "icon active",
      label: "Under way"
    })
    expect(host.matches(":state(open)")).toBe(false)
    // folded, a rule below;  but the last phase, its run's rounded bottom, has none (I96)
    expect(getComputedStyle(host.previousElementSibling!).borderBottomWidth).toBe("1px")
    expect(getComputedStyle(host).borderBottomWidth).toBe("0px")
  })

  // epic `epic-engine` P41, Owen's M1 and M3:  a done phase shows only what it took, `~<estimate>` its tooltip
  test("done and timed:  the pill says what it took, the estimate its tooltip;  not done, the estimate", async () => {
    const host = await render(
      `<epic-section id="phases" kind="phases">` +
        `<epic-phase id="p-done" title="Done" status="done" estimate="3-4h" took="21m"></epic-phase>` +
        `<epic-phase id="p-untimed" title="Untimed" status="done" estimate="2h"></epic-phase>` +
        `<epic-phase id="p-open" title="Open" status="active" estimate="1h" took="5m"></epic-phase>` +
        `</epic-section>`,
      "#p-done"
    )
    const pill = (phase: Element) => phase.shadowRoot!.querySelector('[part~="estimate"]')!
    const done = pill(host)
    expect({ text: done.textContent, tip: done.getAttribute("title"), took: done.classList.contains("took") }).toEqual({
      text: "21m",
      tip: "~3-4h",
      took: true
    })
    const [, untimed, open] = Array.from(host.parentElement!.children)
    expect([pill(untimed!).textContent, pill(untimed!).getAttribute("title")]).toEqual(["2h", null])
    expect([pill(open!).textContent, pill(open!).classList.contains("took")]).toEqual(["1h", false])
  })

  // r32 (Owen, 2026-10-25):  "Clicking accept or Revisit should collapse like it does for questions"
  test("an action chosen on its own review controls (`epic-chosen`) folds it, as an item's", async () => {
    const host = await render(`<epic-phase id="p1" title="One" status="todo" open><p>Body</p></epic-phase>`)
    expect(host.matches(":state(open)")).toBe(true)
    inner(host).dispatchEvent(new CustomEvent("epic-chosen", { bubbles: true, composed: true }))
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
  })

  test("open, it shows its fields through its slot;  nested in a section, its children get the stack", async () => {
    const host = await render<E.DOMElement>(
      `<epic-section id="phases" kind="phases" open><epic-phase id="p1" title="One" status="done" open>` +
        `<epic-field name="symptom">Broken.</epic-field></epic-phase></epic-section>`,
      "epic-phase"
    )
    const field = host.querySelector("epic-field")!
    expect(field.assignedSlot).not.toBeNull()
    // the titles measure themselves (`ResizeObserver`):  a frame or two
    for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame)
    await ElementFixture.tick()
    const body = host.shadowRoot!.querySelector<HTMLElement>('[part~="body"]')!
    const stack = parseFloat(body.style.getPropertyValue("--epic-stack"))
    expect(stack).toBeGreaterThan(0)
    await expectAccessible(host)
  })
})

/** A started review client adopted as the page's, its inbox `working` on `ids` (phase ids). */
async function adoptWorking(ids: string[]): Promise<ReviewClient> {
  const since = new Date().toISOString()
  const inbox = {
    marks: {},
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: Object.fromEntries(ids.map((id) => [id, { action: "details", since }])),
    listening: null,
    unsentComments: [],
    waitingComments: [],
    woken: null,
    doing: null
  } as unknown as Inbox
  const client = new ReviewClient({
    page: "/epics/demo/demo.plan.html",
    server: { token: "token" },
    protocol: "http:",
    fetch: (async () =>
      new Response(JSON.stringify(inbox), { headers: { "content-type": "application/json" } })) as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
  return client
}

// Owen, 2026-10-26:  "repo-split is actively planning this (writing the plan) but there is no indication in the phase
// header" (epic `epic-engine` I147)
describe("<epic-phase> while Claude works on it", () => {
  test("its status icon is a blue turning spinner, saying what he does;  a done phase's never;  passes axe", async () => {
    await adoptWorking(["p-one-repo", "p-old"])
    try {
      const section = await render(
        `<epic-section id="phases" kind="phases">` +
          `<epic-phase id="p-old" title="Old" status="done"></epic-phase>` +
          `<epic-phase id="p-one-repo" title="One Repo" status="todo"></epic-phase>` +
          `<epic-phase id="p-built" title="Built" status="active" plan="accepted"></epic-phase></epic-section>`
      )
      const phase = section.querySelector("#p-one-repo")!
      const status = () => phase.shadowRoot!.querySelector<HTMLElement>('[part~="status"]')!
      await vi.waitFor(() => expect(status().querySelector(".spinner")).not.toBeNull())
      expect([status().title, status().getAttribute("aria-label")]).toEqual([
        "Claude is writing this phase's plan",
        "Claude is writing this phase's plan"
      ])
      expect(phase.matches(":state(working)")).toBe(true)
      // blue, as the header's step label under way:  not the grey of a to-do phase
      const blue = getComputedStyle(section.querySelector("#p-built")!.shadowRoot!.querySelector('[part~="status"]')!)
      expect(getComputedStyle(status()).color).toBe(blue.color)
      expect(section.querySelector("#p-old")!.shadowRoot!.querySelector(".spinner")).toBeNull()
      await expectAccessible(phase)
    } finally {
      ReviewClient.adopt(undefined)
    }
  })
})

// epic `epic-engine` I170 (Owen, 2026-10-29:  "The order, one chip per phase:  red, orange, blue (working), dotted blue,
// green, grey")
describe("<epic-phase> while Claude works on it, its plan changed", () => {
  test("orange beats blue:  the spinner orange, its chip `updated`, not in the blue counts;  worked on alone, blue", async () => {
    await adoptWorking(["p-changed", "p-quiet"])
    try {
      const now = new Date()
      const at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00`
      const section = await render(
        `<epic-section id="phases" kind="phases">` +
          `<epic-phase id="p-changed" title="Changed" status="active" plan="accepted" to-see="up1@${at}"></epic-phase>` +
          `<epic-phase id="p-quiet" title="Quiet" status="todo" plan="accepted"></epic-phase></epic-section>`
      )
      const status = (id: string) =>
        section.querySelector(`#${id}`)!.shadowRoot!.querySelector<HTMLElement>('[part~="status"]')!
      await vi.waitFor(() => expect(status("p-changed").querySelector(".spinner")).not.toBeNull())
      expect([status("p-changed").dataset.state, status("p-quiet").dataset.state]).toEqual(["updated", "progress"])
      expect(getComputedStyle(status("p-changed")).color).not.toBe(getComputedStyle(status("p-quiet")).color)
      const filter = section.shadowRoot!.querySelector('[part~="filter"] epic-state-filter')!
      const chip = filter.shadowRoot!.querySelector<HTMLElement>('button[data-state="updated"]')!
      expect([chip.textContent, getComputedStyle(status("p-changed")).color]).toEqual([
        "1",
        getComputedStyle(chip).borderTopColor
      ])
      // the blue badge and the toolbar's blue count:  the quiet one alone
      expect(filter.shadowRoot!.querySelector(".marked")!.textContent).toBe("1")
      const entry = (section as Element & { contentsEntry?: { count?: { running?: number } } }).contentsEntry
      expect(entry?.count?.running).toBe(1)
    } finally {
      ReviewClient.adopt(undefined)
    }
  })
})

describe("<epic-phase> plan changes (Owen, 2026-10-11:  no Plan changes surround)", () => {
  /** A phase of `status`, its plan changed twice:  `changes="2"`, and (`lines`) the two updates loaded. */
  function changed(status: string, { lines = true } = {}) {
    const body = lines
      ? `<epic-field name="symptom">Broken.</epic-field><epic-field name="goal">Fixed.</epic-field>` +
        `<epic-update at="2026-10-07 10:00" summary="Split it" phase="1"><p>Split it.</p></epic-update>` +
        `<epic-update at="2026-10-08 11:00" summary="Joined again" phase="1"><p>Joined again.</p></epic-update>`
      : ""
    return `<epic-phase id="p2" title="Two" status="${status}" changes="2" open>${body}</epic-phase>`
  }

  test("its updates are plain children, each its own block after Goal:  no box around them", async () => {
    const host = await render(changed("todo"))
    expect(host.shadowRoot!.querySelector('[part~="changes"], .changes')).toBeNull()
    const updates = Array.from(host.querySelectorAll("epic-update"))
    for (const update of updates) expect(update.assignedSlot?.name).toBe("")
    await ElementFixture.tick()
    expect(updates.map((update) => update.shadowRoot!.querySelector('[part~="title"]')!.textContent)).toEqual([
      "Update: Split it",
      "Update: Joined again"
    ])
    await expectAccessible(host)
  })

  test("its title says its plan changed while it isn't done, folded too (`changes`, its updates not loaded)", async () => {
    const host = await render(changed("active", { lines: false }))
    const mark = host.shadowRoot!.querySelector('[part~="changed"]')!
    expect(mark.textContent).toBe("2")
    await vi.waitFor(() => expect(mark.querySelector("svg")).not.toBeNull())
    expect(mark.getAttribute("title")).toContain("2 × Update")
    host.setAttribute("status", "done")
    await ElementFixture.tick()
    expect(host.shadowRoot!.querySelector('[part~="changed"]')).toBeNull()
  })

  // epic `epic-engine` I168 (Owen, 2026-10-29:  "How do I clear these 'update' marks?")
  test("the pen counts its NEW updates (`to-see`):  less the ones quiet since, or marked Seen;  none, no pen", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0))
    const routes = new SeenRoutes()
    try {
      // up1 is 4 days old by now:  quiet, though the tool listed it when it wrote the page
      const toSee = "up1@2026-10-08T08:00 up2@2026-10-11T10:00 up3@2026-10-11T11:00"
      let host = await render(`<epic-phase id="p2" title="Two" status="active" to-see="${toSee}"></epic-phase>`)
      const pen = () => host.shadowRoot!.querySelector<HTMLElement>('[part~="changed"]')
      expect(pen()!.textContent).toBe("2")
      expect(pen()!.title).toContain("✓ Seen")
      expect(pen()!.title).toContain("3 days")
      // not reviewed:  no ✓
      expect(host.shadowRoot!.querySelector('[part~="seen-all"]')).toBeNull()
      // reviewed (the client adopted before it draws, as on a page):  the ✓ marks every new one Seen;  the pen goes
      await adoptSeenClient(routes)
      host = await render(`<epic-phase id="p2b" title="Two" status="active" to-see="${toSee}"></epic-phase>`)
      const all = await vi.waitFor(() => {
        const button = host.shadowRoot!.querySelector<HTMLElement>('[part~="seen-all"]')
        expect(button).not.toBeNull()
        return button!
      })
      expect(all.title).toContain("all 2 new updates")
      all.click()
      await vi.waitFor(() => expect(Object.keys(routes.inbox.marks).sort()).toEqual(["up2", "up3"]))
      await vi.waitFor(() => expect(pen()).toBeNull())
      expect(Object.values(routes.inbox.marks).map((mark) => mark.action)).toEqual(["seen", "seen"])
      // an older page:  `changes`, no `to-see` yet, counts as before;  a page the tool wrote with nothing new:  no pen
      const older = await render(`<epic-phase id="p3" title="Three" status="active" changes="2"></epic-phase>`)
      expect(older.shadowRoot!.querySelector('[part~="changed"]')!.textContent).toBe("2")
      const none = await render(`<epic-phase id="p4" title="Four" status="active"></epic-phase>`)
      expect(none.shadowRoot!.querySelector('[part~="changed"]')).toBeNull()
    } finally {
      ReviewClient.adopt(undefined)
      vi.useRealTimers()
    }
  })

  test('an older doc\'s lines (`slot="changes"`) still show, unboxed, at the end of its body', async () => {
    const host = await render(
      `<epic-phase id="p2" title="Two" status="todo" open><epic-field name="goal">Fixed.</epic-field>` +
        `<epic-updated slot="changes" at="2026-10-07 10:00" phase="1"><p>Split it.</p></epic-updated></epic-phase>`
    )
    const line = host.querySelector("epic-updated")!
    expect(line.assignedSlot?.name).toBe("changes")
    const body = host.shadowRoot!.querySelector('[part~="body"]')!
    expect(body.querySelector("slot:not([name])")!.compareDocumentPosition(line.assignedSlot!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })
})

describe("<epic-field>", () => {
  test("its icon and label before its prose;  Files and Verify hidden until a gear shows them", async () => {
    const section = await render<E.DOMElement>(
      `<epic-section id="phases" kind="phases" open><epic-phase id="p1" title="One" status="todo" open>` +
        `<epic-field name="goal"><p>Win.</p></epic-field><epic-field name="files">a.ts</epic-field>` +
        `</epic-phase></epic-section>`
    )
    const goal = section.querySelector('epic-field[name="goal"]')!
    const files = section.querySelector('epic-field[name="files"]')!
    expect(goal.shadowRoot!.querySelector('[part~="label"]')!.textContent).toBe("Goal:")
    expect(goal.shadowRoot!.querySelector('[part~="icon"]')).not.toBeNull()
    expect(getComputedStyle(files).display).toBe("none")
    const gear = await gearOf(section)
    await pickGear(gear, "Show each phase's files")
    expect(getComputedStyle(files).display).toBe("block")
    await pickGear(gear, "Show each phase's files")
    await expectAccessible(goal)
  })

  // epic `epic-engine` I166:  "In each phase header, that's the same for this phase"
  test("each phase's GEAR, last on its row:  its own files and checks, over the Phases section's for it", async () => {
    const section = await render<E.DOMElement>(
      `<epic-section id="phases" kind="phases" open>` +
        `<epic-phase id="p1" title="One" status="todo" estimate="1h" open><epic-field name="files">a.ts</epic-field>` +
        `<epic-field name="verify">yarn test</epic-field></epic-phase>` +
        `<epic-phase id="p2" title="Two" status="todo" open><epic-field name="files">b.ts</epic-field></epic-phase>` +
        `</epic-section>`
    )
    const [one, two] = Array.from(section.querySelectorAll("epic-phase"))
    const shown = () =>
      Array.from(section.querySelectorAll("epic-field"), (field) => getComputedStyle(field).display !== "none")
    const oneGear = await gearOf(one!)
    expect(oneGear.title).toBe("Settings for this phase")
    expect(oneGear.closest('[part~="tools"]')!.lastElementChild).toBe(oneGear)
    expect(gearEntries(oneGear)).toEqual(["Show this phase's files:  off", "Show this phase's checks:  off"])
    // this phase alone
    await pickGear(oneGear, "Show this phase's checks")
    expect(shown()).toEqual([false, true, false])
    expect(gearEntries(oneGear)).toEqual(["Show this phase's files:  off", "Show this phase's checks:  on"])
    expect(one!.matches(":state(open)")).toBe(true)
    // every phase's files, but this one's, which it hides
    await pickGear(await gearOf(section), "Show each phase's files")
    expect(shown()).toEqual([true, true, true])
    expect(gearEntries(await gearOf(two!))).toEqual(["Show this phase's files:  on", "Show this phase's checks:  off"])
    await pickGear(oneGear, "Show this phase's files")
    expect(shown()).toEqual([false, true, true])
    expect(JSON.parse(localStorage.getItem(`epic-phase-own-fields:${location.pathname}`)!)).toEqual({
      p1: { verify: true, files: false }
    })
    // every phase's again:  each phase's own choice of it forgotten
    await pickGear(await gearOf(section), "Show each phase's files")
    expect(shown()).toEqual([false, true, false])
    await pickGear(await gearOf(section), "Show each phase's files")
    expect(shown()).toEqual([true, true, true])
    // back as it was
    await pickGear(await gearOf(section), "Show each phase's files")
    await pickGear(oneGear, "Show this phase's checks")
    expect(shown()).toEqual([false, false, false])
    expect(localStorage.getItem(`epic-phase-own-fields:${location.pathname}`)).toBe("{}")
    await expectAccessible(section)
  })

  test("a labelled block in prose (`label`, P14):  `Where:` before its prose, no icon", async () => {
    const field = await render(`<epic-field label="Where"><p>The inbox file.</p></epic-field>`)
    expect(field.shadowRoot!.querySelector('[part~="label"]')!.textContent).toBe("Where:")
    expect(field.shadowRoot!.querySelector('[part~="icon"]')).toBeNull()
    expect(field.querySelector("p")!.assignedSlot).not.toBeNull()
    await expectAccessible(field)
  })

  // epic `epic-engine` P45:  `<epic-mark>`s, which draw their own chips (the field wrote `data-spell-state` before)
  test("To review:  its marks, each in its item's state colour, laid out in its prose", async () => {
    const field = await render(
      `<div><epic-field name="to-review"><epic-mark item="j9" link></epic-mark>, <epic-mark item="q9" link></epic-mark>, ` +
        `<epic-mark item="i9" link></epic-mark></epic-field>` +
        `<p id="j9" state="attention"></p><p id="q9" status="decided"></p><p id="i9" status="canceled"></p></div>`,
      "epic-field"
    )
    await ElementFixture.tick()
    const chips = Array.from(field.querySelectorAll("epic-mark"), (mark) =>
      mark.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
    )
    // without a `state`:  decided green for good, canceled grey (no longer relevant)
    expect(chips.map((chip) => chip.dataset.state)).toEqual(["attention", "recent", "old"])
    expect(field.textContent).toBe(", , ")
    // on the label's line, after it
    const label = field.shadowRoot!.querySelector('[part~="label"]')!.getBoundingClientRect()
    const first = chips[0]!.getBoundingClientRect()
    expect(first.left).toBeGreaterThan(label.right)
    expect(Math.abs((first.top + first.bottom) / 2 - (label.top + label.bottom) / 2)).toBeLessThan(2)
  })
})

// epic `epic-engine`, r31 (Owen, 2026-10-25):  "this needs to be collapsable ... smaller with click to show in modal"
describe("<epic-field> requests", () => {
  /** A 400 x 300 PNG, drawn on a canvas:  bigger than a thumbnail both ways. */
  function screenshot(): string {
    const canvas = document.createElement("canvas")
    Object.assign(canvas, { width: 400, height: 300 })
    canvas.getContext("2d")!.fillRect(0, 0, 400, 300)
    return canvas.toDataURL("image/png")
  }

  /** A Requests field holding one request, as `epic file` writes it, with a screenshot. */
  async function renderRequest(): Promise<E.DOMElement> {
    const src = screenshot()
    const field = await render<E.DOMElement>(
      `<epic-field name="requests"><epic-field label="r31 · debut (ad62dff0)">` +
        `<blockquote><p>Make these foldable.</p></blockquote><p>Sent 2026-10-25 14:05;  request.md</p>` +
        `<p><a href="${src}" target="shot"><img src="${src}" alt="r31, screenshot 1" style="max-width: 100%" /></a></p>` +
        `</epic-field></epic-field>`,
      "epic-field[label]"
    )
    await field.querySelector("img")!.decode()
    return field
  }

  test("a request folds:  folded to start with, its title row opens it, Enter on its chevron folds it again", async () => {
    const request = await renderRequest()
    const shadow = request.shadowRoot!
    const body = shadow.querySelector<HTMLElement>('[part~="body"]')!
    const button = shadow.querySelector<HTMLButtonElement>('[part~="toggle"]')!
    // its label as the title, without a colon;  the prose folded, find-in-page still reaching it
    expect(shadow.querySelector('[part~="label"]')!.textContent).toBe("r31 · debut (ad62dff0)")
    expect([request.hasAttribute("open"), body.getAttribute("hidden"), button.getAttribute("aria-expanded")]).toEqual([
      false,
      "until-found",
      "false"
    ])
    expect(request.matches(":state(request)")).toBe(true)
    // a click on the label opens it:  its `open` attribute, page state the live patch keeps
    ;(shadow.querySelector('[part~="label"]') as HTMLElement).click()
    await ElementFixture.tick()
    expect([request.hasAttribute("open"), body.hasAttribute("hidden"), request.matches(":state(open)")]).toEqual([
      true,
      false,
      true
    ])
    button.focus()
    await userEvent.keyboard("{Enter}")
    await ElementFixture.tick()
    expect([request.hasAttribute("open"), body.getAttribute("hidden")]).toEqual([false, "until-found"])
    // an `open` written from outside (a live patch carrying it, a restore):  it follows
    request.setAttribute("open", "")
    await ElementFixture.tick()
    expect(body.hasAttribute("hidden")).toBe(false)
    await expectAccessible(request)
  })

  test("only a labelled field right inside Requests folds:  a Where block stays a plain labelled block", async () => {
    const field = await render(`<epic-field label="Where"><p>The inbox file.</p></epic-field>`)
    expect([field.matches(":state(request)"), field.shadowRoot!.querySelector('[part~="toggle"]')]).toEqual([
      false,
      null
    ])
  })

  test("its screenshot is a thumbnail;  a click shows it full size in the page's <ui-zoom>, not its link;  Escape closes it", async () => {
    const request = await renderRequest()
    request.setAttribute("open", "")
    await ElementFixture.tick()
    const image = request.querySelector("img")!
    const box = image.getBoundingClientRect()
    expect([box.width <= 200.5, box.height <= 140.5, getComputedStyle(image).borderTopStyle]).toEqual([
      true,
      true,
      "solid"
    ])
    const followed = vi.fn((event: Event) => event.defaultPrevented)
    document.addEventListener("click", followed, { once: true })
    image.click()
    await ElementFixture.tick()
    // the link isn't followed:  the click's default is prevented
    expect(followed).toHaveReturnedWith(true)
    // the page's ONE zoom (`ImageZoom`), made at the end of `<body>`
    const zoom = document.querySelector<E.DOMElement>("body > ui-zoom")!
    await zoom.ready
    const modal = zoom.shadowRoot!.querySelector<E.DOMElement>('[part~="base"]')!
    await modal.ready
    await ElementFixture.tick()
    expect(modal.hasAttribute("visible")).toBe(true)
    const zoomed = zoom.shadowRoot!.querySelector<HTMLImageElement>('[part~="image"]')!
    expect([zoomed.src === image.src, zoomed.alt]).toEqual([true, "r31, screenshot 1, full size"])
    await userEvent.keyboard("{Escape}")
    await vi.waitFor(() => expect(modal.hasAttribute("visible")).toBe(false))
    expect([zoom.hasAttribute("src"), zoom.shadowRoot!.querySelector('[part~="image"]')]).toEqual([false, null])
    zoom.remove()
  })
})

describe("<epic-updated> (retired:  migrated to <epic-update>)", () => {
  test("an older doc's, fenced:  its icon, `Updated`, its time to the minute (`10/6/26 14:30`) and the phase, then its prose", async () => {
    const host = await render(`<epic-updated at="2026-10-06T14:30:12" phase="3"><p>Changed.</p></epic-updated>`)
    const label = host.shadowRoot!.querySelector('[part~="label"]')!
    expect(label.textContent!.replace(/\s+/g, " ").trim()).toBe("Updated 10/6/26 14:30during P3")
    expect(getComputedStyle(host.shadowRoot!.querySelector('[part~="base"]')!).borderTopStyle).toBe("dashed")
    expect(host.querySelector("p")!.assignedSlot).not.toBeNull()
    await expectAccessible(host)
  })
})

// epic `epic-workflow` P25:  the page's own buttons in the title row, where the docs runtime puts the bullhorn too
describe("<epic-phase> actions slot", () => {
  // P25:  the page's own buttons at the title's end, before its fold
  test('`slot="actions"`:  at the title\'s end, the chevron at its start;  a click never folds it', async () => {
    const host = await render(
      `<epic-phase id="p-one" title="One" status="active"><button slot="actions" aria-label="Copy">C</button></epic-phase>`
    )
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    expect(host.shadowRoot!.querySelector('[part~="tools"]')!.contains(button.assignedSlot)).toBe(true)
    const chevron = inner(host).shadowRoot!.querySelector('[part~="fold-icon"]')!
    const header = inner(host).shadowRoot!.querySelector('[part~="header"]')!
    const [b, fold, words] = [button, chevron, header].map((each) => each.getBoundingClientRect())
    expect([words.right <= b.left + 0.5, fold.right <= words.left + 0.5]).toEqual([true, true])
    button.click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(false)
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

// Owen, 2026-10-19:  "always show the full title, wrapped" (J183's "ellipsis when collapsed" before)
describe("<epic-phase> title, folded and open", () => {
  test("in full, wrapped, folded and open, no tooltip;  the pen on its first line;  nothing moves as it opens", async () => {
    const host = await render(
      `<div style="width: 320px"><epic-section id="phases" kind="phases" open>` +
        `<epic-phase id="p-long" title="A long title that cannot fit on one line of the narrow side bar, so it wraps, folded or open" status="active" changes="2"><button slot="actions" aria-label="Copy">C</button></epic-phase>` +
        `</epic-section></div>`,
      "#p-long"
    )
    const header = host.shadowRoot!.querySelector<HTMLElement>(".header")!
    const words = host.shadowRoot!.querySelector<HTMLElement>(".words")!
    const pen = host.shadowRoot!.querySelector<HTMLElement>('[part~="changed"]')!
    const button = host.querySelector<HTMLElement>("button[slot=actions]")!
    const lineHeight = parseFloat(getComputedStyle(words).lineHeight)
    const folded = { top: firstLineTop(words), button: button.getBoundingClientRect() }
    expect(header.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5)
    expect(words.scrollWidth).toBeLessThanOrEqual(words.clientWidth)
    expect(header.hasAttribute("title")).toBe(false)
    // the pen:  whole, inside the title's box, after the words, on their first line
    const [penBox, headerBox, wordsBox] = [pen, header, words].map((each) => each.getBoundingClientRect())
    expect([
      penBox.width > 0,
      penBox.right <= headerBox.right + 0.5,
      penBox.left >= wordsBox.right - 0.5,
      penBox.top < folded.top + lineHeight
    ]).toEqual([true, true, true, true])
    inner(host).shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!.click()
    await ElementFixture.tick()
    expect(host.matches(":state(open)")).toBe(true)
    expect(header.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5)
    expect(header.hasAttribute("title")).toBe(false)
    // open, a drawer (I115):  nothing moves, room only below it (Owen, 2026-10-25)
    expect(firstLineTop(words) - folded.top).toBeCloseTo(0, 0)
    // collapse-all shows only while open (as before P25), so the slot's button keeps its height, not its x
    expect(button.getBoundingClientRect().top - folded.button.top).toBeCloseTo(0, 0)
  })
})

// epic `epic-engine` I161 (Owen, 2026-10-29:  "holding down option is 'expand all'"):  no toggle-all in the row
describe("<epic-phase> ⌥-click", () => {
  test("⌥-click on its chevron opens the phase and its items;  again, folds them and it", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-phase id="p2" title="Two" status="todo"><epic-item id="t1" title="Do it" status="open"><p>How.</p>` +
        `</epic-item></epic-phase>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    expect(host.shadowRoot!.querySelector('[part~="toggle-all"]')).toBeNull()
    const toggle = inner(host).shadowRoot!.querySelector<HTMLButtonElement>('[part~="toggle"]')!
    const altClick = () =>
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
    altClick()
    await vi.waitFor(() => expect(host.querySelector("epic-item")!.matches(":state(open)")).toBe(true))
    expect(host.matches(":state(open)")).toBe(true)
    altClick()
    await ElementFixture.tick()
    expect([host.matches(":state(open)"), host.querySelector("epic-item")!.matches(":state(open)")]).toEqual([
      false,
      false
    ])
  })
})

// epic `epic-engine` I161 (Owen, 2026-10-29:  "Should show pointer when over content in these headers, drag cursor when
// over whitespace")
describe("<epic-phase> its title row's cursors", () => {
  /** The cursor over each piece of `phase`'s title row. */
  function cursors(phase: Element) {
    const section = inner(phase).shadowRoot!
    const at = (selector: string, root: ParentNode = section) => getComputedStyle(root.querySelector(selector)!).cursor
    return {
      space: at('[part~="heading"]'),
      row: at('[part~="title"]'),
      chevron: at('[part~="toggle"]'),
      time: at('[part~="estimate"]', phase.shadowRoot!)
    }
  }

  test("a to-do phase on a reviewed page:  grab over the empty space, the pointer over its content", async () => {
    await adoptWorking([])
    try {
      const section = await render(
        `<epic-section id="phases" kind="phases">` +
          `<epic-phase id="p-todo" title="Send Countdown" status="todo" estimate="4-6h"></epic-phase>` +
          `<epic-phase id="p-done" title="Built" status="done" estimate="2h"></epic-phase></epic-section>`
      )
      const todo = section.querySelector("#p-todo")!
      await vi.waitFor(() => expect(todo.matches(":state(movable)")).toBe(true))
      expect(cursors(todo)).toEqual({ space: "grab", row: "grab", chevron: "pointer", time: "pointer" })
      // done:  it never drags, and a click on its empty space folds it:  the pointer all over
      expect(cursors(section.querySelector("#p-done")!)).toEqual({
        space: "pointer",
        row: "pointer",
        chevron: "pointer",
        time: "pointer"
      })
      // while a phase is dragged (`PhaseDrag` marks every phase):  grabbing, wherever the pointer is
      todo.setAttribute("data-dragging", "")
      expect(cursors(todo)).toEqual({ space: "grabbing", row: "grabbing", chevron: "grabbing", time: "grabbing" })
    } finally {
      ReviewClient.adopt(undefined)
    }
  })

  test("not reviewed:  the pointer all over, as a click anywhere on the row folds it", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-phase id="p3" title="Three" status="todo" estimate="1h"></epic-phase>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    expect(cursors(host)).toEqual({ space: "pointer", row: "pointer", chevron: "pointer", time: "pointer" })
  })
})

/** The review routes' `mark`, as `fetch`, over an inbox kept here (epic `epic-engine` I168):  each reply the whole inbox. */
class SeenRoutes {
  inbox = {
    marks: {} as Record<string, { action: string; at: string }>,
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: {},
    listening: null,
    unsentComments: [],
    waitingComments: [],
    woken: null,
    doing: null
  }

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    if (input.replace(/\?.*/, "").endsWith("/mark")) {
      const body = JSON.parse(init!.body as string) as { id: string; mark: { action: string } | null }
      if (body.mark) this.inbox.marks[body.id] = { ...body.mark, at: new Date().toISOString() }
      else delete this.inbox.marks[body.id]
    }
    return new Response(JSON.stringify(this.inbox), { headers: { "content-type": "application/json" } })
  })
}

/** A started, served client on `routes`, adopted as the page's:  the page is reviewed. */
async function adoptSeenClient(routes: SeenRoutes): Promise<void> {
  const client = new ReviewClient({
    page: "/epics/demo/demo.plan.html",
    server: { token: "token" },
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
}
