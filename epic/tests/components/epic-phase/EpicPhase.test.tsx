import { describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { E } from "spell-ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-ui/components/ui-section"
import "spell-epic/components/epic-section"
import "spell-epic/components/epic-phase"
import "spell-epic/components/epic-update"
import "spell-epic/components/epic-item"
import "spell-epic/components/epic-mark"
import "spell-ui/components/ui-modal"

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
  test("its icon and label before its prose;  Files and Verify hidden until the Phases toggles show them", async () => {
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
    section.shadowRoot!.querySelector<HTMLButtonElement>("button.toggle")!.click()
    await ElementFixture.tick()
    expect(getComputedStyle(files).display).toBe("block")
    section.shadowRoot!.querySelector<HTMLButtonElement>("button.toggle")!.click()
    await ElementFixture.tick()
    await expectAccessible(goal)
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

  test("its screenshot is a thumbnail;  a click shows it full size in the page's <epic-zoom>, not its link;  Escape closes it", async () => {
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
    const zoom = document.querySelector<E.DOMElement>("body > epic-zoom")!
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

// Owen, 2026-10-20:  "This should have an 'Expand all' next to collapse all"
describe("<epic-phase> toggle-all", () => {
  test("folded or open, last before the chevron;  a click opens the phase and its items, the next folds them", async () => {
    const host = await ElementFixture.render<E.DOMElement>(
      `<epic-phase id="p2" title="Two" status="todo"><epic-item id="t1" title="Do it" status="open"><p>How.</p>` +
        `</epic-item></epic-phase>`
    )
    await inner(host).ready
    await ElementFixture.settle(host)
    const tools = host.shadowRoot!.querySelector('[part~="tools"]')!
    const expand = tools.querySelector<HTMLButtonElement>('[part~="toggle-all"]')!
    expect([tools.lastElementChild === expand, expand.title]).toEqual([true, "Open everything in P1 · Two"])
    expand.click()
    await vi.waitFor(() => expect(host.querySelector("epic-item")!.matches(":state(open)")).toBe(true))
    expect(host.matches(":state(open)")).toBe(true)
    await ElementFixture.tick()
    // one button:  still last, now folding everything inside
    expect([tools.lastElementChild === expand, expand.title]).toEqual([true, "Fold everything in P1 · Two"])
    expand.click()
    await vi.waitFor(() => expect(host.querySelector("epic-item")!.matches(":state(open)")).toBe(false))
    expect(host.matches(":state(open)")).toBe(true)
  })
})
