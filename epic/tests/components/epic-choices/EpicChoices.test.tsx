import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient } from "spell/epic/review"

// NOT `epic-item`:  the options read only their item's attributes, so an undefined `<epic-item>` does
import "spell/epic/components/epic-choices"

////////////////
// ## Fakes
////////////////

/** The page the fake routes serve. */
const PAGE = "/epics/sample/sample.plan.html"

/** A mark as the fake routes keep it. */
type FakeMark = {
  action: string
  pick?: string
  choices?: number
  note?: string
  when?: string
  removed?: string[]
  at: string
}

/**
 * The page server's review routes, as `fetch`:  `GET inbox`, `POST mark` and `POST send`, every reply the whole
 * inbox;  a session listening.
 */
class FakeRoutes {
  inbox = {
    marks: {} as Record<string, FakeMark>,
    drafts: {},
    sent: null as string | null,
    now: [],
    working: {},
    listening: { session: "s1", seen: new Date().toISOString() }
  }
  /** every POST, as `[route, body]` */
  posts: [string, Record<string, unknown>][] = []

  // the client fetches by URL string, a POST's body a JSON string
  readonly fetch = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (url.startsWith("/api/epics/review/inbox")) return Response.json(this.inbox)
    const route = url.replace("/api/epics/review/", "")
    const body = JSON.parse(init?.body as string) as Record<string, unknown>
    this.posts.push([route, body])
    const id = body.id as string
    if (route === "mark") {
      const mark = body.mark as Omit<FakeMark, "at"> | null
      if (mark) this.inbox.marks[id] = { ...mark, at: new Date().toISOString() }
      else delete this.inbox.marks[id]
    }
    if (route === "send") this.inbox.sent = new Date(Date.now() + 1000).toISOString()
    return Response.json(this.inbox)
  })
}

/** A reviewing page:  the fake routes, and the page's client on them (`ReviewClient.forPage()` returns it). */
async function reviewing(routes = new FakeRoutes()) {
  const client = new ReviewClient({
    page: PAGE,
    server: { token: "t1" },
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch,
    storage: null
  })
  expect(await client.start()).toBe(true)
  ReviewClient.adopt(client)
  return { routes, client }
}

/** `option`'s Choose pill, if it has one. */
function pillOf(option: Element): HTMLButtonElement | null {
  return option.shadowRoot!.querySelector<HTMLButtonElement>("[part~='choose']")
}

/** Each option's pill as `[text, aria-pressed]`, or `null` without one. */
function pills(options: Element[]) {
  return options.map((option) => {
    const pill = pillOf(option)
    return pill && [pill.textContent, pill.getAttribute("aria-pressed")]
  })
}

/** Let a click's write land, and the elements redraw. */
async function settle() {
  for (let round = 0; round < 3; round++) await ElementFixture.tick()
}

afterEach(() => ReviewClient.adopt(undefined))

/** Two options, `B` recommended. */
const OPTIONS =
  `<epic-option letter="A" title="A named palette"><ul><li>short</li></ul></epic-option>` +
  `<epic-option letter="B" title="Any CSS colour" recommended><ul><li>free</li></ul></epic-option>`

/** Render `html`;  returns its `<epic-choices>` and the option hosts. */
async function choices(html: string) {
  const first = await ElementFixture.render(html)
  const host = first.localName === "epic-choices" ? first : first.querySelector("epic-choices")!
  return { host, options: Array.from(host.querySelectorAll("epic-option")) }
}

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement | null {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)
}

