import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-card"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-dropdown"
import "spell/ui/components/ui-item"
import "spell/epic/components/epic-list"

/** Today, as a card's `updated` writes it. */
const TODAY = new Date().toISOString().slice(0, 10)

/** A card as `docs index` writes it, with `attributes`. */
async function render(attributes: string, description = "Meta tags and a site map.") {
  const host = await ElementFixture.render(
    `<epic-card id="epic-seo" epic="seo" ${attributes}><a href="seo/seo.plan.html">SEO</a>` +
      `${description ? `<span slot="description">${description}</span>` : ""}` +
      `<span slot="meta">P2 · Site Map · epics/seo</span></epic-card>`
  )
  await vi.waitFor(() => expect(host.shadowRoot!.querySelector(".mark")).toBeTruthy())
  return host
}

/** Its state's mark:  `[tag, words or icon, tooltip]`. */
function mark(host: Element): [string, string, string] {
  const each = host.shadowRoot!.querySelector(".mark")!
  return [
    each.localName,
    each.getAttribute("name") ?? each.textContent!.trim(),
    each.getAttribute("data-tooltip") ?? ""
  ]
}

/** Serve the page as the page server does:  a write token. */
function served() {
  ;(window as { SPELL_SERVER?: object }).SPELL_SERVER = { token: "t" }
}

afterEach(() => {
  delete (window as { SPELL_SERVER?: object }).SPELL_SERVER
  vi.restoreAllMocks()
})

