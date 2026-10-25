import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell-ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { Markup } from "spell-epic/markup"
import { AgentsClient, ReviewClient, clockOf, type Inbox } from "spell-epic/review"

import "spell-ui/components/ui-button"
import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-section"
import "spell-ui/components/ui-label"
import "spell-ui/components/ui-message"
import "spell-ui/components/ui-code"
import "spell-ui/components/ui-breadcrumbs"
import "spell-ui/components/ui-toast"
import "spell-epic/components/epic-page"
import "spell-epic/components/epic-overview"
import "spell-epic/components/epic-section"
import "spell-epic/components/epic-phase"
import "spell-epic/components/epic-commit"
import "spell-epic/components/epic-item"
import "spell-epic/components/epic-answer"
import "spell-epic/components/epic-aside"

/** A page with phases in `statuses`, and `attributes` on the page. */
function page(attributes: string, statuses: string[], extra = ""): string {
  const phases = statuses.map(
    (status, at) => `<epic-phase id="p${at + 1}" title="Phase ${at + 1}" status="${status}"></epic-phase>`
  )
  return (
    `<epic-page epic="demo" title="Demo" ${attributes}>` +
    `<epic-overview id="overview"><p slot="summary">Two sentences.</p></epic-overview>` +
    `<epic-section id="phases" kind="phases">${phases.join("")}</epic-section>${extra}</epic-page>`
  )
}

/** `host`'s step label, as drawn:  its words, colour and link;  `undefined` for none. */
function step(host: Element) {
  const labels = host.shadowRoot!.querySelectorAll('[part~="status"] ui-label')
  const label = labels[labels.length - 1]
  if (!label || label.textContent?.includes("Bedtime")) return undefined
  return {
    words: label.textContent!.trim(),
    color: label.getAttribute("color"),
    href: label.getAttribute("href") ?? undefined,
    // its first line:  the state's why follows on the next
    tip: label.getAttribute("title")?.split("\n")[0]
  }
}

/** Render `html` and let the page's observers settle. */
async function render(html: string): Promise<E.DOMElement> {
  const host = await ElementFixture.render<E.DOMElement>(html)
  await ElementFixture.settle(host)
  await ElementFixture.tick()
  return host
}

