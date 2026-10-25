import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell-epic/review"

import "spell-ui/components/ui-button"
import "spell-ui/components/ui-icon"
import "spell-epic/components/epic-change"

////////////////
// ## Fakes
////////////////

const PAGE = "/epics/sample/sample.plan.html"

/** A waiting change mark, stamped, its question's answer copied in. */
const WAITING = `<epic-change id="ch3" item="q16" at="2026-10-24 15:10" answer="One list, Caveats">todos fold into it</epic-change>`

/** The same change, accepted. */
const ACCEPTED = WAITING.replace(` answer=`, ` accepted="2026-10-24 19:02" answer=`)

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
    unsentComments: [],
    woken: null
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

let routes: FakeRoutes

/** A started client on `routes`, adopted as the page's;  `served` false:  not served, so never reviewed. */
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
}

/** Render `html`, settled. */
async function render(html: string) {
  const host = await ElementFixture.render(html)
  await ElementFixture.settle()
  return host
}

/** `host`'s part `name`. */
function part(host: Element, name: string): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)!
}

/** `host`'s Accept or Reopen button, in its `<epic-review>`'s shadow root;  `null` when not drawn. */
function button(host: Element, action: "accept" | "reopen"): HTMLElement | null {
  const review = host.shadowRoot!.querySelector("epic-review")
  return review?.shadowRoot?.querySelector<HTMLElement>(`ui-button[data-action="${action}"]`) ?? null
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

describe("<epic-change>", () => {
  test("draws its words on an orange ground, then a folded chip naming the question;  passes axe", async () => {
    const host = await render(`<p>Caveats:  ${WAITING}.</p>`).then((p) => p.querySelector("epic-change")!)
    const words = part(host, "words")
    expect([words.localName, words.querySelector("slot") !== null]).toEqual(["mark", true])
    expect(getComputedStyle(words).backgroundColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    expect(words.title).toBe("Changed by Q16's answer on 10/24/26 15:10:  Accept or Reopen")
    const chip = part(host, "chip")
    expect([chip.textContent, chip.getAttribute("aria-expanded"), part(host, "qa").hidden]).toEqual([
      "Q16",
      "false",
      true
    ])
    await expectAccessible(host)
  })

  test("its chip unfolds the question's title (from the page) and its answer, in a line", async () => {
    const page = await render(
      `<div><epic-item id="q16" title="Where do caveats go?" status="decided"></epic-item><p>${WAITING}</p></div>`
    )
    const host = page.querySelector("epic-change")!
    part(host, "chip").click()
    await ElementFixture.settle()
    const qa = part(host, "qa")
    expect([qa.hidden, qa.textContent, host.matches(":state(open)")]).toEqual([
      false,
      "Where do caveats go? · One list, Caveats",
      true
    ])
  })

  test("accepted:  NO orange, the chip muted but kept (Q13, B), and no buttons", async () => {
    await adoptClient()
    const host = await render(ACCEPTED)
    expect(host.matches(":state(accepted)")).toBe(true)
    expect(getComputedStyle(part(host, "words")).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    expect(part(host, "chip").textContent).toBe("Q16")
    expect(part(host, "words").title).toBe("Changed by Q16's answer on 10/24/26 15:10;  accepted 10/24/26 19:02")
    expect(button(host, "accept")).toBeNull()
  })

  test("while reviewed:  Accept (green) and Reopen (blue) post their marks under its id;  none unstamped or unserved", async () => {
    await adoptClient({ served: false })
    expect(button(await render(WAITING), "accept")).toBeNull()
    ReviewClient.adopt(undefined)
    await adoptClient()
    expect(button(await render(`<epic-change item="q16">just written</epic-change>`), "accept")).toBeNull()
    const host = await render(WAITING)
    const accept = button(host, "accept")!
    expect([accept.dataset.color, button(host, "reopen")!.dataset.color]).toEqual(["green", "blue"])
    accept.click()
    await vi.waitFor(() => expect(routes.inbox.marks.ch3?.action).toBe("accept"))
    button(host, "reopen")!.click()
    await vi.waitFor(() => expect(routes.inbox.marks.ch3?.action).toBe("reopen"))
  })
})
