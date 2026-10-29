import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-button"
import "spell/epic/components/epic-update"

/** The clock every test reads:  the day after the blocks below were written (2026-10-11), so they're new. */
const TODAY = new Date(2026, 9, 12, 9, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
  ReviewClient.adopt(undefined)
})

describe("<epic-update>", () => {
  test("bare:  an inline orange UPDATE label, its phase in its tooltip", async () => {
    const root = await ElementFixture.render(`<p>Changed <epic-update phase="5"></epic-update></p>`)
    const update = root.querySelector("epic-update")!
    const label = update.shadowRoot!.querySelector('[part~="label"]')!
    expect({ text: label.textContent, tip: label.getAttribute("title") }).toEqual({
      text: "UPDATE",
      tip: "Changed during P5"
    })
    expect(update.matches(":state(block)")).toBe(false)
    expect(getComputedStyle(update).display).toBe("inline-block")
    await expectAccessible(root)
  })

  test("a block:  `Update: <summary>`, the date at the right of the title row, what changed under it", async () => {
    const update = await ElementFixture.render(
      `<epic-update at="2026-10-11 14:30" summary="Split P7 in two" phase="6"><p>Why it split.</p></epic-update>`
    )
    await ElementFixture.tick()
    const shadow = update.shadowRoot!
    expect(update.matches(":state(block)")).toBe(true)
    expect(update.matches(":state(open)")).toBe(true)
    expect(getComputedStyle(update).display).toBe("block")
    expect(shadow.querySelector('[part~="title"]')!.textContent).toBe("Update: Split P7 in two")
    expect(shadow.querySelector('[part~="title"] b')!.textContent).toBe("Update")
    const time = shadow.querySelector('[part~="time"]')!
    expect({ text: time.textContent, tip: time.getAttribute("title") }).toEqual({
      text: "10/11/26 14:30",
      tip: "2026-10-11 14:30 · Written during P6"
    })
    // the date on the title's right, on its first line
    const title = shadow.querySelector('[part~="title"]')!.getBoundingClientRect()
    const box = time.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(title.right - 0.5)
    expect(Math.abs(box.top - title.top)).toBeLessThan(6)
    expect(update.querySelector("p")!.assignedSlot).not.toBeNull()
    await expectAccessible(update.parentElement!)
  })

  test("a block folds by its title row:  what changed `until-found`, open again on a second click", async () => {
    const update = await ElementFixture.render(
      `<epic-update at="2026-10-11 14:30" summary="Moved"><p>Text</p></epic-update>`
    )
    await ElementFixture.tick()
    const shadow = update.shadowRoot!
    const button = shadow.querySelector<HTMLButtonElement>('[part~="toggle"]')!
    const body = shadow.querySelector('[part~="body"]')!
    expect(button.getAttribute("aria-expanded")).toBe("true")
    shadow.querySelector<HTMLElement>('[part~="header"]')!.click()
    await ElementFixture.tick()
    expect(body.getAttribute("hidden")).toBe("until-found")
    expect(update.matches(":state(open)")).toBe(false)
    button.click()
    await ElementFixture.tick()
    expect(body.hasAttribute("hidden")).toBe(false)
  })

  test("a summary alone:  a block with no fold, no body;  an older note (children, no summary):  `Update` alone", async () => {
    const root = await ElementFixture.render(
      `<div><epic-update at="2026-10-11" summary="Renamed"></epic-update>` +
        `<epic-update phase="2"><p>What changed.</p></epic-update></div>`
    )
    await ElementFixture.tick()
    const [summed, note] = Array.from(root.querySelectorAll("epic-update"))
    expect(summed!.matches(":state(block)")).toBe(true)
    expect(summed!.shadowRoot!.querySelector('[part~="toggle"]')).toBeNull()
    expect(summed!.shadowRoot!.querySelector('[part~="time"]')!.textContent).toBe("10/11/26")
    expect(note!.matches(":state(block)")).toBe(true)
    expect(note!.shadowRoot!.querySelector('[part~="title"]')!.textContent).toBe("Update")
    expect(note!.shadowRoot!.querySelector('[part~="time"]')).toBeNull()
    note!.replaceChildren()
    await new Promise(requestAnimationFrame)
    await ElementFixture.tick()
    expect(note!.matches(":state(block)")).toBe(false)
  })
})

