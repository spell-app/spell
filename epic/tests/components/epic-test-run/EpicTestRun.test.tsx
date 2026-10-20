import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "$/ui/core"
import { ElementFixture } from "$/ui/test/ElementFixture"
import { expectAccessible } from "$/ui/test/A11y"

import { ReviewClient, type Inbox } from "$/epics/review"

import "$/ui/components/ui-button"
import "$/ui/components/ui-icon"
import "$/ui/components/ui-section"
import "$/ui/components/ui-label"
import "$/ui/components/ui-progress"
import "$/ui/components/ui-modal"
import "$/ui/components/ui-message"
import "$/ui/components/ui-code"
import "$/ui/components/ui-breadcrumb"
import "$/epics/components/epic-page"
import "$/epics/components/epic-section"
import "$/epics/components/epic-phase"
import "$/epics/components/epic-item"
import "$/epics/components/epic-test-run"

////////////////
// ## The page and its routes
////////////////

/**
 * A page whose To test section holds:  v1 (the new shape, an action link and an Example), v2 (older:  prose only),
 * v3 (deferred:  last), v4 (done:  not in the run), v5 (failed before).
 */
const PAGE =
  `<epic-page epic="demo" title="Demo"><epic-section id="tests" kind="tests">` +
  `<epic-item id="v1" title="Titles wrap" status="open" state="open">` +
  `<epic-field label="Step"><p>Open the guide.</p><p><a class="epic-test-action" href="/guides/x.html">Open it</a></p></epic-field>` +
  `<epic-field label="Should"><p>Every title wraps.</p></epic-field>` +
  `<epic-field label="Example"><img src="tests/v1.png" alt="wrapped"><p>At 390px.</p></epic-field>` +
  `<epic-field label="If not"><p>Say which.</p></epic-field></epic-item>` +
  `<epic-item id="v2" title="Tabs come back" status="open" state="open"><p>Reload each tab.</p></epic-item>` +
  `<epic-item id="v3" title="Deferred" status="open" state="open" deferred="2026-10-18"><p>Later.</p></epic-item>` +
  `<epic-item id="v4" title="Done" status="done" state="recent"><p>Passed.</p></epic-item>` +
  `<epic-item id="v5" title="Failed once" status="open" state="open" failed="i9"><p>Try again.</p></epic-item>` +
  `</epic-section></epic-page>`

/** The review routes, as `fetch`, over an inbox kept here;  `posts` every POST;  the shot and tests routes too. */
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
    woken: null
  }
  posts: [string, Record<string, unknown>][] = []
  tests = [
    { epic: "demo", open: 4, page: "/epics/demo/demo.plan.html" },
    { epic: "later", open: 2, page: "/epics/later/later.plan.html" }
  ]

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    if (input === "/api/epics/tests") return json(this.tests)
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (route === "inbox") return json(this.inbox)
    const body = JSON.parse(init!.body as string) as Record<string, unknown>
    this.posts.push([route, body])
    if (route === "shot") return json({ shot: `tests/${String(body.id)}-20261019-1432.png` })
    if (route === "mark") {
      const at = new Date().toISOString()
      if (body.mark) this.inbox.marks[body.id as string] = { ...(body.mark as object), at } as Inbox["marks"][string]
      else delete this.inbox.marks[body.id as string]
      // the route:  a mark carrying a note takes the place of its draft
      if ((body.mark as { note?: string } | null)?.note !== undefined) delete this.inbox.drafts[body.id as string]
    }
    if (route === "draft") {
      const at = new Date().toISOString()
      if (body.note) this.inbox.drafts[body.id as string] = { action: "revisit", note: body.note as string, at }
      else delete this.inbox.drafts[body.id as string]
    }
    if (route === "send") this.inbox.sent = new Date(Date.now() + 1000).toISOString()
    return json(this.inbox)
  })
}

/** `value` as a JSON response. */
function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } })
}

