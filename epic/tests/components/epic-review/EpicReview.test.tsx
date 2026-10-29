import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-section"
import "spell/epic/components/epic-item"
import "spell/epic/components/epic-choices"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-summary"
import "spell/epic/components/epic-overview"
// the note is a `<ui-textarea grow>`:  `<ui-root>` loads it on a page
import "spell/ui/components/ui-input"

////////////////
// ## Fakes
////////////////

const PAGE = "/epics/sample/sample.plan.html"

/**
 * The review routes, as `fetch`, over an inbox kept here:  each reply the whole inbox, as the routes answer.
 * - `posts`:  every POST's route and body
 */
class FakeRoutes {
  inbox: Inbox = {
    marks: {},
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
  posts: [string, Record<string, unknown>][] = []

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (route !== "inbox") this.answer(route, JSON.parse(init!.body as string) as Record<string, unknown>)
    if (route === "shot")
      return new Response(JSON.stringify({ shot: SHOT }), { headers: { "content-type": "application/json" } })
    return new Response(JSON.stringify(this.inbox), { headers: { "content-type": "application/json" } })
  })

  /** Change the inbox as the route would. */
  private answer(route: string, body: Record<string, unknown>) {
    this.posts.push([route, body])
    const id = body.id as string
    const at = new Date().toISOString()
    if (route === "mark") {
      const mark = body.mark as Inbox["marks"][string] | null
      if (mark) this.inbox.marks[id] = { ...mark, at }
      else delete this.inbox.marks[id]
      // as `ReviewInbox.setMark()`:  the note box's text is in the mark now, or gone with it
      if (!mark || mark.note !== undefined) delete this.inbox.drafts[id]
    }
    if (route === "urgency") {
      if (body.calm === null) delete this.inbox.urgency[id]
      else this.inbox.urgency[id] = { calm: body.calm as boolean, at }
    }
    if (route === "draft") {
      if (body.note) this.inbox.drafts[id] = { action: "revisit", note: body.note as string, at }
      else delete this.inbox.drafts[id]
    }
    if (route === "new") {
      const key = (body.id as string | undefined) ?? `new${Object.keys(this.inbox.marks).length + 1}`
      if (body.entry) this.inbox.marks[key] = { ...(body.entry as object), action: "new", at } as Inbox["marks"][string]
      else delete this.inbox.marks[key]
    }
    if (route === "now") {
      const action = body.action as "details" | "revisit" | "prepare"
      this.inbox.now.push({ id, action, at })
      this.inbox.marks[id] =
        action === "revisit"
          ? { action, when: "now", note: (body.note as string | undefined) ?? "", at }
          : { action, at }
    }
  }
}

let routes: FakeRoutes

/** The path the shot route answers (epic `epic-engine` P51). */
const SHOT = "tests/j9-20261029-1432.png"

/** A 1x1 PNG, as a pasted screenshot. */
const PNG_BYTES = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (char) => char.charCodeAt(0)
)

