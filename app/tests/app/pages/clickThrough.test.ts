import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page, type Route } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

/**
 * The Star Wars site's CLICK-THROUGH mockup in the editor's Run (epic `mockup` P8):  the films, a film, a person in the
 * sidebar, a review in a dialog, kept on this device, and back.
 * - The site is the example itself, `@spell/examples/StarWarsSite`, as it's committed:  nothing reaches its files.
 * - swapi.py4e.com is answered here, with one film and two people:  the test needs no network, and its words don't move.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** The project. */
const PROJECT = "@spell/examples/StarWarsSite"

/** The server the Star Wars place reads. */
const SWAPI = "https://swapi.py4e.com/api"

/** What the galaxy holds here:  one film, two people from one planet. */
const FILM = {
  title: "A New Hope",
  episode_id: 4,
  opening_crawl: "It is a period of civil war.",
  director: "George Lucas",
  producer: "Gary Kurtz",
  release_date: "1977-05-25",
  characters: [`${SWAPI}/people/1/`, `${SWAPI}/people/2/`],
  planets: [`${SWAPI}/planets/1/`],
  starships: [],
  vehicles: [],
  species: [],
  created: "2014-12-10T14:23:31.880000Z",
  edited: "2014-12-20T19:49:45.256000Z",
  url: `${SWAPI}/films/1/`
}

/** A person of the galaxy, its fields as swapi writes them. */
function person(id: number, name: string, birthYear: string) {
  return {
    name,
    height: "172",
    mass: "77",
    hair_color: "blond",
    skin_color: "fair",
    eye_color: "blue",
    birth_year: birthYear,
    gender: "male",
    homeworld: `${SWAPI}/planets/1/`,
    films: [`${SWAPI}/films/1/`],
    species: [],
    vehicles: [],
    starships: [],
    created: "2014-12-09T13:50:51.644000Z",
    edited: "2014-12-20T21:17:56.891000Z",
    url: `${SWAPI}/people/${id}/`
  }
}

const PEOPLE = [person(1, "Luke Skywalker", "19BBY"), person(2, "Owen Lars", "52BBY")]

const PLANET = {
  name: "Tatooine",
  rotation_period: "23",
  orbital_period: "304",
  diameter: "10465",
  climate: "arid",
  gravity: "1 standard",
  terrain: "desert",
  surface_water: "1",
  population: "200000",
  residents: PEOPLE.map((each) => each.url),
  films: [FILM.url],
  created: "2014-12-09T13:50:49.641000Z",
  edited: "2014-12-20T20:58:18.411000Z",
  url: `${SWAPI}/planets/1/`
}

/** Each collection's rows, by its path. */
const COLLECTIONS: Record<string, object[]> = {
  films: [FILM],
  people: PEOPLE,
  planets: [PLANET],
  species: [],
  vehicles: [],
  starships: []
}

/** swapi's answer for `url`:  a page of a collection, one row, or not found. */
function swapiAnswer(route: Route): Promise<void> {
  const { pathname } = new URL(route.request().url())
  const [collection, id] = pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean)
  const rows = collection ? COLLECTIONS[collection] : undefined
  const json = (body: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) })
  if (!collection) return json(Object.fromEntries(Object.keys(COLLECTIONS).map((name) => [name, `${SWAPI}/${name}/`])))
  if (!rows) return route.fulfill({ status: 404, body: "{}" })
  if (!id) return json({ count: rows.length, next: null, previous: null, results: rows })
  const row = rows.find((each) => (each as { url: string }).url.endsWith(`/${collection}/${id}/`))
  return row ? json(row) : route.fulfill({ status: 404, body: "{}" })
}

/** What a draw and a read of the galaxy take, at most. */
const SETTLE_MS = 3000

