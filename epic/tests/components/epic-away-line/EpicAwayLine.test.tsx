import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ReviewClient, type Inbox } from "spell/epic/review"

import "spell/ui/components/ui-button"
import "spell/epic/components/epic-away-line"

afterEach(() => {
  ReviewClient.adopt(undefined)
})

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

/** The line's Read, in its `<epic-review>`'s shadow root;  `null` when not drawn. */
function readButton(line: Element): HTMLElement | null {
  const review = line.shadowRoot!.querySelector("epic-review")
  return review?.shadowRoot?.querySelector<HTMLElement>('ui-button[data-action="seen"]') ?? null
}

describe("<epic-away-line>", () => {
  const LINE = `<epic-away-line line="i205"><a href="#i205">I205</a> open issue:  no Done reading</epic-away-line>`

  test("its words through `body`;  no Read while the page isn't reviewed", async () => {
    const line = await ElementFixture.render(LINE)
    await ElementFixture.tick()
    expect(line.shadowRoot!.querySelector('[part~="body"] slot')).not.toBeNull()
    expect(readButton(line)).toBeNull()
    await expectAccessible(line)
  })

  test("reviewed:  a ✓ Read first;  pressed, a Seen on `away:<line>`, and the line fades at once", async () => {
    const routes = new FakeRoutes()
    await adoptClient(routes)
    const line = await ElementFixture.render(LINE)
    await ElementFixture.settle()
    await vi.waitFor(() => expect(readButton(line)).not.toBeNull())
    const button = readButton(line)!
    expect(button.getAttribute("title")).toContain("the rest stays")
    await expectAccessible(line)
    button.click()
    await vi.waitFor(() => expect(routes.inbox.marks["away:i205"]?.action).toBe("seen"))
    await vi.waitFor(() => expect(line.matches(":state(read)")).toBe(true))
  })

  test("a part's heading:  `:state(heading)`", async () => {
    const heading = await ElementFixture.render(
      `<epic-away-line line="done" heading><b>What was done</b></epic-away-line>`
    )
    await ElementFixture.tick()
    expect(heading.matches(":state(heading)")).toBe(true)
  })
})