describe("<epic-page>", () => {
  test("draws the epic's name as its h1 (no title under it), its meta lines and its guide's link, and passes axe", async () => {
    const host = await render(
      page(`branch="demo" worktree="/w/demo" started="2026-10-06" updated="2026-10-07"`, ["done"], "").replace(
        "</epic-overview>",
        `</epic-overview><a slot="durable" href="#durable">Durable</a>`
      )
    )
    const shadow = host.shadowRoot!
    expect(shadow.querySelector("h1 button")!.textContent).toBe("demo")
    expect(shadow.querySelector('[part~="subhead"]')).toBeNull()
    const lines = Array.from(shadow.querySelectorAll('[part~="meta"] > li:not([hidden])'), (li) =>
      li.textContent!.replace(/\s+/g, " ").trim()
    )
    expect(lines).toEqual([
      "Epic page for /epic demo, branch demo",
      "Worktree: /w/demo",
      "Started 10/6/26, updated 10/7/26",
      "Guide:"
    ])
    expect(host.querySelector('a[slot="durable"]')!.assignedSlot).not.toBeNull()
    await expectAccessible(host)
  })

  // its colour and icon are the epic state's while it has one (the state test below);  DONE and FUTURE keep their own
  test("the step label follows the phases:  the active one, else the next, else DONE (green);  none without phases", async () => {
    const host = await render(page("", ["done", "active", "todo"]))
    expect(step(host)).toMatchObject({ words: "P2", href: "#p2", tip: "P2 · Phase 2" })
    host.querySelector("#p2")!.setAttribute("status", "done")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(step(host)).toMatchObject({ words: "P3", href: "#p3", tip: "Next:  P3 · Phase 3" })
    host.querySelector("#p3")!.setAttribute("status", "done")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(step(host)).toMatchObject({ words: "DONE", color: "green" })
    for (const phase of host.querySelectorAll("epic-phase")) phase.remove()
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(step(host)).toBeUndefined()
  })

  test("a future epic:  FUTURE, meta lines without a branch, and its notice;  bedtime:  its label", async () => {
    const future = await render(page("future", []))
    expect(step(future)).toMatchObject({ words: "FUTURE", color: "grey" })
    expect(future.matches(":state(future)")).toBe(true)
    expect(future.shadowRoot!.querySelector('[part~="meta"] li')!.textContent!.replace(/\s+/g, " ")).toContain(
      "Future epic: /epic future demo, no branch yet"
    )
    expect(future.shadowRoot!.querySelector('[part~="notice"]')).not.toBeNull()
    future.remove()
    const bedtime = await render(page(`bedtime="P3-P6"`, ["active"]))
    const label = bedtime.shadowRoot!.querySelector('[part~="status"] ui-label')!
    expect(label.textContent).toContain("Bedtime P3-P6")
  })

  // epic `epic-workflow` P15:  a saga's page, from the same elements
  test("a saga page:  crumbs DOCS / SAGAS / <id>, its short address in the meta lines, its review command;  no step label, Plan hung?, See Also or agents", async () => {
    const fetched = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ pages: [] })))
    const host = await render(
      `<epic-page kind="saga" saga="epics" title="Epic Tooling" started="2026-10-14" updated="2026-10-14">` +
        `<epic-overview id="overview"><epic-summary>Epics.</epic-summary></epic-overview>` +
        `<epic-section id="caveats" kind="caveats"></epic-section></epic-page>`
    )
    const shadow = host.shadowRoot!
    expect(shadow.querySelector("h1 button")!.textContent).toBe("epics")
    expect(shadow.querySelector("h1 button")!.getAttribute("title")).toBe("Copy /epic review SAGA:/epics")
    const crumbs = Array.from(shadow.querySelectorAll("ui-breadcrumb"), (crumb) => [
      crumb.textContent,
      crumb.getAttribute("href")
    ])
    expect(crumbs).toEqual([
      ["Docs", "../../pages/index.html"],
      ["Sagas", "../../sagas/index.html"]
    ])
    const lines = Array.from(shadow.querySelectorAll('[part~="meta"] > li'), (li) =>
      li.textContent!.replace(/\s+/g, " ").trim()
    )
    expect(lines).toEqual(["Saga page: SAGA:/epics", "Started 10/14/26, updated 10/14/26"])
    expect(shadow.querySelector('[part~="review-line"] code')!.textContent).toBe("/epic review SAGA:/epics")
    expect(step(host)).toBeUndefined()
    expect(shadow.querySelector('[part~="hung"]')).toBeNull()
    expect(shadow.querySelector("epic-agents")).toBeNull()
    expect(fetched).not.toHaveBeenCalledWith(expect.stringContaining("/api/epics/pages"))
    fetched.mockRestore()
    await expectAccessible(host)
  })

  test("a doc still planning:  the folded `Plan hung?` aside with its prompt to copy;  gone with the first phase", async () => {
    const host = await render(
      page("", []).replace(
        `<p slot="summary">Two sentences.</p>`,
        `<p slot="summary">Two sentences.</p><blockquote slot="prompt"><p>Plan it.<br>Line 2</p><p>Then more.</p></blockquote>`
      )
    )
    const hung = host.shadowRoot!.querySelector<HTMLDetailsElement>('[part~="hung"]')!
    expect({ open: hung.open, title: hung.querySelector("summary")!.textContent }).toEqual({
      open: false,
      title: "Plan hung?"
    })
    expect(hung.querySelector("p")!.textContent).toBe("Close its Claude tab, then run /epic demo and pick “Reuse”.")
    expect(hung.querySelector("ui-code")!.textContent).toBe("Plan it.\nLine 2\n\nThen more.")
    host
      .querySelector("#phases")!
      .insertAdjacentHTML("beforeend", `<epic-phase id="p1" title="One" status="todo"></epic-phase>`)
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.shadowRoot!.querySelector('[part~="hung"]')).toBeNull()
  })

  test("the git toggle shows only with commits, and shows every commit below while pressed", async () => {
    const without = await render(page("", ["done"]))
    expect(without.shadowRoot!.querySelector('[part~="git"]')).toBeNull()
    without.remove()
    const host = await render(
      page(`repo="https://example.com/r"`, []).replace(
        "</epic-section>",
        `<epic-phase id="p1" title="One" status="done" open><epic-commit sha="0123456789abcdef">Did it</epic-commit></epic-phase></epic-section>`
      )
    )
    const commit = host.querySelector("epic-commit")!
    const git = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="git"]')!
    expect(getComputedStyle(commit).display).toBe("none")
    git.click()
    await ElementFixture.tick()
    expect(git.getAttribute("aria-pressed")).toBe("true")
    expect(getComputedStyle(commit).display).toBe("block")
    git.click()
    await ElementFixture.tick()
  })

  test("its blocks are numbered by place, and top-level titles stick below its header and toolbar bar", async () => {
    const host = await render(page("", ["todo"]))
    const [header, bar] = ["header", "bar"].map(
      (name) => host.shadowRoot!.querySelector(`[part~="${name}"]`)!.getBoundingClientRect().height
    )
    const phases = host.querySelector("#phases")!.shadowRoot!.querySelector("ui-section")!
    expect(Number(phases.getAttribute("offset"))).toBe(Math.round(Math.round(header) + bar))
  })

  // Owen, 2026-10-10:  "Right items:  (=>P14) (whatever the half-filled circle is) (git icon, but bigger)"
  test("the h1's row and the toolbar's bar stick;  the step label (the state in it), then git", async () => {
    const now = new Date()
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((n) => String(n).padStart(2, "0"))
      .join("-")
    const host = await render(
      page(`updated="${today}" repo="https://example.com/r"`, []).replace(
        "</epic-section>",
        `<epic-phase id="p1" title="One" status="done"><epic-commit sha="0123456789abcdef">Did it</epic-commit></epic-phase>` +
          `<epic-phase id="p2" title="Two" status="active"></epic-phase></epic-section>`
      )
    )
    const shadow = host.shadowRoot!
    const position = (name: string) => getComputedStyle(shadow.querySelector(`[part~="${name}"]`)!).position
    expect(["header", "bar"].map(position)).toEqual(["sticky", "sticky"])
    expect(
      Array.from(shadow.querySelector('[part~="status"]')!.children, (child) => child.getAttribute("part"))
    ).toEqual(["step-pill", "git"])
    // the step label (the state in it) inside the one pill, after the changes to accept (I108)
    expect(shadow.querySelector('[part~="step-pill"] > [part~="state"]')).not.toBeNull()
  })

  // Owen, 2026-10-13:  "Just go with a single set of breadcrumbs"
  test("draws its crumbs in the h1, `Docs / Epics /` then the name;  NONE while the doc still holds its old crumbs before it", async () => {
    const host = await render(page("", ["todo"]))
    const crumbs = host.shadowRoot!.querySelector('[part~="crumbs"]')!
    expect(
      Array.from(crumbs.querySelectorAll("ui-breadcrumb"), (crumb) => [
        crumb.textContent,
        crumb.getAttribute("href"),
        crumb.hasAttribute("active")
      ])
    ).toEqual([
      ["Docs", "../../pages/index.html", false],
      ["Epics", "../../epics/index.html", false]
    ])
    expect(crumbs.parentElement!.localName).toBe("h1")
    expect(crumbs.nextElementSibling!.textContent).toBe("demo")

    const old = await render(
      `<main><ui-breadcrumbs class="spell-crumbs"><ui-breadcrumb active>Demo</ui-breadcrumb></ui-breadcrumbs>` +
        `${page("", ["todo"])}</main>`
    )
    expect(old.querySelector("epic-page")!.shadowRoot!.querySelector('[part~="crumbs"]')).toBeNull()
  })

  test("runs EDGE TO EDGE:  out of `<main>`'s inline padding (`--spell-doc-pad-inline`), however wide", async () => {
    for (const width of [900, 320]) {
      const main = await render(
        `<main style="--spell-doc-pad-inline: 16px; padding: 0 16px; width: ${width}px; box-sizing: border-box">` +
          `${page("", ["todo"])}</main>`
      )
      const [outer, inside] = [main, main.querySelector("epic-page")!].map((box) => box.getBoundingClientRect())
      expect([inside.left - outer.left, inside.width, main.scrollWidth]).toEqual([0, width, width])
    }
    // no token (a page without `spell-doc.css`):  no breakout
    const plain = await render(`<main style="padding: 0 16px">${page("", ["todo"])}</main>`)
    expect(getComputedStyle(plain.querySelector("epic-page")!).marginLeft).toBe("0px")
  })

  // epic `airplane` P8 (Owen, 2026-10-10):  in progress, errors, done, paused;  no sleeping mark any more
  test("the state, in the step label:  in progress between phases, paused once untouched, errors while items need Owen", async () => {
    const now = new Date()
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((n) => String(n).padStart(2, "0"))
      .join("-")
    const items =
      `<epic-section id="decisions" kind="questions">` +
      `<epic-item id="q1" title="One" status="open" state="attention"></epic-item>` +
      `<epic-item id="q2" title="Two" status="decided" state="recent"></epic-item></epic-section>` +
      `<epic-section id="caveats" kind="caveats"><epic-item id="c1" title="Later" status="open" state="open"></epic-item></epic-section>`
    const mark = (host: Element) => host.shadowRoot!.querySelector<HTMLElement>('[part~="state"]')
    // between phases, items open, touched today:  in progress (it used to sleep)
    const busy = await render(page(`updated="${today}"`, ["done", "todo"], items))
    expect([
      mark(busy)?.dataset.state,
      mark(busy)?.getAttribute("color"),
      mark(busy)?.title.split("\n").at(-1)
    ]).toEqual(["progress", "blue", `in progress:  1/2 phases done, updated ${today}`])
    busy.remove()
    // a phase active, but nobody on it for days:  paused, in grey;  the icon the PHASE's own (P33:  as its row draws it)
    const idle = await render(page(`updated="2026-01-01"`, ["done", "active"], items))
    expect([mark(idle)?.dataset.state, mark(idle)?.getAttribute("color"), mark(idle)?.getAttribute("icon")]).toEqual([
      "paused",
      "grey",
      "circle half stroke"
    ])
    idle.remove()
    // every phase done, a question open:  errors;  answered, it's done, and the DONE label says so alone
    const loud = await render(page(`updated="2026-01-01"`, ["done", "done"], items))
    expect([
      mark(loud)?.dataset.state,
      mark(loud)?.getAttribute("color"),
      mark(loud)?.title.split("\n").at(-1)
    ]).toEqual(["errors", "red", "errors:  every phase done, but 1 question need you"])
    loud.querySelector("#q1")!.setAttribute("state", "recent")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(mark(loud)).toBeNull()
    expect(step(loud)?.words).toBe("DONE")
    expect(loud.shadowRoot!.innerHTML).not.toMatch(/sleeping|😴/)
    loud.remove()
    // a future epic:  its FUTURE label, no mark
    const future = await render(page("future", []))
    expect(mark(future)).toBeNull()
  })

  test("the review line:  `/epic review <name>`, copied on click, and it flashes", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const host = await render(page("", ["todo"]))
    const line = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="review-line"]')!
    expect(line.textContent!.replace(/\s+/g, " ")).toContain("To review this doc, type /epic review demo")
    line.click()
    await vi.waitFor(() => expect(line.classList.contains("flash")).toBe(true))
    expect(writeText).toHaveBeenCalledWith("/epic review demo")
    expect(line.querySelector(".done")!.textContent).toBe("copied")
    writeText.mockRestore()
  })

  test("airplane mode:  the review line names `/airplane land`, never a warning", async () => {
    const server = window as { SPELL_SERVER?: { airplane?: boolean } }
    const before = server.SPELL_SERVER
    server.SPELL_SERVER = { ...before, airplane: true }
    try {
      const host = await render(page("", ["todo"]))
      const line = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="review-line"]')!
      expect(line.textContent!.replace(/\s+/g, " ")).toContain(
        "Airplane mode: what you mark here waits for /airplane land"
      )
      expect(getComputedStyle(line).backgroundColor).toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    } finally {
      server.SPELL_SERVER = before
    }
  })

  // Owen, 2026-10-13:  "There is no easy way to get to a "decisions" or "details" pages from an epic"
  test("See Also:  the epic's pages from the page server, each a link with its kind;  none, no box", async () => {
    const pages = [
      { href: "details/names.html", title: "Boolean names", kind: "choices", updated: "2026-10-12T21:00:00.000Z" },
      { href: "details/analysis.html", title: "Analysis", kind: "details", updated: "2026-10-11T09:00:00.000Z" },
      // epic `epic-workflow` P13:  its guide and the guides it links
      { href: "../../guides/py.html", title: "The Python Target", kind: "durable", updated: "2026-10-12T09:00:00Z" },
      { href: "../../guides/targets.html", title: "Targets", kind: "guide", updated: "2026-10-11T09:00:00Z" }
    ]
    const fetched = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ pages })))
    const host = await render(page("", ["todo"]))
    const box = await vi.waitFor(() => {
      const found = host.shadowRoot!.querySelector('[part~="see-also"]')
      expect(found).toBeTruthy()
      return found!
    })
    expect(fetched.mock.calls[0]![0] as string).toBe("/api/epics/pages?epic=demo")
    expect(Array.from(box.querySelectorAll("a"), (link) => [link.getAttribute("href"), link.textContent])).toEqual([
      ["details/names.html", "Boolean names"],
      ["details/analysis.html", "Analysis"],
      ["../../guides/py.html", "The Python Target"],
      ["../../guides/targets.html", "Targets"]
    ])
    expect(Array.from(box.querySelectorAll(".see-also-kind"), (kind) => kind.textContent)).toEqual([
      "choice",
      "details",
      "guide",
      "guide"
    ])
    expect(Array.from(box.querySelectorAll("li ui-icon"), (icon) => icon.getAttribute("name"))).toEqual([
      "table columns",
      "circle question",
      "book",
      "book open"
    ])
    // before the blocks:  the slot comes after it
    expect(box.compareDocumentPosition(host.shadowRoot!.querySelector("slot:not([name])")!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    fetched.mockResolvedValue(new Response(JSON.stringify({ pages: [] })))
    const empty = await render(page("", ["todo"]))
    await ElementFixture.tick()
    expect(empty.shadowRoot!.querySelector('[part~="see-also"]')).toBeNull()
    fetched.mockRestore()
  })

  // epic `epic-workflow` P15
  test("its saga:  a meta line linking the saga page, by id until the page server gives its title and purpose", async () => {
    const saga = { id: "epics", title: "Epic Tooling", purpose: "Epics", href: "../../sagas/epics/epics.saga.html" }
    let answer = (): Response => new Response(JSON.stringify({ pages: [] }))
    const fetched = vi.spyOn(globalThis, "fetch").mockImplementation(async () => answer())
    const host = await render(page(`saga="epics"`, ["todo"]))
    const link = () => host.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="meta"] li.saga a')
    expect(link()!.getAttribute("href")).toBe("../../sagas/epics/epics.saga.html")
    expect(link()!.textContent).toBe("epics")
    answer = () => new Response(JSON.stringify({ pages: [], saga }))
    const named = await render(page(`saga="epics"`, ["todo"]))
    const namedLink = () => named.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="meta"] li.saga a')!
    await vi.waitFor(() => expect(namedLink().textContent).toBe("Epic Tooling"))
    expect(namedLink().getAttribute("title")).toBe("The saga this epic serves:  Epics")
    const none = await render(page("", ["todo"]))
    expect(none.shadowRoot!.querySelector('[part~="meta"] li.saga')).toBeNull()
    fetched.mockRestore()
  })

  // Owen, 2026-10-13:  "Clicking on the "review-review" should copy the string "/epic resume review-review" with a
  // subtle toast"
  test("the heading's name:  a click copies `/epic resume <name>`, and a toast says so", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const host = await render(page("", ["todo"]))
    host.shadowRoot!.querySelector<HTMLButtonElement>("h1 button")!.click()
    await vi.waitFor(() =>
      expect(document.getElementById("epic-copied")?.getAttribute("message")).toBe("Copied /epic resume demo")
    )
    expect(writeText).toHaveBeenCalledWith("/epic resume demo")
    writeText.mockRestore()
  })

  test("`Markup` reads, writes and checks the LIVE elements:  no problems once they're defined and drawn", async () => {
    const doc = await ElementFixture.render(`
      <epic-page epic="demo" title="Demo">
        <epic-overview id="overview"><p slot="summary">Two sentences.</p></epic-overview>
        <epic-section id="decisions" kind="questions">
          <epic-item id="q1" title="Which colour names?" status="open"><p>Which?</p></epic-item>
        </epic-section>
      </epic-page>`)
    await ElementFixture.settle()
    expect(Markup.validate(doc)).toEqual([])
    const item = doc.querySelector("epic-item")!
    Markup.set<"epic-item">(item, { status: "decided", answered: true })
    item.append(Markup.element(document, "epic-answer", { title: "Named palette" }, "<p>Named.</p>"))
    await ElementFixture.settle()
    expect(Markup.read(item)).toEqual({ id: "q1", title: "Which colour names?", status: "decided", answered: true })
    expect(item.querySelector("epic-answer")!.shadowRoot).not.toBeNull()
    expect(Markup.validate(doc)).toEqual([])
  })
})

