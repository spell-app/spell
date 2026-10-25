/**
 * Tests of the Epics page's routes, over HTTP, in a scratch checkout:
 * - a future epic made from the page (New epic)
 * - the favourites (a card's star)
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import epicRoutes, { FROM_PAGE, epicName, newEpic, setFavorite } from "spell-epic/tool/epicRoutes"

const root = mkdtempSync(join(tmpdir(), "epic-routes-"))
mkdirSync(join(root, "epics"))
// the scratch checkout has no docs tools:  the docs index isn't rebuilt, and says so on stderr
vi.spyOn(process.stderr, "write").mockImplementation(() => true)

afterAll(() => rmSync(root, { recursive: true, force: true }))

test("an epic's name:  the title, lower-kebab-cased;  a reserved word gets `-epic`", () => {
  expect(epicName("Docs Index:  the Second Go!")).toBe("docs-index-the-second-go")
  expect(epicName("Review")).toBe("review-epic")
  expect(() => epicName("!!!")).toThrow(/nothing to name/)
})

test("makes a future epic with the prompt quoted, its log saying it came from the page;  a taken name gets `-2`", async () => {
  expect(await newEpic(root, "Phone Review", "Review epic pages from my phone.")).toBe("phone-review")
  const html = readFileSync(join(root, "epics", "phone-review", "phone-review.plan.html"), "utf8")
  expect(html).toMatch(/<epic-page[^>]*\bfuture\b/)
  expect(html).toContain("Review epic pages from my phone.")
  expect(readFileSync(join(root, "epics", "phone-review", "parts", "log.html"), "utf8")).toContain(FROM_PAGE)
  expect(await newEpic(root, "Phone Review", "")).toBe("phone-review-2")
})

////////////////
// ## Favorites (epic `airplane` P8)
////////////////

describe("POST /api/epics/favorite", () => {
  let server: PageServer
  let port: number

  beforeAll(async () => {
    server = new PageServer({ root })
    await epicRoutes.setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => server.stop())

  /** POST `body` from a page this server served (its token, its origin);  the status and the answer */
  async function star(body: unknown, token = server.web.guard.token) {
    const answer = await ask(port, "POST", "/api/epics/favorite", {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-server-token": token, origin: `http://127.0.0.1:${port}` }
    })
    return { status: answer.status, body: JSON.parse(answer.text) }
  }

  test("stars and unstars into ONE shared file, sorted, written whole;  answers every favourite", async () => {
    const file = join(root, "epics", "favorites.json5")
    expect(await star({ name: "seo", favorite: true })).toEqual({ status: 200, body: { favorites: ["seo"] } })
    expect((await star({ name: "airplane", favorite: true })).body).toEqual({ favorites: ["airplane", "seo"] })
    // starring twice is still one
    expect((await star({ name: "seo", favorite: true })).body).toEqual({ favorites: ["airplane", "seo"] })
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(["airplane", "seo"])
    expect((await star({ name: "seo", favorite: false })).body).toEqual({ favorites: ["airplane"] })
    expect(await setFavorite(root, "airplane", false)).toEqual([])
    expect(readFileSync(file, "utf8")).toBe("[]\n")
    // written through the one safe write:  no temp file or lock left beside it
    expect(readdirSync(join(root, "epics")).filter((name) => /\.(tmp|lock)$/.test(name))).toEqual([])
  })

  // Owen, 2026-10-13:  "There is no easy way to get to a "decisions" or "details" pages from an epic"
  test("GET pages:  the epic's own details and choice pages, titled, newest first;  none without the folder", async () => {
    const details = join(root, "epics", "seo", "details")
    mkdirSync(details, { recursive: true })
    writeFileSync(join(details, "names.html"), "<title>Boolean names</title>")
    writeFileSync(join(details, "names.rows.json5"), "{}")
    writeFileSync(join(details, "names.answer.json5"), "{}")
    writeFileSync(join(details, "bare.html"), "<p>no title</p>")
    const answer = await ask(port, "GET", "/api/epics/pages?epic=seo")
    const { pages } = JSON.parse(answer.text) as { pages: { href: string; title: string; kind: string }[] }
    const byHref = (a: string[], b: string[]) => a[0]!.localeCompare(b[0]!)
    expect(pages.map(({ href, title, kind }) => [href, title, kind]).sort(byHref)).toEqual([
      ["details/bare.html", "bare", "details"],
      ["details/names.html", "Boolean names", "choices"]
    ])
    expect(JSON.parse((await ask(port, "GET", "/api/epics/pages?epic=nothing-here")).text)).toEqual({
      pages: [],
      saga: null
    })
    expect((await ask(port, "GET", "/api/epics/pages?epic=../etc")).status).toBe(400)
  })

  // epic `epic-workflow` P15:  `<epic-page>` links the saga by its title
  test("GET pages:  the saga the epic page names, from the sagas' list;  null for none, or one not in it", async () => {
    mkdirSync(join(root, "sagas"), { recursive: true })
    writeFileSync(
      join(root, "sagas", "sagas.json5"),
      JSON.stringify({ sagas: [{ id: "epics", title: "Epic Tooling", purpose: "epics" }] })
    )
    const page = join(root, "epics", "named", "named.plan.html")
    mkdirSync(join(root, "epics", "named"), { recursive: true })
    writeFileSync(page, `<epic-page epic="named" title="Named"\n  saga="epics"></epic-page>`)
    const sagaOf = async () => JSON.parse((await ask(port, "GET", "/api/epics/pages?epic=named")).text).saga
    expect(await sagaOf()).toEqual({
      id: "epics",
      title: "Epic Tooling",
      purpose: "epics",
      href: "../../sagas/epics/epics.saga.html"
    })
    writeFileSync(page, `<epic-page epic="named" title="Named" saga="gone"></epic-page>`)
    expect(await sagaOf()).toBeNull()
  })

  // epic `epic-engine` P4:  the run's summary card asks for the next epic to test
  test("GET tests:  every epic with open tests, Owen's saga order;  no token needed", async () => {
    const page = (name: string, saga: string, items: string) => {
      mkdirSync(join(root, "epics", name), { recursive: true })
      const html = `<epic-page epic="${name}" title="${name}" saga="${saga}">${items}</epic-page>`
      writeFileSync(join(root, "epics", name, `${name}.plan.html`), html)
    }
    page("tested", "epics", '<epic-item id="m1" title="a" status="open"></epic-item>')
    page("passed", "epics", '<epic-item id="m1" title="a" status="done"></epic-item>')
    const answer = await ask(port, "GET", "/api/epics/tests")
    expect(answer.status).toBe(200)
    expect(JSON.parse(answer.text)).toEqual([
      {
        epic: "tested",
        title: "tested",
        saga: "epics",
        open: 1,
        page: "/epics/tested/tested.plan.html",
        href: "../tested/tested.plan.html"
      }
    ])
  })

  // epic `epic-engine` I45:  a server that says which content folder it serves (the epic server, a demo's) is read
  test("GET tests:  from the content folder the server says it serves, not the checkout's", async () => {
    const other = join(root, "other-content")
    mkdirSync(join(other, "epics", "copy"), { recursive: true })
    writeFileSync(
      join(other, "epics", "copy", "copy.plan.html"),
      '<epic-page epic="copy" title="Copy"><epic-item id="m1" title="a" status="open"></epic-item></epic-page>'
    )
    const served = new PageServer({ root })
    await epicRoutes.setup({ ...served.routeContext(), content: other } as Parameters<typeof epicRoutes.setup>[0])
    await served.start({ port: 0, routes: false, pidFile: false })
    try {
      const answer = JSON.parse((await ask(served.info.port, "GET", "/api/epics/tests")).text)
      expect(answer.map((each: { epic: string }) => each.epic)).toEqual(["copy"])
    } finally {
      await served.stop()
    }
  })

  test("refuses a name that isn't an epic's, a missing flag, and a write without the token", async () => {
    expect((await star({ name: "../etc", favorite: true })).status).toBe(400)
    expect((await star({ name: "seo" })).status).toBe(400)
    expect((await star({ name: "seo", favorite: true }, "forged")).status).toBe(403)
  })
})
