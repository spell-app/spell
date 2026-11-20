/**
 * Tests of the kickoff box (`<epic-kickoff>`, epic `epic-engine` P75):  drawn by a new epic's Overview while there's
 * no prompt and no phases;  pictures dropped go into its words labelled;  an x renumbers;  saved as a `kickoff` mark.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-section"
import "spell/ui/components/ui-input"
import "spell/epic/components/epic-page"
import "spell/epic/components/epic-overview"
import "spell/epic/components/epic-kickoff"

afterEach(() => ReviewClient.adopt(undefined))

/** A tiny PNG's bytes:  the 8-byte signature is all `Pictures.pngOf()` reads of a PNG. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** The review routes, as `fetch`:  marks kept as the route would;  each picture its own file. */
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
  readonly posted: { route: string; body: Record<string, unknown> }[] = []
  /** How many pictures were saved. */
  shots = 0

  readonly fetch = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const route = input.replace("/api/epics/review/", "").replace(/\?.*/, "")
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {}
    if (init?.body) this.posted.push({ route, body })
    if (route === "shot") return Response.json({ shot: `pictures/kickoff-20261117-2300-${++this.shots}.png` })
    if (route === "mark") {
      const id = body.id as string
      if (body.mark) this.inbox.marks[id] = { ...(body.mark as object), at: new Date().toISOString() } as never
      else delete this.inbox.marks[id]
    }
    return Response.json(this.inbox)
  })
}

/** A served client on `routes`, started (the page reviewed) and adopted as the page's. */
async function reviewing(routes: FakeRoutes): Promise<ReviewClient> {
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

/**
 * A new epic's page, in its Overview stage:  its Overview, with `inside` (a prompt, say), and `after` (phases, say);
 * `attributes` in place of `stage="overview"` (a saga page's, say).
 */
async function page(inside = "", after = "", attributes = 'epic="sample" stage="overview"'): Promise<HTMLElement> {
  const host = await ElementFixture.render<E.DOMElement>(
    `<epic-page ${attributes} title="Sample"><epic-overview id="overview">${inside}</epic-overview>${after}</epic-page>`
  )
  await ElementFixture.settle()
  return host.querySelector<HTMLElement>("epic-overview")!
}

/** The Overview's kickoff box, drawn in its shadow root;  `null` when not drawn. */
function kickoffOf(overview: Element): HTMLElement | null {
  return overview.shadowRoot!.querySelector<HTMLElement>("epic-kickoff")
}

/** The kickoff box's native field. */
function fieldOf(kickoff: Element): HTMLTextAreaElement {
  const box = kickoff.shadowRoot!.querySelector("epic-text-box") as HTMLElement & { textarea?: HTMLTextAreaElement }
  return box.textarea!
}

/** The labels and files of the strip under the box. */
function stripOf(kickoff: Element): [string | null, string | null | undefined][] {
  return [...kickoff.shadowRoot!.querySelectorAll(".pictures epic-picture")].map((each) => [
    each.getAttribute("label"),
    each.querySelector("img")?.getAttribute("src")
  ])
}

describe("<epic-kickoff>", () => {
  test("drawn first in a new epic's Overview while reviewed;  not with a prompt, nor with phases, nor unreviewed", async () => {
    expect(kickoffOf(await page())).toBe(null)
    await reviewing(new FakeRoutes())
    const overview = await page()
    await vi.waitFor(() => expect(kickoffOf(overview)).not.toBe(null))
    const kickoff = kickoffOf(overview)!
    await ElementFixture.settle()
    expect(kickoff.shadowRoot!.querySelector('[part~="lead"]')?.textContent).toBe("What should this epic do?")
    // the Overview unfolds, so the box is seen:  epic pages open folded
    expect(overview.matches(":state(open)")).toBe(true)
    await expectAccessible(kickoff)
    expect(kickoffOf(await page("<epic-prompt><p>Do it</p></epic-prompt>"))).toBe(null)
    const phases = `<epic-section id="phases" kind="phases"><epic-phase id="p-one" title="One" status="todo"></epic-phase></epic-section>`
    expect(kickoffOf(await page("", phases))).toBe(null)
  })

  // epic `epic-engine` I349:  a saga page showed it, as any page with no prompt and no phases did
  test("only on an EPIC page in its Overview stage:  never a saga page, nor a page with no stage or a later one", async () => {
    await reviewing(new FakeRoutes())
    const fresh = await page()
    await vi.waitFor(() => expect(kickoffOf(fresh)).not.toBe(null))
    for (const attributes of [
      'kind="saga" saga="epics"',
      'kind="saga" saga="epics" stage="overview"',
      'epic="sample"',
      'epic="sample" stage="phases"',
      'epic="sample" stage="building"'
    ]) {
      const overview = await page("", "", attributes)
      await ElementFixture.settle()
      expect(kickoffOf(overview), attributes).toBe(null)
    }
  })

  test("three pictures dropped are IMG1-IMG3, saved as a kickoff mark;  taking IMG2 out leaves IMG1 and IMG2", async () => {
    const routes = new FakeRoutes()
    await reviewing(routes)
    const overview = await page()
    await vi.waitFor(() => expect(kickoffOf(overview)).not.toBe(null))
    const kickoff = kickoffOf(overview)!
    await ElementFixture.settle()
    await vi.waitFor(() => expect(fieldOf(kickoff)).toBeInstanceOf(HTMLTextAreaElement))
    const field = fieldOf(kickoff)
    field.value = "A list page, like IMG3."
    field.setSelectionRange(field.value.length, field.value.length)
    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
    const dropped = new DataTransfer()
    for (const name of ["a.png", "b.png", "c.png"])
      dropped.items.add(new File([PNG_BYTES], name, { type: "image/png" }))
    field.dispatchEvent(
      new DragEvent("drop", { dataTransfer: dropped, bubbles: true, composed: true, cancelable: true })
    )
    await vi.waitFor(() => expect(stripOf(kickoff).map(([label]) => label)).toEqual(["IMG1", "IMG2", "IMG3"]))
    expect(routes.posted.filter((each) => each.route === "shot").map((each) => each.body.id)).toEqual([
      "kickoff",
      "kickoff",
      "kickoff"
    ])
    await vi.waitFor(() =>
      expect(routes.inbox.marks.kickoff).toMatchObject({
        action: "kickoff",
        note:
          "A list page, like IMG3.\n![IMG1](pictures/kickoff-20261117-2300-1.png)\n" +
          "![IMG2](pictures/kickoff-20261117-2300-2.png)\n![IMG3](pictures/kickoff-20261117-2300-3.png)"
      })
    )
    // IMG2's x:  IMG3 becomes IMG2, in the words that name it too
    const second = kickoff.shadowRoot!.querySelectorAll(".pictures epic-picture")[1]!
    second.shadowRoot!.querySelector<HTMLElement>('[part~="remove"]')!.click()
    await vi.waitFor(() =>
      expect(stripOf(kickoff)).toEqual([
        ["IMG1", "pictures/kickoff-20261117-2300-1.png"],
        ["IMG2", "pictures/kickoff-20261117-2300-3.png"]
      ])
    )
    expect(field.value).toBe(
      "A list page, like IMG2.\n![IMG1](pictures/kickoff-20261117-2300-1.png)\n![IMG2](pictures/kickoff-20261117-2300-3.png)\n"
    )
    await vi.waitFor(() => expect(routes.inbox.marks.kickoff?.note).toBe(field.value.trim()))
  })
})