////////////////
// ## Send and its countdown (P10;  one group since epic `epic-engine` P20)
////////////////

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
    unsentComments: [],
    woken: null,
    doing: null
  }
  posts: [string, Record<string, unknown>][] = []

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (route !== "inbox") {
      const body = JSON.parse(init!.body as string) as Record<string, unknown>
      this.posts.push([route, body])
      if (route === "send") {
        this.inbox.sent = new Date(Date.now() + 1000).toISOString()
        this.inbox.unsentComments = []
      }
      if (route === "mark") {
        const { id, mark } = body as { id: string; mark: Inbox["marks"][string] | null }
        if (mark) this.inbox.marks[id] = { ...mark, at: new Date().toISOString() }
        else delete this.inbox.marks[id]
      }
      if (route === "new") {
        const at = new Date().toISOString()
        this.inbox.marks.new1 = { ...(body.entry as object), action: "new", at } as Inbox["marks"][string]
      }
    }
    return new Response(JSON.stringify(this.inbox), { headers: { "content-type": "application/json" } })
  })
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

/**
 * `host`'s Send, in its header (`<epic-send-buttons part="send">`):  `[state, the plane's tooltip]`;  `null` when not
 * drawn.
 */
function headerButtons(host: Element) {
  const group = host.shadowRoot!.querySelector<HTMLElement>('[part~="send"]')
  const plane = group?.shadowRoot?.querySelector<HTMLButtonElement>('[part~="send"]')
  return { send: group ? [group.getAttribute("state"), plane?.title] : null }
}

