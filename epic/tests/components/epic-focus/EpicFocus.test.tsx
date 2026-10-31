import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, SendCountdown, type Inbox } from "spell/epic/review"
import { FocusList } from "spell/epic/components/epic-focus/FocusList"
import { FocusPlace } from "spell/epic/components/epic-focus/FocusPlace"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-menu"
import "spell/ui/components/ui-modal"
import "spell/ui/components/ui-section"
import "spell/ui/components/ui-popup"
import "spell/ui/components/ui-theme-menu"
import "spell/ui/components/ui-breadcrumbs"
import "spell/epic/components/epic-page"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-item"
import "spell/epic/components/epic-review"
import "spell/epic/components/epic-focus"
// the note box is a `<ui-textarea grow>`:  `<ui-root>` loads it on a page
import "spell/ui/components/ui-input"

////////////////
// ## The page
////////////////

/** The fixtures folder of the section's tests:  a part file for an item's text. */
const FIXTURES = new URL("../epic-section/fixtures", import.meta.url).pathname

/**
 * A page with one of each:  a done phase, a plan waiting (red), a scheduled one (dotted blue);  a red question, a
 * yellow one, a decided one;  a todo with its text in a part file;  two tests, M2 first in Owen's order.
 */
const PAGE_HTML = `<epic-page epic="demo" title="Demo">
  <epic-section id="phases" kind="phases">
    <epic-phase id="p-one" title="One" status="done"></epic-phase>
    <epic-phase id="p-two" title="Two" status="todo" plan="waiting"></epic-phase>
    <epic-phase id="p-three" title="Three" status="todo"></epic-phase>
  </epic-section>
  <epic-section id="decisions" kind="questions">
    <epic-item id="q1" title="First question" status="open" state="attention"><p class="text">Its text.</p><p>See <a href="#q2">Q2</a>.</p></epic-item>
    <epic-item id="q2" title="Second question" status="open" state="open"></epic-item>
    <epic-item id="q3" title="Decided" status="decided" state="recent"></epic-item>
  </epic-section>
  <epic-section id="todos" kind="todos">
    <epic-item id="t1" title="A todo" status="open" state="open" source="${FIXTURES}/part.html"></epic-item>
  </epic-section>
  <epic-section id="tests" kind="tests">
    <epic-item id="m1" title="Test one" status="open" state="open" prepared="2"></epic-item>
    <epic-item id="m2" title="Test two" status="open" state="open" prepared="1"></epic-item>
  </epic-section>
</epic-page>`

/** The review routes, as `fetch`, over an inbox kept here:  each reply the whole inbox;  `posts` every POST. */
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
  posts: [string, Record<string, unknown>][] = []

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (route !== "inbox") {
      const body = JSON.parse(init!.body as string) as Record<string, unknown>
      this.posts.push([route, body])
      if (route === "mark") {
        const { id, mark } = body as { id: string; mark: Inbox["marks"][string] | null }
        if (mark) this.inbox.marks[id] = { ...mark, at: new Date().toISOString() }
        else delete this.inbox.marks[id]
      }
    }
    return new Response(JSON.stringify(this.inbox), { headers: { "content-type": "application/json" } })
  })
}

let routes: FakeRoutes

