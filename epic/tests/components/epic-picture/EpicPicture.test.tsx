import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { PictureDeletes, ReviewClient, type Inbox } from "spell/epic/review"

import "spell/epic/components/epic-picture"
import "spell/epic/components/epic-item"

afterEach(() => {
  ReviewClient.adopt(undefined)
  for (const src of [SRC]) PictureDeletes.cancel(src)
  document.querySelector("[data-spell-notices]")?.remove()
})

/** The picture's address, as the page has it. */
const SRC = "/epics/sample/pictures/t9-20261116-1302.png"

/** An item showing one picture. */
const ITEM = `<epic-item id="t9" title="a todo" status="open"><p>It breaks.</p><epic-picture><img src="${SRC}" alt="Picture pasted in the chat" /></epic-picture></epic-item>`

/** The review routes, as `fetch`:  each reply an empty inbox;  the routes posted to kept. */
class FakeRoutes {
  readonly inbox: Inbox = {
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
    if (init?.body) this.posted.push({ route, body: JSON.parse(init.body as string) })
    const reply = route === "delete-picture" ? { deleted: "pictures/t9-20261116-1302.png" } : this.inbox
    return new Response(JSON.stringify(reply), { headers: { "content-type": "application/json" } })
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

/** Its item's `<epic-picture>`. */
async function render(): Promise<HTMLElement> {
  const item = await ElementFixture.render(ITEM)
  await ElementFixture.settle()
  return item.querySelector<HTMLElement>("epic-picture")!
}

/** Its trash, in its shadow root;  `null` when not drawn. */
function trashOf(picture: Element): HTMLElement | null {
  return picture.shadowRoot!.querySelector<HTMLElement>('[part~="delete"]')
}

/** Is it hidden, deleted and waiting on its Undo? */
function isDeleted(picture: Element): boolean {
  return picture.matches(":state(deleted)")
}

/** The notice's Undo, in the page's notices. */
function undoButton(): HTMLElement | null {
  return document.querySelector("[data-spell-notices]")?.shadowRoot?.querySelector<HTMLElement>("ui-button") ?? null
}

describe("<epic-picture>", () => {
  test("its picture is the `<img>` inside it;  not reviewed, no trash", async () => {
    const picture = await render()
    expect(picture.shadowRoot!.querySelector(`[part~="base"] slot`)).not.toBeNull()
    expect(picture.querySelector("img")?.getAttribute("src")).toBe(SRC)
    expect(trashOf(picture)).toBeNull()
  })

  test("reviewed:  a trash with its tooltip;  clicked, hidden at once, and deleted once its Undo has had its time", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const picture = await render()
    await vi.waitFor(() => expect(trashOf(picture)).not.toBeNull())
    const trash = trashOf(picture)!
    expect(trash.getAttribute("data-tooltip")).toBe("Delete the picture and its file")
    await expectAccessible(picture)
    trash.click()
    await vi.waitFor(() => expect(isDeleted(picture)).toBe(true))
    expect(getComputedStyle(picture).display).toBe("none")
    expect(PictureDeletes.isPending(SRC)).toBe(true)
    // nothing posted while the Undo is open
    expect(routes.posted.map((post) => post.route)).not.toContain("delete-picture")
    // its time up (sent now, as its timer would)
    expect(await PictureDeletes.send(SRC)).toBe(true)
    expect(routes.posted).toContainEqual({
      route: "delete-picture",
      body: { page: "/epics/sample/sample.plan.html", id: "t9", src: SRC }
    })
  })

  test("Undo puts it back, and nothing is posted", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const picture = await render()
    await vi.waitFor(() => expect(trashOf(picture)).not.toBeNull())
    trashOf(picture)!.click()
    await vi.waitFor(() => expect(undoButton()).not.toBeNull())
    expect(undoButton()!.textContent).toBe("Undo")
    undoButton()!.click()
    await vi.waitFor(() => expect(isDeleted(picture)).toBe(false))
    expect(PictureDeletes.isPending(SRC)).toBe(false)
    expect(await PictureDeletes.send(SRC)).toBe(false)
    expect(routes.posted.map((post) => post.route)).not.toContain("delete-picture")
  })

  test("drawn again while its delete waits (a live patch):  stays hidden", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const picture = await render()
    await vi.waitFor(() => expect(trashOf(picture)).not.toBeNull())
    trashOf(picture)!.click()
    const again = await render()
    await vi.waitFor(() => expect(isDeleted(again)).toBe(true))
  })
})

// epic `epic-engine` P75:  labelled, so the person can name one in words;  a box's x in place of the trash
describe("<epic-picture> labels and the x", () => {
  test("its label is a chip on its corner;  none, no chip", async () => {
    const host = await ElementFixture.render(
      `<div><epic-picture label="IMG2"><img src="${SRC}" alt="IMG2" /></epic-picture>` +
        `<epic-picture><img src="${SRC}" alt="x" /></epic-picture></div>`
    )
    await ElementFixture.settle()
    const [labelled, plain] = [...host.querySelectorAll("epic-picture")]
    expect(labelled!.shadowRoot!.querySelector('[part~="label"]')?.textContent).toBe("IMG2")
    expect(plain!.shadowRoot!.querySelector('[part~="label"]')).toBe(null)
  })

  test("`removable`:  an x (no trash, even in an item being reviewed) that hands its label to the box", async () => {
    await adoptClient(new FakeRoutes())
    const item = await ElementFixture.render(
      `<epic-item id="t9" title="a todo" status="open"><epic-picture label="IMG3" removable><img src="${SRC}" alt="IMG3" /></epic-picture></epic-item>`
    )
    await ElementFixture.settle()
    const picture = item.querySelector("epic-picture")!
    expect(trashOf(picture)).toBe(null)
    const removed: unknown[] = []
    picture.addEventListener("epic-picture-removed", (event) => removed.push((event as CustomEvent).detail))
    const x = picture.shadowRoot!.querySelector<HTMLElement>('[part~="remove"]')!
    expect(x.getAttribute("data-tooltip")).toBe("Remove IMG3")
    x.click()
    expect(removed).toEqual([{ label: "IMG3", src: SRC }])
    await expectAccessible(picture)
  })
})
