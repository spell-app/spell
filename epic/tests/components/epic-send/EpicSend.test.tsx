import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { AnswerForm } from "spell-epic/answers"

import "spell-epic/components/epic-send"
import "spell-epic/components/epic-text-box"
// the boxes are `<ui-textarea grow>`s:  `<ui-root>` loads them on a page
import "spell-ui/components/ui-input"

////////////////
// ## Fakes
////////////////

/**
 * The details routes, as `fetch`:  no answer or draft yet;  a POST answered as saved or sent.
 * - `listening`:  who waits for the answer, as the route answers it (r6);  `undefined`:  a route from before, silent
 */
function fakeRoute({ listening }: { listening?: { since: string; seen: string } | null } = {}) {
  return vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (!init?.method || init.method === "GET") return Response.json({ answer: null, draft: null, listening })
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    if (url === "/api/docs/details/draft")
      return Response.json({ ok: true, draft: { ...body, saved: "2026-10-14T04:00:00.000Z" } })
    const answer = { ...body, answered: "2026-10-14T04:00:00.000Z", changes: 0 }
    return Response.json({ ok: true, answer, listening })
  })
}

/** The page's form, on the fake route;  `page`:  its path. */
function adoptForm(route = fakeRoute(), page = "/pages/details/x.html") {
  const form = new AnswerForm({
    page,
    server: { token: "t" },
    protocol: "http:",
    fetch: route as unknown as typeof fetch
  })
  AnswerForm.adopt(form)
  return { form, fetch: route }
}

afterEach(() => AnswerForm.adopt(undefined))

/** `host`'s shadow part `name`. */
function part(host: Element, name: string): HTMLElement | null {
  return host.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)
}

/** `send`'s paper plane:  the `send` part of its `<epic-send-buttons>` (epic `epic-engine` P20). */
function plane(send: Element): HTMLElement {
  return part(part(send, "send")!, "send")!
}

////////////////
// ## Tests
////////////////