describe("<epic-choices>", () => {
  test("an open question:  cards side by side, each headed `A · title`, a violet thumbs-up after the recommended one, no word;  passes axe", async () => {
    const { host, options } = await choices(`<epic-choices>${OPTIONS}</epic-choices>`)
    expect(host.matches(":state(answered)")).toBe(false)
    expect(getComputedStyle(part(host, "cards")!).display).toBe("grid")
    expect(options.map((option) => part(option, "title")!.textContent!.trim())).toEqual([
      "A · A named palette",
      "B · Any CSS colour"
    ])
    const thumb = part(options[1]!, "recommended")!
    expect([part(options[0]!, "recommended"), thumb.getAttribute("aria-label"), thumb.title]).toEqual([
      null,
      "Recommended",
      "Recommended"
    ])
    await vi.waitFor(() => expect(thumb.querySelector("svg")).not.toBeNull())
    expect(options.map((option) => part(option, "base")!.className)).toEqual(["card option", "card option"])
    expect(part(host, "toggle")).toBeNull()
    await expectAccessible(host)
  })

  test("an open question's card folds by its header (Owen, 2026-10-08), open to start;  one with no pros and cons doesn't", async () => {
    const { host, options } = await choices(
      `<epic-choices>${OPTIONS}<epic-option letter="C" title="Nothing said"></epic-option></epic-choices>`
    )
    const [a, b, c] = options
    const toggle = part(a!, "toggle")!
    expect([toggle.localName, toggle.getAttribute("aria-expanded"), a!.matches(":state(open)")]).toEqual([
      "button",
      "true",
      true
    ])
    toggle.click()
    await ElementFixture.tick()
    expect([part(a!, "body")!.getAttribute("hidden"), a!.matches(":state(open)"), part(b!, "body")!.hidden]).toEqual([
      "until-found",
      false,
      false
    ])
    // folded, its header alone:  shorter than its open neighbour in the row
    expect(part(a!, "base")!.getBoundingClientRect().height).toBeLessThan(
      part(b!, "base")!.getBoundingClientRect().height
    )
    expect([part(c!, "toggle")!.localName, part(c!, "toggle")!.hasAttribute("aria-expanded")]).toEqual(["span", false])
    await expectAccessible(host)
  })

  test("answered:  folded under `Choices`, which NAMES the chosen one;  that one a panel marked with a check, and open;  passes axe", async () => {
    const { host, options } = await choices(`<epic-choices chosen="B">${OPTIONS}</epic-choices>`)
    const [a, b] = options
    expect(host.matches(":state(answered)")).toBe(true)
    // folded, the pick stays in sight (Owen, 2026-10-10)
    expect([
      part(host, "toggle")!.textContent,
      part(host, "chosen")!.textContent,
      part(host, "panels")!.getAttribute("hidden")
    ]).toEqual([
      `ChoicesChosen:  B · ${b!.getAttribute("title")}`,
      `Chosen:  B · ${b!.getAttribute("title")}`,
      "until-found"
    ])
    expect([a.matches(":state(chosen)"), b.matches(":state(chosen)")]).toEqual([false, true])
    expect([part(a, "check"), part(b, "check")?.localName]).toEqual([null, "svg"])
    expect([part(a, "body")!.getAttribute("hidden"), part(b, "body")!.hasAttribute("hidden")]).toEqual([
      "until-found",
      false
    ])
    part(host, "toggle")!.click()
    await ElementFixture.tick()
    expect([host.matches(":state(open)"), part(host, "panels")!.hasAttribute("hidden")]).toEqual([true, false])
    await expectAccessible(host)
  })

  test("the pick's line atop the panels (I153):  its day and what happens next;  none before I153, nor while open", async () => {
    const note = "recorded as the answer;  waiting for a phase to take it up"
    const { host } = await choices(
      `<epic-choices chosen="B" chosen-on="2026-10-29" chosen-note="${note}">${OPTIONS}</epic-choices>`
    )
    expect(part(host, "panels")!.firstElementChild).toBe(part(host, "note"))
    expect(part(host, "note")!.textContent).toBe(`Chosen 10/29/26:  ${note}`)
    host.removeAttribute("chosen-on")
    await ElementFixture.tick()
    expect(part(host, "note")!.textContent).toBe(`Chosen:  ${note}`)
    const before = await choices(`<epic-choices chosen="B">${OPTIONS}</epic-choices>`)
    expect(part(before.host, "note")).toBeNull()
    const open = await choices(`<epic-choices chosen-note="${note}">${OPTIONS}</epic-choices>`)
    expect(part(open.host, "note")).toBeNull()
  })

  test("a panel's header folds and unfolds it", async () => {
    const { options } = await choices(`<epic-choices chosen="A">${OPTIONS}</epic-choices>`)
    const [, b] = options
    part(b, "toggle")!.click()
    await ElementFixture.tick()
    expect([b.matches(":state(open)"), part(b, "body")!.hasAttribute("hidden")]).toEqual([true, false])
    part(b, "toggle")!.click()
    await ElementFixture.tick()
    expect(b.matches(":state(open)")).toBe(false)
  })

  test("answered without a pick (`answered` on its item):  folded too, nothing marked;  follows `chosen` as it's set", async () => {
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="decided" answered><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    expect(host.matches(":state(answered)")).toBe(true)
    expect(options.some((option) => option.matches(":state(chosen)"))).toBe(false)
    host.setAttribute("chosen", "A")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(options[0].matches(":state(chosen)")).toBe(true)
  })

  test("an option's title with markup comes through its `title` slot", async () => {
    const { options } = await choices(
      `<epic-choices><epic-option letter="A"><span slot="title">The <code>x</code> API</span><p>Why</p></epic-option></epic-choices>`
    )
    const slot = part(options[0], "title")!.querySelector<HTMLSlotElement>("slot")!
    expect(slot.assignedElements()[0].textContent).toBe("The x API")
  })
})