/** A started client on `routes`, adopted as the page's;  `server` none:  not served. */
async function adoptClient({ served = true } = {}) {
  const client = new ReviewClient({
    page: PAGE,
    server: served ? { token: "token" } : undefined,
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
  return client
}

/**
 * `host`'s shadow root, and the shadow roots of the `<epic-review>` / `<epic-new-item>` it draws:
 * where its review controls are.
 */
function rootsOf(host: Element): ParentNode[] {
  const root = host.shadowRoot!
  const inner = Array.from(root.querySelectorAll("epic-review, epic-new-item"), (it) => it.shadowRoot)
  return [root, ...inner.filter((it) => it !== null)]
}

/** Every match of `selector` in `roots`;  ` >>> ` steps into the shadow root of what's matched before it. */
function queryAll(roots: ParentNode[], selector: string): Element[] {
  const [first, ...rest] = selector.split(" >>> ")
  const found = roots.flatMap((root) => Array.from(root.querySelectorAll(first!)))
  return rest.length
    ? queryAll(
        found.flatMap((it) => it.shadowRoot ?? []),
        rest.join(" >>> ")
      )
    : found
}

/**
 * Queries over `host`'s review controls (`rootsOf()`), its own shadow root first:
 * `[part~='note-box'] >>> ui-textarea >>> textarea` is the textarea in its note box's shadow root.
 */
function deep(host: Element) {
  return {
    querySelector: <T extends Element = HTMLElement>(selector: string) =>
      (queryAll(rootsOf(host), selector)[0] ?? null) as T | null,
    querySelectorAll: <T extends Element = HTMLElement>(selector: string) => queryAll(rootsOf(host), selector) as T[]
  }
}

/** Render `html`, settled. */
async function render(html: string) {
  const host = await ElementFixture.render<E.DOMElement & { open: boolean }>(html)
  await ElementFixture.settle()
  return host
}

/** `host`'s review buttons' actions, in order. */
function actions(host: Element): string[] {
  return Array.from(deep(host).querySelectorAll<HTMLElement>("ui-button[data-action]"), (it) => it.dataset.action!)
}

/** `host`'s `action` button. */
function button(host: Element, action: string): HTMLElement {
  return deep(host).querySelector<HTMLElement>(`ui-button[data-action="${action}"]`)!
}

/** `host`'s note box buttons' `how`, in order. */
function noteButtons(host: Element): string[] {
  return Array.from(
    deep(host).querySelectorAll<HTMLElement>("[part~='note-box'] >>> button[data-how]"),
    (it) => it.dataset.how!
  )
}

/** Wait for the client's writes and Solid's updates. */
async function settle() {
  await vi.waitFor(() => expect(routes.fetch).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 20))
  await ElementFixture.tick()
}

beforeEach(() => {
  routes = new FakeRoutes()
})

afterEach(() => {
  ReviewClient.adopt(undefined)
})

////////////////
// ## Tests
////////////////

describe("<epic-item> review controls", () => {
  test("draw NOTHING unless the page is served with a token and its inbox answers", async () => {
    await adoptClient({ served: false })
    const host = await render(`<epic-item id="q1" title="A question" status="open"><p>Text</p></epic-item>`)
    expect(actions(host)).toEqual([])
    expect(deep(host).querySelector("textarea")).toBeNull()
  })

  test("Make Todo, Revisit, Approve in ONE group, no Do Now (Owen, 2026-10-25);  Approve marks it, dashed green, and saves", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="q1" title="A question" status="open"><p>Text</p></epic-item>`)
    expect(actions(host)).toEqual(["todo", "revisit", "approve"])
    expect(
      Array.from(deep(host).querySelectorAll("ui-buttons > ui-button"), (it) => (it as HTMLElement).dataset.action)
    ).toEqual(["todo", "revisit", "approve"])
    // the wand's gone:  nothing outside the group, no wand icon anywhere on the line
    expect(deep(host).querySelector(".review-controls > ui-button")).toBeNull()
    expect(deep(host).querySelector('ui-button[icon="wand magic sparkles"]')).toBeNull()
    expect(actions(host).map((action) => button(host, action).dataset.fill)).toEqual(["none", "none", "none"])
    button(host, "approve").click()
    await settle()
    expect(routes.inbox.marks.q1?.action).toBe("approve")
    expect([button(host, "approve").dataset.fill, button(host, "approve").dataset.color]).toEqual(["dashed", "green"])
  })

  test("a todo:  the plane (next phase), Revisit, the x (drop), one group;  no Approve or Make Todo", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="t4" title="A todo" status="open"><p>Text</p></epic-item>`)
    expect(actions(host)).toEqual(["next", "revisit", "drop"])
    expect(
      Array.from(deep(host).querySelectorAll<HTMLElement>("ui-buttons > ui-button"), (it) => it.dataset.action)
    ).toEqual(["next", "revisit", "drop"])
    expect(
      actions(host).map((action) => [
        button(host, action).getAttribute("icon"),
        button(host, action).dataset.color,
        button(host, action).title
      ])
    ).toEqual([
      [
        "paper plane",
        "green",
        "Do it in the next phase:  Queued into the next phase still to do, once Claude applies it"
      ],
      ["history", "blue", "Revisit:  I'm adding a note for you:  Write a note for Claude in the box at its end"],
      ["xmark", "grey", "Drop it:  Canceled, struck through, once Claude applies it"]
    ])
    // the plane marks it, dashed green, and so does its chip;  again, cleared
    button(host, "next").click()
    await settle()
    expect(routes.inbox.marks.t4?.action).toBe("next")
    const chip = deep(host).querySelector<HTMLElement>("[part~='id']")!
    // the chip keeps its state's colour, the mark's fill (2026-10-11)
    expect([button(host, "next").dataset.fill, chip.dataset.color, chip.dataset.fill]).toEqual([
      "dashed",
      undefined,
      "dashed"
    ])
    // the x:  the latest mark wins
    button(host, "drop").click()
    await settle()
    expect(routes.inbox.marks.t4?.action).toBe("drop")
    expect([button(host, "next").dataset.fill, button(host, "drop").dataset.fill, chip.dataset.color]).toEqual([
      "none",
      "dashed",
      undefined
    ])
    button(host, "drop").click()
    await settle()
    expect(routes.inbox.marks.t4).toBeUndefined()
    // other kinds keep theirs
    const call = await render(`<epic-item id="j4" title="A call" status="open"></epic-item>`)
    expect(actions(call)).toEqual(["todo", "revisit", "approve"])
  })

  test("a todo's note box:  the plane, Revisit Later, the x;  the plane takes the note along, as does the line's x", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="t5" title="A todo" status="open" open><p>Text</p></epic-item>`)
    const how = () =>
      Array.from(deep(host).querySelectorAll<HTMLElement>("[part~='note-box'] >>> button[data-how]"), (it) => [
        it.dataset.how,
        it.dataset.color
      ])
    expect(how()).toEqual([
      ["next", "green"],
      ["soon", "blue"],
      ["drop", "grey"]
    ])
    const note = deep(host).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    note.value = "after the merge"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    deep(host).querySelector<HTMLButtonElement>('button[data-how="next"]')!.click()
    await settle()
    expect(routes.inbox.marks.t5).toMatchObject({ action: "next", note: "after the merge" })
    expect(deep(host).querySelector("[part~='said'] >>> [part~='base']")!.textContent).toContain(
      "next phase · not sent yet"
    )
    // the line's x, with words in the box:  they go along
    const other = await render(`<epic-item id="t6" title="Another" status="open" open><p>Text</p></epic-item>`)
    const box = deep(other).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    box.value = "moot since P3"
    box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    button(other, "drop").click()
    await settle()
    expect(routes.inbox.marks.t6).toMatchObject({ action: "drop", note: "moot since P3" })
  })

  test("the fill:  a mark dashed until sent, then outlined;  Claude on it, its icon turns;  handled, they CLEAR", async () => {
    const before = new Date(Date.now() - 60_000).toISOString()
    routes.inbox.marks.j3 = { action: "revisit", when: "soon", note: "why?", at: before }
    routes.inbox.sent = new Date().toISOString()
    routes.inbox.working.j3 = { action: "revisit", since: new Date().toISOString() }
    await adoptClient()
    const host = await render(`<epic-item id="j3" title="A call" status="open" state="attention"></epic-item>`)
    await settle()
    const revisit = button(host, "revisit")
    expect([revisit.dataset.fill, revisit.dataset.color, revisit.hasAttribute("data-busy")]).toEqual([
      "outline",
      "blue",
      true
    ])
    // Claude's agent at work:  the chip is blue at once, before the script rewrites `state`
    expect(deep(host).querySelector("[part~='base']")!.classList.contains("progress")).toBe(true)
    // a request for now Claude did (`inbox done`):  its mark gone, every button a grey outline again;  the chip says the rest
    const done = await render(`<epic-item id="j4" title="Done" status="open" review-as="now"></epic-item>`)
    expect(actions(done).map((action) => button(done, action).dataset.fill)).toEqual(["none", "none", "none"])
  })

  test("a mark in flight:  the id chip ONE 2px dotted blue ring, red letters, whatever the mark;  no mark, solid;  light and dark", async () => {
    const before = new Date(Date.now() - 60_000).toISOString()
    routes.inbox.marks.m2 = { action: "approve", at: new Date().toISOString() }
    routes.inbox.marks.j8 = { action: "revisit", when: "soon", note: "why?", at: before }
    routes.inbox.marks.q9 = { action: "pick", pick: "B", at: before }
    routes.inbox.sent = new Date(Date.now() - 30_000).toISOString()
    await adoptClient()
    const look = async (html: string) => {
      const box = await render(html)
      const host = box.localName === "epic-item" ? box : box.querySelector("epic-item")!
      const chip = deep(host).querySelector<HTMLElement>("[part~='id']")!
      const button = deep(host).querySelector<HTMLElement>("ui-button:is([data-fill='dashed'], [data-fill='outline'])")
      const style = getComputedStyle(chip)
      return { box, chip, button, fill: chip.dataset.fill, color: chip.dataset.color, border: style.borderTopStyle }
    }
    const approved = await look(`<epic-item id="m2" title="Picked" status="open" state="open"></epic-item>`)
    // Owen, 2026-10-11 (J3 of epic-workflow):  the chip keeps the state the section's counts count, not the button's colour
    // marked in this pass (epic `epic-engine` P43;  Owen, 2026-10-25:  "red text, single blue 2px dotted"):  the mark's
    // fill stays in the data, but the chip draws one dotted ring in the badge's blue
    expect([approved.fill, approved.color, approved.border]).toEqual(["dashed", undefined, "dotted"])
    expect(approved.chip.hasAttribute("data-marked")).toBe(true)
    expect([approved.button?.dataset.fill, approved.button?.dataset.color]).toEqual(["dashed", "green"])
    expect(approved.chip.title).toMatch(/you chose Approve · not sent yet/)
    const revisited = await look(`<epic-item id="j8" title="Talk" status="open" state="attention"></epic-item>`)
    expect([revisited.fill, revisited.color, revisited.border]).toEqual(["outline", undefined, "dotted"])
    // the ring the same blue whatever the item's state;  an unmarked chip keeps its solid state colour
    const solid = await look(`<epic-item id="j99" title="Unmarked" status="open" state="attention"></epic-item>`)
    expect(getComputedStyle(revisited.chip).borderTopColor).toBe(getComputedStyle(approved.chip).borderTopColor)
    expect(solid.chip.hasAttribute("data-marked")).toBe(false)
    const picked = await look(`<epic-item id="q9" title="Which?" status="open" state="attention"></epic-item>`)
    expect([picked.fill, picked.color, picked.chip.title]).toEqual([
      "outline",
      undefined,
      expect.stringMatching(/you chose pick B · sent/)
    ])
    // no mark, or one Claude handled (`review-as`, its buttons cleared):  the state's colour, solid -- the result
    const plain = await look(
      `<epic-item id="q10" title="Seen" status="decided" state="recent" review-as="approve"></epic-item>`
    )
    expect([plain.fill, plain.color, plain.border, plain.button]).toEqual([undefined, undefined, "none", null])
    for (const scheme of ["color-scheme: light", "color-scheme: dark; background: #1b1c1d; color: CanvasText"]) {
      const { box } = await look(`<div style="${scheme}; padding: 4px">
        <epic-item id="m2" title="Picked" status="open" state="open"></epic-item>
        <epic-item id="j8" title="Talk" status="open" state="attention"></epic-item>
      </div>`)
      await expectAccessible(box)
    }
  })

  test("an old Do Now (`details`) queued:  no button for it;  the note box keeps Revisit Later and the x", async () => {
    // the inbox still holds an older page's request for now:  nothing on the line draws it (Owen, 2026-10-25)
    routes.inbox.now.push({ id: "q5", action: "details", at: new Date().toISOString() })
    await adoptClient()
    const host = await render(`<epic-item id="q5" title="A question" status="open" open><p>Text</p></epic-item>`)
    expect(actions(host)).toEqual(["todo", "revisit", "approve"])
    expect(actions(host).map((action) => button(host, action).dataset.fill)).toEqual(["none", "none", "none"])
    expect(
      Array.from(
        deep(host).querySelectorAll<HTMLElement>("[part~='note-box'] >>> button[data-how]"),
        (it) => it.dataset.how
      )
    ).toEqual(["soon", "skip"])
  })

  test("the note box's x, Skip This (Owen, 2026-10-09):  in place of Make Todo;  a skip mark, the chip dashed in its state's colour", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="j9" title="A call" status="open" open><p>Text</p></epic-item>`)
    const x = deep(host).querySelector<HTMLButtonElement>("[part~='note-box'] >>> button[data-how='skip']")!
    expect([x.dataset.color, x.title, x.getAttribute("aria-label")]).toEqual([
      "grey",
      "Skip this:  nothing to do, marked reviewed once Claude applies it;  a note here says why",
      "Skip this:  nothing to do, marked reviewed once Claude applies it;  a note here says why"
    ])
    expect(x.querySelector("ui-icon")!.getAttribute("name")).toBe("xmark")
    // the line keeps its Make Todo
    expect(actions(host)).toEqual(["todo", "revisit", "approve"])
    const note = deep(host).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    note.value = "covered by P3"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    x.click()
    await settle()
    expect(routes.inbox.marks.j9).toMatchObject({ action: "skip", note: "covered by P3" })
    expect(deep(host).querySelector("[part~='said'] >>> [part~='base']")!.textContent).toContain("skip · not sent yet")
    const chip = deep(host).querySelector<HTMLElement>("[part~='id']")!
    expect([chip.dataset.color, chip.dataset.fill]).toEqual([undefined, "dashed"])
    expect(chip.title).toMatch(/you chose Skip this · not sent yet/)
    // none of the line's buttons wears it
    expect(actions(host).map((action) => button(host, action).dataset.fill)).toEqual(["none", "none", "none"])
  })

  test("Revisit on an item without details:  a box under its line;  Later makes the note a mark, shown with Edit", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="j2" title="A bare call" status="open"></epic-item>`)
    button(host, "revisit").click()
    await settle()
    const note = deep(host).querySelector<HTMLTextAreaElement>(
      ".under-line [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    note.value = "why not reuse it?"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    deep(host).querySelector<HTMLButtonElement>('button[data-how="soon"]')!.click()
    await settle()
    expect(routes.inbox.marks.j2).toMatchObject({ action: "revisit", when: "soon", note: "why not reuse it?" })
    const said = deep(host).querySelector("[part~='said'] >>> [part~='base']")!
    expect(said.textContent).toContain("revisit soon · not sent yet")
    expect(said.textContent).toContain("why not reuse it?")
    expect(deep(host).querySelector(".under-line [part~='note-box'] >>> ui-textarea >>> textarea")).toBeNull()
  })

  // Owen, 2026-10-22 (epic `epic-engine` P20):  "turn revision on, add 'do it' and focus the text in the field"
  test('Revisit on a judgement call or a todo:  an EMPTY box gets "do it", selected, and Revisit turns ON with it (Owen, 2026-10-19)', async () => {
    await adoptClient()
    const host = await render(`<div><epic-item id="j3" title="A call" status="open" open><p>Text</p></epic-item>
      <epic-item id="t9" title="A bare todo" status="open"></epic-item></div>`)
    const [call, todo] = Array.from(host.querySelectorAll("epic-item"))
    // a call with details:  its docked box
    button(call!, "revisit").click()
    const note = deep(call!).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    await vi.waitFor(() => expect(note.value).toBe("do it"))
    // selected, so his first key replaces it
    expect([note.matches(":focus"), note.selectionStart, note.selectionEnd]).toEqual([true, 0, 5])
    await vi.waitFor(() =>
      expect(routes.inbox.marks.j3).toMatchObject({ action: "revisit", when: "soon", note: "do it" })
    )
    expect(routes.inbox.drafts.j3).toBeUndefined()
    await vi.waitFor(() => expect(button(call!, "revisit").dataset.fill).toBe("dashed"))
    // the box's floppy says Saved
    await vi.waitFor(() =>
      expect(deep(call!).querySelector("[part~='note-box'] >>> .note-saved")!.hasAttribute("hidden")).toBe(false)
    )
    // a todo without details:  its box under its line;  Later makes it the mark's note
    button(todo!, "revisit").click()
    await settle()
    const bare = deep(todo!).querySelector<HTMLTextAreaElement>(
      ".under-line [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    await vi.waitFor(() => expect(bare.value).toBe("do it"))
    await vi.waitFor(() => expect(routes.inbox.marks.t9?.note).toBe("do it"))
    deep(todo!).querySelector<HTMLButtonElement>('button[data-how="soon"]')!.click()
    await settle()
    expect(routes.inbox.marks.t9).toMatchObject({ action: "revisit", when: "soon", note: "do it" })
  })

  test('"do it" never over his words:  a draft, or an earlier note, stays;  a question gets nothing', async () => {
    routes.inbox.drafts.j4 = { action: "revisit", note: "my own words", at: "2026-10-19T10:00:00.000Z" }
    routes.inbox.marks.t3 = { action: "skip", note: "moot since P3", at: "2026-10-19T10:00:00.000Z" }
    await adoptClient()
    const host = await render(`<div><epic-item id="j4" title="A call" status="open" open><p>Text</p></epic-item>
      <epic-item id="t3" title="A todo" status="open" open><p>Text</p></epic-item>
      <epic-item id="q5" title="A question" status="open" open><p>Text</p></epic-item>
      <epic-item id="i6" title="An issue" status="open" open><p>Text</p></epic-item></div>`)
    const [call, todo, question, issue] = Array.from(host.querySelectorAll("epic-item"))
    const box = (item: Element) =>
      deep(item).querySelector<HTMLTextAreaElement>(
        "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
      )!
    // one at a time:  each Revisit holds the focus until its box has it
    for (const item of [call!, todo!, question!, issue!]) {
      button(item, "revisit").click()
      await vi.waitFor(() => expect(box(item).matches(":focus")).toBe(true))
    }
    await settle()
    expect([box(call!).value, box(todo!).value, box(question!).value, box(issue!).value]).toEqual([
      "my own words",
      "",
      "",
      ""
    ])
    expect(routes.inbox.drafts).toEqual({ j4: expect.objectContaining({ note: "my own words" }) })
    expect(routes.posts.filter(([route]) => route === "draft")).toEqual([])
  })

  test("an item without details:  its box lines up where details start;  its chevron shows, and folds the box away", async () => {
    await adoptClient()
    const host =
      await render(`<div style="width: 360px"><epic-item id="t7" title="A bare todo" status="open"></epic-item>
      <epic-item id="t8" title="With text" status="open" open><p>Text</p></epic-item></div>`)
    const [bare, full] = Array.from(host.querySelectorAll("epic-item"))
    const toggle = () => deep(bare!).querySelector<HTMLButtonElement>("[part~='toggle']")
    expect(toggle()).toBeNull()
    button(bare!, "revisit").click()
    await settle()
    const box = deep(bare!).querySelector<HTMLElement>(".under-line [part~='note-box']")!
    const docked = deep(full!).querySelector<HTMLElement>("[part~='details'] [part~='note-box']")!
    // where an item's details start:  under the id chip, not the item's edge
    expect(box.getBoundingClientRect().left - bare!.getBoundingClientRect().left).toBeGreaterThan(20)
    // an open item's box is its drawer's bottom (I104):  side to side, over the drawer's rules (4px in, the rule under its edge)
    expect(Math.round(docked.getBoundingClientRect().left - full!.getBoundingClientRect().left)).toBe(4)
    expect(toggle()?.getAttribute("aria-expanded")).toBe("true")
    // its box holds a todo's "do it", selected:  words selected in a field are no drag over the title, so it folds
    expect(String(window.getSelection())).toBe("do it")
    toggle()!.click()
    await settle()
    expect(deep(bare!).querySelector(".under-line [part~='note-box']")).toBeNull()
    expect(toggle()).toBeNull()
  })

  // Owen, 2026-10-22 (epic `epic-engine` P20):  "when I type in the revisit box, revisit is automatically on (but
  // don't auto-close the field from underneath me)"
  test("a note box LAST in its details:  typing turns Revisit on at once, the box staying, its words kept;  still there once approved", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="q1" title="A question" status="open" open><p>Text</p></epic-item>`)
    const note = deep(host).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    note.focus()
    note.value = "h"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    // the first key:  Revisit on, saved at once, with no wait for the typing to stop
    await vi.waitFor(() => expect(routes.inbox.marks.q1).toMatchObject({ action: "revisit", when: "soon", note: "h" }))
    await vi.waitFor(() => expect(button(host, "revisit").dataset.fill).toBe("dashed"))
    note.value = "half a thought"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    note.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }))
    note.dispatchEvent(new FocusEvent("blur", { composed: true }))
    await settle()
    await vi.waitFor(() => expect(routes.inbox.marks.q1?.note).toBe("half a thought"))
    expect(routes.inbox.drafts.q1).toBeUndefined()
    // the box is still there, his words in it, and no marked note is drawn over it
    expect(deep(host).querySelector("[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea")).toBe(note)
    expect(note.value).toBe("half a thought")
    expect(deep(host).querySelector("[part~='said']")).toBeNull()
    button(host, "approve").click()
    await settle()
    const details = deep(host).querySelector("[part~='details']")!
    expect(details.lastElementChild!.matches("[part~='note-box']")).toBe(true)
    expect(getComputedStyle(details.lastElementChild!).position).toBe("sticky")
  })

  test("Owen's input, once handled, CLEARS (Owen, 2026-10-08):  every button grey, the chip carries the result", async () => {
    await adoptClient()
    // J9:  approved, closed;  J10:  revisited and answered, still open
    const approved = await render(
      `<epic-item id="j9" title="Done" status="done" state="recent" review-as="approve" open><p>Text</p></epic-item>`
    )
    const answered = await render(
      `<epic-item id="j10" title="Talked over" status="open" state="open" review-as="revisit"></epic-item>`
    )
    for (const host of [approved, answered]) {
      expect(actions(host).map((action) => button(host, action).dataset.fill)).toEqual(["none", "none", "none"])
      for (const action of actions(host)) expect(button(host, action).getAttribute("aria-label")).not.toMatch(/done/)
    }
    const look = (host: Element) => {
      const chip = deep(host).querySelector<HTMLElement>("[part~='id']")!
      const box = deep(host).querySelector("[part~='base']")!
      return [chip.dataset.fill, box.classList.contains("recent"), box.classList.contains("open")]
    }
    expect([look(approved), look(answered)]).toEqual([
      [undefined, true, false],
      [undefined, false, true]
    ])
    // every button and the note box stay:  a new mark can follow
    expect(
      deep(approved).querySelector("[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea")
    ).not.toBeNull()
  })

  test("answered, the work still due (Owen, 2026-10-10):  the chip OUTLINED -- green queued, blue Claude on it;  done, solid", async () => {
    await adoptClient()
    const queued = await render(
      `<epic-item id="t4" title="Tidy" status="open" state="open" queued="2026-10-10" work="P9 · Build" review-as="next"></epic-item>`
    )
    const onIt = await render(`<epic-item id="j6" title="A call" status="open" state="progress"></epic-item>`)
    const doneTodo = await render(
      `<epic-item id="t5" title="Tidied" status="done" state="recent" queued="2026-10-10"></epic-item>`
    )
    await settle()
    const look = (host: Element) => {
      const chip = host.shadowRoot!.querySelector<HTMLElement>("[part~='id']")!
      return [chip.dataset.color, chip.dataset.fill, getComputedStyle(chip).backgroundColor === "rgba(0, 0, 0, 0)"]
    }
    expect([look(queued), look(onIt), look(doneTodo)]).toEqual([
      ["green", "outline", true],
      ["blue", "outline", true],
      [undefined, undefined, false]
    ])
    // its tooltip still says where it stands and what's to do
    expect(queued.shadowRoot!.querySelector<HTMLElement>("[part~='id']")!.title).toMatch(/to do:  P9 · Build/)
  })

  test("a pick Claude took off the inbox, the doc's `chosen` not here yet:  the chip stays green, outlined", async () => {
    routes.inbox.marks.j7 = { action: "pick", pick: "B", at: new Date(Date.now() - 60_000).toISOString() }
    routes.inbox.sent = new Date().toISOString()
    const client = await adoptClient()
    const host = await render(`<epic-item id="j7" title="A call" status="open" state="attention"></epic-item>`)
    await settle()
    delete routes.inbox.marks.j7
    await client.refresh()
    await settle()
    const chip = host.shadowRoot!.querySelector<HTMLElement>("[part~='id']")!
    expect([chip.dataset.color, chip.dataset.fill]).toEqual(["green", "outline"])
  })

  test("a marked note shows ABOVE the note box, last in the details;  Claude's status cards between them (P13)", async () => {
    routes.inbox.marks.q3 = { action: "revisit", when: "soon", note: "why B?", at: new Date().toISOString() }
    await adoptClient()
    const host = await render(`<epic-item id="q3" title="A question" status="open" open><p>Text</p></epic-item>`)
    await settle()
    const parts = Array.from(
      deep(host).querySelector("[part~='details']")!.children,
      (it) => it.getAttribute("part") ?? `slot:${it.getAttribute("name")}`
    )
    expect(parts.slice(-3)).toEqual(["said", "slot:status", "note-box"])
  })

  test("the review label goes:  each review button's tooltip says it (`Approve:  Fine as it is · reviewed 10/7/26`)", async () => {
    await adoptClient()
    const host = await render(
      `<epic-item id="j5" title="A call" status="done" reviewed="2026-10-07"><p>Text</p></epic-item>`
    )
    expect(deep(host).querySelector("[part~='review']")).toBeNull()
    expect(button(host, "approve").getAttribute("title")).toBe("Approve:  Fine as it is · reviewed 10/7/26")
    expect(button(host, "todo").getAttribute("title")).toBe(
      "Make Todo:  Follow it up later, as a todo:  work still to do · reviewed 10/7/26"
    )
  })

  test("an open judgement call's id chip:  urgent (red) <-> not urgent (blue), through the inbox", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="j6" title="A call" status="open" state="attention"></epic-item>`)
    const chip = () => deep(host).querySelector<HTMLElement>("[part~='id']")!
    const box = () => deep(host).querySelector("[part~='base']")!
    expect(chip().localName).toBe("button")
    expect(chip().title).toMatch(/click:  not urgent$/)
    chip().click()
    await settle()
    expect(routes.inbox.urgency.j6?.calm).toBe(true)
    expect([box().classList.contains("open"), box().classList.contains("attention")]).toEqual([true, false])
    expect(chip().hasAttribute("data-unsent")).toBe(true)
    expect(host.open).toBeFalsy()
    chip().click()
    await settle()
    expect(routes.posts.at(-1)).toEqual(["urgency", { page: PAGE, id: "j6", calm: null }])
    expect(box().classList.contains("attention")).toBe(true)
  })

  test("a question's chip, or a reviewed call's, stays a link", async () => {
    await adoptClient()
    const question = await render(`<epic-item id="q4" title="Which?" status="open"></epic-item>`)
    const reviewed = await render(`<epic-item id="j7" title="Seen" status="open" reviewed="2026-10-07"></epic-item>`)
    for (const host of [question, reviewed]) expect(deep(host).querySelector("[part~='id']")!.localName).toBe("a")
  })

  test("an action CHOSEN folds the item (Owen, 2026-10-10):  Approve, Make Todo, the x, a note box button, a pick", async () => {
    await adoptClient()
    const item = (html: string) => render(`<epic-item status="open" open ${html}><p>Text</p></epic-item>`)
    const approved = await item(`id="q1" title="A question"`)
    button(approved, "approve").click()
    const asked = await item(`id="j2" title="A call"`)
    button(asked, "todo").click()
    const dropped = await item(`id="t1" title="A todo"`)
    button(dropped, "drop").click()
    const noted = await item(`id="j3" title="Another call"`)
    deep(noted).querySelector<HTMLButtonElement>("[part~='note-box'] >>> button[data-how='skip']")!.click()
    await settle()
    expect([approved.open, asked.open, dropped.open, noted.open]).toEqual([false, false, false, false])
    // a pick on its option cards (`<epic-option>`'s Choose pill)
    const question = await render(`<epic-item id="q2" title="Which?" status="open" open><epic-choices>
      <epic-option letter="A" title="One"><ul><li>short</li></ul></epic-option>
      <epic-option letter="B" title="Two"><ul><li>free</li></ul></epic-option></epic-choices></epic-item>`)
    const option = question.querySelector("epic-option")!
    option.shadowRoot!.querySelector<HTMLButtonElement>("[part~='choose']")!.click()
    await settle()
    expect([routes.inbox.marks.q2?.pick, question.open]).toEqual(["A", false])
  })

  test("NOT folded by Revisit (the box opens), typing, a mark cleared, or a request called off", async () => {
    // q6:  a revisit now Claude is on
    routes.inbox.working.q6 = { action: "revisit", since: new Date().toISOString() }
    routes.inbox.marks.q6 = { action: "revisit", when: "now", note: "now please", at: new Date().toISOString() }
    await adoptClient()
    const host = await render(`<epic-item id="q1" title="A question" status="open" open><p>Text</p></epic-item>`)
    button(host, "revisit").click()
    const note = deep(host).querySelector<HTMLTextAreaElement>(
      "[part~='details'] [part~='note-box'] >>> ui-textarea >>> textarea"
    )!
    note.value = "half a thought"
    note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await settle()
    expect(host.open).toBe(true)
    // a mark pressed again clears it:  nothing chosen, it stays open
    button(host, "todo").click()
    await settle()
    host.open = true
    await ElementFixture.tick()
    button(host, "todo").click()
    await settle()
    expect([routes.inbox.marks.q1, host.open]).toEqual([undefined, true])
    // a revisit now Claude is on, pressed:  called off
    const busy = await render(`<epic-item id="q6" title="Busy" status="open" open><p>Text</p></epic-item>`)
    button(busy, "revisit").click()
    await settle()
    expect(busy.open).toBe(true)
  })

  test("folding keeps its STUCK line where it is on screen;  the details fold away below it", async () => {
    await adoptClient()
    const host = await render(`<div><epic-item id="j4" title="A long call" status="open" open>
      <p style="height: 3000px">Long text</p></epic-item><div style="height: 4000px"></div></div>`)
    const item = host.querySelector("epic-item")!
    const line = () => item.shadowRoot!.querySelector<HTMLElement>("[part~='line']")!
    window.scrollTo({ top: item.getBoundingClientRect().top + window.scrollY + 1500, behavior: "instant" })
    await ElementFixture.tick()
    const stuckAt = line().getBoundingClientRect().top
    // stuck:  the item's top is far above the window
    expect(item.getBoundingClientRect().top).toBeLessThan(stuckAt - 1000)
    button(item, "approve").click()
    await settle()
    expect((item as Element & { open: boolean }).open).toBe(false)
    expect(Math.abs(line().getBoundingClientRect().top - stuckAt)).toBeLessThan(2)
    window.scrollTo({ top: 0, behavior: "instant" })
  })
})

describe("<epic-section kind=overview-part> review controls (Q14)", () => {
  test("Make Todo, Revisit in its title;  no Approve;  a note box at its body's end", async () => {
    await adoptClient()
    const host = await render(
      `<epic-section id="o1" kind="overview-part" title="What changes" open><p>Prose</p></epic-section>`
    )
    expect(actions(host)).toEqual(["todo", "revisit"])
    expect(deep(host).querySelector("[part~='note-box'] >>> ui-textarea >>> textarea")).not.toBeNull()
    expect(noteButtons(host)).toEqual(["soon", "skip"])
    button(host, "todo").click()
    await settle()
    expect(routes.inbox.marks.o1?.action).toBe("todo")
    // the box's x:  skip this, nothing to do
    deep(host).querySelector<HTMLButtonElement>("[part~='note-box'] >>> button[data-how='skip']")!.click()
    await settle()
    expect(routes.inbox.marks.o1?.action).toBe("skip")
  })

  test("other kinds of section draw no review controls", async () => {
    await adoptClient()
    const host = await render(`<epic-section id="todos" kind="todos" open></epic-section>`)
    expect(actions(host)).toEqual([])
  })
})

// epic `airplane` P2:  notes on the phases and the summary
describe("<epic-phase> and <epic-overview> review controls", () => {
  // Do this, the thumbs up (epic `epic-engine` I181;  Owen, 2026-10-29:  "it's already a phase, you wouldn't make it a
  // todo"):  the same `todo` mark;  an Overview part keeps Make Todo
  test("a phase:  Do this (a thumbs up), Revisit in its title;  a note box at its body's end;  Do this marks it `todo`", async () => {
    await adoptClient()
    const host = await render(`<epic-phase id="p2" title="Plan-Doc Notes" status="todo" open></epic-phase>`)
    expect(actions(host)).toEqual(["todo", "revisit"])
    expect(button(host, "todo").getAttribute("icon")).toBe("thumbs up")
    expect(button(host, "todo").title).toBe("Do this:  Yes:  build this phase")
    expect(deep(host).querySelector("[part~='note-box'] >>> ui-textarea >>> textarea")).not.toBeNull()
    expect(noteButtons(host)).toEqual(["soon", "skip"])
    button(host, "todo").click()
    await settle()
    expect(routes.inbox.marks.p2?.action).toBe("todo")
    expect(button(host, "todo").dataset.fill).toBe("dashed")
  })

  // epic `epic-engine` I140 (Owen, 2026-10-26:  "Accepted-but-unstarted phases should show checkmark pill green")
  // a thumbs up since I181 (Owen, 2026-10-29:  the thumbs up "when it means 'accept this' rather than 'make this a todo'")
  test("a to-do phase whose plan is accepted:  a green thumbs up first, then Revisit, Do this (a waiting plan's slots), a state, never a mark", async () => {
    await adoptClient()
    const host = await render(`<epic-phase id="p2" title="Themes as Data" status="todo" plan="accepted"></epic-phase>`)
    expect(actions(host)).toEqual(["revisit", "todo"])
    const check = deep(host).querySelector<HTMLElement>('ui-button[data-state="accepted"]')!
    // first in its group, in a waiting plan's Accept slot (Owen:  "checkmark on the wrong side")
    expect(check.parentElement!.firstElementChild).toBe(check)
    expect(check.dataset).toMatchObject({ color: "green", fill: "outline" })
    expect(check.getAttribute("icon")).toBe("thumbs up")
    expect(check.title).toBe("Plan accepted:  ready to build:  you accepted Claude's plan for this phase")
    // the ring is a WAITING plan's alone
    expect(deep(host).querySelector(".review-group")!.hasAttribute("data-asks")).toBe(false)
    // a state:  a click marks nothing, and never folds it
    const posts = routes.posts.length
    host.setAttribute("open", "")
    await ElementFixture.tick()
    check.click()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(routes.posts.length).toBe(posts)
    expect(host.matches(":state(open)")).toBe(true)
    // under way, or its plan still waiting:  no check
    const active = await render(`<epic-phase id="p3" title="Busy" status="active" plan="accepted"></epic-phase>`)
    expect(deep(active).querySelector('ui-button[data-state="accepted"]')).toBeNull()
    const waiting = await render(`<epic-phase id="p4" title="Asks" status="todo" plan="waiting"></epic-phase>`)
    // its Accept plan a thumbs up too (I181):  it means "accept this"
    expect(button(waiting, "approve").getAttribute("icon")).toBe("thumbs up")
    expect(deep(waiting).querySelector('ui-button[data-state="accepted"]')).toBeNull()
    await expectAccessible(host)
  })

  // epic `epic-engine` I140 (Owen, 2026-10-26:  "If I add a comment in a phase section text and press "revisit", don't
  // make me type in the comment section.  The inline mark(s) are my comment.")
  test("Revisit on a phase with Owen's comments in its text:  marked at once, the comments its content;  none, the box", async () => {
    routes.inbox.waitingComments = [
      { id: "c1", anchor: "p2#field-4" },
      { id: "c2", anchor: "q9" },
      { id: "c3", anchor: "p2" }
    ]
    await adoptClient()
    const host = await render(`<epic-phase id="p2" title="Themes as Data" status="todo" plan="accepted"></epic-phase>`)
    expect(button(host, "revisit").title).toBe(
      "Revisit:  Talk it over:  your comments in its text (C1, C3) are your note"
    )
    button(host, "revisit").click()
    await settle()
    expect(routes.inbox.marks.p2).toMatchObject({
      action: "revisit",
      when: "soon",
      note: "see my comments in its text:  C1, C3",
      comments: ["c1", "c3"]
    })
    // written, so Send counts it;  no box waits for typing
    expect(button(host, "revisit").dataset.fill).toBe("dashed")
    expect(deep(host).querySelector("[part~='said']")).not.toBeNull()
    // a phase with none of his comments:  the note box, as before
    const other = await render(`<epic-phase id="p5" title="Plain" status="todo"></epic-phase>`)
    button(other, "revisit").click()
    await settle()
    expect(routes.inbox.marks.p5).toBeUndefined()
  })

  // epic `epic-engine` I55 (Owen, 2026-10-20:  "The buttons on the left should move into the 1. Overview header")
  test("the Overview:  keyed `summary`;  its buttons in its title row, the note box under it once Revisit opens it", async () => {
    await adoptClient({ served: false })
    const quiet = await render(
      `<epic-overview id="overview"><epic-summary>Two sentences.</epic-summary></epic-overview>`
    )
    expect(actions(quiet)).toEqual([])
    ReviewClient.adopt(undefined)
    await adoptClient()
    const host = await render(
      `<epic-overview id="overview"><epic-summary>Two sentences.</epic-summary>` +
        `<epic-section id="o1" kind="overview-part" title="Structure"><p>Hello</p></epic-section></epic-overview>`
    )
    // in the title row (`tools`);  folded or open
    expect(actions(host)).toEqual(["todo", "revisit"])
    const tools = host.shadowRoot!.querySelector('[part~="tools"]')!
    expect(tools.querySelector('[part~="review-buttons"]')).not.toBeNull()
    // no note box until Revisit;  the summary draws none of its own any more
    expect(deep(host).querySelector("[part~='note-box']")).toBeNull()
    expect(host.querySelector("epic-summary")!.shadowRoot!.querySelector("epic-review")).toBeNull()
    button(host, "revisit").click()
    await settle()
    await vi.waitFor(() =>
      expect(deep(host).querySelector("[part~='note-box'] >>> ui-textarea >>> textarea")).not.toBeNull()
    )
    expect(host.matches(":state(open)")).toBe(true)
    const textarea = deep(host).querySelector("[part~='note-box'] >>> ui-textarea >>> textarea")!
    expect(textarea.getAttribute("aria-label")).toBe("the Overview:  your note")
    // under the title row, above the summary
    const box = host.shadowRoot!.querySelector("[part~='note-box']")!
    expect(box.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      host.querySelector("epic-summary")!.getBoundingClientRect().top + 0.5
    )
    expect(noteButtons(host)).toEqual(["soon", "skip"])
    await expectAccessible(host)
  })

  test("an Overview with no `<epic-summary>` (an older doc's), or a summary alone:  no review controls", async () => {
    await adoptClient()
    const older = await render(`<epic-overview id="overview" open><p slot="summary">Two sentences.</p></epic-overview>`)
    expect(actions(older)).toEqual([])
    const alone = await render(`<epic-summary>Two sentences.</epic-summary>`)
    expect(actions(alone)).toEqual([])
  })
})

// epic `epic-engine` P51:  a picture in any note box;  a test's x
describe("<epic-review> note pictures", () => {
  test("a picture pasted in the note box:  saved, a revisit carrying it, its thumbnail shown;  its x takes it out", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="j9" title="A call" status="open" open><p>Text</p></epic-item>`)
    const box = deep(host).querySelector<HTMLElement>("[part~='details'] [part~='note-box'] >>> .note-box")!
    const data = new DataTransfer()
    data.items.add(new File([PNG_BYTES], "shot.png", { type: "image/png" }))
    box.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true, cancelable: true })
    )
    await vi.waitFor(() => expect(routes.inbox.marks.j9).toMatchObject({ action: "revisit", shot: SHOT }))
    await ElementFixture.tick()
    const shotPost = routes.posts.find(([route]) => route === "shot")!
    expect([shotPost[1].id, String(shotPost[1].png).startsWith("data:image/png;base64,")]).toEqual(["j9", true])
    const thumb = () =>
      deep(host).querySelector<HTMLImageElement>("[part~='details'] [part~='note-box'] >>> .note-picture img")
    await vi.waitFor(() => expect(thumb()?.getAttribute("src")).toBe(SHOT))
    deep(host)
      .querySelector<HTMLButtonElement>("[part~='details'] [part~='note-box'] >>> .note-picture button")!
      .click()
    await settle()
    expect(routes.inbox.marks.j9).toBeUndefined()
  })

  test("the picture button chooses a file;  a test's x says it no longer applies", async () => {
    await adoptClient()
    const host = await render(`<epic-item id="m4" title="A test" status="open" open><p>Step</p></epic-item>`)
    const pick = deep(host).querySelector<HTMLButtonElement>("[part~='details'] [part~='note-box'] >>> .note-pick")!
    expect(pick.title).toMatch(/^Add a picture:  paste one/)
    const x = deep(host).querySelector<HTMLButtonElement>(
      "[part~='details'] [part~='note-box'] >>> button[data-how='skip']"
    )!
    expect(x.title).toBe("No longer applies:  cancel this test;  a note here says why")
  })
})

