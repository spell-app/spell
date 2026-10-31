import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { UI } from "spell/ui/runtime"
import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-popup"
import "spell/epic/components/epic-change"

////////////////
// ## Fakes
////////////////

const PAGE = "/epics/sample/sample.plan.html"

/** `date` as a change mark stamps it:  `2026-10-24 15:10`, local time. */
function stamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`
}

/** Stamped an hour ago. */
const AN_HOUR_AGO = stamp(new Date(Date.now() - 60 * 60 * 1000))

/** A NEW change mark (stamped an hour ago), its question's answer copied in. */
const NEW = `<epic-change id="ch3" item="q16" at="${AN_HOUR_AGO}" answer="One list, Caveats">todos fold into it</epic-change>`

/** The same change, stamped 4 days ago:  quiet. */
const OLDER = NEW.replace(AN_HOUR_AGO, stamp(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)))

/** The same change, accepted on a page from before changes needed no approval:  quiet. */
const ACCEPTED = NEW.replace(` answer=`, ` accepted="2026-10-24 19:02" answer=`)

/** The review routes' `mark`, as `fetch`, over an inbox kept here:  each reply the whole inbox. */
class FakeRoutes {
  inbox: Inbox = {
    marks: {},
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: {},
    taken: {},
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

/** `host`'s popup on its words (`<ui-popup>`), and whether it's shown. */
function popup(host: Element): HTMLElement {
  return part(host, "popup")
}
function isOpen(host: Element): boolean {
  return popup(host).matches(":popover-open")
}

/** The popup's text, its spaces collapsed. */
function popupText(host: Element): string {
  return popup(host).textContent!.replace(/\s+/g, " ").trim()
}

/** `host`'s Accept or Reopen button, in its `<epic-review>`'s shadow root;  `null` when not drawn. */
function button(host: Element, action: "accept" | "reopen"): HTMLElement | null {
  const review = host.shadowRoot!.querySelector("epic-review")
  return review?.shadowRoot?.querySelector<HTMLElement>(`ui-button[data-action="${action}"]`) ?? null
}

beforeEach(async () => {
  routes = new FakeRoutes()
  await UI.load()
  // Escape through a keyboard binding rather than `CloseWatcher`, so the test can press it
  UI.overlays.useCloseWatcher = false
})

afterEach(() => {
  ReviewClient.adopt(undefined)
})

////////////////
// ## Tests
////////////////

describe("<epic-change>", () => {
  test("new:  its words on an orange ground, then a folded chip naming the question;  passes axe", async () => {
    const host = await render(`<p>Caveats:  ${NEW}.</p>`).then((p) => p.querySelector("epic-change")!)
    const words = part(host, "words")
    expect([words.localName, words.querySelector("slot") !== null]).toEqual(["mark", true])
    expect(getComputedStyle(words).backgroundColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    // no tooltip:  the popup says it, on a click (I160)
    expect([words.hasAttribute("title"), isOpen(host)]).toEqual([false, false])
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
      `<div><epic-item id="q16" title="Where do caveats go?" status="decided"></epic-item><p>${NEW}</p></div>`
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

  test("no approval (Owen, 2026-10-25):  quiet after 3 days, or accepted before:  NO orange, the chip kept, no button", async () => {
    await adoptClient()
    for (const markup of [OLDER, ACCEPTED]) {
      const host = await render(markup)
      expect(host.matches(":state(quiet)")).toBe(true)
      expect(getComputedStyle(part(host, "words")).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
      expect(part(host, "chip").textContent).toBe("Q16")
      expect(popupText(host)).toMatch(/^Changed by Q16 \(\d+\/\d+\/\d+ \d+:\d+\)$/)
      expect(button(host, "reopen")).toBeNull()
    }
  })

  test("new and reviewed:  Reopen (blue) alone posts its mark under its id;  none unstamped or unserved, no Accept", async () => {
    await adoptClient({ served: false })
    expect(button(await render(NEW), "reopen")).toBeNull()
    ReviewClient.adopt(undefined)
    await adoptClient()
    expect(button(await render(`<epic-change item="q16">just written</epic-change>`), "reopen")).toBeNull()
    const host = await render(NEW)
    expect(button(host, "accept")).toBeNull()
    const reopen = button(host, "reopen")!
    expect(reopen.dataset.color).toBe("blue")
    expect(part(host, "words").hasAttribute("title")).toBe(false)
    reopen.click()
    await vi.waitFor(() => expect(routes.inbox.marks.ch3?.action).toBe("reopen"))
  })

  test("I160:  a click on the words opens its popup, a click elsewhere closes it;  no hover", async () => {
    const host = await render(`<p>Caveats:  ${NEW}.</p>`).then((p) => p.querySelector("epic-change")!)
    const words = part(host, "words")
    await userEvent.hover(words)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(isOpen(host)).toBe(false)
    await userEvent.click(words)
    await ElementFixture.settle()
    expect([isOpen(host), words.getAttribute("aria-expanded")]).toEqual([true, "true"])
    expect(popupText(host)).toMatch(/^Changed by Q16 \(\d+\/\d+\/\d+ \d+:\d+\)$/)
    await userEvent.click(document.body, { position: { x: 2, y: 2 } })
    await ElementFixture.settle()
    expect(isOpen(host)).toBe(false)
  })

  test("I160:  the keyboard:  Tab to the words, Enter opens it, Escape closes it", async () => {
    const host = await render(`<p>${NEW}</p>`).then((p) => p.querySelector("epic-change")!)
    const words = part(host, "words")
    expect([words.tabIndex, words.getAttribute("role")]).toEqual([0, "button"])
    words.focus()
    await userEvent.keyboard("{Enter}")
    await ElementFixture.settle()
    expect(isOpen(host)).toBe(true)
    await userEvent.keyboard("{Escape}")
    await ElementFixture.settle()
    expect(isOpen(host)).toBe(false)
    await userEvent.keyboard(" ")
    await ElementFixture.settle()
    expect(isOpen(host)).toBe(true)
  })

  test("I160:  `was` shows as Originally, under the line;  Reopen kept while reviewed", async () => {
    await adoptClient()
    const host = await render(NEW.replace(` answer=`, ` was="todos stay a list of their own" answer=`))
    await userEvent.click(part(host, "words"))
    await ElementFixture.settle()
    const original = popup(host).querySelector(".original")!
    expect(original.textContent!.replace(/\s+/g, " ").trim()).toBe("Originally: todos stay a list of their own")
    expect(original.querySelector("i")!.textContent).toBe("Originally:")
    expect(button(host, "reopen")).not.toBeNull()
    await expectAccessible(host)
  })

  test("I160:  the popup and its arrow are filled alike, and opaque", async () => {
    const host = await render(`<p>${NEW}</p>`).then((p) => p.querySelector("epic-change")!)
    await userEvent.click(part(host, "words"))
    await ElementFixture.settle()
    const box = popup(host).shadowRoot!.querySelector<HTMLElement>("[part~=popup]")!
    const body = getComputedStyle(box)
    const arrow = getComputedStyle(box, "::before")
    expect(arrow.backgroundColor).toBe(body.backgroundColor)
    expect(body.backgroundColor).not.toMatch(/^rgba\(.*, 0(\.\d+)?\)$|^transparent$/)
    expect(body.backdropFilter).toBe("none")
  })
})