/** `host`'s Send group, in its header. */
function sendGroup(host: Element): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>('[part~="send"]')!
}

/** `host`'s paper plane, in its Send group. */
function plane(host: Element): HTMLButtonElement {
  return sendGroup(host).shadowRoot!.querySelector<HTMLButtonElement>('[part~="send"]')!
}

/** What the tooltips add while nobody listens. */
const NOBODY = ".  No Claude session is reviewing this doc:  Send wakes one"

describe("<epic-page> Send and its countdown", () => {
  afterEach(() => {
    ReviewClient.adopt(undefined)
  })

  test("drawn ONLY while the page is reviewed (served with a token, its inbox answering)", async () => {
    await adoptClient(new FakeRoutes(), { served: false })
    const host = await render(page("", ["todo"]))
    expect(headerButtons(host)).toEqual({ send: null })
    expect(host.shadowRoot!.querySelector('[part~="new-button"]')).toBeNull()
  })

  // Owen, 2026-10-10:  "The send + do now icons in bottom-right is too hidden.  Move back to the page header, to the
  // left of P11"
  test("in the header, left of the step label:  never dashed, a click sends, then outlined;  nobody listening:  the pill under the review line and the tooltips say so", async () => {
    const routes = new FakeRoutes()
    const at = new Date().toISOString()
    routes.inbox.marks = { q1: { action: "approve", at }, q2: { action: "revisit", when: "soon", note: "hm", at } }
    const client = await adoptClient(routes)
    const host = await render(page("", ["todo"]))
    await vi.waitFor(() => expect(headerButtons(host).send?.[1]).toBeTruthy())
    expect(host.shadowRoot!.querySelector('[part~="send-bar"]')).toBeNull()
    expect(
      Array.from(host.shadowRoot!.querySelector('header [part~="status"]')!.children, (child) =>
        child.getAttribute("part")
      )
    ).toEqual(["send", "step-pill"])
    expect(headerButtons(host)).toEqual({ send: ["unsent", `Send 2 marks to Claude${NOBODY}`] })
    // never dashed (Owen, 2026-10-22:  "Lose the dotted outline around both"):  marks not sent, a plain outline
    const outline = () => getComputedStyle(sendGroup(host).shadowRoot!.querySelector('[part~="base"]')!).borderTopStyle
    expect(outline()).toBe("solid")
    // marks not sent yet:  no pill, so a press never pushes the page down (I123)
    expect(host.shadowRoot!.querySelector('[part~="pill"]')).toBeNull()
    plane(host).click()
    await vi.waitFor(() => expect(routes.posts.map(([route]) => route)).toEqual(["send"]))
    await vi.waitFor(() => expect(headerButtons(host).send?.[0]).toBe("sent"))
    await vi.waitFor(() => expect(outline()).toBe("solid"))
    // sent, and nobody listening:  the pill says so
    await vi.waitFor(() => expect(host.shadowRoot!.querySelector('[part~="pill"]')).not.toBeNull())
    const pill = host.shadowRoot!.querySelector<HTMLElement>('[part~="pill"]')!
    expect(pill.textContent!.replace(/\s+/g, " ")).toContain(
      "No Claude session is reviewing: start one with /epic review demo"
    )
    expect(getComputedStyle(pill).backgroundColor).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/)
    // right under the review line, which says nothing of it itself
    const line = host.shadowRoot!.querySelector<HTMLElement>('[part~="review-line"]')!
    expect(line.nextElementSibling).toBe(pill)
    expect(line.textContent).not.toContain("No Claude session")
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    await client.refresh()
    await ElementFixture.tick()
    expect(headerButtons(host).send).toEqual(["sent", "Sent:  waiting for Claude"])
    expect(host.shadowRoot!.querySelector('[part~="pill"]')).toBeNull()
    // a countdown running out (the wand's, should it come back) sends as Review Now did (decision Q7):  every revisit
    // asked now
    sendGroup(host).dispatchEvent(
      new CustomEvent("epic-send-saving", { detail: { auto: true }, bubbles: true, composed: true })
    )
    await vi.waitFor(() =>
      expect(routes.posts.at(-1)).toEqual(["send", { page: "/epics/demo/demo.plan.html", now: true }])
    )
    await expectAccessible(host)
  })

  // Owen, 2026-10-10:  "send button at top of page doesn't appear to be hooked up" -- with only a comment waiting,
  // Send was grey and a click said "Nothing to send"
  test("a comment waiting for Claude makes Send blue;  its tooltip counts it;  a click sends", async () => {
    const routes = new FakeRoutes()
    const at = new Date().toISOString()
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    routes.inbox.unsentComments = ["cm1"]
    await adoptClient(routes)
    const host = await render(page("", ["todo"]))
    await vi.waitFor(() => expect(headerButtons(host).send?.[1]).toBeTruthy())
    expect(headerButtons(host)).toEqual({ send: ["unsent", "Send 1 comment to Claude"] })
    routes.inbox.marks = { q1: { action: "approve", at }, q2: { action: "todo", at } }
    routes.inbox.unsentComments = ["cm1", "cm2"]
    await ReviewClient.forPage().refresh()
    await ElementFixture.tick()
    expect(headerButtons(host).send).toEqual(["unsent", "Send 2 marks, 2 comments to Claude"])
    plane(host).click()
    await vi.waitFor(() => expect(routes.posts.map(([route]) => route)).toEqual(["send"]))
    await vi.waitFor(() => expect(headerButtons(host).send).toEqual(["sent", "Sent:  waiting for Claude"]))
  })

  // epic `epic-workflow` P16:  Send and Do Now with nobody listening wake the epic;  the pill says how, until a session
  // listens
  test("woken:  the pill says what the wake did, even for a Do Now alone;  a session listening, it goes", async () => {
    const routes = new FakeRoutes()
    const at = new Date().toISOString()
    routes.inbox.marks = { q1: { action: "details", at } }
    routes.inbox.now = [{ id: "q1", action: "details", at }]
    const client = await adoptClient(routes)
    const host = await render(page("", ["todo"]))
    const pill = () => host.shadowRoot!.querySelector<HTMLElement>('[part~="pill"]')
    await vi.waitFor(() => expect(pill()).not.toBeNull())
    expect(pill()!.textContent!.replace(/\s+/g, " ")).toContain("No Claude session is reviewing: start one with")
    const message = "Typed /epic review demo into 🚧 demo:  press Enter there."
    routes.inbox.woken = { at, state: "typed", did: "typed /epic review demo into 🚧 demo", message }
    await client.refresh()
    await ElementFixture.tick()
    expect(pill()!.textContent).toBe(message)
    expect(pill()!.title).toBe("Start the review in this epic's Claude session (and copy the command)")
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    await client.refresh()
    await ElementFixture.tick()
    expect(pill()).toBeNull()
  })

  test("the pill copies the review line's command", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    const routes = new FakeRoutes()
    routes.inbox.marks = { q1: { action: "approve", at: new Date(Date.now() - 60_000).toISOString() } }
    // sent:  the pill shows only for marks sent with nobody listening (I123)
    routes.inbox.sent = new Date().toISOString()
    await adoptClient(routes)
    const host = await render(page("", ["todo"]))
    await vi.waitFor(() => expect(host.shadowRoot!.querySelector('[part~="pill"]')).not.toBeNull())
    // an earlier test's toast, still on the page
    document.getElementById("epic-copied")?.remove()
    host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="pill"]')!.click()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("/epic review demo"))
    // epic-engine I78:  starting the review, its notice is the one toast;  no "Copied" toast stacked beside it
    expect(document.getElementById("epic-copied")).toBeNull()
    writeText.mockRestore()
  })

  // epic `airplane` P2;  in the toolbar since P8
  // Owen, 2026-10-13:  "Remove "comment" icon from top header -- add it to question/todo/issue/test headers"
  test("no new item button in the toolbar;  an item section's, on its title, opens the section and its form;  Add saves a todo, and Send shows it", async () => {
    const routes = new FakeRoutes()
    // listening:  the orange pill has a contrast issue of its own (axe), not this test's
    const at = new Date().toISOString()
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    await adoptClient(routes)
    const host = await render(page("", ["todo"], `<epic-section id="caveats" kind="caveats"></epic-section>`))
    const todos = host.querySelector<E.DOMElement>("#caveats")!
    await vi.waitFor(() => expect(todos.shadowRoot!.querySelector('[part~="new-button"]')).not.toBeNull())
    expect(host.shadowRoot!.querySelector('[part~="new-button"]')).toBeNull()
    expect(host.shadowRoot!.querySelector('[part~="toggle-all"]')).not.toBeNull()
    const button = todos.shadowRoot!.querySelector<HTMLButtonElement>('[part~="new-button"]')!
    expect(button.title).toBe("New Caveat")
    expect(button.closest('[part~="tools"]')).not.toBeNull()
    expect(button.querySelector("ui-icon")!.getAttribute("name")).toBe("comment dots")
    // nothing waiting:  there, grey (so it's always in the same place), and no pill
    await vi.waitFor(() => expect(headerButtons(host).send?.[1]).toBeTruthy())
    expect(headerButtons(host)).toEqual({
      send: ["idle", "Nothing to send:  mark an item (its buttons) or leave a comment (its bullhorn)"]
    })
    expect(host.shadowRoot!.querySelector('[part~="pill"]')).toBeNull()
    button.click()
    await vi.waitFor(() =>
      expect(todos.hasAttribute("open") || (todos as unknown as { open: boolean }).open).toBe(true)
    )
    const newItem = todos.shadowRoot!.querySelector<HTMLElement>('[part~="new-item"]')!
    const form = await vi.waitFor(() => {
      const opened = newItem.shadowRoot?.querySelector<HTMLFormElement>('[part~="form"]')
      expect(opened).toBeTruthy()
      return opened!
    })
    form.querySelector<HTMLInputElement>('[data-field="title"]')!.value = "check the wifi"
    form.requestSubmit()
    await vi.waitFor(() =>
      expect(routes.posts.at(-1)).toEqual([
        "new",
        { page: "/epics/demo/demo.plan.html", entry: { kind: "todo", title: "check the wifi" } }
      ])
    )
    await vi.waitFor(() => expect(headerButtons(host).send?.[0]).toBe("unsent"))
    await expectAccessible(host)
  })
})