/** A started client on `routes`, adopted as the page's:  the page is reviewed. */
async function adoptClient() {
  const client = new ReviewClient({
    page: "/epics/demo/demo.plan.html",
    server: { token: "token" },
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
  return client
}

/** The page, reviewed and settled. */
async function render(html = PAGE_HTML): Promise<E.DOMElement> {
  const host = await ElementFixture.render<E.DOMElement>(html)
  await ElementFixture.settle(host)
  await vi.waitFor(() => expect(focusOf(host)).not.toBeNull())
  await ElementFixture.settle(focusOf(host)!)
  return host
}

/** The page's Focus mode. */
function focusOf(host: Element) {
  return host.shadowRoot!.querySelector<E.DOMElement & { show(ask?: object): void; open: boolean }>("epic-focus")
}

/** Open Focus mode (as the gear's row does), and let it draw. */
async function open(host: Element, ask?: object) {
  focusOf(host)!.show(ask)
  await vi.waitFor(() => expect(focusOf(host)!.open).toBe(true))
  await ElementFixture.tick()
  await ElementFixture.tick()
}

/** What Focus mode shows:  its tabs (kind and count), where you are, the item's head. */
function shows(host: Element) {
  const shadow = focusOf(host)!.shadowRoot!
  return {
    tabs: Array.from(shadow.querySelectorAll<HTMLElement>(".tabs ui-item"), (item) => [
      item.dataset.kind,
      item.querySelector("ui-label")!.textContent
    ]),
    selected: shadow.querySelector<HTMLElement>(".tabs ui-item[selected]")?.dataset.kind,
    where: shadow.querySelector(".where")?.textContent ?? "",
    head: [".head .chip", ".head .title"]
      .map((part) => shadow.querySelector(part)?.textContent ?? "")
      .join(" ")
      .trim()
  }
}

/** Focus mode's `name` button (`back`, `next`). */
function control(host: Element, name: "back" | "next" | "close"): HTMLElement {
  return focusOf(host)!.shadowRoot!.querySelector<HTMLElement>(`ui-button.${name}`)!
}

/** Click Focus mode's `name` button, and let it draw. */
async function press(host: Element, name: "back" | "next" | "close") {
  control(host, name).click()
  await ElementFixture.tick()
  await ElementFixture.tick()
}

beforeEach(() => {
  localStorage.clear()
  routes = new FakeRoutes()
  // the page's own countdown, off:  nothing sends by itself
  const countdown = new SendCountdown({ storage: null })
  countdown.choose("off")
  SendCountdown.adopt(countdown)
})

afterEach(() => {
  ReviewClient.adopt(undefined)
  SendCountdown.adopt(undefined)
  localStorage.clear()
})

describe("<epic-focus>", () => {
  test("walks the open items by the page's colours, a tab per kind (P, Q, T, then M), tests in Owen's order;  axe", async () => {
    await adoptClient()
    const host = await render()
    await open(host)
    expect(shows(host)).toEqual({
      // the done phase, the decided question left out
      tabs: [
        ["phases", "2"],
        ["questions", "2"],
        ["todos", "1"],
        ["tests", "2"]
      ],
      selected: "phases",
      where: "1 of 7 · Phases 1 of 2",
      head: "P2 Two"
    })
    const walked: string[] = [shows(host).head]
    for (let step = 0; step < 6; step++) {
      await press(host, "next")
      walked.push(shows(host).head)
    }
    expect(walked).toEqual([
      "P2 Two",
      "P3 Three",
      "Q1 First question",
      "Q2 Second question",
      "T1 A todo",
      // prepared 1, then 2
      "M2 Test two",
      "M1 Test one"
    ])
    // the last:  Next has nowhere to go
    expect(control(host, "next").hasAttribute("disabled")).toBe(true)
    expect(shows(host).where).toBe("7 of 7 · Tests 2 of 2")
    await expectAccessible(focusOf(host)!)
  })

  test("Back and Next, ← and →, across tabs;  a tab's click lands on its first;  not while typing", async () => {
    await adoptClient()
    const host = await render()
    await open(host)
    const shadow = focusOf(host)!.shadowRoot!
    shadow.querySelector<HTMLElement>('.tabs ui-item[data-kind="questions"]')!.click()
    await ElementFixture.tick()
    expect(shows(host).head).toBe("Q1 First question")
    const key = (name: string, target: Element = shadow.querySelector(".focus")!) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, composed: true }))
    key("ArrowLeft")
    await ElementFixture.tick()
    expect(shows(host).head).toBe("P3 Three")
    key("ArrowRight")
    key("ArrowRight")
    await ElementFixture.tick()
    expect(shows(host).where).toBe("4 of 7 · Questions 2 of 2")
    // in the note box, the arrows are its own
    const note = await vi.waitFor(() => {
      const field = shadow
        .querySelector('epic-review[shows="note"]')!
        .shadowRoot!.querySelector("ui-textarea")
        ?.shadowRoot?.querySelector("textarea")
      expect(field).not.toBeNull()
      return field!
    })
    key("ArrowLeft", note)
    await ElementFixture.tick()
    expect(shows(host).head).toBe("Q2 Second question")
    await press(host, "back")
    expect(shows(host).head).toBe("Q1 First question")
  })

  test("its text:  a copy of the page's, from its part file when it has one;  the page's item stays put", async () => {
    await adoptClient()
    const host = await render()
    await open(host, { tab: "questions", item: "q1" })
    const body = () => focusOf(host)!.shadowRoot!.querySelector(".body")!
    await vi.waitFor(() => expect(body().querySelector(".text")?.textContent).toBe("Its text."))
    // a copy:  the page's own text is still in its item
    expect(host.querySelector("#q1 .text")).not.toBeNull()
    await open(host, { tab: "todos" })
    await vi.waitFor(() => expect(body().querySelector(".body")?.textContent).toBe("A body, from its part file."))
    expect(host.querySelector("#t1 .body")).toBeNull()
  })

  test("a link in its text closes it, and lands on the page", async () => {
    await adoptClient()
    history.replaceState(null, "", location.pathname)
    const host = await render()
    await open(host, { tab: "questions", item: "q1" })
    const body = focusOf(host)!.shadowRoot!.querySelector(".body")!
    const link = await vi.waitFor(() => {
      const found = body.querySelector<HTMLAnchorElement>('a[href="#q2"]')
      expect(found).not.toBeNull()
      return found!
    })
    link.click()
    await vi.waitFor(() => expect(focusOf(host)!.open).toBe(false))
    await vi.waitFor(() => expect(location.hash).toBe("#q2"))
    history.replaceState(null, "", location.pathname)
  })

  test("its buttons are the page's:  the same mark, on the same client;  the item stays showing", async () => {
    await adoptClient()
    const host = await render()
    await open(host, { tab: "questions", item: "q1" })
    const buttons = focusOf(host)!.shadowRoot!.querySelector('epic-review[shows="buttons"]')!
    expect(buttons.getAttribute("buttons")).toBe("item")
    const approve = await vi.waitFor(() => {
      const found = buttons.shadowRoot!.querySelector<HTMLElement>('ui-button[data-action="approve"]')
      expect(found).not.toBeNull()
      return found!
    })
    approve.click()
    await vi.waitFor(() => expect(routes.posts.find(([route]) => route === "mark")?.[1]).toMatchObject({ id: "q1" }))
    expect(routes.inbox.marks.q1?.action).toBe("approve")
    await ElementFixture.tick()
    expect(shows(host).head).toBe("Q1 First question")
    // a waiting plan's buttons on a phase, as its row draws them
    await open(host, { tab: "phases", item: "p-two" })
    expect(focusOf(host)!.shadowRoot!.querySelector('epic-review[shows="buttons"]')!.getAttribute("buttons")).toBe(
      "plan"
    )
  })

  test("the chips filter the tab, remembered;  an item Claude closes while you're on it stays until you move on", async () => {
    await adoptClient()
    const host = await render()
    await open(host, { tab: "questions", item: "q2" })
    const chips = () =>
      focusOf(host)!.shadowRoot!.querySelector('[part~="chips"]')!.shadowRoot!.querySelectorAll<HTMLElement>("button")
    await vi.waitFor(() => expect(chips().length).toBe(2))
    // everything showing, a click on red:  only red;  the yellow Q2 showing goes, to the tab's first
    Array.from(chips())
      .find((chip) => chip.dataset.state === "attention")!
      .click()
    await ElementFixture.tick()
    expect(shows(host)).toMatchObject({ head: "Q1 First question", where: "3 of 6 · Questions 1 of 1" })
    expect(FocusPlace.read(location.pathname).shown).toEqual({ questions: ["attention"] })
    // Claude decides Q1 while it shows:  it stays
    host.querySelector("#q1")!.setAttribute("status", "decided")
    host.querySelector("#q1")!.setAttribute("state", "recent")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(shows(host).head).toBe("Q1 First question")
    // moved on, it's gone
    await press(host, "next")
    expect(shows(host).head).toBe("T1 A todo")
    await press(host, "back")
    expect(shows(host).head).toBe("P3 Three")
  })

  test("keeps its place across a reload:  open, its tab, its item", async () => {
    await adoptClient()
    const first = await render()
    await open(first, { tab: "tests" })
    expect(shows(first).head).toBe("M2 Test two")
    await press(first, "next")
    expect(FocusPlace.read(location.pathname)).toMatchObject({ open: true, tab: "tests", item: "m1" })
    first.remove()
    const again = await render()
    await vi.waitFor(() => expect(focusOf(again)!.open).toBe(true))
    await ElementFixture.tick()
    expect(shows(again).head).toBe("M1 Test one")
  })
})

describe("FocusList", () => {
  test("by the page's own colour per item:  open ones only, kinds by the id's letter, a limit left out", () => {
    const page = document.createElement("div")
    page.innerHTML = `<epic-section kind="todos">
      <epic-item id="t1" state="open"></epic-item><epic-item id="t2" state="old"></epic-item>
      <epic-item id="t3" state="open" limit></epic-item><epic-item id="j1" state="attention"></epic-item>
    </epic-section>`
    const entries = FocusList.of(page, {
      stateOf: (element) => element.getAttribute("state") ?? "",
      isMarked: () => false
    })
    expect(entries.map((entry) => [entry.id, entry.kind])).toEqual([
      ["t1", "todos"],
      ["j1", "judgements"]
    ])
    // the chips:  the pinned, the marked and the blue never hide
    const pinned = FocusList.of(
      page,
      { stateOf: (element) => element.getAttribute("state") ?? "", isMarked: () => false },
      "t2"
    )
    expect(FocusList.visible(pinned, { todos: ["attention"] }, "t2").map((entry) => entry.id)).toEqual(["t2", "j1"])
  })
})
