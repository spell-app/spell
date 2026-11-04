/**
 * What a web server's lines say, really run:  compiled spell, on `core`, reading a fake server (epic `data` P18).
 * - Wrapped lists, next pages, an id that's an address, a number written as text, a type of several words.
 * - The whole of `spell place ingest`, which writes these lines:  `tests/spell/ingest/PlaceIngest.test.ts`.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { RestPlace } from "spell/util/places"
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
    expect(rows).toEqual([{ id: `${HOST}/people/1`, name: "Luke" }])
    expect(asked).toEqual([`${HOST}/people/1`])
  })

  test("what's said of every collection gives way to a collection's own", async () => {
    serve({ [`${HOST}/a`]: { rows: [{ key: 1 }] }, [`${HOST}/b`]: { inside: [{ key: 2, name: "x" }] } })
    const place = new RestPlace({
      url: HOST,
      allCollections: { rowsAt: "rows", fields: { id: "key" } },
      collections: { b: { rowsAt: "inside", fields: { title: "name" } } }
    })
    expect((await place.list("a", {}, {})).rows).toEqual([{ id: 1 }])
    expect((await place.list("b", {}, {})).rows).toEqual([{ id: 2, title: "x" }])
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