////////////////
// ## The toolbar's state filter and collapse-all (epic `airplane` P8)
////////////////

/** A page with a Questions and a Caveats section, items in `states` each. */
function filterPage(questions: string[], todos: string[]): string {
  const items = (letter: string, states: string[]) =>
    states
      .map(
        (state, at) =>
          `<epic-item id="${letter}${at + 1}" title="${letter} ${at + 1}" status="open" state="${state}"></epic-item>`
      )
      .join("")
  return (
    `<epic-page epic="demo" title="Demo"><epic-overview id="overview"><p slot="summary">Two.</p></epic-overview>` +
    `<epic-section id="decisions" kind="questions">${items("q", questions)}</epic-section>` +
    `<epic-section id="caveats" kind="caveats">${items("c", todos)}</epic-section></epic-page>`
  )
}

/** The toolbar's chips, as drawn:  `state+` while it shows, `state-` while hidden, and the count. */
function pageChips(host: Element): string[] {
  return Array.from(
    chipsOf(host),
    (chip) => `${chip.dataset.state}${chip.getAttribute("aria-pressed") === "true" ? "+" : "-"}${chip.textContent}`
  )
}

/** The chips `host` draws (its `<epic-state-filter>`'s buttons):  a page's toolbar's, or a section's. */
function chipsOf(host: Element): HTMLButtonElement[] {
  const filter = host.shadowRoot!.querySelector('[part~="filter"] epic-state-filter')
  return Array.from(filter?.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? [])
}

/** Click the toolbar's `state` chip, and let the sections and the toolbar follow. */
async function pickPageState(host: Element, state: string) {
  chipsOf(host)
    .find((chip) => chip.dataset.state === state)!
    .click()
  await ElementFixture.tick()
  await ElementFixture.tick()
}

/** The items shown, by id, across the page. */
function shownItems(host: Element): string[] {
  return Array.from(host.querySelectorAll("epic-item"))
    .filter((item) => getComputedStyle(item).display !== "none")
    .map((item) => item.id)
}

describe("<epic-page> toolbar", () => {
  afterEach(() => {
    localStorage.clear()
  })

  test("a chip per state on the page, the sections' counts added up;  a click filters EVERY section, by the sections' rule", async () => {
    const host = await render(filterPage(["attention", "open", "recent"], ["open", "recent", "recent"]))
    await vi.waitFor(() => expect(pageChips(host)).toEqual(["attention+1", "open+2", "recent+3"]))
    // everything showing:  only that state
    await pickPageState(host, "attention")
    expect(pageChips(host)).toEqual(["attention+1", "open-2", "recent-3"])
    expect(shownItems(host)).toEqual(["q1"])
    // a hidden one:  shows too
    await pickPageState(host, "open")
    expect(pageChips(host)).toEqual(["attention+1", "open+2", "recent-3"])
    expect(shownItems(host)).toEqual(["q1", "q2", "c1"])
    // a shown one, others too:  hides
    await pickPageState(host, "attention")
    expect(shownItems(host)).toEqual(["q2", "c1"])
    // the only one showing:  everything again
    await pickPageState(host, "open")
    expect(pageChips(host)).toEqual(["attention+1", "open+2", "recent+3"])
    expect(shownItems(host)).toHaveLength(6)
  })

  test("a section's own chip changes the toolbar's:  a state is on only while every section having it shows it", async () => {
    const host = await render(filterPage(["open", "recent"], ["open"]))
    await vi.waitFor(() => expect(pageChips(host)).toEqual(["open+2", "recent+1"]))
    const questions = host.querySelector("#decisions")!
    chipsOf(questions)
      .find((chip) => chip.dataset.state === "open")!
      .click()
    await ElementFixture.tick()
    await ElementFixture.tick()
    // Questions shows only open;  Caveats still everything
    expect(pageChips(host)).toEqual(["open+2", "recent-1"])
  })

  test("collapse-all folds every block, item and card on the page;  a section's folds only what's inside it, and stays open", async () => {
    const host = await render(
      `<epic-page epic="demo" title="Demo"><epic-overview id="overview"><p slot="summary">Two.</p></epic-overview>` +
        `<epic-section id="phases" kind="phases" open><epic-phase id="p1" title="One" status="todo" open><p>Do.</p></epic-phase></epic-section>` +
        `<epic-section id="decisions" kind="questions" open>` +
        `<epic-item id="q1" title="Which?" status="open" open><p>Which?</p><epic-aside title="Why"><p>Because.</p></epic-aside></epic-item>` +
        `</epic-section></epic-page>`
    )
    await ElementFixture.settle(host)
    const aside = host.querySelector("epic-aside") as E.DOMElement & {
      component?: { fold: { toggle(): void; isOpen(): boolean } }
    }
    aside.component!.fold.toggle()
    await ElementFixture.tick()
    const questions = host.querySelector<E.DOMElement>("#decisions")!
    const item = host.querySelector<E.DOMElement>("#q1")!
    // an item has no collapse-all of its own (Owen, 2026-10-25:  "lose it entirely")
    expect(item.shadowRoot!.querySelector('[part~="collapse-all"]')).toBe(null)
    // the section's:  its items fold, it stays open
    // the section's ONE toggle:  first it opens everything inside, then the same button folds it
    const sectionButton = questions.shadowRoot!.querySelector<HTMLButtonElement>('[part~="toggle-all"]')!
    expect(sectionButton.title).toBe("Open everything in 3. Questions")
    sectionButton.click()
    await vi.waitFor(() => expect(sectionButton.title).toBe("Fold everything in 3. Questions"))
    sectionButton.click()
    await ElementFixture.tick()
    expect([
      aside.component!.fold.isOpen(),
      isOpen(item),
      isOpen(questions),
      isOpen(host.querySelector("#phases")!)
    ]).toEqual([false, false, true, true])
    // the page's:  everything, each block through its cancelable `ui-closing`, as a click (the runtime saves those)
    const closed: string[] = []
    host.addEventListener("ui-closing", (event) => closed.push((event.target as Element).id))
    // the toolbar's ONE toggle:  first it opens everything, then it folds everything
    const pageButton = host.shadowRoot!.querySelector<HTMLButtonElement>('[part~="toolbar"] [part~="toggle-all"]')!
    pageButton.click()
    await ElementFixture.tick()
    closed.length = 0
    pageButton.click()
    await ElementFixture.tick()
    expect(Array.from(host.querySelectorAll("epic-section, epic-phase"), isOpen)).toEqual([false, false, false])
    // everything its first click opened (the Overview, the item) folds with the rest
    expect(closed).toEqual(["overview", "phases", "p1", "decisions", "q1"])
  })
})