describe("<epic-card>", () => {
  test("draws its state, title link, description, saga, meta line and last-worked day;  axe", async () => {
    const host = await render(
      `phases="done active todo" updated="${TODAY}" active="P2 · Site Map" worked="2026-10-09T14:34-04:00" ` +
        `saga="epics" saga-title="Epic Tooling" saga-purpose="Epics &amp; co"`
    )
    const root = host.shadowRoot!
    expect(mark(host)).toEqual(["ui-label", "1/3", `in progress:  P2 · Site Map under way, updated ${TODAY}`])
    expect(root.querySelector("ui-description")).toBeTruthy()
    const saga = root.querySelector(".saga")!
    expect([saga.textContent!.trim(), saga.getAttribute("data-tooltip")]).toEqual(["Epic Tooling", "Epics & co"])
    const worked = root.querySelector("time")!
    expect(worked.textContent).toBe(
      `${new Date("2026-10-09T14:34-04:00").getMonth() + 1}/${new Date("2026-10-09T14:34-04:00").getDate()}`
    )
    expect(worked.getAttribute("data-tooltip")).toMatch(/^Last worked on \d+\/\d+\/26 \d\d:\d\d$/)
    // the title is its own link, in its header
    expect((root.querySelector(".header slot") as HTMLSlotElement).assignedElements()[0]!.localName).toBe("a")
    await expectAccessible(host)
  })

  test("marks each state by the one rule:  paused, future, errors, done;  running is never paused", async () => {
    const host = await render(`phases="done todo" updated="2026-01-01"`, "")
    expect(mark(host)).toEqual(["ui-icon", "circle pause", "paused:  no update since 2026-01-01, 1/2 phases done"])
    expect(host.shadowRoot!.querySelector("ui-description")).toBeNull()
    host.setAttribute("running", "")
    await vi.waitFor(() => expect(mark(host)[0]).toBe("ui-label"))
    expect(mark(host)[2]).toBe("in progress:  1/2 phases done, a session is running")
    host.removeAttribute("running")
    host.setAttribute("phases", "")
    host.setAttribute("future", "")
    await vi.waitFor(() => expect(mark(host)).toEqual(["ui-icon", "seedling", "future:  not planned yet"]))
    host.setAttribute("phases", "done")
    host.setAttribute("urgent", "q1 j2")
    await vi.waitFor(() => expect(mark(host)[1]).toBe("circle exclamation"))
    expect(mark(host)[2]).toBe("errors:  every phase done, but 1 question, 1 judgement call need you")
    host.removeAttribute("urgent")
    await vi.waitFor(() =>
      expect(mark(host)).toEqual(["ui-icon", "circle check", "done:  every phase done, nothing needs you"])
    )
  })

  test("its star:  disabled from disk, saying why;  served, a click stars it at once, then on the page server", async () => {
    const host = await render(`phases="active" updated="${TODAY}"`)
    const star = () => host.shadowRoot!.querySelector(".star")!
    expect(star().hasAttribute("disabled")).toBe(true)
    expect(star().getAttribute("data-tooltip")).toBe("Needs the page server")
    served()
    // read again as the page is served:  a fresh card
    const card = await render(`phases="active" updated="${TODAY}"`)
    const button = card.shadowRoot!.querySelector(".star")!
    expect(button.hasAttribute("disabled")).toBe(false)
    expect([button.getAttribute("icon"), button.getAttribute("aria-label")]).toEqual(["star outline", "Star seo"])
    const posted = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ favorites: ["other", "seo"] })))
    const heard = vi.fn()
    card.addEventListener("epic-starred", (event) => heard((event as CustomEvent).detail))
    ;(button as HTMLElement).click()
    expect(card.hasAttribute("favorite")).toBe(true)
    await vi.waitFor(() => expect(heard).toHaveBeenCalled())
    expect(heard).toHaveBeenCalledWith({ epic: "seo", favorite: true, favorites: ["other", "seo"] })
    const [url, init] = posted.mock.calls[0]!
    expect(url).toBe("/api/epics/favorite")
    expect(JSON.parse(init!.body as string)).toEqual({ name: "seo", favorite: true })
    await vi.waitFor(() => expect(button.getAttribute("icon")).toBe("star"))
    expect(button.getAttribute("data-tooltip")).toBe("Unstar")
  })

  test("a star the page server refuses goes back as it was, and says why", async () => {
    served()
    const host = await render(`phases="active" updated="${TODAY}" favorite`)
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ error: "no such epic" }), { status: 400 })
    )
    const said = vi.spyOn(console, "error").mockImplementation(() => {})
    ;(host.shadowRoot!.querySelector(".star") as HTMLElement).click()
    expect(host.hasAttribute("favorite")).toBe(false)
    await vi.waitFor(() => expect(host.hasAttribute("favorite")).toBe(true))
    expect(said).toHaveBeenCalledWith("Couldn't unstar seo:  no such epic")
  })

  // epic `epic-engine` T103:  "add a `...` menu in the TR corner, with Resume, Rename Epic..., Complete, Delete Epic..."
  test("its `...` menu:  the four entries;  a done epic's without Resume and Complete;  disabled from disk", async () => {
    served()
    const entries = (host: Element) =>
      Array.from(host.shadowRoot!.querySelectorAll(".menu ui-item"), (item) => item.getAttribute("value"))
    const open = await render(`phases="done active"`)
    expect(entries(open)).toEqual(["resume", "rename", "complete", "delete"])
    expect(open.shadowRoot!.querySelector(".menu")!.getAttribute("data-tooltip")).toBe("More for seo")
    expect(open.shadowRoot!.querySelector(".menu")!.hasAttribute("disabled")).toBe(false)
    const done = await render(`phases="done done"`)
    expect(entries(done)).toEqual(["rename", "delete"])
    delete (window as { SPELL_SERVER?: object }).SPELL_SERVER
    const offline = await render(`phases="done active"`)
    expect(offline.shadowRoot!.querySelector(".menu")!.hasAttribute("disabled")).toBe(true)
  })

  test("its `...` menu's pick is heard by its own listener (not an `on-ui-*` prop):  Resume asks the page server", async () => {
    served()
    const host = await render(`phases="done active"`)
    const posted = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({})))
    host.shadowRoot!.querySelector(".menu")!.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "resume" } }))
    await vi.waitFor(() => expect(posted).toHaveBeenCalled())
    expect(posted.mock.calls[0]![0]).toMatch(/\/resume$/)
  })
})