describe("<epic-option>'s Choose pill (P10)", () => {
  test("none while the page isn't reviewed (no page server, no inbox)", async () => {
    const { options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(pills(options)).toEqual([null, null])
  })

  test("an open question's cards each take one;  a click picks its letter through the client, again un-picks it;  passes axe", async () => {
    const { routes } = await reviewing()
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(pills(options)).toEqual([
      ["Choose", "false"],
      ["Choose", "false"]
    ])
    pillOf(options[1])!.click()
    await settle()
    // the pick names its card set by position (I8):  the item's first
    expect(routes.posts).toEqual([["mark", { page: PAGE, id: "q1", mark: { action: "pick", pick: "B", choices: 0 } }]])
    expect(pills(options)).toEqual([
      ["Choose", "false"],
      ["Chosen · not sent", "true"]
    ])
    expect([options[1].matches(":state(picked)"), part(options[1], "base")!.classList.contains("picked")]).toEqual([
      true,
      true
    ])
    expect(pillOf(options[1])!.title).toBe("B is picked:  click to un-pick · not sent yet")
    // the fill rule (Q20):  a pick not sent is DASHED green, pill and card
    expect([
      getComputedStyle(pillOf(options[1])!).borderTopStyle,
      getComputedStyle(part(options[1], "base")!).borderTopStyle,
      getComputedStyle(pillOf(options[0])!).borderTopStyle
    ]).toEqual(["dashed", "dashed", "solid"])
    await expectAccessible(host)
    pillOf(options[1])!.click()
    await settle()
    expect(routes.posts[1]).toEqual(["mark", { page: PAGE, id: "q1", mark: null }])
    expect(pills(options)).toEqual([
      ["Choose", "false"],
      ["Choose", "false"]
    ])
  })

  test("a pick once sent:  the pill and card outlined, no longer dashed (`sent`), its tooltip says so", async () => {
    const { client } = await reviewing()
    const { options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    pillOf(options[0])!.click()
    await settle()
    await client.send()
    await settle()
    expect([pillOf(options[0])!.classList.contains("sent"), pillOf(options[0])!.title]).toEqual([
      true,
      "A is picked:  click to un-pick · sent"
    ])
    expect([
      part(options[0], "base")!.classList.contains("sent"),
      getComputedStyle(pillOf(options[0])!).borderTopStyle,
      getComputedStyle(part(options[0], "base")!).borderTopStyle
    ]).toEqual([true, "solid", "solid"])
  })

  test("an answered question's panels:  the chosen one's pill SOLID (applied), no other until it's revisited", async () => {
    const { client, routes } = await reviewing()
    const { options } = await choices(
      `<epic-item id="q1" title="Which?" status="decided" answered><epic-choices chosen="A">${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(pills(options)).toEqual([["Chosen", "true"], null])
    const applied = pillOf(options[0])!
    // the fill rule's done:  solid green, a click does nothing;  the panel isn't framed as a pick
    expect([
      applied.classList.contains("applied"),
      applied.getAttribute("aria-disabled"),
      applied.title,
      getComputedStyle(applied).backgroundColor === getComputedStyle(applied).borderTopColor,
      options[0].matches(":state(picked)")
    ]).toEqual([true, "true", "A is the chosen option", true, false])
    applied.click()
    await settle()
    expect(routes.posts).toEqual([])
    await client.save("q1", { action: "revisit", when: "soon", note: "but why?" })
    await settle()
    expect(pills(options)).toEqual([
      ["Chosen", "true"],
      ["Choose", "false"]
    ])
  })

  test("never in an Original Discussion:  history, not a choice", async () => {
    await reviewing()
    const item = await ElementFixture.render(
      `<epic-item id="q1" title="Which?" status="open"><epic-original><epic-choices>${OPTIONS}</epic-choices></epic-original></epic-item>`
    )
    await settle()
    expect(pills(Array.from(item.querySelectorAll("epic-option")))).toEqual([null, null])
  })
})

describe("<epic-option>'s Choose pill, anywhere (I8)", () => {
  /**
   * An open judgement call holding two card sets:  its text's, and a reply's;  an Original Discussion's set before
   * both (never counted).  Returns each set's options.
   */
  async function twoSets() {
    const item = await ElementFixture.render(
      `<epic-item id="j2" title="Which store?" status="open">` +
        `<epic-original><epic-choices>${OPTIONS}</epic-choices></epic-original>` +
        `<p>weighed</p><epic-choices>${OPTIONS}</epic-choices>` +
        `<epic-reply from="Claude"><p>or:</p><epic-choices>${OPTIONS}</epic-choices></epic-reply></epic-item>`
    )
    const [, own, reply] = Array.from(item.querySelectorAll("epic-choices"), (set) =>
      Array.from(set.querySelectorAll("epic-option"))
    )
    return { item, own: own!, reply: reply! }
  }

  test("a judgement call's cards and a reply's each take pills;  a pick in the reply names ITS set, and marks only it", async () => {
    const { routes } = await reviewing()
    const { own, reply } = await twoSets()
    await settle()
    expect([pills(own), pills(reply)]).toEqual([
      [
        ["Choose", "false"],
        ["Choose", "false"]
      ],
      [
        ["Choose", "false"],
        ["Choose", "false"]
      ]
    ])
    pillOf(reply[0])!.click()
    await settle()
    expect(routes.posts).toEqual([["mark", { page: PAGE, id: "j2", mark: { action: "pick", pick: "A", choices: 1 } }]])
    expect([pills(own)[0], pills(reply)[0]]).toEqual([
      ["Choose", "false"],
      ["Chosen · not sent", "true"]
    ])
    // dashed until sent, wherever the cards are
    expect(getComputedStyle(pillOf(reply[0])!).borderTopStyle).toBe("dashed")
  })

  test("an old mark, `{ pick }` with no card set:  the item's own set's option, never the reply's", async () => {
    const routes = new FakeRoutes()
    routes.inbox.marks.j2 = { action: "pick", pick: "B", at: new Date().toISOString() }
    await reviewing(routes)
    const { own, reply } = await twoSets()
    await settle()
    expect([pills(own)[1], pills(reply)[1]]).toEqual([
      ["Chosen · not sent", "true"],
      ["Choose", "false"]
    ])
  })

  test("from the pick on, it says Chosen:  not sent, sent, still sent once Claude takes it (the doc on its way), then applied", async () => {
    const { client, routes } = await reviewing()
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    pillOf(options[1])!.click()
    await settle()
    expect(pills(options)[1]).toEqual(["Chosen · not sent", "true"])
    await client.send()
    await settle()
    expect(pills(options)[1]).toEqual(["Chosen · sent", "true"])
    // `inbox apply` clears the mark before the page has the doc's `chosen` (Owen, 2026-10-10:  "losing the marker")
    delete routes.inbox.marks.q1
    await client.refresh()
    await settle()
    expect([pills(options)[1], getComputedStyle(pillOf(options[1])!).borderTopStyle]).toEqual([
      ["Chosen · sent", "true"],
      "solid"
    ])
    // the doc lands:  applied
    host.setAttribute("chosen", "B")
    host.closest("epic-item")!.setAttribute("status", "decided")
    await settle()
    expect(pills(options)[1]).toEqual(["Chosen", "true"])
  })

  test("applied in a reply (its set `chosen`, the call accepted):  that option's pill solid;  the rest none", async () => {
    await reviewing()
    const item = await ElementFixture.render(
      `<epic-item id="j2" title="Which store?" status="done"><p>weighed</p><epic-choices>${OPTIONS}</epic-choices>` +
        `<epic-reply from="Claude"><epic-choices chosen="B">${OPTIONS}</epic-choices></epic-reply></epic-item>`
    )
    await settle()
    const [own, reply] = Array.from(item.querySelectorAll("epic-choices"), (set) =>
      Array.from(set.querySelectorAll("epic-option"))
    )
    expect([pills(own!), pills(reply!)]).toEqual([
      [null, null],
      [null, ["Chosen", "true"]]
    ])
    expect(pillOf(reply![1])!.classList.contains("applied")).toBe(true)
  })
})

////////////////
// ## P50:  any set, pick any, Add choice, edited in place
////////////////

/** `host`'s shadow element matching `selector`. */
function inShadow<T extends Element = HTMLElement>(host: Element, selector: string): T | null {
  return host.shadowRoot!.querySelector<T>(selector)
}

/** The mark the routes keep under `id`, without its time. */
function markOf(routes: FakeRoutes, id: string) {
  const { at: _at, ...mark } = routes.inbox.marks[id] ?? ({ at: "" } as FakeMark)
  return mark
}

describe("<epic-choices> P50:  pick any, the switch, Add choice, edits", () => {
  test("pick any (`multiple`):  several pills on at once, ONE mark naming them all;  the item stays open", async () => {
    const { routes } = await reviewing()
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices multiple>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(inShadow(host, "[part~='switch']")!.getAttribute("aria-checked")).toBe("true")
    pillOf(options[0])!.click()
    await settle()
    pillOf(options[1])!.click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({ action: "pick", pick: "A B", choices: 0 })
    expect(pills(options)).toEqual([
      ["Chosen · not sent", "true"],
      ["Chosen · not sent", "true"]
    ])
  })

  test("the switch flips pick one to pick any, and back:  the newest pick stays;  the flip rides in the mark", async () => {
    const { routes } = await reviewing()
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    const toggle = () => inShadow<HTMLButtonElement>(host, "[part~='switch']")!
    expect([toggle().getAttribute("role"), toggle().getAttribute("aria-checked"), toggle().textContent]).toEqual([
      "switch",
      "false",
      "Pick one"
    ])
    toggle().click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({ action: "pick", multiple: true, choices: 0 })
    pillOf(options[1])!.click()
    await settle()
    pillOf(options[0])!.click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({ action: "pick", pick: "B A", multiple: true, choices: 0 })
    toggle().click()
    await settle()
    // back to what the set says:  no flip, the newest pick alone
    expect(markOf(routes, "q1")).toEqual({ action: "pick", pick: "A", choices: 0 })
    expect(pills(options)).toEqual([
      ["Chosen · not sent", "true"],
      ["Choose", "false"]
    ])
  })

  test("the switch flips a set already picked (I178):  pick any holds, the pick kept", async () => {
    const routes = new FakeRoutes()
    routes.inbox.marks.q1 = { action: "pick", pick: "B", choices: 0, at: new Date().toISOString() }
    await reviewing(routes)
    const { host, options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    const toggle = () => inShadow<HTMLButtonElement>(host, "[part~='switch']")!
    toggle().click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({ action: "pick", pick: "B", multiple: true, choices: 0 })
    expect([toggle().getAttribute("aria-checked"), toggle().textContent]).toEqual(["true", "Pick any"])
    pillOf(options[0])!.click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({ action: "pick", pick: "B A", multiple: true, choices: 0 })
  })

  test("Add choice:  its form, then a card of Owen's, picked, dashed until sent;  ✕ drops it", async () => {
    const { routes } = await reviewing()
    const { host } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    inShadow<HTMLButtonElement>(host, "[part~='add']")!.click()
    await settle()
    const form = inShadow(host, "epic-option-form")!
    await ElementFixture.settle()
    const title = form.shadowRoot!.querySelector<HTMLInputElement>("[part~='title']")!
    title.value = "Both"
    form.shadowRoot!.querySelector<HTMLButtonElement>("button[type=submit]")!.click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({
      action: "pick",
      pick: "+1",
      added: [{ key: "+1", title: "Both" }],
      choices: 0
    })
    const card = inShadow(host, "[part~='added']")!
    expect(card.textContent).toContain("New · Both")
    expect(card.textContent).toContain("Yours · not sent")
    expect(getComputedStyle(card).borderTopStyle).toBe("dashed")
    expect(inShadow(host, "epic-option-form")).toBe(null)
    // its ✕
    card.querySelectorAll("ui-button")[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await settle()
    expect(routes.inbox.marks.q1).toBe(undefined)
  })

  test("`fixed`:  no Add choice;  `closed`:  drawn answered, no pills, no switch, no pencils", async () => {
    await reviewing()
    const fixed = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices fixed>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(inShadow(fixed.host, "[part~='add']")).toBe(null)
    expect(inShadow(fixed.host, "[part~='switch']")).not.toBe(null)
    const closed = await choices(
      `<epic-item id="q2" title="Which?" status="open"><epic-choices closed>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    expect(closed.host.matches(":state(answered)")).toBe(true)
    expect(pills(closed.options)).toEqual([null, null])
    expect(inShadow(closed.host, "[part~='switch']")).toBe(null)
    expect(closed.options.map((option) => inShadow(option, ".tools"))).toEqual([null, null])
  })

  test("edited in place:  the pencil's form, then the new title dashed with Undo;  ✕ fades it, Undo brings it back", async () => {
    const { routes } = await reviewing()
    const { options } = await choices(
      `<epic-item id="q1" title="Which?" status="open"><epic-choices>${OPTIONS}</epic-choices></epic-item>`
    )
    await settle()
    const tools = (option: Element) => inShadow(option, ".tools")!.querySelectorAll("ui-button")
    tools(options[0])[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await settle()
    const form = inShadow(options[0], "epic-option-form")!
    await ElementFixture.settle()
    const title = form.shadowRoot!.querySelector<HTMLInputElement>("[part~='title']")!
    expect(title.value).toBe("A named palette")
    title.value = "A palette of six"
    form.shadowRoot!.querySelector<HTMLButtonElement>("button[type=submit]")!.click()
    await settle()
    expect(markOf(routes, "q1")).toEqual({
      action: "pick",
      edited: [{ letter: "A", title: "A palette of six", note: "short" }],
      choices: 0
    })
    expect(part(options[0], "title")!.textContent).toBe("A · A palette of six")
    expect(part(options[0], "change")!.textContent).toContain("Edited · not sent")
    tools(options[1])[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    await settle()
    expect(options[1].matches(":state(removing)")).toBe(true)
    expect(markOf(routes, "q1").removed).toEqual(["B"])
    part(options[1], "change")!.querySelector("button")!.click()
    await settle()
    expect(options[1].matches(":state(removing)")).toBe(false)
    expect(markOf(routes, "q1")).toEqual({
      action: "pick",
      edited: [{ letter: "A", title: "A palette of six", note: "short" }],
      choices: 0
    })
  })

  test("a phase's set is keyed by the phase;  a standing set by its own id, its title its heading", async () => {
    const { routes } = await reviewing()
    const phase = await choices(
      `<epic-phase id="p-one"><epic-field name="choices"><epic-choices>${OPTIONS}</epic-choices></epic-field></epic-phase>`
    )
    await settle()
    pillOf(phase.options[0])!.click()
    await settle()
    expect(markOf(routes, "p-one")).toEqual({ action: "pick", pick: "A", choices: 0 })
    const standing = await choices(
      `<epic-choices id="s-upgrades" title="Upgrades on offer" standing multiple>${OPTIONS}` +
        `<epic-option letter="C" title="Old one" slot="picked" picked-on="2026-10-28"></epic-option>` +
        `<epic-option letter="D" title="Gone" slot="removed" removed="2026-10-28"></epic-option></epic-choices>`
    )
    await settle()
    expect(standing.host.matches(":state(answered)")).toBe(false)
    expect(part(standing.host, "title")!.textContent).toBe("Upgrades on offer")
    expect(part(standing.host, "picked")!.textContent).toContain("Picked (1)")
    expect(part(standing.host, "removed")!.textContent).toContain("Removed (1)")
    // retired options:  no pill
    expect(pills(standing.options)).toEqual([["Choose", "false"], ["Choose", "false"], null, null])
    pillOf(standing.options[1])!.click()
    await settle()
    expect(markOf(routes, "s-upgrades")).toEqual({ action: "pick", pick: "B", choices: 0 })
  })
})