/** Is `host` (a fold or an item) open, as drawn? */
function isOpen(host: Element): boolean {
  return host.matches(":state(open)")
}

////////////////
// ## Agents running (epic `skillz` P3)
////////////////

/** The agents routes, as `fetch`, over a list kept here:  each reply `{ agents }`;  `posts` every redirect. */
class FakeAgents {
  agents: Record<string, unknown>[] = [
    {
      name: "demo-aaa",
      task: "Port the parser",
      status: "active",
      started: new Date(Date.now() - 125 * 60_000).toISOString()
    },
    {
      name: "demo-bbb",
      task: "Wait for aaa",
      status: "blocked on demo-aaa",
      started: new Date().toISOString(),
      redirects: [{ note: "Hold on", at: "2026-10-07T10:42:00.000Z", told: "2026-10-07T10:43:00.000Z" }]
    }
  ]
  posts: Record<string, unknown>[] = []
  /** the next redirect's error, once */
  failure = ""

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    if (input.startsWith("/api/epics/agents?")) return reply({ agents: this.agents })
    const body = JSON.parse(init!.body as string) as Record<string, unknown>
    this.posts.push(body)
    if (this.failure) {
      const error = this.failure
      this.failure = ""
      return reply({ error }, 400)
    }
    const agent = this.agents.find((it) => it.name === body.name)!
    agent.redirects = [...((agent.redirects as unknown[]) ?? []), { note: body.note, at: new Date().toISOString() }]
    return reply({ agents: this.agents })
  })
}

/** A JSON reply. */
function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } })
}

/** A started agents client on `routes`, adopted as the page's;  `served` false:  no token, never listed. */
async function adoptAgents(routes: FakeAgents, { served = true } = {}) {
  const client = new AgentsClient({
    page: "/epics/demo/demo.plan.html",
    server: served ? { token: "token" } : undefined,
    protocol: "http:",
    fetch: routes.fetch as unknown as typeof fetch
  })
  await client.start()
  AgentsClient.adopt(client)
  return client
}

/**
 * The shadow root of `host`'s `<epic-agents>` drawing `draws`:  the agents' button in the header's pill, or the
 * session's line in the toolbar (Owen, 2026-10-25).
 */
function agentsRoot(host: Element, draws: "agents" | "doing" = "agents"): ShadowRoot {
  return host.shadowRoot!.querySelector(`epic-agents[draws="${draws}"]`)!.shadowRoot!
}

/** `host`'s agent rows, as drawn:  `[name, status, colour, age, task, redirects]` each. */
function agentRows(host: Element) {
  return Array.from(agentsRoot(host).querySelectorAll<HTMLElement>(".agent"), (row) => [
    row.querySelector(".agent-name")!.textContent,
    row.querySelector("ui-label")!.textContent!.trim(),
    row.querySelector("ui-label")!.getAttribute("color"),
    row.querySelector(".agent-age")!.textContent,
    row.querySelector(".agent-task")!.textContent,
    Array.from(row.querySelectorAll(".agent-redirects > li"), (li) => li.textContent!.replace(/\s+/g, " ").trim())
  ])
}

/** Agent `name`'s row, its note box and its Send button. */
function noteBox(host: Element, name: string) {
  const row = agentsRoot(host).querySelector(`.agent[data-name="${name}"]`)!
  return { row, note: row.querySelector("textarea")!, send: row.querySelector<HTMLElement>("ui-button")! }
}

/** Type `text` into `note`, as a person would. */
function type(note: HTMLTextAreaElement, text: string) {
  note.value = text
  note.dispatchEvent(new InputEvent("input", { bubbles: true }))
}

/** Render a page with the panel, once it shows. */
async function renderWithAgents(): Promise<E.DOMElement> {
  const host = await render(page("", ["active"]))
  await vi.waitFor(() => expect(agentsRoot(host).querySelector(".agents-button")).not.toBeNull())
  return host
}