// epic `epic-engine` P51 (Q53):  tests answered on the page, Start testing preparing them first
describe("<epic-section kind=tests> Start testing", () => {
  const TESTS = `<epic-section id="tests" kind="tests">
    <epic-item id="m1" title="One" status="open"></epic-item>
    <epic-item id="m2" title="Two" status="open"></epic-item>
    <epic-item id="m3" title="Done" status="done"></epic-item>
  </epic-section>`

  /** The section's button. */
  const testButton = (host: Element) => deep(host).querySelector<HTMLElement>("ui-button.start-testing")!

  test("Start testing · 2 asks Claude to prepare them;  Preparing tests while it does;  then the first opens", async () => {
    const client = await adoptClient()
    history.replaceState(null, "", location.pathname)
    const host = await render(TESTS)
    expect(testButton(host).textContent).toContain("Start testing · 2")
    testButton(host).click()
    await settle()
    expect(routes.posts.at(-1)).toEqual(["now", { page: PAGE, id: "tests", action: "prepare" }])
    await ElementFixture.tick()
    expect(testButton(host).textContent).toContain("Preparing tests")
    // Claude prepared them:  M2 first, its request done
    host.querySelector("#m2")!.setAttribute("prepared", "1")
    host.querySelector("#m1")!.setAttribute("prepared", "2")
    routes.inbox.now = []
    delete routes.inbox.marks.tests
    await client.refresh()
    await vi.waitFor(() => expect(location.hash).toBe("#m2"))
    expect(testButton(host).textContent).toContain("Next test · 2 left")
    testButton(host).click()
    expect(location.hash).toBe("#m1")
    history.replaceState(null, "", location.pathname)
  })

  test("every open test prepared:  Next test counts the ones not answered, and skips them", async () => {
    await adoptClient()
    history.replaceState(null, "", location.pathname)
    const host = await render(TESTS.replace(/(id="m[12]")/g, '$1 prepared="1"'))
    await routes.fetch("/api/epics/review/mark", {
      method: "POST",
      body: JSON.stringify({ page: PAGE, id: "m1", mark: { action: "approve" } })
    })
    await ReviewClient.forPage().refresh()
    await ElementFixture.tick()
    expect(testButton(host).textContent).toContain("Next test · 1 left")
    testButton(host).click()
    expect(location.hash).toBe("#m2")
    expect(routes.posts.some(([route]) => route === "now")).toBe(false)
    history.replaceState(null, "", location.pathname)
  })
})

