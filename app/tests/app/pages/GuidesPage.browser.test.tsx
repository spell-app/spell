import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"
import { memoryHistory, type MemoryHistoryAdapter } from "@solidjs/router"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SPACES } from "spell/app/spaces"
import { uiReady } from "spell/app/app/solid"
import { Routes, createAppRouter } from "spell/app/app/pages/routes"

/**
 * The Guides page (`<GuidesPage>`, epic `epic-engine` P79), in the browser, on a router of its own:
 * - `/guides`:  Start here first, the makers' topics, the programmers' folded under their heading, a search box
 * - `/guides/<path>`:  one guide's body, links between guides opening here, a chapter landed on by its anchor
 * - the guides are the app server's (`/api/guides/`):  a stand-in `fetch` answers here, with a list and two pages
 */

/** The shipped guides' list, as `epic guides index` writes it. */
const LIST = `{
  guides: [
    { path: "guides/spell-language/spell-language.html", title: "The Spell Language", description: "Spell, from the first line.", audience: "makers", topic: "Writing Spell" },
    { path: "guides/data/data.html", title: "Data", description: "Where things live.", audience: "makers", topic: "Data and Sites" },
    { path: "guides/server.html", title: "The Page Server", description: "Serving pages locally.", audience: "programmers", topic: "Tools" }
  ],
  startHere: [
    { order: 1, path: "guides/spell-language/spell-language.html", title: "The Spell Language" },
    { order: 3, path: "guides/data/data.html", title: "Data" },
    { order: 5, path: "guides/spell-language/spell-language.html", title: "Views", anchor: "views" }
  ]
}`

/** A guide page as it's shipped:  the epic site's header and breadcrumb around its body. */
function guidePage(title: string, body: string): string {
  return (
    `<!doctype html><html><head><title>${title}</title></head><body><spell-site-header></spell-site-header>` +
    `<main><ui-breadcrumbs class="spell-crumbs"><ui-breadcrumb>Spell Epic</ui-breadcrumb></ui-breadcrumbs>` +
    `<ui-sticky class="spell-h1"><header class="spell-page-head"><h1>${title}</h1></header></ui-sticky>` +
    `${body}</main><script src="/_epic/assets/spell-ui.js"></script></body></html>`
  )
}

/** What the stand-in server answers, by path. */
const FILES: Record<string, string> = {
  "/api/guides/guides.json5": LIST,
  "/api/guides/spell-language/spell-language.html": guidePage(
    "The Spell Language",
    '<p>See <a href="/guides/data/data.html">Data</a>.</p><ui-section id="views" label="Views" open="false"><p>Views draw.</p></ui-section>'
  ),
  "/api/guides/data/data.html": guidePage("Data", "<p>Things live somewhere.</p>")
}

/** Undo for each test. */
const cleanups: (() => void)[] = []