describe("<epic-page> Agents running", () => {
  afterEach(() => {
    AgentsClient.adopt(undefined)
  })

  test("in the toolbar (P35):  '2 agents running', its popover a row per agent:  name, status, age, task, redirects;  axe", async () => {
    await adoptAgents(new FakeAgents())
    const host = await renderWithAgents()
    const button = agentsRoot(host).querySelector(".agents-button")!
    expect([button.querySelector(".words")!.textContent, button.getAttribute("aria-label")]).toEqual([
      "2 agents running",
      "2 agents running"
    ])
    expect(agentsRoot(host).querySelector(".agents-pop")!.getAttribute("aria-label")).toBe("Agents running")
    // no panel above the blocks any more:  the button is the header's pill's last part (Owen, 2026-10-25)
    expect(host.shadowRoot!.querySelector('epic-agents[draws="agents"]')!.closest('[part~="step-pill"]')).not.toBeNull()
    expect(agentRows(host)).toEqual([
      ["demo-aaa", "active", "blue", "2h 5m", "Port the parser", []],
      [
        "demo-bbb",
        "blocked on demo-aaa",
        "orange",
        "<1m",
        "Wait for aaa",
        [`You · ${clockOf("2026-10-07T10:42:00.000Z")} · told ${clockOf("2026-10-07T10:43:00.000Z")}Hold on`]
      ]
    ])
    expect(noteBox(host, "demo-aaa").note.placeholder).toBe("Redirect demo-aaa ...")
    // the rail and counts read the light DOM:  the panel isn't there
    expect(host.querySelector(".agents")).toBeNull()
    await expectAccessible(host)
  })

  test("a poll updates each row in place:  what's typed in a box, and its focus, stay", async () => {
    const routes = new FakeAgents()
    const client = await adoptAgents(routes)
    const host = await renderWithAgents()
    const { note } = noteBox(host, "demo-aaa")
    note.focus()
    type(note, "Half typed")
    routes.agents[0]!.status = "blocked on demo-ccc"
    routes.agents.push({ name: "demo-ccc", task: "New one", status: "active", started: new Date().toISOString() })
    await client.refresh()
    await ElementFixture.tick()
    expect(agentRows(host).map((row) => row.slice(0, 3))).toEqual([
      ["demo-aaa", "blocked on demo-ccc", "orange"],
      ["demo-bbb", "blocked on demo-aaa", "orange"],
      ["demo-ccc", "active", "blue"]
    ])
    expect(noteBox(host, "demo-aaa").note).toBe(note)
    expect(note.value).toBe("Half typed")
    expect(agentsRoot(host).activeElement).toBe(note)
    expect(agentsRoot(host).querySelector(".agents-button")!.getAttribute("aria-label")).toBe("3 agents running")
  })

  test("Send (and Cmd + Enter) redirects the agent:  the note posted, the box emptied, the redirect waiting", async () => {
    const routes = new FakeAgents()
    await adoptAgents(routes)
    const host = await renderWithAgents()
    const { note, send } = noteBox(host, "demo-aaa")
    expect(send.hasAttribute("disabled")).toBe(true)
    type(note, "  Use the new parser  ")
    await ElementFixture.tick()
    expect(send.hasAttribute("disabled")).toBe(false)
    send.click()
    await vi.waitFor(() => expect(note.value).toBe(""))
    expect(routes.posts).toEqual([{ page: "/epics/demo/demo.plan.html", name: "demo-aaa", note: "Use the new parser" }])
    const sent = (routes.agents[0]!.redirects as { at: string }[])[0]!.at
    await vi.waitFor(() =>
      expect(agentRows(host)[0]![5]).toEqual([`You · ${clockOf(sent)} · waiting for the sessionUse the new parser`])
    )
    type(note, "And the old tests")
    note.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }))
    await vi.waitFor(() => expect(routes.posts).toHaveLength(2))
    await vi.waitFor(() => expect(note.value).toBe(""))
  })

  test("a refused redirect says why under the box, as a sentence;  what was typed stays", async () => {
    const routes = new FakeAgents()
    await adoptAgents(routes)
    const host = await renderWithAgents()
    const { row, note, send } = noteBox(host, "demo-bbb")
    routes.failure = "AgentList:  no agent `demo-bbb` is running"
    type(note, "Go on")
    await ElementFixture.tick()
    send.click()
    await vi.waitFor(() =>
      expect(row.querySelector(".agent-error")?.textContent).toBe("AgentList:  no agent `demo-bbb` is running.")
    )
    expect(note.value).toBe("Go on")
  })

  test("hidden with no agent running, or the page not served with a token;  gone when the last one finishes", async () => {
    const empty = new FakeAgents()
    empty.agents = []
    await adoptAgents(empty)
    const none = await render(page("", ["active"]))
    expect(agentsRoot(none).querySelector(".agents-button")).toBeNull()
    none.remove()
    await adoptAgents(new FakeAgents(), { served: false })
    const unserved = await render(page("", ["active"]))
    expect(agentsRoot(unserved).querySelector(".agents-button")).toBeNull()
    unserved.remove()
    const routes = new FakeAgents()
    const client = await adoptAgents(routes)
    const host = await renderWithAgents()
    routes.agents = []
    await client.refresh()
    await ElementFixture.tick()
    expect(agentsRoot(host).querySelector(".agents-button")).toBeNull()
  })
})

// epic `epic-engine` P35:  "Would be nice to have indicator in epic page toolbar that you are e.g. 'Formulating responses.'"
describe("<epic-page> what Claude is doing", () => {
  afterEach(() => {
    ReviewClient.adopt(undefined)
  })

  test("the session's line in the toolbar, its styled tooltip listing what it answers, linked;  none while idle", async () => {
    const routes = new FakeRoutes()
    routes.inbox.listening = { session: "s1", since: new Date().toISOString(), seen: new Date().toISOString() }
    routes.inbox.doing = {
      text: "Responding",
      items: [
        { id: "q1", title: "Which?" },
        { id: "m3", title: "This reads oddly" }
      ],
      at: new Date().toISOString()
    }
    const client = await adoptClient(routes)
    const host = await render(page("", ["active"]))
    const line = () => agentsRoot(host, "doing").querySelector<HTMLElement>("[part~='doing']")
    await vi.waitFor(() => expect(line()?.textContent).toBe("Responding"))
    expect(line()!.getAttribute("aria-label")).toBe("Responding:  Q1, M3")
    const tip = agentsRoot(host, "doing").querySelector("ui-popup.doing-tip")!
    expect(tip.getAttribute("open-on")).toBe("hover")
    expect(Array.from(tip.querySelectorAll("a"), (link) => [link.getAttribute("href"), link.textContent])).toEqual([
      ["#q1", "Q1 Which?"],
      ["#m3", "M3 This reads oddly"]
    ])
    routes.inbox.doing = null
    await client.refresh()
    await ElementFixture.tick()
    expect(line()).toBeNull()
  })
})

////////////////
// ## Stages (epic `epic-engine` P29)
////////////////

/** A page in `stage` (none:  `""`):  an open phase and a done one, a question, a judgement call, todos and the log. */
function stagedPage(stage: string): string {
  return (
    `<epic-page epic="demo" title="Demo"${stage ? ` stage="${stage}"` : ""}>` +
    `<epic-overview id="overview"><p slot="summary">Two sentences.</p></epic-overview>` +
    `<epic-section id="phases" kind="phases">` +
    `<epic-phase id="p-one" title="One" status="todo"></epic-phase>` +
    `<epic-phase id="p-two" title="Two" status="done"></epic-phase></epic-section>` +
    `<epic-section id="decisions" kind="questions"><epic-item id="q1" title="Which?" status="open"></epic-item>` +
    `<epic-item id="q2" title="That?" status="open"></epic-item></epic-section>` +
    `<epic-section id="judgements" kind="judgements"><epic-item id="j1" title="Kept" status="open"></epic-item></epic-section>` +
    `<epic-section id="caveats" kind="caveats"><epic-item id="c1" title="Later" status="open"></epic-item></epic-section>` +
    `<epic-section id="log" kind="log"><epic-event at="2026-10-24T10:00">made</epic-event></epic-section>` +
    `</epic-page>`
  )
}

/** The page's top-level blocks that show, each as its title says:  `2. Questions`. */
function shownBlocks(host: Element): string[] {
  return Array.from(host.children)
    .filter((block) => getComputedStyle(block).display !== "none")
    .map((block) => (block as unknown as { contentsEntry?: { label: string } }).contentsEntry?.label ?? block.id)
}

/** `phase`'s review buttons, by action. */
function pillsOf(phase: Element): string[] {
  const review = phase.shadowRoot!.querySelector('epic-review[shows="buttons"]')
  return Array.from(review?.shadowRoot?.querySelectorAll("ui-button[data-action]") ?? [], (button) =>
    button.getAttribute("data-action")!
  )
}