// epic `airplane` P2:  new todos and questions from the page
describe("<epic-section kind=todos | questions> new items", () => {
  /** `host`'s waiting cards:  `[title, fill]` each. */
  function cards(host: Element) {
    return Array.from(deep(host).querySelectorAll<HTMLElement>("[part~='new-list'] li"), (card) => [
      card.querySelector(".title")!.textContent,
      card.dataset.fill
    ])
  }

  test("its button opens the form at its end, on its own kind;  Add saves it, and it waits there, dashed", async () => {
    await adoptClient()
    const host = await render(`<epic-section id="decisions" kind="questions" open></epic-section>`)
    const open = deep(host).querySelector<HTMLButtonElement>("[part~='new-item'] >>> [part~='button']")!
    expect(open.textContent).toBe("New question")
    open.click()
    await ElementFixture.tick()
    const form = deep(host).querySelector<HTMLFormElement>("[part~='new-item'] >>> [part~='form']")!
    expect(form.querySelector("[aria-pressed='true']")!.textContent).toBe("Question")
    form.querySelector<HTMLInputElement>("[data-field='title']")!.value = "window or aisle?"
    form.querySelector<HTMLTextAreaElement>("[data-field='note']")!.value = "  long flight "
    form.querySelector<HTMLInputElement>("[data-field='near']")!.value = "P2"
    form.requestSubmit()
    await settle()
    expect(routes.posts.at(-1)).toEqual([
      "new",
      { page: PAGE, entry: { kind: "question", title: "window or aisle?", note: "long flight", near: "p2" } }
    ])
    await vi.waitFor(() => expect(cards(host)).toEqual([["window or aisle?", "dashed"]]))
    expect(deep(host).querySelector("[part~='new-item'] >>> [part~='form']")).toBeNull()
    expect(deep(host).querySelector("[part~='new-list'] a")!.getAttribute("href")).toBe("#p2")
    await expectAccessible(host)
  })

  test("no title:  nothing saved, the title takes the focus;  Escape cancels", async () => {
    await adoptClient()
    const host = await render(`<epic-section id="todos" kind="todos" open></epic-section>`)
    deep(host).querySelector<HTMLButtonElement>("[part~='new-item'] >>> [part~='button']")!.click()
    await ElementFixture.tick()
    const form = deep(host).querySelector<HTMLFormElement>("[part~='new-item'] >>> [part~='form']")!
    form.requestSubmit()
    await ElementFixture.tick()
    expect(routes.posts).toEqual([])
    const newItem = host.shadowRoot!.querySelector("[part~='new-item']")!
    expect(newItem.shadowRoot!.activeElement?.getAttribute("data-field")).toBe("title")
    form.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }))
    await ElementFixture.tick()
    expect(deep(host).querySelector("[part~='new-item'] >>> [part~='form']")).toBeNull()
  })

  test("a waiting item:  Edit opens the form on it and saves under its key;  Remove drops it;  only its kind listed", async () => {
    const at = new Date().toISOString()
    routes.inbox.marks = {
      new1: { action: "new", kind: "todo", title: "pack", at },
      new2: { action: "new", kind: "question", title: "aisle?", at }
    }
    await adoptClient()
    const host = await render(`<epic-section id="todos" kind="todos" open></epic-section>`)
    expect(cards(host)).toEqual([["pack", "dashed"]])
    deep(host).querySelector<HTMLButtonElement>("[part~='new-list'] button[title='Edit']")!.click()
    await ElementFixture.tick()
    const form = deep(host).querySelector<HTMLFormElement>("[part~='new-item'] >>> [part~='form']")!
    const title = form.querySelector<HTMLInputElement>("[data-field='title']")!
    expect(title.value).toBe("pack")
    title.value = "pack chargers"
    form.requestSubmit()
    await settle()
    expect(routes.posts.at(-1)).toEqual([
      "new",
      { page: PAGE, id: "new1", entry: { kind: "todo", title: "pack chargers" } }
    ])
    await vi.waitFor(() => expect(cards(host)).toEqual([["pack chargers", "dashed"]]))
    deep(host).querySelector<HTMLButtonElement>("[part~='new-list'] button[title='Remove']")!.click()
    await settle()
    expect(routes.posts.at(-1)).toEqual(["new", { page: PAGE, id: "new1", entry: null }])
    expect(cards(host)).toEqual([])
  })
})