/** A started client on `routes`, adopted as the page's;  `served` false:  no token, never reviewed. */
async function adoptClient(routes: FakeRoutes, { served = true } = {}) {
  const client = new ReviewClient({
    page: "/epics/demo/demo.plan.html",
    server: served ? { token: "token" } : undefined,
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  await client.start()
  ReviewClient.adopt(client)
  return client
}

/** Render the page with `query` on the address (`?test=1` ...), and let it settle. */
async function render(query = "?test=1", html = PAGE): Promise<E.DOMElement> {
  history.replaceState(null, "", `${location.pathname}${query}`)
  const host = await ElementFixture.render<E.DOMElement>(html)
  await settle(host)
  return host
}

/** Let `host` and its run settle. */
async function settle(host: Element) {
  await ElementFixture.settle(host)
  await ElementFixture.tick()
  await ElementFixture.settle(host)
}

/** The run's shadow root, drawn by the page. */
function runOf(host: Element): ShadowRoot | null {
  return host.shadowRoot!.querySelector("epic-test-run")?.shadowRoot ?? null
}

/** `element`'s words, white space squeezed. */
function words(element: Element | null | undefined): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim()
}

/** The run's card, as drawn:  where, its id and title, its fields, the Step's words, its action buttons, labels. */
function card(host: Element) {
  const root = runOf(host)!
  const article = root.querySelector(".card")!
  return {
    at: words(root.querySelector(".where")),
    id: words(article.querySelector(".id")),
    title: words(article.querySelector(".test-title")),
    fields: Array.from(article.querySelectorAll(".field h3"), (h3) => words(h3)),
    step: words(article.querySelector(".step .prose")),
    actions: Array.from(article.querySelectorAll("ui-button.action"), (button) => [
      words(button),
      button.getAttribute("href"),
      button.getAttribute("target")
    ]),
    shots: Array.from(article.querySelectorAll(".example img"), (image) => image.getAttribute("src")),
    labels: Array.from(article.querySelectorAll(".before"), (label) => words(label))
  }
}

/** Press `key` on the document, as a key on the page. */
async function key(host: Element, name: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }))
  await settle(host)
}

/** The answer button for `result`. */
function answer(host: Element, result: string): HTMLElement {
  return runOf(host)!.querySelector<HTMLElement>(`ui-button.answer[data-result="${result}"]`)!
}

/** Wait out the run's pause after an answer, then settle. */
async function afterAnswer(host: Element) {
  await new Promise((resolve) => setTimeout(resolve, 450))
  await settle(host)
}

////////////////
// ## Tests
////////////////