// epic `epic-workflow` P25:  the page's own buttons in the title row, where the docs runtime puts the bullhorn too
describe("<epic-update> actions slot", () => {
  // P25:  the page's own buttons in the title row, where the docs runtime puts the bullhorn
  test("`slot=\"actions\"`:  on the title row's right, BEFORE the date;  a click never folds it, and isn't what changed", async () => {
    const update = await ElementFixture.render(
      `<epic-update at="2026-10-11 14:30" summary="Split P7"><p>Why.</p>` +
        `<button slot="actions" aria-label="Copy">C</button></epic-update>`
    )
    await ElementFixture.tick()
    const shadow = update.shadowRoot!
    const button = update.querySelector<HTMLElement>("button[slot=actions]")!
    expect(button.assignedSlot?.getAttribute("name")).toBe("actions")
    const [b, time, title] = [
      button,
      shadow.querySelector('[part~="time"]')!,
      shadow.querySelector('[part~="title"]')!
    ].map((each) => each.getBoundingClientRect())
    expect(b.right).toBeLessThanOrEqual(time.left + 0.5)
    expect(title.top).toBeLessThan(b.bottom)
    button.click()
    await ElementFixture.tick()
    expect(update.matches(":state(open)")).toBe(true)
    // a summary and a button, no children:  nothing to fold
    const alone = await ElementFixture.render(
      `<epic-update at="2026-10-11 14:30" summary="Alone"><button slot="actions">C</button></epic-update>`
    )
    await ElementFixture.tick()
    expect(alone.shadowRoot!.querySelector('[part~="toggle"]')).toBeNull()
    await expectAccessible(update)
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

describe("<epic-update> title, folded and open", () => {
  test("in full, wrapped, open (as it starts) and folded, no tooltip;  the date on its first line, nothing moves", async () => {
    const wrap = await ElementFixture.render(
      `<div style="width: 320px"><epic-update at="2026-10-11 14:30" summary="A long title that cannot fit on one line of the narrow side bar, so it wraps, folded or open"><p>Why.</p></epic-update></div>`
    )
    await ElementFixture.tick()
    const update = wrap.querySelector("epic-update")!
    const shadow = update.shadowRoot!
    const title = shadow.querySelector<HTMLElement>('[part~="title"]')!
    const time = shadow.querySelector<HTMLElement>('[part~="time"]')!
    const lineHeight =
      parseFloat(getComputedStyle(title).lineHeight) || parseFloat(getComputedStyle(title).fontSize) * 1.2
    const open = { top: firstLineTop(title), time: time.getBoundingClientRect() }
    expect([title.getBoundingClientRect().height > lineHeight * 1.5, title.hasAttribute("title")]).toEqual([
      true,
      false
    ])
    shadow.querySelector<HTMLElement>('[part~="toggle"]')!.click()
    await ElementFixture.tick()
    expect(update.matches(":state(open)")).toBe(false)
    expect([title.getBoundingClientRect().height > lineHeight * 1.5, title.hasAttribute("title")]).toEqual([
      true,
      false
    ])
    expect(firstLineTop(title)).toBeCloseTo(open.top, 0)
    expect(time.getBoundingClientRect().left).toBeCloseTo(open.time.left, 0)
  })
})

////////////////
// ## New, seen, quiet (epic `epic-engine` I168)
////////////////

// Owen, 2026-10-29:  "How do I clear these 'update' marks?"  He picked both:  a Seen on each, and quiet after 3 days

/** The review routes' `mark`, as `fetch`, over an inbox kept here:  each reply the whole inbox. */
class FakeRoutes {
  inbox: Inbox = {
    marks: {},
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: {},
    listening: null,
    lastListener: null,
    unsentComments: [],
    waitingComments: [],
    woken: null,
    doing: null
  }

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (route === "mark") {
      const body = JSON.parse(init!.body as string) as { id: string; mark: Inbox["marks"][string] | null }
      if (body.mark) this.inbox.marks[body.id] = { ...body.mark, at: new Date().toISOString() }
      else delete this.inbox.marks[body.id]
    }
    return new Response(JSON.stringify(this.inbox), { headers: { "content-type": "application/json" } })
  })
}

/** A started, served client on `routes`, adopted as the page's:  the page is reviewed. */
async function adoptClient(routes: FakeRoutes): Promise<ReviewClient> {
  const client = new ReviewClient({
    page: "/epics/sample/sample.plan.html",
    server: { token: "token" },
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
  return client
}

/** `update`'s Seen, in its `<epic-review>`'s shadow root;  `null` when not drawn. */
function seenButton(update: Element): HTMLElement | null {
  const review = update.shadowRoot!.querySelector("epic-review")
  return review?.shadowRoot?.querySelector<HTMLElement>('ui-button[data-action="seen"]') ?? null
}

describe("<epic-update> new, seen, quiet", () => {
  const BLOCK = `<epic-update id="up3" at="2026-10-11 14:30" summary="Split P7"><p>Why.</p></epic-update>`

  test("new:  orange, open;  3 days after `at`, quiet by itself:  grey, folded to its title row", async () => {
    const fresh = await ElementFixture.render(BLOCK)
    await ElementFixture.tick()
    expect([fresh.matches(":state(quiet)"), fresh.matches(":state(open)")]).toEqual([false, true])
    const orange = getComputedStyle(fresh.shadowRoot!.querySelector(".block")!).borderTopColor
    // just past 3 days:  quiet, as `<epic-change>` goes (the one rule, `PlanDates.isQuiet()`)
    vi.setSystemTime(new Date(2026, 9, 14, 14, 31))
    const old = await ElementFixture.render(BLOCK.replace("up3", "up4"))
    await ElementFixture.tick()
    expect([old.matches(":state(quiet)"), old.matches(":state(open)")]).toEqual([true, false])
    expect(old.shadowRoot!.querySelector('[part~="body"]')!.getAttribute("hidden")).toBe("until-found")
    expect(old.shadowRoot!.querySelector('[part~="title"]')!.textContent).toBe("Update: Split P7")
    expect(getComputedStyle(old.shadowRoot!.querySelector(".block")!).borderTopColor).not.toBe(orange)
    // still the record:  it opens on a click
    old.shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!.click()
    await ElementFixture.tick()
    expect(old.matches(":state(open)")).toBe(true)
    await expectAccessible(old)
  })

  test("`seen`:  quiet at once, whatever its age;  its date's tooltip says when", async () => {
    const update = await ElementFixture.render(BLOCK.replace(">", ' seen="2026-10-12 08:00">'))
    await ElementFixture.tick()
    expect([update.matches(":state(quiet)"), update.matches(":state(open)")]).toEqual([true, false])
    expect(update.shadowRoot!.querySelector('[part~="time"]')!.getAttribute("title")).toBe(
      "2026-10-11 14:30 · Seen 10/12/26 08:00"
    )
  })

  test("reviewed:  a ✓ Seen on a new block;  pressed, it's marked `seen` and folds to a grey line at once", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const update = await ElementFixture.render(BLOCK)
    await ElementFixture.settle()
    await vi.waitFor(() => expect(seenButton(update)).not.toBeNull())
    const button = seenButton(update)!
    expect(button.getAttribute("title")).toContain("fold it to one grey line")
    await expectAccessible(update)
    button.click()
    await vi.waitFor(() => expect(routes.inbox.marks.up3?.action).toBe("seen"))
    await vi.waitFor(() => expect(update.matches(":state(quiet)")).toBe(true))
    expect(update.matches(":state(open)")).toBe(false)
    // quiet:  no Seen to press
    expect(seenButton(update)).toBeNull()
  })

  test("no Seen:  a block not stamped (no `id`), one quiet already, or a page not reviewed", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const root = await ElementFixture.render(
      `<div>${BLOCK.replace(' id="up3"', "")}${BLOCK.replace(">", ' seen="2026-10-12 08:00">')}</div>`
    )
    await ElementFixture.settle()
    for (const update of root.querySelectorAll("epic-update")) expect(seenButton(update)).toBeNull()
    ReviewClient.adopt(undefined)
    const alone = await ElementFixture.render(BLOCK)
    await ElementFixture.settle()
    expect(seenButton(alone)).toBeNull()
  })
})