describe("<epic-page> stages", () => {
  afterEach(() => {
    ReviewClient.adopt(undefined)
  })

  test("overview:  only the Overview, Questions and Caveats show, numbered as they show;  the toolbar's chips count only them", async () => {
    const host = await render(stagedPage("overview"))
    await vi.waitFor(() => expect(shownBlocks(host)).toEqual(["1. Overview", "2. Questions", "3. Caveats"]))
    // the step label says the stage, not a phase that doesn't show
    expect(step(host)?.words).toBe("OVERVIEW")
    // the file still holds them:  only a view
    expect(host.querySelectorAll(":scope > epic-section")).toHaveLength(5)
    await vi.waitFor(() =>
      expect(pageChips(host).reduce((sum, chip) => sum + Number(chip.replace(/\D/g, "")), 0)).toBe(3)
    )
  })

  test("phases:  the Phases too;  building, or no stage (every page before stages):  everything", async () => {
    const phases = await render(stagedPage("phases"))
    await vi.waitFor(() =>
      expect(shownBlocks(phases)).toEqual(["1. Overview", "2. Phases", "3. Questions", "4. Caveats"])
    )
    expect(step(phases)?.words).toBe("PHASES")
    for (const stage of ["building", ""]) {
      const host = await render(stagedPage(stage))
      await vi.waitFor(() => expect(shownBlocks(host)).toHaveLength(6))
    }
    // the stage moved on (the live update patches the attribute):  the sections follow
    phases.setAttribute("stage", "building")
    await vi.waitFor(() => expect(shownBlocks(phases)).toHaveLength(6))
  })

  test("the header's stage button:  Accept Overview in Send's place, what's open in its tooltip;  a press sends its mark;  building:  Send again", async () => {
    const routes = new FakeRoutes()
    const at = new Date().toISOString()
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    await adoptClient(routes)
    const host = await render(stagedPage("overview"))
    const button = () => plane(host)
    await vi.waitFor(() => expect(button()?.textContent).toContain("Accept Overview"))
    expect(button().title).toBe("The Overview is agreed:  Claude writes the phases next · 2 questions open")
    // no wand (Owen, 2026-10-25:  "remove the wand EVERYWHERE")
    expect(sendGroup(host).shadowRoot!.querySelector('[part~="countdown"]')).toBeNull()
    button().click()
    await vi.waitFor(() => expect(routes.posts.map(([route]) => route)).toEqual(["mark", "send"]))
    expect(routes.posts[0]![1]).toEqual({
      page: "/epics/demo/demo.plan.html",
      id: "stage",
      mark: { action: "accept", stage: "overview" }
    })
    routes.inbox.marks.stage = { action: "accept", stage: "overview", at }
    await ReviewClient.forPage().refresh()
    await vi.waitFor(() => expect(sendGroup(host).hasAttribute("accepted")).toBe(true))
    expect(button().title).toBe("Overview accepted:  waiting for Claude to write the phases")
    // the session moved it on:  Accept Phases;  then building, the plane
    host.setAttribute("stage", "phases")
    await vi.waitFor(() => expect(button().textContent).toContain("Accept Phases"))
    expect(sendGroup(host).hasAttribute("accepted")).toBe(false)
    host.setAttribute("stage", "building")
    await vi.waitFor(() => expect(sendGroup(host).hasAttribute("accept")).toBe(false))
    expect(button().textContent).not.toContain("Accept")
    await expectAccessible(host)
  })

  // Owen, 2026-10-25:  "This just needs to be `send|wand` and not green -- I may not be accepting the phases"
  test("building, build plans waiting:  Send as ever, ringed 2px #666 (waiting on you), the plans in its tooltip;  dotted once marked", async () => {
    const routes = new FakeRoutes()
    const at = new Date().toISOString()
    routes.inbox.listening = { session: "s1", since: at, seen: at }
    // one mark not sent yet, so a press has something to send
    routes.inbox.marks.q1 = { action: "approve", at }
    await adoptClient(routes)
    const html = stagedPage("building")
      .replace(
        `<epic-phase id="p-one" title="One" status="todo">`,
        `<epic-phase id="p-one" title="One" status="todo" plan="waiting">`
      )
      .replace(
        `<epic-phase id="p-two" title="Two" status="done">`,
        `<epic-phase id="p-two" title="Two" status="done"></epic-phase><epic-phase id="p-three" title="Three" status="todo" plan="waiting">`
      )
    const host = await render(html)
    await vi.waitFor(() => expect(sendGroup(host).getAttribute("asks")).toBe("waiting"))
    // no green Accept:  the plane alone, no stage words, no wand
    expect(sendGroup(host).hasAttribute("accept")).toBe(false)
    expect(plane(host).querySelector("ui-icon")!.getAttribute("name")).toBe("paper plane")
    expect(sendGroup(host).shadowRoot!.querySelector('[part~="countdown"]')).toBeNull()
    expect(plane(host).title).toBe("2 build plans wait for your Accept:  P1, P3 · Send 1 mark to Claude")
    const base = sendGroup(host).shadowRoot!.querySelector<HTMLElement>('[part~="base"]')!
    expect([getComputedStyle(base).borderTopStyle, getComputedStyle(base).borderTopWidth]).toEqual(["solid", "2px"])
    // a press is a plain Send:  no accept marks
    plane(host).click()
    await vi.waitFor(() => expect(routes.posts.map(([route]) => route)).toEqual(["send"]))
    // each plan marked on its phase:  dotted
    routes.inbox.marks["p-one"] = { action: "approve", at }
    routes.inbox.marks["p-three"] = { action: "defer", at }
    // the send may still be writing:  a refresh waits for it
    await vi.waitFor(async () => {
      await ReviewClient.forPage().refresh()
      expect(sendGroup(host).getAttribute("asks")).toBe("taken")
    })
    expect(getComputedStyle(base).borderTopStyle).toBe("dotted")
    // none waiting:  no ring
    for (const phase of host.querySelectorAll("epic-phase[plan]")) phase.setAttribute("plan", "accepted")
    await vi.waitFor(() => expect(sendGroup(host).hasAttribute("asks")).toBe(false))
    expect(getComputedStyle(base).borderTopWidth).toBe("1px")
    await expectAccessible(host)
  })

  // epic `epic-engine` P30:  the change marks waiting for Accept, counted from the skeleton's lists and the page
  test("change marks need no approval (Owen, 2026-10-25):  no count in the header, none in the stage button's tooltip", async () => {
    await adoptClient(new FakeRoutes())
    const html = stagedPage("overview")
      .replace(`<epic-phase id="p-one"`, `<epic-phase id="p-one" to-accept="ch2"`)
      .replace(
        `<p slot="summary">Two sentences.</p>`,
        `<p slot="summary">Two sentences.</p><epic-section id="o1" kind="overview-part" title="Why">` +
          `<p><epic-change id="ch1" item="q1">changed</epic-change></p></epic-section>`
      )
    const host = await render(html)
    await vi.waitFor(() => expect(plane(host).title).toBeTruthy())
    expect(host.shadowRoot!.querySelector('[part~="changes"]')).toBeNull()
    expect(plane(host).title).not.toMatch(/to accept/)
  })

  test("phases:  an open phase's pills are Looks good and Defer;  a done one's, and every one once building, the usual", async () => {
    await adoptClient(new FakeRoutes())
    const host = await render(stagedPage("phases"))
    const [one, two] = Array.from(host.querySelectorAll("epic-phase"))
    await vi.waitFor(() => expect(pillsOf(one!)).toEqual(["approve", "defer"]))
    expect(pillsOf(two!)).toEqual(["todo", "revisit"])
    host.setAttribute("stage", "building")
    await vi.waitFor(() => expect(pillsOf(one!)).toEqual(["todo", "revisit"]))
  })
})