describe("<epic-test-run>", () => {
  let routes: FakeRoutes
  beforeEach(() => {
    routes = new FakeRoutes()
  })
  afterEach(() => {
    ReviewClient.adopt(undefined)
    history.replaceState(null, "", location.pathname)
  })

  test("?test=1:  the page's open tests one at a time, deferred last;  the new shape's fields;  axe", async () => {
    await adoptClient(routes)
    const host = await render()
    expect(host.matches(":state(testing)")).toBe(true)
    expect(card(host)).toEqual({
      at: "1 of 4",
      id: "V1",
      title: "Titles wrap",
      fields: ["Step", "Should", "Example", "If not"],
      step: "Open the guide.",
      actions: [["Open it", "/guides/x.html", "_blank"]],
      shots: ["tests/v1.png"],
      labels: []
    })
    // the blocks hide;  the doc is never touched (the action link still in v1)
    const slot = host.shadowRoot!.querySelector("slot:not([name])")!
    expect(getComputedStyle(slot).display).toBe("none")
    expect(host.querySelector("#v1 a.epic-test-action")).not.toBeNull()
    await expectAccessible(runOf(host)!.host as Element)
  })

  test("an older test's prose is its Step;  failed before and deferred say so;  `#v5` lands there", async () => {
    await adoptClient(routes)
    const host = await render("?test=1#v5")
    expect(card(host)).toMatchObject({ at: "3 of 4", id: "V5", step: "Try again.", labels: ["failed before · I9"] })
    await key(host, "ArrowLeft")
    expect(card(host)).toMatchObject({ at: "2 of 4", id: "V2", fields: ["Step"], step: "Reload each tab." })
    await key(host, "ArrowRight")
    await key(host, "ArrowRight")
    expect(card(host)).toMatchObject({ at: "4 of 4", id: "V3", labels: ["not now 2026-10-18"] })
    expect(location.hash).toBe("#v3")
  })

  test("P / S / N answer and move on;  each a test mark, dashed until sent;  the bar counts them", async () => {
    await adoptClient(routes)
    const host = await render()
    await key(host, "p")
    expect(routes.inbox.marks.v1).toMatchObject({ action: "test", result: "passed" })
    await afterAnswer(host)
    expect(card(host).id).toBe("V2")
    expect(runOf(host)!.querySelector("ui-progress")!.getAttribute("value")).toBe("1")
    await key(host, "s")
    await afterAnswer(host)
    await key(host, "n")
    await afterAnswer(host)
    expect(Object.fromEntries(Object.entries(routes.inbox.marks).map(([id, mark]) => [id, mark.result]))).toEqual({
      v1: "passed",
      v2: "skip",
      v5: "notnow"
    })
    // back on v1:  its answer shown, dashed green
    await key(host, "ArrowLeft")
    await key(host, "ArrowLeft")
    await key(host, "ArrowLeft")
    expect(card(host).id).toBe("V1")
    expect([answer(host, "passed").dataset.fill, answer(host, "passed").getAttribute("aria-pressed")]).toEqual([
      "dashed",
      "true"
    ])
  })

  test("the comment's ivory frame is the same on all four sides, empty and with lines (r3)", async () => {
    await adoptClient(routes)
    const host = await render()
    const frame = runOf(host)!.querySelector<HTMLElement>(".comment")!
    const box = frame.querySelector<HTMLElement & { value: string }>("epic-text-box")!
    const sides = () => {
      const outer = frame.getBoundingClientRect()
      const inner = box.shadowRoot!.querySelector("textarea")!.getBoundingClientRect()
      const rule = parseFloat(getComputedStyle(frame).borderTopWidth)
      return [
        inner.top - outer.top - rule,
        outer.right - rule - inner.right,
        outer.bottom - rule - inner.bottom,
        inner.left - outer.left - rule
      ].map(Math.round)
    }
    expect(sides()).toEqual([8, 8, 8, 8])
    box.value = "One\nTwo\nThree\nFour"
    await settle(host)
    expect(sides()).toEqual([8, 8, 8, 8])
  })

  test("Failed:  the note box and the screenshot's area;  the note saved, a pasted screenshot saved and kept", async () => {
    await adoptClient(routes)
    const host = await render()
    answer(host, "failed").click()
    await settle(host)
    expect(routes.inbox.marks.v1).toMatchObject({ action: "test", result: "failed" })
    const box = runOf(host)!.querySelector<HTMLElement & { value: string }>(".comment epic-text-box")!
    const field = box.shadowRoot!.querySelector("textarea")!
    field.value = "Still cut short"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    field.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }))
    await settle(host)
    expect(routes.inbox.marks.v1).toMatchObject({ result: "failed", note: "Still cut short" })
    // a screenshot pasted
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array([137, 80, 78, 71])], "shot.png", { type: "image/png" }))
    field.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true }))
    await vi.waitFor(() => expect(routes.inbox.marks.v1?.shot).toBe("tests/v1-20261019-1432.png"))
    const shot = routes.posts.find(([route]) => route === "shot")![1]
    expect([shot.id, String(shot.png).startsWith("data:image/png;base64,")]).toEqual(["v1", true])
    expect(routes.inbox.marks.v1).toMatchObject({ note: "Still cut short" })
    await settle(host)
    expect(runOf(host)!.querySelector(".drop ui-button.shot img")).not.toBeNull()
  })

  test("a COMMENT on every card:  a draft before an answer, then with whichever answer;  the summary lists it", async () => {
    await adoptClient(routes)
    const host = await render()
    const field = () => runOf(host)!.querySelector(".comment epic-text-box")!.shadowRoot!.querySelector("textarea")!
    expect(field().placeholder).toBe("Comment (optional)")
    field().value = "Only the first half worked"
    field().dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    field().dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }))
    await vi.waitFor(() => expect(routes.inbox.drafts.v1?.note).toBe("Only the first half worked"))
    expect(routes.inbox.marks.v1).toBeUndefined()
    // a reload of the run (a new card) finds it again, from the draft
    await key(host, "ArrowRight")
    await key(host, "ArrowLeft")
    expect(field().value).toBe("Only the first half worked")
    // Passed:  the comment goes with it, the draft gone
    await key(host, "p")
    expect(routes.inbox.marks.v1).toMatchObject({ result: "passed", note: "Only the first half worked" })
    expect(routes.inbox.drafts.v1).toBeUndefined()
    await afterAnswer(host)
    // back, and changed to Not now:  the comment stays
    await key(host, "ArrowLeft")
    await key(host, "n")
    expect(routes.inbox.marks.v1).toMatchObject({ result: "notnow", note: "Only the first half worked" })
    await afterAnswer(host)
    for (let at = 0; at < 4; at++) await key(host, "ArrowRight")
    const listed = Array.from(runOf(host)!.querySelectorAll(".commented li"), (li) => words(li))
    expect(listed).toEqual(["V1Not nowOnly the first half worked"])
  })

  test("past the last:  the summary's counts, Send results, and with `all` the next epic", async () => {
    await adoptClient(routes)
    routes.inbox.marks.v1 = { action: "test", result: "passed", at: new Date().toISOString() } as never
    routes.inbox.marks.v2 = { action: "test", result: "failed", note: "x", at: new Date().toISOString() } as never
    await ReviewClient.forPage().refresh()
    const host = await render("?test=1&all=1#v3")
    await key(host, "ArrowRight")
    await vi.waitFor(() => expect(runOf(host)!.querySelector("ui-button.next-epic")).not.toBeNull())
    const root = runOf(host)!
    expect(Array.from(root.querySelectorAll(".counts li:not([data-zero])"), (li) => words(li))).toEqual([
      "1 passed",
      "1 failed",
      "2 not answered"
    ])
    const next = root.querySelector("ui-button.next-epic")!
    expect([words(next), new URL(next.getAttribute("href")!).search]).toEqual([
      "Next: later (2 tests)",
      "?test=1&all=1"
    ])
    root.querySelector<HTMLElement>("ui-button.send")!.click()
    await vi.waitFor(() => expect(routes.posts.some(([route]) => route === "send")).toBe(true))
    await vi.waitFor(() => expect(words(root.querySelector("ui-button.send"))).toBe("Results sent"))
  })

  test("not reviewed:  the answers are disabled, and say why", async () => {
    await adoptClient(routes, { served: false })
    const host = await render()
    expect(words(runOf(host)!.querySelector(".not-served"))).toBe(
      "Not served by the page server: answers can't be saved here."
    )
    expect(answer(host, "passed").hasAttribute("disabled")).toBe(true)
  })

  test("Start testing on the To test title, while reviewed;  Esc leaves, the blocks back", async () => {
    await adoptClient(routes)
    const host = await render("")
    const section = host.querySelector("#tests")!
    await settle(section)
    const start = section.shadowRoot!.querySelector<HTMLElement>("ui-button.start-testing")!
    expect(words(start)).toBe("Start testing · 4")
    start.click()
    await settle(host)
    expect([host.matches(":state(testing)"), new URLSearchParams(location.search).get("test")]).toEqual([true, "1"])
    expect(card(host).id).toBe("V1")
    await key(host, "Escape")
    expect([host.matches(":state(testing)"), location.search, runOf(host)]).toEqual([false, "", null])
    // nothing answered:  it just leaves, nothing sent
    expect(routes.posts.some(([route]) => route === "send")).toBe(false)
  })

  test("Done testing SENDS the run's unsent answers (I52), after their saves;  the notice says how many", async () => {
    routes.inbox.listening = { session: "s", since: new Date().toISOString() }
    const client = await adoptClient(routes)
    const notices: string[] = []
    client.onNotice((message) => notices.push(message))
    const host = await render()
    await key(host, "p")
    await afterAnswer(host)
    await key(host, "s")
    // left at once, the Skip's save maybe still on its way:  the send goes after it
    runOf(host)!.querySelector<HTMLElement>("ui-button.leave")!.click()
    await settle(host)
    expect(runOf(host)).toBeNull()
    await vi.waitFor(() => expect(notices.at(-1)).toBe("2 results sent to Claude"))
    expect(routes.posts.map(([route]) => route)).toEqual(["mark", "mark", "send"])
    expect(["v1", "v2"].every((id) => client.isSent(client.markOf(id)!))).toBe(true)
  })

  test("leaving, the send failing:  the notice says so, the answers wait unsent", async () => {
    const client = await adoptClient(routes)
    const notices: string[] = []
    client.onNotice((message) => notices.push(message))
    const host = await render()
    await key(host, "p")
    await afterAnswer(host)
    const fetch = routes.fetch.getMockImplementation()!
    routes.fetch.mockImplementation(async (input, init) =>
      input.endsWith("/send") ? new Response("gone", { status: 502 }) : fetch(input, init)
    )
    await key(host, "Escape")
    await vi.waitFor(() => expect(notices.at(-1)).toMatch(/^Couldn't send your answers \(1\): .+They're kept/))
    expect(client.isSent(client.markOf("v1")!)).toBe(false)
  })
})
