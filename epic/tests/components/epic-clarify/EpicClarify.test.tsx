import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/epic/components/epic-clarify"
import "spell/epic/components/epic-item"

afterEach(() => {
  ReviewClient.adopt(undefined)
})

/** The review routes' `now`, as `fetch`, over an inbox kept here:  each reply the whole inbox. */
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
    repliedComments: [],
    woken: null,
    doing: null
  }

  /** The routes posted to, in order. */
  readonly posted: { route: string; body: unknown }[] = []

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    if (init?.body) {
      const body = JSON.parse(init.body as string) as { id: string; action: string }
      this.posted.push({ route, body })
      if (route === "now")
        this.inbox.now.push({ id: body.id, action: body.action, at: new Date().toISOString() } as Inbox["now"][number])
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

/** Its link, in its shadow root;  `null` when not drawn. */
function linkOf(clarify: Element): HTMLElement | null {
  return clarify.shadowRoot!.querySelector<HTMLElement>('[part~="base"]')
}

describe("<epic-clarify>", () => {
  const ITEM = `<epic-item id="t9" title="a todo" status="open"><p data-title-body=""><em>What it says on the tin.</em><epic-clarify></epic-clarify></p></epic-item>`

  /** Its `<epic-clarify>`, rendered inside an item. */
  async function render(): Promise<Element> {
    const item = await ElementFixture.render(ITEM)
    await ElementFixture.settle()
    return item.querySelector("epic-clarify")!
  }

  test("not reviewed:  nothing drawn, the words stand alone", async () => {
    const clarify = await render()
    expect(linkOf(clarify)).toBeNull()
  })

  test("reviewed:  a Clarify link;  clicked, its item's details asked for now, and the link goes", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const clarify = await render()
    await vi.waitFor(() => expect(linkOf(clarify)).not.toBeNull())
    const link = linkOf(clarify)!
    expect(link.textContent).toBe("Clarify")
    expect(link.title).toMatch(/without waiting for Send/)
    await expectAccessible(clarify)
    link.click()
    await vi.waitFor(() =>
      expect(routes.posted).toContainEqual({
        route: "now",
        body: expect.objectContaining({ id: "t9", action: "details" })
      })
    )
    await vi.waitFor(() => expect(linkOf(clarify)).toBeNull())
  })

  test("I289:  the link is a button, never a hash link, and its click leaves the page where it is", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const spacer = document.createElement("div")
    spacer.style.height = "3000px"
    document.body.prepend(spacer)
    try {
      const clarify = await render()
      await vi.waitFor(() => expect(linkOf(clarify)).not.toBeNull())
      const link = linkOf(clarify)!
      expect([link.localName, link.getAttribute("href")]).toEqual(["button", null])
      window.scrollTo({ top: 1200, behavior: "instant" })
      const before = { y: window.scrollY, hash: location.hash }
      link.click()
      await vi.waitFor(() => expect(routes.posted.map((post) => post.route)).toContain("now"))
      await ElementFixture.settle()
      expect({ y: window.scrollY, hash: location.hash }).toEqual(before)
    } finally {
      spacer.remove()
    }
  })

  /** The icon's button, in its shadow root;  `null` when not drawn. */
  function buttonOf(clarify: Element): HTMLButtonElement | null {
    return clarify.shadowRoot!.querySelector<HTMLButtonElement>('button[part~="base"]')
  }

  test("icon (T76):  a circle-question button for `of`;  clicked, the details asked for now, and it stays, turning", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const clarify = await ElementFixture.render(`<epic-clarify of="J182" icon></epic-clarify>`)
    await vi.waitFor(() => expect(buttonOf(clarify)).not.toBeNull())
    const button = buttonOf(clarify)!
    expect(button.querySelector("ui-icon")?.getAttribute("name")).toBe("circle question")
    expect(button.title).toMatch(/clarify this now, without waiting for Send/)
    await expectAccessible(clarify)
    button.click()
    await vi.waitFor(() =>
      expect(routes.posted).toContainEqual({
        route: "now",
        body: expect.objectContaining({ id: "j182", action: "details" })
      })
    )
    await vi.waitFor(() => expect(buttonOf(clarify)?.title).toMatch(/call it off/))
    expect((clarify as unknown as { matches(s: string): boolean }).matches(":state(turning)")).toBe(true)
  })

  test("icon (I295):  an agent merely at work on the item leaves it still;  clicked, it asks, never calls the agent off", async () => {
    const routes = new FakeRoutes()
    // an issue taken up (`epic inbox working i98 on`, no ask of Owen's):  a working flag, not `asked`
    routes.inbox.working = { i98: { action: "details", since: new Date().toISOString() } }
    await adoptClient(routes)
    const clarify = await ElementFixture.render(`<epic-clarify of="I98" icon></epic-clarify>`)
    await vi.waitFor(() => expect(buttonOf(clarify)).not.toBeNull())
    const turning = () => (clarify as unknown as { matches(s: string): boolean }).matches(":state(turning)")
    expect(turning()).toBe(false)
    expect(buttonOf(clarify)!.title).toMatch(/clarify this now/)
    buttonOf(clarify)!.click()
    await vi.waitFor(() =>
      expect(routes.posted).toContainEqual({
        route: "now",
        body: expect.objectContaining({ id: "i98", action: "details" })
      })
    )
    expect(routes.posted.map((each) => each.route)).not.toContain("cancel")
    await vi.waitFor(() => expect(turning()).toBe(true))
  })

  test("icon (I295):  his ask taken by the session (`working.asked`) keeps it turning", async () => {
    const routes = new FakeRoutes()
    routes.inbox.working = { j9: { action: "details", since: new Date().toISOString(), asked: true } }
    await adoptClient(routes)
    const clarify = await ElementFixture.render(`<epic-clarify of="J9" icon></epic-clarify>`)
    await vi.waitFor(() => expect(buttonOf(clarify)).not.toBeNull())
    await vi.waitFor(() =>
      expect((clarify as unknown as { matches(s: string): boolean }).matches(":state(turning)")).toBe(true)
    )
  })

  test("icon in an item:  `<epic-item>` draws it at its body's right while reviewed, a given body's too", async () => {
    await adoptClient(new FakeRoutes())
    const item = await ElementFixture.render(ITEM)
    // drawn from its first unfolding (epic `epic-engine` I333):  folded, its body is hidden anyway
    await ElementFixture.tick()
    expect(item.shadowRoot!.querySelector('[part~="clarify"]')).toBeNull()
    item.setAttribute("open", "")
    await vi.waitFor(() => expect(item.shadowRoot!.querySelector('[part~="clarify"]')).not.toBeNull())
    const icon = item.shadowRoot!.querySelector('[part~="clarify"]')!
    expect(icon.getAttribute("of")).toBe("t9")
    await vi.waitFor(() => expect(buttonOf(icon)).not.toBeNull())
  })
})