beforeEach(() => {
  const real = globalThis.fetch
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const path = new URL(url, location.href).pathname
    const text = FILES[path]
    return text === undefined ? new Response("not found", { status: 404 }) : new Response(text, { status: 200 })
  })
  globalThis.fetch = fetcher as typeof fetch
  cleanups.push(() => (globalThis.fetch = real))
  // project roots load from the API server, which tests don't have
  const load = vi.spyOn(SPACES.SpellProjectRoot.prototype, "load").mockResolvedValue(undefined as never)
  cleanups.push(() => load.mockRestore())
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("the Guides page", () => {
  test("lists Start here first, then the makers' topics, the programmers' folded under their heading", async () => {
    const { host } = await mountAt("/guides")
    await vi.waitFor(() => expect(host.querySelector("#start-here")).toBeTruthy())
    expect(host.querySelector("#GuidesPage h1")?.textContent).toBe("Guides")
    const starts = [...host.querySelectorAll("#start-here ui-header")].map((each) => each.textContent)
    expect(starts).toEqual(["The Spell Language", "Data", "Views"])
    expect(host.querySelector("#start-here")?.textContent).toContain("A chapter of The Spell Language.")
    const programmers = host.querySelector("#for-programmers")!
    expect(programmers.getAttribute("open")).toBe("false")
    expect(programmers.textContent).toContain("The Page Server")
    expect(programmers.textContent).not.toContain("Where things live.")
  })

  test("the search box keeps only the guides whose title or description has every word, programmers' opened", async () => {
    const { host } = await mountAt("/guides")
    await vi.waitFor(() => expect(host.querySelector(".GuidesSearch")).toBeTruthy())
    host.querySelector(".GuidesSearch")!.dispatchEvent(new CustomEvent("ui-typed", { detail: { value: "serving" } }))
    await settle(host)
    expect(host.querySelector("#start-here")).toBeNull()
    const cards = [...host.querySelectorAll(".GuideCard ui-header")].map((each) => each.textContent)
    expect(cards).toEqual(["The Page Server"])
    expect(host.querySelector("#for-programmers")?.hasAttribute("open")).toBe(true)
    expect(host.querySelector("#for-programmers")?.getAttribute("open")).not.toBe("false")
  })

  test("a card opens its guide:  its body alone, no site header, breadcrumb or script;  a guide's link opens here", async () => {
    const { host, history } = await mountAt("/guides")
    await vi.waitFor(() => expect(host.querySelector("#start-here .GuideCard")).toBeTruthy())
    ;(host.querySelector("#start-here .GuideCard") as HTMLElement).click()
    await vi.waitFor(() => expect(host.querySelector(".GuideBody h1")?.textContent).toBe("The Spell Language"))
    expect(history.get()).toBe("/guides/spell-language/spell-language.html")
    const body = host.querySelector(".GuideBody")!
    expect(body.querySelector("spell-site-header, ui-breadcrumbs, script, ui-sticky")).toBeNull()
    ;(body.querySelector('a[href="/guides/data/data.html"]') as HTMLElement).click()
    await vi.waitFor(() => expect(host.querySelector(".GuideBody h1")?.textContent).toBe("Data"))
    expect(history.get()).toBe("/guides/data/data.html")
  })

  test("Views, from Start here, lands on the language page's chapter, opened", async () => {
    const { host, history } = await mountAt("/guides")
    await vi.waitFor(() => expect(host.querySelectorAll("#start-here .GuideCard").length).toBe(3))
    ;(host.querySelectorAll("#start-here .GuideCard")[2] as HTMLElement).click()
    await vi.waitFor(() => expect(host.querySelector(".GuideBody #views")).toBeTruthy())
    expect(history.get()).toBe("/guides/spell-language/spell-language.html#views")
    await vi.waitFor(() => expect(host.querySelector(".GuideBody #views")?.getAttribute("open")).toBe("true"))
  })

  test("the home page's guides row:  only the Start here guides, each opening on the Guides page, and its button", async () => {
    const { host, history } = await mountAt("/")
    await vi.waitFor(() => expect(host.querySelectorAll("#guides .TileCard:not(.empty)").length).toBe(3))
    const titles = [...host.querySelectorAll("#guides .TileCard .title")].map((each) => each.textContent)
    expect(titles).toEqual(["The Spell Language", "Data", "Views"])
    ;(host.querySelectorAll("#guides .TileCard")[2] as HTMLElement).click()
    await settle(host)
    expect(history.get()).toBe("/guides/spell-language/spell-language.html#views")
  })
})

/** Draw the app's routes at `url`, on a memory history, and wait for the page. */
async function mountAt(url: string): Promise<{ host: HTMLElement; history: MemoryHistoryAdapter }> {
  await uiReady
  const history = memoryHistory(url)
  const router = createAppRouter(history)
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(() => <Routes router={router} />, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  await settle(host)
  return { host, history }
}

/** Let writes, the router and the elements settle. */
async function settle(host: HTMLElement) {
  flush()
  await new Promise((resolve) => setTimeout(resolve, 0))
  flush()
  await ElementFixture.settle(host)
}