describe("<epic-send>", () => {
  test("nothing on the page:  Not sent, grey;  Send a round grey outline with a tooltip and a name;  axe", async () => {
    adoptForm()
    const send = await ElementFixture.render(`<epic-send></epic-send>`)
    await ElementFixture.settle()
    expect(part(send, "state")!.textContent).toBe("Not sent")
    expect(part(send, "state")!.dataset.color).toBe("grey")
    // Send and its countdown, one group (epic `epic-engine` P20):  grey with nothing to send
    const group = part(send, "send")!
    expect([group.localName, group.dataset.fill, group.getAttribute("state")]).toEqual([
      "epic-send-buttons",
      "rest",
      "idle"
    ])
    expect(plane(send).getAttribute("aria-label")).toMatch(/partial answer is fine/)
    expect(plane(send).title).toMatch(/partial answer is fine/)
    await expectAccessible(send)
  })

  test("something typed:  dashed blue;  Send posts it;  sent:  green, a blue outline", async () => {
    const { fetch } = adoptForm()
    const root = await ElementFixture.render(
      `<div><epic-send></epic-send><epic-text-box type="notes"></epic-text-box></div>`
    )
    const [send, notes] = Array.from(root.children) as [Element, Element]
    const field = notes.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    field.value = "hi"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect([part(send, "send")!.dataset.fill, part(send, "state")!.textContent]).toEqual(["pending", "Not sent"])
    expect(send.matches(":state(pending)")).toBe(true)
    plane(send).click()
    await vi.waitFor(() => expect(part(send, "send")!.dataset.fill).toBe("sent"))
    // no question on the page:  nothing to count (r6)
    expect(part(send, "state")!.textContent).toMatch(/^Sent \d+\/\d+\/\d+ \d\d:\d\d$/)
    const posted = JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string) as Record<string, unknown>
    expect(posted).toEqual({ page: "/pages/details/x.html", answers: {}, comments: {}, notes: "hi" })
  })

  test("the draft's save, muted beside it (P18):  not saved yet, then saved;  sent:  gone", async () => {
    const { form, fetch } = adoptForm()
    const root = await ElementFixture.render(
      `<div><epic-send></epic-send><epic-text-box type="notes"></epic-text-box></div>`
    )
    const [send, notes] = Array.from(root.children) as [Element, Element]
    const field = notes.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    field.value = "half a thought"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(part(send, "draft")!.textContent).toBe("not saved yet")
    await form.saveDraft()
    await ElementFixture.settle()
    expect(part(send, "draft")!.textContent).toMatch(/^saved \d\d:\d\d$/)
    expect([part(send, "draft")!.classList.contains("draft-failed"), fetch.mock.calls.at(-1)![0]]).toEqual([
      false,
      "/api/docs/details/draft"
    ])
    plane(send).click()
    await vi.waitFor(() => expect(part(send, "send")!.dataset.fill).toBe("sent"))
    expect(part(send, "draft")).toBeNull()
  })

  test("a draft's save that failed:  on its own line under the rest, red and bold (P15)", async () => {
    const route = vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
      if (!init?.method || init.method === "GET") return Response.json({ answer: null, draft: null })
      return Response.json({ error: "disk full" }, { status: 500 })
    })
    const { form } = adoptForm(route)
    const root = await ElementFixture.render(
      `<div><epic-send></epic-send><epic-text-box type="notes"></epic-text-box></div>`
    )
    const [send, notes] = Array.from(root.children) as [Element, Element]
    const field = notes.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    field.value = "half a thought"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await form.saveDraft()
    await ElementFixture.settle()
    const line = part(send, "draft")!
    expect([line.localName, line.getAttribute("role"), line.textContent]).toEqual([
      "p",
      "alert",
      "kept in this browser only:  disk full;  trying again every 3s"
    ])
    expect(getComputedStyle(line).fontWeight).toBe("600")
    // not in the line beside Send, where the side bar's width would cut it short
    expect(line.parentElement).toBe(part(send, "base"))
  })

  test("an empty page never sent:  Send says what to do first, under it", async () => {
    adoptForm()
    const send = await ElementFixture.render(`<epic-send></epic-send>`)
    await ElementFixture.settle()
    plane(send).click()
    await ElementFixture.settle()
    expect(part(send, "error")!.textContent).toMatch(/^Pick an option, or write something/)
    expect(part(send, "error")!.getAttribute("role")).toBe("alert")
  })

  test("comments only (r6):  a section's comment box alone makes it pending;  Send posts the comments", async () => {
    const { fetch } = adoptForm()
    const root = await ElementFixture.render(
      `<div><epic-send></epic-send><ui-section id="l-main" label="2.2 The main checkout"><p>x</p>` +
        `<epic-text-box for="l-main"></epic-text-box></ui-section></div>`
    )
    const send = root.querySelector("epic-send")!
    const box = root.querySelector("epic-text-box")!
    const field = box.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    field.value = "Make the top project just spell"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect([part(send, "send")!.dataset.fill, part(send, "state")!.textContent]).toEqual(["pending", "Not sent"])
    plane(send).click()
    await vi.waitFor(() => expect(part(send, "send")!.dataset.fill).toBe("sent"))
    const posted = JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string) as Record<string, unknown>
    expect(posted.comments).toEqual({ "l-main": "Make the top project just spell" })
  })

  test("who hears it (r6):  a session waiting, a green dot and the epic's name;  none, 'nobody is waiting yet'", async () => {
    adoptForm(
      fakeRoute({ listening: { since: "2026-10-14T03:00:00.000Z", seen: "2026-10-14T03:59:40.000Z" } }),
      "/epics/repo-split/details/layout.html"
    )
    const send = await ElementFixture.render(`<epic-send></epic-send>`)
    await vi.waitFor(() => expect(part(send, "who")?.textContent).toBe("repo-split is listening"))
    expect(part(send, "who")!.hasAttribute("data-listening")).toBe(true)
    expect(part(send, "who")!.title).toMatch(/epic ask wait/)
    AnswerForm.adopt(undefined)
    adoptForm(fakeRoute({ listening: null }), "/epics/repo-split/details/layout.html")
    const other = await ElementFixture.render(`<epic-send></epic-send>`)
    await vi.waitFor(() => expect(part(other, "who")?.textContent).toBe("nobody is waiting yet"))
    expect(part(other, "who")!.hasAttribute("data-listening")).toBe(false)
    expect(part(other, "who")!.title).toMatch(/Send still saves it/)
  })

  test("a route that can't tell who waits (before r6):  no line", async () => {
    adoptForm(fakeRoute())
    const send = await ElementFixture.render(`<epic-send></epic-send>`)
    await ElementFixture.settle()
    expect(part(send, "who")).toBeNull()
  })

  test("sent with nobody waiting (r6):  it's saved, and an orange line says Claude reads it when it next looks", async () => {
    adoptForm(fakeRoute({ listening: null }))
    const root = await ElementFixture.render(
      `<div><epic-send></epic-send><epic-text-box type="notes"></epic-text-box></div>`
    )
    const [send, notes] = Array.from(root.children) as [Element, Element]
    const field = notes.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    field.value = "Is this worth it?"
    field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    plane(send).click()
    await vi.waitFor(() => expect(part(send, "send")!.dataset.fill).toBe("sent"))
    await ElementFixture.settle()
    expect(part(send, "notice")!.textContent).toBe(
      "Saved:  nobody is waiting yet;  Claude reads it when it next looks."
    )
    expect(part(send, "error")).toBeNull()
  })
})
