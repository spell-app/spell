/**
 * What a web server's lines say, really run:  compiled spell, on `core`, reading a fake server (epic `data` P18).
 * - Wrapped lists, next pages, an id that's an address, a number written as text, a type of several words.
 * - The whole of `spell place ingest`, which writes these lines:  `tests/spell/ingest/PlaceIngest.test.ts`.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { RestPlace } from "spell/places"
import { core } from "spell/parser/core"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/** A server, by address. */
function serve(routes: Record<string, unknown>): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push(url)
    const route = routes[url]
    return route === undefined ? new Response("no", { status: 404 }) : Response.json(route)
  })
  return asked
}

/** Each thing of `Class`, whole:  nothing compiled here reads its fields, so it would ask for none of them. */
async function read(Class: unknown): Promise<Array<Record<string, unknown>>> {
  delete (Class as { savedIn: { select?: unknown } }).savedIn.select
  return (await core.savedThings(Class as new () => unknown)).items as Array<Record<string, unknown>>
}

const HOST = "https://web.test"

afterEach(() => void vi.unstubAllGlobals())

describe("the lines", () => {
  test("compile, in either language, for the whole place", () => {
    const lines = [
      `stars is a web server at "${HOST}":`,
      `\t- its rows are its "results"`,
      `\t- its next page is its "next"`
    ]
    const { compiled, errors } = parseSpellProject([{ path: "/T.spell", contents: `${lines.join("\n")}\n` }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`rowsIn: "results"`)
    expect(compiled).toContain(`nextPageIn: "next"`)
    const es = [
      `estrellas es un servidor web en "${HOST}":`,
      `\t- sus filas están en "results"`,
      `\t- su página siguiente está en "next"`
    ]
    const spanish = parseSpellProject([{ path: "/T.es.spell", contents: `${es.join("\n")}\n` }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain(`nextPageIn: "next"`)
  })

  test("a list inside its answer, every page of it, with ids that are addresses", async () => {
    const asked = serve({
      [`${HOST}/moves`]: { next: `${HOST}/moves?page=2`, results: [{ name: "a", url: `${HOST}/moves/1` }] },
      [`${HOST}/moves?page=2`]: { next: null, results: [{ name: "b", url: `${HOST}/moves/2` }] }
    })
    core.resetRuntime()
    const { Move } = runSpell([
      `dex is a web server at "${HOST}":`,
      `\t- its id is its "url"`,
      `\t- its rows are its "results"`,
      `\t- its next page is its "next"`,
      `a "move" is a thing:`,
      `\t- it lives in the dex`,
      `\t- its "name" is text`
    ])("Move")
    const moves = await read(Move)
    expect(moves.map(({ name }) => name)).toEqual(["a", "b"])
    expect(moves.map(({ id }) => id)).toEqual([`${HOST}/moves/1`, `${HOST}/moves/2`])
    expect(asked).toHaveLength(2)
  })

  test("a number written as text reads as a number, a word for none as nothing;  anything else is nothing, warned of once;  a null is nothing (epic `data` P23)", async () => {
    serve({
      [`${HOST}/people`]: [
        { id: 1, height: "172", mass: "1,358", weird: "30-165", planet: null },
        { id: 2, height: "unknown", mass: "n/a", weird: "4", planet: "Tatooine" }
      ]
    })
    core.resetRuntime()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { Person } = runSpell([
      `stars is a web server at "${HOST}"`,
      `a "person" is a thing:`,
      `\t- it lives in the stars`,
      `\t- its "height" is a number`,
      `\t- its "mass" is a number`,
      `\t- its "weird" is a number`,
      `\t- its "planet" is text`
    ])("Person")
    const [first, second] = await read(Person)
    expect([first!.height, first!.mass, first!.weird]).toEqual([172, 1358, undefined])
    expect([second!.height, second!.mass, second!.weird]).toEqual([undefined, undefined, 4])
    expect(first!.planet).toBe("")
    expect(second!.planet).toBe("Tatooine")
    expect(warn.mock.calls.flat().join("\n")).toMatch(/weird/)
    expect(warn.mock.calls.flat().join("\n")).not.toMatch(/planet/)
    warn.mockRestore()
  })

  test("a type of several words finds what its line says", async () => {
    serve({ [`${HOST}/forms`]: [{ id: 1, name: "moss" }] })
    core.resetRuntime()
    const { LifeForm } = runSpell([
      `dex is a web server at "${HOST}":`,
      `\t- life forms live at "/forms"`,
      `a "life form" is a thing:`,
      `\t- it lives in the dex`,
      `\t- its "name" is text`
    ])("LifeForm")
    expect((await read(LifeForm)).map(({ name }) => name)).toEqual(["moss"])
  })

  test("a field by quoted words, for those the plain form stops at", () => {
    const { compiled, errors } = parseSpellProject([
      {
        path: "/T.spell",
        contents: `dex is a web server at "${HOST}":\n\t- a ship's "cost in credits" is its "cost_in_credits"\na "ship" is a thing:\n\t- it lives in the dex\n\t- its "cost in credits" is text\n`
      }
    ]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`costInCredits: "cost_in_credits"`)
  })
})

describe("RestPlace", () => {
  test("a thing whose id is an address is at that address", async () => {
    const asked = serve({ [`${HOST}/people/1`]: { url: `${HOST}/people/1`, name: "Luke" } })
    const place = new RestPlace({ url: HOST, allCollections: { fields: { id: "url" } } })
    const rows = await place.getMany("people", [`${HOST}/people/1`], {})
    // its id's field is still itself too (epic `data` P28)
    expect(rows).toEqual([{ id: `${HOST}/people/1`, url: `${HOST}/people/1`, name: "Luke" }])
    expect(asked).toEqual([`${HOST}/people/1`])
  })

  test("what's said of every collection gives way to a collection's own", async () => {
    serve({ [`${HOST}/a`]: { rows: [{ key: 1 }] }, [`${HOST}/b`]: { inside: [{ key: 2, name: "x" }] } })
    const place = new RestPlace({
      url: HOST,
      allCollections: { rowsAt: "rows", fields: { id: "key" } },
      collections: { b: { rowsAt: "inside", fields: { title: "name" } } }
    })
    expect((await place.list("a", {}, {})).rows).toEqual([{ id: 1, key: 1 }])
    expect((await place.list("b", {}, {})).rows).toEqual([{ id: 2, key: 2, title: "x" }])
  })
})

describe("a server that searches (epic `data` P26, T70)", () => {
  /** A place that searches names, a type in it, and a search for it, as a program writes them. */
  const SEARCHING = [
    `dex is a web server at "${HOST}":`,
    `\t- its rows are its "results"`,
    `\t- it searches names and titles with "search"`,
    `a "move" is a thing:`,
    `\t- it lives in the dex`,
    `\t- its "name" is text`,
    `\t- its "power" is a number`,
    `to find moves (words as text):`,
    `\treturn every move where its name includes words`
  ]

  test("a where it can search for asks the server, still checking what comes back;  no warning that it reads every page", () => {
    const { compiled, errors, warnings } = parseSpellProject([
      { path: "/T.spell", contents: `${SEARCHING.join("\n")}\n` }
    ]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`searches: { param: "search", fields: ["names", "titles"] }`)
    expect(compiled).toContain(
      `core.filter(await core.savedThings(Move, { search: { name: words } }, "looks through"), (move) => core.includes(move.name, words))`
    )
    expect(warnings.join("\n")).not.toContain("looks through them here")
  })

  test("a where on a field it doesn't search stays here, and says so", () => {
    const lines = [...SEARCHING.slice(0, -1), `\treturn every move where its power is more than 3`]
    const { compiled, warnings } = parseSpellProject([{ path: "/T.spell", contents: `${lines.join("\n")}\n` }])
      .files[0]!
    expect(compiled).not.toContain("search: {")
    expect(warnings.join("\n")).toContain("looks through them here")
  })

  test("in Spanish too", () => {
    const es = [
      `pokedex es un servidor web en "${HOST}":`,
      `\t- sus filas están en "results"`,
      `\t- busca nombres con "search"`
    ]
    const spanish = parseSpellProject([{ path: "/T.es.spell", contents: `${es.join("\n")}\n` }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain(`searches: { param: "search", fields: ["nombres"] }`)
  })

  test("when it runs, the text goes as the server's parameter, and one page comes back", async () => {
    const asked = serve({
      [`${HOST}/moves?search=sky`]: { results: [{ id: "1", name: "Skyfall" }] }
    })
    core.resetRuntime()
    const { Move } = runSpell(SEARCHING.slice(0, 6))("Move")
    delete (Move as { savedIn: { select?: unknown } }).savedIn.select
    const found = await core.savedThings(Move as new () => unknown, { search: { name: "sky" } })
    expect((found.items as Array<{ name: string }>).map(({ name }) => name)).toEqual(["Skyfall"])
    expect(asked).toEqual([`${HOST}/moves?search=sky`])
  })
})

describe("GitHub's way (epic `data` P28)", () => {
  /** A server whose answers carry headers:  each route its body and headers;  what's asked, with its key if any. */
  function serveWithHeaders(routes: Record<string, { body: unknown; headers?: Record<string, string> }>) {
    const asked: Array<{ url: string; key: string | null }> = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push({ url, key: new Headers(init?.headers).get("authorization") })
      const route = routes[url]
      return route === undefined ? new Response("no", { status: 404 }) : Response.json(route.body, route)
    })
    return asked
  }

  const LINES = [
    `github is a web server at "${HOST}":`,
    `\t- its key is the secret "GITHUB_TOKEN", if it's set`,
    `\t- its next page is in its "Link" header`,
    `\t- contributors live at "/repos/solidjs/solid/contributors"`,
    `a "contributor" is a thing:`,
    `\t- it lives in github`,
    `\t- its "login" is text`
  ]
  const PAGE_2 = `${HOST}/repositories/1/contributors?page=2`
  const ROUTES = {
    [`${HOST}/repos/solidjs/solid/contributors`]: {
      body: [{ id: 1, login: "ryansolid" }],
      headers: { link: `<${PAGE_2}>; rel="next", <${PAGE_2}>; rel="last"` }
    },
    [PAGE_2]: { body: [{ id: 2, login: "thetarnav" }], headers: { link: `<${HOST}/x?page=1>; rel="prev"` } }
  }

  test("the lines compile, in either language:  a key taken when it's set needs no server side", () => {
    const { compiled, errors, warnings } = parseSpellProject([{ path: "/G.spell", contents: `${LINES.join("\n")}\n` }])
      .files[0]!
    expect(errors).toEqual([])
    expect(String(warnings)).not.toMatch(/server side/)
    expect(compiled).toContain(`keyNamed: "GITHUB_TOKEN"`)
    expect(compiled).toContain(`keyIfSet: true`)
    expect(compiled).toContain(`nextPageInLink: true`)
    const es = [
      `github es un servidor web en "${HOST}":`,
      `\t- su clave es el secreto "GITHUB_TOKEN", si la hay`,
      `\t- su página siguiente está en su cabecera "Link"`
    ]
    const spanish = parseSpellProject([{ path: "/G.es.spell", contents: `${es.join("\n")}\n` }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain(`keyIfSet: true`)
    expect(spanish.compiled).toContain(`nextPageInLink: true`)
  })

  test("a next page in any other header won't compile, saying so;  a key it can't do without still needs a server side", () => {
    const lines = [`github is a web server at "${HOST}":`, `\t- its next page is in its "X-Next" header`]
    const { errors } = parseSpellProject([{ path: "/G.spell", contents: `${lines.join("\n")}\n` }]).files[0]!
    expect(errors.join("\n")).toMatch(/said in a "Link" header, not "X-Next"/)
    const needed = [`github is a web server at "${HOST}":`, `\t- its key is the secret "GITHUB_TOKEN"`]
    const { warnings } = parseSpellProject([{ path: "/G.spell", contents: `${needed.join("\n")}\n` }]).files[0]!
    expect(String(warnings)).toMatch(/needs a small server side/)
  })

  test("every page, by its Link header;  with no key set, each request goes without", async () => {
    const asked = serveWithHeaders(ROUTES)
    core.resetRuntime()
    const { Contributor } = runSpell(LINES)("Contributor")
    expect((await read(Contributor)).map(({ login }) => login)).toEqual(["ryansolid", "thetarnav"])
    expect(asked.map(({ url }) => url)).toEqual([`${HOST}/repos/solidjs/solid/contributors`, PAGE_2])
    expect(asked.map(({ key }) => key)).toEqual([null, null])
  })

  test("with the key set where it runs, it goes on each request", async () => {
    const asked = serveWithHeaders(ROUTES)
    core.resetRuntime().keyFrom = (name) => (name === "GITHUB_TOKEN" ? "t0ken" : undefined)
    const { Contributor } = runSpell(LINES)("Contributor")
    await read(Contributor)
    expect(asked.map(({ key }) => key)).toEqual(["Bearer t0ken", "Bearer t0ken"])
  })

  test("a field that's its id is still itself too:  a user's login", async () => {
    serveWithHeaders({ [`${HOST}/users/ryansolid`]: { body: { login: "ryansolid", name: "Ryan" } } })
    core.resetRuntime()
    const { User } = runSpell([
      `github is a web server at "${HOST}":`,
      `\t- users are found at "/users/{name}"`,
      `\t- a user's id is its "login"`,
      `a "user" is a thing:`,
      `\t- it lives in github`,
      `\t- its "login" is text`,
      `\t- its "name" is text`
    ])("User")
    const user = (await core.savedThingWithId(User as never, "ryansolid")) as unknown as Record<string, unknown>
    expect([user.id, user.login, user.name]).toEqual(["ryansolid", "ryansolid", "Ryan"])
  })
})