describe.skipIf(!SERVING)("the Star Wars site's click-through", { timeout: 240_000 }, () => {
  let browser: Browser
  let page: Page

  /** What the site draws now, through each element's shadow root. */
  const shown = () =>
    page.evaluate(() => {
      const textIn = (node: Node): string =>
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent ?? "")
          : [...((node as Element).shadowRoot?.childNodes ?? []), ...node.childNodes].map(textIn).join(" ")
      const site = document.querySelector(".spell-site")
      return site ? textIn(site).replace(/\s+/g, " ").trim() : "(no site)"
    })

  /** The text inside the first `tag`, through its shadow roots:  `""` for none. */
  const textOf = (tag: string) =>
    page.evaluate((tag) => {
      const textIn = (node: Node): string =>
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent ?? "")
          : [...((node as Element).shadowRoot?.childNodes ?? []), ...node.childNodes].map(textIn).join(" ")
      let found: Element | undefined
      const find = (root: Document | ShadowRoot) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === tag) found ??= element
          if (element.shadowRoot) find(element.shadowRoot)
        }
      }
      find(document)
      return found ? textIn(found).replace(/\s+/g, " ").trim() : ""
    }, tag)

  /** The site's address, as the URL names it. */
  const address = () => new URL(page.url()).pathname.replace(`/run/${PROJECT}`, "") || "/"

  /** The site, shown. */
  const site = () => page.locator(".spell-site")

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 } })
    await context.route(`${SWAPI}/**`, swapiAnswer)
    page = await context.newPage()
    await page.goto(`${EDITOR}run/${PROJECT}/films`)
    await site().waitFor({ timeout: 60_000 })
    await page.waitForTimeout(SETTLE_MS)
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("wears the Mockup theme, inside the editor's own", async () => {
    const theme = await page.evaluate(() => {
      const find = (root: Document | ShadowRoot): Element | undefined => {
        for (const element of root.querySelectorAll("*")) {
          if (element.classList.contains("spell-site-frame")) return element
          const inside = element.shadowRoot && find(element.shadowRoot)
          if (inside) return inside
        }
        return undefined
      }
      return find(document)?.getAttribute("data-theme")
    })
    expect(theme).toBe("mockup")
  })

  test("the films page lists the films, and a title goes to its film's page", async () => {
    expect(await shown()).toContain("A New Hope")
    await site().locator("ui-link.film", { hasText: "A New Hope" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(address()).toBe("/films/1")
    const text = await shown()
    expect(text).toContain("It is a period of civil war.")
    expect(text).toContain("Luke Skywalker")
    expect(text).toContain("Tatooine")
  })

  test("a person opens in the sidebar, without leaving the page", async () => {
    await site().locator("ui-button.person", { hasText: "Luke Skywalker" }).click()
    await page.waitForTimeout(SETTLE_MS)
    const sidebar = await textOf("ui-flyout")
    expect(sidebar).toContain("Luke Skywalker")
    expect(sidebar).toContain("19BBY")
    expect(address()).toBe("/films/1")
    // its close icon
    await page.locator("ui-flyout button.close").click()
    await page.waitForTimeout(SETTLE_MS / 2)
    expect(await textOf("ui-flyout")).toBe("")
  })

  test("Add a review opens a dialog, and a saved review shows on the film's page", async () => {
    await site().locator("ui-button.add-review").click()
    await page.waitForTimeout(SETTLE_MS / 2)
    expect(await textOf("ui-modal")).toContain("Review A New Hope")
    await page.locator("ui-modal textarea").fill("Better every time.")
    await page.waitForTimeout(500)
    await page.locator("ui-modal ui-button.save-review").click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await textOf("ui-modal")).toBe("")
    expect(await shown()).toContain("5 of 5 · Better every time.")
  })

  test("the reviews page edits them like a spreadsheet, each change kept and undoable", async () => {
    await page.goto(`${EDITOR}run/${PROJECT}/reviews`)
    await site().waitFor({ timeout: 60_000 })
    await page.waitForTimeout(SETTLE_MS)
    const table = site().locator("ui-table table.editable")
    const headers = await table.locator("thead th").allTextContents()
    const column = (name: string) => headers.indexOf(name)
    expect(headers).toEqual(["film title", "stars", "words"])
    const row = table.locator("tbody tr", { hasText: "Better every time." })
    // the stars cell:  typed into, kept with Enter
    await row.locator("td").nth(column("stars")).click()
    await page.keyboard.type("3")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(SETTLE_MS / 2)
    expect(await row.locator("td").nth(column("stars")).textContent()).toBe("3")
    // a new review, typed into the empty last row
    const rowsBefore = await table.locator("tbody tr").count()
    await table.locator("tbody tr.new-row td").nth(column("words")).click()
    await page.keyboard.type("Typed in the table.")
    await page.keyboard.press("Enter")
    await page.waitForTimeout(SETTLE_MS / 2)
    expect(await table.locator("tbody tr", { hasText: "Typed in the table." }).count()).toBe(1)
    // ⌘Z takes the new one back out:  one step
    await table.locator("tbody tr", { hasText: "Typed in the table." }).locator("td").first().click()
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z")
    await page.waitForTimeout(SETTLE_MS / 2)
    expect(await table.locator("tbody tr", { hasText: "Typed in the table." }).count()).toBe(0)
    expect(await table.locator("tbody tr").count()).toBe(rowsBefore)
    await page.screenshot({ path: path.join(KIT, "app/build/p9-reviews.png") })
  })

  test("back goes back to the films", async () => {
    await page.goto(`${EDITOR}run/${PROJECT}/films`)
    await site().waitFor({ timeout: 60_000 })
    await page.goto(`${EDITOR}run/${PROJECT}/films/1`)
    await site().waitFor({ timeout: 60_000 })
    await page.goBack()
    await page.waitForTimeout(SETTLE_MS)
    expect(address()).toBe("/films")
    expect(await shown()).toContain("Directed by")
  })
})
