import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"
import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { PlaceIngest, descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceIngest"
import { PoliteReader, READER_NAME } from "spell/parser/spell/ingest/PoliteReader"
import {
  IngestStopped,
  type IngestFiles,
  type IngestSettings,
  type PlaceDescription
} from "spell/parser/spell/ingest/ingest.types"
import type { ClaudeRunner } from "spell/parser/spell/translate/translate.types"

/**
 * `spell place ingest`'s steps (epic `data` P18):  against a source a test writes, and the demo's real servers, with a stubbed agent.
 * - Every read through the Spell really runs:  `readThroughSpell()`, compiled spell on `core`, as the command does.
 */

const API = "https://stars.test/api"

const LUKE = {
  name: "Luke",
  height: "172",
  mass: "77",
  hair_color: "blond",
  homeworld: `${API}/planets/1`,
  films: [`${API}/films/1`],
  created: "2014-12-09T13:50:51.644000Z",
  url: `${API}/people/1`
}
const LEIA = { ...LUKE, name: "Leia", height: "unknown", url: `${API}/people/2`, homeworld: null }
const TATOOINE = { name: "Tatooine", population: "200000", url: `${API}/planets/1` }

/** A source shaped like swapi.info:  an index, lists with no paging, ids only in `url`, numbers as text, links by address. */
const STARS: Record<string, unknown> = {
  [API]: { people: `${API}/people`, planets: `${API}/planets` },
  [`${API}/people`]: [LUKE, LEIA],
  [`${API}/planets`]: [TATOOINE]
}

/** A `fetch` over `routes`, by address, noting what's asked;  a route that's a function answers for itself. */
function fakeFetch(routes: Record<string, unknown>) {
  const asked: Array<{ url: string; method: string; headers: Headers; body?: string }> = []
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`.replace(
      /[?#].*$/,
      ""
    )
    asked.push({
      url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      ...(typeof init?.body === "string" && { body: init.body })
    })
    const route = routes[url]
    if (route === undefined) return new Response("nope", { status: 404 })
    if (route instanceof Response) return route.clone()
    return Response.json(route, {
      headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" }
    })
  }) as typeof globalThis.fetch
  return { fetch, asked }
}

/**
 * Files in memory.
 * - `descriptions` holds each one as it's read back, so a test changes it as a person would the file:
 *   written and read through the shape on disk, `allCollections` and all.
 */
function memoryFiles(start: Record<string, string> = {}) {
  const texts = new Map(Object.entries(start))
  const descriptions = new Map<string, PlaceDescription>()
  const listed: Array<{ file: string; path: string }> = []
  const files: IngestFiles = {
    read: async (path) => texts.get(path),
    write: async (path, text) => void texts.set(path, text),
    readDescription: async (path) => {
      const held = descriptions.get(path)
      return held && descriptionOnDisk(held)
    },
    writeDescription: async (path, description) =>
      void descriptions.set(path, descriptionFromDisk(structuredClone(description))),
    listInProject: async (file, path) => void listed.push({ file, path }),
    otherSpellBeside: async (path) => [...texts].filter(([other]) => other !== path).map(([, text]) => text)
  }
  return { files, texts, descriptions, listed }
}

/** A `PlaceIngest` on a fake source, with no agent, and no one to ask. */
function ingestOf(routes: Record<string, unknown>, more: Partial<IngestSettings> = {}, start?: Record<string, string>) {
  const { fetch, asked } = fakeFetch(routes)
  const disk = memoryFiles(start)
  const ingest = new PlaceIngest({
    fetch,
    ask: async () => undefined,
    files: disk.files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-10-31T12:00:00Z"),
    ...more
  })
  return { ingest, asked, ...disk }
}

const STARS_SPELL = `stars is a web server at "${API}":
	- its id is its "url"
	- check it every 30 seconds
	- it writes names like "hair_color"
	- people live at "/people"
	- planets live at "/planets"

a "person" is a thing:
	- it lives in stars
	- its "name" is text
	- its "height" is a number or "unknown"
	- its "mass" is a number
	- its "hair color" is text
	- its "homeworld" is a planet
	- its "films" is a list of text  // each an address
	- its "created" is a date

a "planet" is a thing:
	- it lives in stars
	- its "name" is text
	- its "population" is a number`

describe("adding a source", () => {
  test("its description is written once beside it, what every collection shares in allCollections, and named in the project", async () => {
    const { ingest, descriptions, listed } = ingestOf(STARS)
    await ingest.add({ address: API, into: "/Stars.api.spell", name: "stars" })
    expect([...descriptions.keys()]).toEqual(["/Stars.api.json5"])
    expect(listed).toEqual([{ file: "/Stars.api.spell", path: "/Stars.api.json5" }])
    const onDisk = descriptionOnDisk(descriptions.get("/Stars.api.json5")!)
    expect(onDisk.allCollections).toMatchObject({ idField: "url", idIsAnAddress: true })
    expect(onDisk.collections.people).not.toHaveProperty("idField")
    expect(onDisk.collections.people).toMatchObject({ type: "person", at: "/people" })
    // a collection's own setting wins over what they all share
    const back = descriptionFromDisk({
      ...onDisk,
      collections: { ...onDisk.collections, people: { ...onDisk.collections.people, idField: "name" } }
    })
    expect(back.collections.people!.idField).toBe("name")
    expect(back.collections.planets!.idField).toBe("url")
  })

  test("a field every row sent the same no, 0 or empty is filled;  one sent as nothing isn't (epic `data` I53)", async () => {
    // the look sees a closing date;  the read through the Spell, none
    let isReading = false
    const rows = () =>
      [1, 2].map((id) => ({
        id,
        title: `Issue ${id}`,
        locked: false,
        comments: 0,
        body: "",
        closed_at: isReading ? null : "2026-11-01T10:00:00Z"
      }))
    const routes = { [API]: { issues: `${API}/issues` } }
    Object.defineProperty(routes, `${API}/issues`, { get: rows, enumerable: true })
    const { ingest } = ingestOf(routes, {
      readThrough: (asked) => {
        isReading = true
        return readThroughSpell(asked)
      }
    })
    const { description } = await ingest.add({ address: API, into: "/I.spell", name: "issues place" })
    const notes = description.notes.join("\n")
    expect(notes).not.toMatch(/"(?:locked|comments|body)"/)
    expect(notes).toMatch(/No row read filled issue's "closedAt"/)
  })

  test("what swapi.info's shape needs:  links, numbers as text, ids only in an address, several collections", async () => {
    const { ingest, texts, descriptions } = ingestOf(STARS)
    const result = await ingest.add({ address: `${API}/`, into: "/Stars.spell", name: "stars" })
    expect(result.spell).toBe(STARS_SPELL)
    expect(texts.get("/Stars.spell")).toBe(`${STARS_SPELL}\n`)
    expect(result.descriptionPath).toBe("/Stars.json5")
    const description = descriptions.get("/Stars.json5")!
    expect(description.about).toMatchObject({ kind: "web server", address: API, lookedAt: "2026-10-31T12:00:00.000Z" })
    expect(description.about.fingerprint).toMatch(/^[0-9a-f]{16}$/)
    expect(description.about.version).toBeUndefined()
    expect(description.collections.people!.idField).toBe("url")
    expect(description.collections.people!.fields.homeworld).toMatchObject({ type: "link", linksTo: "planets" })
    expect(description.collections.people!.fields.height).toMatchObject({
      type: "number",
      writtenAsText: true,
      noNumberWords: ["unknown"]
    })
    expect(description.collections.people!.readThrough).toEqual({ rows: 2 })
    expect(description.canDo.write).toMatch(/read only/)
    expect(description.spellCantSay.join("\n")).not.toMatch(/people\.homeworld/)
    expect(description.spellCantSay.join("\n")).toMatch(/A link to somewhere else:  .*people\.films/)
    expect(description.spell.join("\n")).toBe(STARS_SPELL)
  })

  test("a search it can do is found by trying one, read only, and said in a line (epic `data` P26)", async () => {
    const people = [
      { name: "Luke Skywalker", url: `${API}/people/1/` },
      { name: "Leia Organa", url: `${API}/people/2/` },
      { name: "Han Solo", url: `${API}/people/3/` }
    ]
    const asked: string[] = []
    const fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(`${input instanceof Request ? input.url : input}`)
      asked.push(url.href)
      if (url.pathname === "/api") return Response.json({ people: `${API}/people/` })
      if (url.pathname !== "/api/people") return new Response("nope", { status: 404 })
      const search = url.searchParams.get("search")?.toLowerCase()
      const results = search === undefined ? people : people.filter(({ name }) => name.toLowerCase().includes(search))
      return Response.json({ count: results.length, next: null, results })
    }) as typeof globalThis.fetch
    const { ingest, descriptions } = ingestOf({}, { fetch })
    const { spell } = await ingest.add({ address: API, into: "/P.spell", name: "people place" })
    expect(spell).toContain(`- it searches names with "search"`)
    expect(descriptions.get("/P.json5")!.collections.people!.searchedBy).toEqual({ param: "search", field: "name" })
    expect(asked).toContain(`${API}/people?search=luke`)
  })

  test("a list kept inside its answer, with pages:  a few read, and the new lines say where", async () => {
    const page = (results: object[], next: string | null) => ({ count: 900, next, previous: null, results })
    const routes = {
      [API]: { moves: `${API}/moves/` },
      [`${API}/moves`]: page([{ name: "a", url: `${API}/moves/1/` }], `${API}/moves2`),
      [`${API}/moves2`]: page([{ name: "b", url: `${API}/moves/2/` }], `${API}/moves3`),
      [`${API}/moves3`]: page([{ name: "c", url: `${API}/moves/3/` }], `${API}/moves4`),
      [`${API}/moves4`]: page([{ name: "d", url: `${API}/moves/4/` }], null)
    }
    const { ingest, descriptions } = ingestOf(routes)
    const { spell } = await ingest.add({ address: API, into: "/M.spell", name: "moves place" })
    expect(spell).toContain(`- its rows are its "results"`)
    expect(spell).toContain(`- its next page is its "next"`)
    expect(spell).toContain(`- its id is its "url"`)
    const moves = descriptions.get("/M.json5")!.collections.moves!
    expect(moves).toMatchObject({ rowsSeen: 3, rowsItSays: 900, paging: "next field" })
    expect(moves.readThrough).toEqual({ rows: 1 })
  })

  test("a list led to another address answers from there:  its line says so, one request a read, not two", async () => {
    const rows = [
      { url: `${API}/people/1/`, name: "Luke" },
      { url: `${API}/people/2/`, name: "Leia" }
    ]
    const { fetch: plain } = fakeFetch({ [API]: { people: `${API}/people` }, [`${API}/people/`]: rows })
    // `/people` answers from `/people/`, as a redirect does:  the answer says where it came from
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = `${input instanceof Request ? input.url : input}`.replace(/[?#].*$/, "")
      const moved = url === `${API}/people` ? `${API}/people/` : undefined
      const answer = await plain(moved ?? input, init)
      if (moved) Object.defineProperty(answer, "url", { value: moved })
      return answer
    }) as typeof globalThis.fetch
    const { ingest, descriptions } = ingestOf({}, { fetch })
    const { spell } = await ingest.add({ address: API, into: "/S.spell", name: "stars" })
    expect(spell).toContain(`- people live at "/people/"`)
    const description = descriptions.get("/S.json5")!
    expect(description.collections.people!.at).toBe("/people/")
    expect(description.notes.join("\n")).toMatch(/answered from \/people\/, not \/people/)
  })

  test("the collections it was asked for are the ones it looks at again", async () => {
    const page = (name: string) => [{ url: `${API}/${name}/1`, name }]
    const routes = {
      [API]: { films: `${API}/films`, people: `${API}/people` },
      [`${API}/films`]: page("films"),
      [`${API}/people`]: page("people")
    }
    const { ingest, descriptions } = ingestOf(routes)
    await ingest.add({ address: API, into: "/F.spell", name: "stars", collections: ["films"] })
    expect(descriptions.get("/F.json5")!.about.collectionsAsked).toEqual(["films"])
    const again = await ingest.update("/F.spell")
    expect(Object.keys(again.description.collections)).toEqual(["films"])
  })

  test("an address that answers nothing itself is a web server, when a collection under it answers", async () => {
    const routes = { [`${API}/page/summary/Hoth`]: { title: "Hoth", extract: "Cold." } }
    const { ingest } = ingestOf(routes)
    const { description } = await ingest.add({
      address: API,
      into: "/H.spell",
      name: "wiki",
      collections: ["wiki pages=/page/summary/{name}"],
      samples: ["Hoth"]
    })
    expect(description.about.kind).toBe("web server")
  })

  test("a collection found by name, with no list:  read by the names given, its id the field holding them", async () => {
    const page = (title: string, pageid: number) => ({
      type: "standard",
      title,
      pageid,
      namespace: { id: 0, text: "" },
      extract: `${title} is somewhere.`
    })
    const routes = {
      [`${API}/page/summary/Tatooine`]: page("Tatooine", 1),
      [`${API}/page/summary/Hoth`]: page("Hoth", 2)
    }
    const { ingest, descriptions } = ingestOf(routes)
    const { spell } = await ingest.add({
      address: API,
      kind: "web server",
      into: "/W.spell",
      name: "wiki",
      collections: ["wiki pages=/page/summary/{name}"],
      samples: ["Tatooine", "Hoth"]
    })
    expect(spell).toContain(`- wiki pages are found at "/page/summary/{name}"`)
    expect(spell).toContain(`- its id is its "title"`)
    expect(spell).toContain(`- its "title" is text`)
    expect(spell).toContain(`- its "kind" is text, stored as "type"`)
    expect(spell).toContain(`- its "number" is a number, stored as "id"`)
    const pages = descriptions.get("/W.json5")!.collections.wiki_pages!
    expect(pages).toMatchObject({ samples: ["Tatooine", "Hoth"], readThrough: { rows: 1 } })
  })

  test("Open Library's way (epic `data` P29):  books only by a search, authors linked by their ids, covers on another server", async () => {
    const COVERS = "https://covers.test/b/id/{id}-M.jpg"
    const books = [
      { key: "/works/OL1W", title: "Dune", author_key: ["OL1A"], cover_i: 7 },
      { key: "/works/OL2W", title: "Dune Messiah", author_key: ["OL1A"], cover_i: 8 }
    ]
    const answers: Record<string, () => Response> = {
      [`${API}/search.json?q=dune`]: () => Response.json({ numFound: 2, docs: books }),
      [`${API}/search.json`]: () => Response.json({ numFound: 0, docs: [] }),
      [`${API}/authors/OL1A.json`]: () => Response.json({ key: "/authors/OL1A", name: "Frank Herbert" }),
      ["https://covers.test/b/id/7-M.jpg"]: () => new Response("jpeg", { headers: { "content-type": "image/jpeg" } })
    }
    const asked: string[] = []
    const fetch = (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push(url)
      return answers[url]?.() ?? new Response("nope", { status: 404 })
    }) as typeof globalThis.fetch
    const { ingest, descriptions } = ingestOf({}, { fetch })
    const { spell } = await ingest.add({
      address: API,
      kind: "web server",
      into: "/L.spell",
      name: "library",
      collections: ["books=/search.json?q=dune", "authors=/authors/{name}.json"],
      samples: ["authors=OL1A"],
      pictures: [`cover_i=${COVERS}`]
    })
    expect(spell).toContain(`- books are searched at "/search.json"`)
    expect(spell).toContain(`- it searches titles with "q"`)
    // what's said of lists is said of those that list:  authors are read one at a time
    expect(spell).toContain(`- its rows are its "docs"`)
    expect(spell).toContain(`- authors are found at "/authors/{name}.json"`)
    expect(spell).toContain(`- its "authors" is a list of authors, stored as "author_key"`)
    expect(spell).toContain(`- a book's "cover i" is a picture at "${COVERS}"`)
    expect(spell).toContain(`- its "cover i" is text  // a picture's address`)
    const { collections, about } = descriptions.get("/L.json5")!
    expect(collections.books).toMatchObject({ searchedOnly: true, searchedFor: "dune", readThrough: { rows: 2 } })
    expect(collections.authors).toMatchObject({ samples: ["OL1A"], readThrough: { rows: 1 } })
    expect(about.picturesAsked).toEqual([`cover_i=${COVERS}`])
    // the read through searched, as a program has to
    expect(asked.filter((url) => url.startsWith(`${API}/search.json`))).toEqual([
      `${API}/search.json?q=dune`,
      `${API}/search.json`,
      `${API}/search.json?q=dune`
    ])
  })

  test("Open-Meteo's way (epic `data` P33):  one thing asked for by a query, its hours lists side by side, in the units it names", async () => {
    const WEATHER = "https://weather.test"
    const forecast = {
      latitude: 52.5126,
      longitude: 13.4195,
      timezone: "Europe/Berlin",
      hourly_units: { time: "iso8601", temperature_2m: "°C", precipitation: "mm", relative_humidity_2m: "%" },
      hourly: {
        time: ["2026-11-05T00:00", "2026-11-05T01:00"],
        temperature_2m: [6.2, 5.5],
        precipitation: [0, 0.4],
        relative_humidity_2m: [80, 82]
      }
    }
    const asked: string[] = []
    const fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(`${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`)
      asked.push(url.href)
      // it can't answer without where it's for;  the hours it's asked for it answers without
      const hasWhere = url.searchParams.has("latitude") && url.searchParams.has("longitude")
      if (url.pathname !== "/v1/forecast") return new Response("nope", { status: 404 })
      return hasWhere ? Response.json(forecast) : Response.json({ error: true }, { status: 400 })
    }) as typeof globalThis.fetch
    const { ingest, descriptions } = ingestOf({}, { fetch })
    const { spell } = await ingest.add({
      address: WEATHER,
      kind: "web server",
      into: "/W.spell",
      name: "weather",
      collections: ["forecasts=/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation"]
    })
    expect(spell).toContain(`- forecasts live at "/v1/forecast?hourly=temperature_2m,precipitation"`)
    expect(spell).toContain(`- forecasts are asked for by their latitude and longitude`)
    expect(spell).toContain(`- its "hours" is a list of hours, stored as "hourly"`)
    expect(spell).toContain(`- its "temperature" is a temperature in °C, stored as "temperature_2m"`)
    expect(spell).toContain(`- its "precipitation" is a length in mm`)
    // a unit Spell has no dimension for is said beside it
    expect(spell).toContain(`- its "relative humidity" is a number, stored as "relative_humidity_2m"  // in %`)
    expect(spell).not.toContain(`hourly units`)
    const { collections, spellCantSay } = descriptions.get("/W.json5")!
    expect(collections.forecasts).toMatchObject({
      askedBy: { latitude: "52.52", longitude: "13.41" },
      readThrough: { rows: 1 }
    })
    expect(collections.forecasts!.fields.hourly).toMatchObject({ words: "hours", isSideBySide: true })
    expect(spellCantSay.join("\n")).not.toMatch(/hourly_units/)
    // the read through asked where it's for, as a program has to
    expect(asked.at(-1)).toBe(
      `${WEATHER}/v1/forecast?hourly=temperature_2m,precipitation&latitude=52.52&longitude=13.41`
    )
  })

  test("REST Countries' way (epic `data` P35):  every country at once, each map by a code a list of things with its code", async () => {
    const COUNTRIES = "https://countries.test"
    const france = {
      name: { common: "France", native: { fra: { official: "République française", common: "France" } } },
      ccn3: "250",
      currencies: { EUR: { name: "Euro", symbol: "€" } },
      languages: { fra: "French" },
      latlng: { lat: 46, lng: 2 },
      idd: { root: "+3", suffixes: ["3"] }
    }
    const aruba = {
      name: {
        common: "Aruba",
        native: { nld: { official: "Aruba", common: "Aruba" }, pap: { official: "Aruba", common: "Aruba" } }
      },
      ccn3: "533",
      currencies: { AWG: { name: "Aruban florin", symbol: "ƒ" } },
      languages: { nld: "Dutch", pap: "Papiamento" },
      latlng: { lat: 12.5, lng: -69.97 },
      idd: { root: "+2", suffixes: ["97"] }
    }
    const afghanistan = { ...aruba, ccn3: "004", currencies: { AFN: { name: "Afghan afghani", symbol: "؋" } } }
    const fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(`${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`)
      return url.pathname === "/countries.json"
        ? Response.json([france, aruba, afghanistan])
        : new Response("nope", { status: 404 })
    }) as typeof globalThis.fetch
    const { ingest, descriptions } = ingestOf({}, { fetch })
    const { spell } = await ingest.add({
      address: COUNTRIES,
      kind: "web server",
      into: "/C.spell",
      name: "world",
      collections: ["countries=/countries.json"]
    })
    // each code a thing's own, not a type of its own:  `EUR`, `fra`
    expect(spell).toContain(`- its "currencies" is a list of currencies`)
    expect(spell).toContain(`- its "languages" is a list of languages`)
    expect(spell).toContain(`- its "native" is a list of natives`)
    expect(spell).toMatch(
      /a "currency" is a thing:\n\t- its "code" is text\n\t- its "name" is text\n\t- its "symbol" is text/
    )
    expect(spell).toMatch(/a "language" is a thing:\n\t- its "code" is text\n\t- its "name" is text/)
    expect(spell).not.toMatch(/"EUR"|"fra" is|"nld" is/)
    // a thing's few fields, the same in every row, are its fields
    expect(spell).toContain(`- its "lat" is a number`)
    // a code in digits stays text:  `004`, `+3`
    expect(spell).toContain(`- its "ccn3" is text`)
    expect(spell).toContain(`- its "root" is text`)
    const { collections } = descriptions.get("/C.json5")!
    expect(collections.countries).toMatchObject({ paging: "none", readThrough: { rows: 3 } })
    expect(collections.countries!.fields.currencies).toMatchObject({ isListInside: true, isByCode: true })
  })

  test("a list of names, each whole at its address, PokéAPI's way:  read whole, inside things in words", async () => {
    const at = (path: string) => `${API}${path}`
    const pikachu = {
      id: 25,
      name: "pikachu",
      weight: 60,
      types: [{ slot: 1, type: { name: "electric", url: at("/type/13/") } }],
      stats: [{ base_stat: 90, stat: { name: "speed", url: at("/stat/6/") } }],
      abilities: [{ is_hidden: true, ability: { name: "static", url: at("/ability/9/") } }],
      sprites: {
        front_default: "f.png",
        versions: Object.fromEntries(["i", "ii", "iii", "iv"].map((n) => [`generation-${n}`, { x: {} }]))
      },
      location_area_encounters: at("/pokemon/25/encounters")
    }
    const routes = {
      [API]: { pokemon: at("/pokemon/"), type: at("/type/") },
      [at("/pokemon")]: {
        count: 1351,
        next: at("/pokemon/more?offset=1&limit=1"),
        results: [{ name: "pikachu", url: at("/pokemon/25/") }]
      },
      [at("/pokemon/more")]: { count: 1351, next: null, results: [{ name: "raichu", url: at("/pokemon/26/") }] },
      [at("/pokemon/25/")]: pikachu,
      [at("/type")]: { count: 21, next: null, results: [{ name: "electric", url: at("/type/13/") }] },
      [at("/type/13/")]: { id: 13, name: "electric" }
    }
    const { ingest, descriptions } = ingestOf(routes)
    const { spell } = await ingest.add({ address: API, into: "/P.spell", name: "poke api" })
    expect(spell).toContain(`- its lists give only each one's "name"`)
    expect(spell).toContain(`- it gives up to 2000 at a time`)
    expect(spell).toContain(`- its id is its "url"`)
    expect(spell).toContain(`- its "number" is a number, stored as "id"`)
    expect(spell).toContain(`- its "weight" is a number`)
    expect(spell).toContain(`- its "types" is a list of pokemon types`)
    expect(spell).toContain(`- its "kind" is a type, stored as "type"`)
    expect(spell).toContain(`- its "hidden" is yes or no, stored as "is_hidden"`)
    expect(spell).toContain(`- its "location area encounters" is text  // an address`)
    expect(spell).not.toMatch(/generation i/)
    const pokemon = descriptions.get("/P.json5")!.collections.pokemon!
    expect(pokemon).toMatchObject({ idField: "url", listsGive: ["name"] })
  })

  test("a name and an address to a collection nobody asked for is the place's one name type, held whole (epic `data` I47)", async () => {
    const at = (path: string) => `${API}${path}`
    const pikachu = {
      id: 25,
      name: "pikachu",
      types: [{ slot: 1, type: { name: "electric", url: at("/type/13/") } }],
      stats: [{ base_stat: 90, stat: { name: "speed", url: at("/stat/6/") }, chart: at("/charts/6") }],
      color: { name: "yellow", url: at("/pokemon-color/10/") },
      forms: [{ name: "pikachu", url: at("/pokemon-form/25/") }]
    }
    const routes = {
      [API]: { pokemon: at("/pokemon/"), type: at("/type/") },
      [at("/pokemon")]: { count: 1, next: null, results: [pikachu] },
      [at("/type")]: { count: 1, next: null, results: [{ id: 13, name: "electric" }] }
    }
    const { ingest } = ingestOf(routes)
    const { spell } = await ingest.add({ address: API, into: "/P.spell", name: "poke api" })
    // one of its own collections stays a link;  the rest are each a poke api name, with no comment
    expect(spell).toContain(`- its "kind" is a type, stored as "type"`)
    expect(spell).toContain(`- its "stat" is a poke api name\n`)
    expect(spell).toContain(`- its "color" is a poke api name\n`)
    expect(spell).toContain(`- its "forms" is a list of poke api names\n`)
    // a plain address inside a row says so, as one at the top does
    expect(spell).toContain(`- its "chart" is text  // an address`)
    // ONE type for the whole place
    expect(spell.match(/^a "poke api name" is a thing:/gm)).toHaveLength(1)
    expect(spell).toContain(`\t- its "name" is text\n\t- its "address" is text, stored as "url"  // never read`)
    // read through it, the pair is held whole:  its name, and its address still there
    const { core } = await import("spell/parser/core")
    const { runSpellFiles } = await import("spell/parser/spell/test/runSpell")
    const held = globalThis.fetch
    globalThis.fetch = fakeFetch(routes).fetch
    try {
      core.resetRuntime()
      const { Pokemon } = runSpellFiles([{ path: "/P.spell", contents: spell }])("Pokemon") as {
        Pokemon: new () => unknown
      }
      const list = await core.savedThings(Pokemon as never, { page: { size: 5 } })
      const [first] = list.items as Array<{ stats: { items: Array<{ stat: { name: string; address: string } }> } }>
      expect(first!.stats.items[0]!.stat).toMatchObject({ name: "speed", address: at("/stat/6/") })
    } finally {
      globalThis.fetch = held
    }
  })

  test("a field Spell's plain words stop at gets quotes;  an object inside a row is a type of its own, read in words", async () => {
    const routes = {
      [API]: { ships: `${API}/ships` },
      [`${API}/ships`]: [{ id: 1, cost_in_credits: "5", parts: { width: 1 } }]
    }
    const { ingest } = ingestOf(routes)
    const { spell, description } = await ingest.add({ address: API, into: "/S.spell", name: "ships place" })
    // its words find it, as the server spells it:  nothing to say
    expect(spell).toContain(`- its "cost in credits" is a number\n`)
    expect(spell).toContain(`- it writes names like "cost_in_credits"`)
    expect(spell).toContain(`- its "parts" is a part`)
    expect(spell).toContain(`a "part" is a thing:`)
    expect(spell).toContain(`- its "width" is a number`)
    expect(spell).not.toMatch(/its "[^"\n]*\./)
    expect(description.spellCantSay.join("\n")).not.toMatch(/parts/)
  })

  test("a collection named after one of Spell's own types says whose", async () => {
    const routes = { [API]: { dates: `${API}/dates` }, [`${API}/dates`]: [{ id: 1, name: "Opening night" }] }
    const { ingest } = ingestOf(routes)
    const { spell } = await ingest.add({ address: API, into: "/C.spell", name: "cast" })
    expect(spell).toContain(`a "cast date" is a thing:`)
    expect(spell).toContain(`- cast dates live at "/dates"`)
  })

  test("`characters` are the program's own:  `character` is no type of Spell's (epic `language` Q17)", async () => {
    const routes = { [API]: { characters: `${API}/characters` }, [`${API}/characters`]: [{ id: 1, name: "Rey" }] }
    const { ingest } = ingestOf(routes)
    const { spell } = await ingest.add({ address: API, into: "/C.spell", name: "cast" })
    expect(spell).toContain(`a "character" is a thing:`)
    expect(spell).toContain(`- characters live at "/characters"`)
  })

  test("a read that returns nothing writes nothing", async () => {
    const { ingest, texts, descriptions } = ingestOf(STARS, {
      readThrough: async () => ({ byType: { person: { rows: 0, problem: "refused" } }, complaints: [] })
    })
    await expect(ingest.add({ address: API, into: "/N.spell" })).rejects.toThrow(/returned no rows/)
    expect(texts.has("/N.spell")).toBe(false)
    expect(descriptions.size).toBe(0)
  })
})

describe("which kind", () => {
  test("--kind says;  one it can't look at stops, naming those it can", async () => {
    const { ingest } = ingestOf(STARS)
    await expect(ingest.add({ address: API, into: "/K.spell", kind: "room" })).rejects.toThrow(
      /web server, graphql server/
    )
  })

  test("the address says, with no request", async () => {
    const { ingest, asked } = ingestOf({})
    await expect(ingest.add({ address: "wss://rooms.test/x", into: "/K.spell" })).rejects.toThrow(
      /can't look at a room yet/
    )
    expect(asked).toEqual([])
  })

  test("can't tell, and no one to ask:  it stops, saying which it tried", async () => {
    const routes = { [API]: new Response("<html>hello</html>", { headers: { "content-type": "text/html" } }) }
    const { ingest } = ingestOf(routes)
    await expect(ingest.add({ address: API, into: "/K.spell" })).rejects.toThrow(
      /can't tell what kind of place .* tried graphql server, sheet, web server/
    )
  })

  test("can't tell, with someone to ask:  it asks, and goes with the answer", async () => {
    const questions: string[] = []
    const { ingest } = ingestOf(
      {
        ...STARS,
        [API]: new Response(JSON.stringify(STARS[API]), { status: 200, headers: { "content-type": "text/odd" } })
      },
      {
        ask: async ({ asks, text }) => {
          questions.push(asks === "kind" ? text : asks)
          return "web server"
        }
      }
    )
    // an odd type, but JSON:  it finds that for itself, so this asks nothing
    await ingest.add({ address: API, into: "/K.spell", name: "stars" })
    expect(questions).toEqual([])
    const html = ingestOf(
      { ...STARS, [API]: new Response("<html></html>", { headers: { "content-type": "text/html" } }) },
      {
        ask: async ({ asks }) => {
          questions.push(asks)
          return "web server"
        }
      }
    )
    await expect(html.ingest.add({ address: API, into: "/K.spell", name: "stars" })).rejects.toThrow(IngestStopped)
    expect(questions).toEqual(["kind"])
  })
})

describe("which file", () => {
  test("none:  it asks, and with no one to ask, it stops", async () => {
    await expect(ingestOf(STARS).ingest.add({ address: API })).rejects.toThrow(/--into <file>/)
    const { ingest, texts } = ingestOf(STARS, { ask: async () => "/Asked.spell" })
    await ingest.add({ address: API, name: "stars" })
    expect(texts.get("/Asked.spell")).toContain("stars is a web server")
  })

  test("an existing file is added to, and the same place isn't added twice", async () => {
    const mine = `print "hello"\n`
    const { ingest, texts } = ingestOf(STARS, {}, { "/Mine.spell": mine })
    await ingest.add({ address: API, into: "/Mine.spell", name: "stars" })
    const once = texts.get("/Mine.spell")!
    expect(once.startsWith(`${mine}\nstars is a web server`)).toBe(true)
    const again = await ingest.add({ address: `${API}/`, into: "/Mine.spell" })
    expect(again.wrote).toBe(false)
    expect(texts.get("/Mine.spell")).toBe(once)
  })

  test("a second server stops:  one to a file;  and a Spanish file can't take English Spell", async () => {
    const start = { "/Mine.spell": `elsewhere is a web server at "https://other.test"\n` }
    await expect(
      ingestOf(STARS, {}, start).ingest.add({ address: API, into: "/Mine.spell", name: "stars" })
    ).rejects.toThrow(/already holds elsewhere, and a server gets a file of its own/)
    await expect(ingestOf(STARS).ingest.add({ address: API, into: "/Mine.es.spell" })).rejects.toThrow(
      /another language/
    )
  })
})

describe("the agent", () => {
  test("names and explains what was seen, sees only samples, and can't invent", async () => {
    const prompts: string[] = []
    const claude: ClaudeRunner = async (prompt) => {
      prompts.push(prompt)
      return JSON.stringify({
        placeName: "the galaxy",
        version: "1.2",
        versionWhere: "its docs",
        limits: "100 a day",
        write: "",
        checkEverySeconds: 3600,
        notes: ["Everything is public."],
        collections: [
          {
            name: "people",
            typeWords: "hero",
            about: "Everyone in the films.",
            idField: "name",
            fields: [
              { field: "hair_color", words: "hair", means: "The color of their hair" },
              { field: "invented", words: "invented", means: "Nothing" }
            ]
          },
          { name: "invented", typeWords: "ghost", about: "", idField: "", fields: [] },
          { name: "planets", typeWords: "date", about: "", idField: "nope", fields: [] }
        ]
      })
    }
    const many = Array.from({ length: 9 }, (_, at) => ({ ...LUKE, name: `person-${at}`, url: `${API}/people/${at}` }))
    const { ingest, descriptions } = ingestOf({ ...STARS, [`${API}/people`]: many }, { claude, claudeVia: "a test" })
    const { spell } = await ingest.add({ address: API, into: "/A.spell" })
    expect(prompts[0]).toContain("person-2")
    expect(prompts[0]).not.toContain("person-3")
    expect(spell).toContain(`galaxy is a web server`)
    expect(spell).toContain(`- check it every hour`)
    expect(spell).toContain(`- heroes live at "/people"`)
    expect(spell).toContain(`- its "hair" is text, stored as "hair_color"`)
    expect(spell).toContain(`a "planet" is a thing`)
    expect(spell).not.toMatch(/ghost|invented/)
    const description = descriptions.get("/A.json5")!
    expect(description.about).toMatchObject({ readBy: "a test", version: { says: "1.2", where: "its docs" } })
    expect(description.canDo.limits).toBe("100 a day")
    expect(description.agentNotes).toContain("Everything is public.")
    expect(description.collections.heroes!.fields.homeworld!.linksTo).toBe("planets")
  })

  test("failing leaves what could be worked out, and says so", async () => {
    const claude: ClaudeRunner = async () => {
      throw new Error("no agent today")
    }
    const { ingest } = ingestOf(STARS, { claude })
    const { description, spell } = await ingest.add({ address: API, into: "/A.spell", name: "stars" })
    expect(spell).toBe(STARS_SPELL)
    expect(description.notes.join("\n")).toMatch(/no agent today/)
  })
})

describe("a key", () => {
  const KEY = "s3cr3t-value-of-the-key"
  const echoing = {
    [API]: { things: `${API}/things` },
    [`${API}/things`]: [{ id: 1, name: `hello ${KEY}` }]
  }

  test("is named, sent, and never written, even when a server says it back", async () => {
    const prompts: string[] = []
    const claude: ClaudeRunner = async (prompt) => {
      prompts.push(prompt)
      return "nonsense"
    }
    const { ingest, asked, texts, descriptions } = ingestOf(echoing, { keyNamed: () => KEY, claude })
    const { description } = await ingest.add({ address: API, into: "/K.spell", name: "stuff", keySecret: "STUFF_KEY" })
    expect(asked[0]!.headers.get("authorization")).toBe(`Bearer ${KEY}`)
    expect(texts.get("/K.spell")).toContain(`- its key is the secret "STUFF_KEY"`)
    const written = [texts.get("/K.spell"), JSON.stringify(descriptions.get("/K.json5")), prompts.join("")].join("\n")
    expect(written).not.toContain(KEY)
    expect(description.about.keySecret).toBe("STUFF_KEY")
    expect(description.collections.stuff_things!.readThrough).toEqual({ rows: 1 })
  })

  test("that isn't in the environment stops;  a source that wants one says to name one", async () => {
    await expect(ingestOf(STARS).ingest.add({ address: API, into: "/K.spell", keySecret: "NOPE" })).rejects.toThrow(
      /NOPE isn't in the environment/
    )
    const locked = { [API]: new Response("no", { status: 401, headers: { "content-type": "application/json" } }) }
    await expect(ingestOf(locked).ingest.add({ address: API, into: "/K.spell", kind: "web server" })).rejects.toThrow(
      /--key-secret/
    )
  })
})

describe("GitHub's way (epic `data` P28)", () => {
  const at = (path: string) => `${API}${path}`
  const LIMITS = { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "59", "x-ratelimit-reset": "1793764004" }
  const issue = (number: number) => ({
    number,
    title: `Issue ${number}`,
    url: at(`/repos/o/r/issues/${number}`),
    reactions: { total_count: 1, "+1": 1, "-1": 0, laugh: 0 }
  })
  const ROUTES = {
    [API]: Response.json({ current_user_url: at("/user") }, { headers: LIMITS }),
    [at("/repos/o/r/issues")]: Response.json([issue(1)], {
      headers: { ...LIMITS, link: `<${at("/repos/o/r/issues/more")}>; rel="next"` }
    }),
    [at("/repos/o/r/issues/more")]: Response.json([issue(2)], { headers: LIMITS }),
    [at("/users/ryansolid")]: Response.json(
      { login: "ryansolid", name: "Ryan", public_repos: 109 },
      { headers: LIMITS }
    )
  }
  const ASK = {
    address: API,
    into: "/G.spell",
    name: "github",
    keySecret: "GH_KEY",
    collections: ["issues=/repos/o/r/issues", "users=/users/{name}"],
    samples: ["ryansolid"]
  }

  test("a key it answers without is taken when it's set;  a Link header pages;  what Spell can't read inside a row is left out", async () => {
    const { ingest, asked, descriptions } = ingestOf(ROUTES, { keyNamed: () => "k3y" })
    const { spell, description } = await ingest.add(ASK)
    expect(spell).toContain(`- its key is the secret "GH_KEY", if it's set`)
    expect(spell).toContain(`- its next page is in its "Link" header`)
    expect(spell).toContain(`a "user" is a thing:`)
    expect(spell).toContain(`- a user's id is its "login"`)
    expect(spell).not.toMatch(/"\+1"|its "1"/)
    expect(description.notes.join("\n")).toMatch(/Left out reaction's "\+1"/)
    expect(description.spellCantSay.join("\n")).not.toMatch(/Link header/)
    // asked once with no key, to see that it answers without one
    expect(asked.filter(({ headers }) => !headers.get("authorization")).length).toBe(1)
    expect(descriptions.get("/G.json5")!.about.keyIfSet).toBe(true)
    // 60 an hour with no key, two collections:  a check every 20 minutes keeps to a tenth of it
    expect(spell).toContain(`- check it every 20 minutes`)
    expect(description.canDo.limits).toMatch(/It allows 60 requests/)
  })

  test("looking again leaves out what it left out before", async () => {
    const { ingest, texts } = ingestOf(ROUTES, { keyNamed: () => "k3y" })
    await ingest.add(ASK)
    const { spell } = await ingest.update("/G.spell")
    expect(spell).not.toMatch(/"\+1"|its "1"/)
    expect(texts.get("/G.spell")).toContain(`- its next page is in its "Link" header`)
  })
})

describe("the manners", () => {
  test("it names itself, and never sends a write, whoever asks", async () => {
    const { fetch, asked } = fakeFetch({ [API]: {} })
    const reader = new PoliteReader({ fetch, sleep: async () => {} })
    await reader.read(API)
    expect(asked[0]!.headers.get("user-agent")).toBe(READER_NAME)
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      await expect(reader.fetch(API, { method, body: "{}" })).rejects.toThrow(/never sends a write/)
    }
    const mutation = JSON.stringify({ query: "mutation { removeRecipe(id: 1) }" })
    await expect(reader.fetch(API, { method: "POST", body: mutation })).rejects.toThrow(/never sends a write/)
    await expect(
      reader.fetch(API, { method: "POST", body: JSON.stringify({ query: "{ recipes { id } }" }) })
    ).resolves.toBeInstanceOf(Response)
    expect(asked.filter(({ method }) => method !== "GET")).toHaveLength(1)
  })

  test("it waits when told to, then goes on", async () => {
    const waits: number[] = []
    let tries = 0
    const fetch = (async () =>
      ++tries === 1
        ? new Response("wait", { status: 429, headers: { "retry-after": "3" } })
        : Response.json({})) as typeof globalThis.fetch
    const reader = new PoliteReader({ fetch, sleep: async (msec) => void waits.push(msec) })
    expect((await reader.read(API)).status).toBe(200)
    expect(waits).toContain(3000)
  })

  test("a rate limit used up:  it waits for the reset when that's soon, else stops, saying when (epic `data` P28)", async () => {
    const waits: number[] = []
    let tries = 0
    const usedUp = (inMs: number) => ({
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(Math.ceil((Date.now() + inMs) / 1000))
    })
    const soon = (async () =>
      ++tries === 1
        ? new Response("limit", { status: 403, headers: usedUp(3000) })
        : Response.json({})) as typeof globalThis.fetch
    const reader = new PoliteReader({ fetch: soon, sleep: async (msec) => void waits.push(msec) })
    expect((await reader.read(API)).status).toBe(200)
    expect(Math.max(...waits)).toBeGreaterThan(1000)
    const later = (async () =>
      new Response("limit", { status: 403, headers: usedUp(3_600_000) })) as typeof globalThis.fetch
    const stopped = new PoliteReader({ fetch: later, sleep: async () => {} })
    await expect(stopped.read(API)).rejects.toThrow(
      /stars.test says its rate limit is used up for now:  .* --key-secret/
    )
  })

  test("it stops at a size:  an answer too big is cut, and a look too long stops", async () => {
    const big = new PoliteReader({
      fetch: (async () => new Response("x".repeat(3_000_000))) as typeof globalThis.fetch,
      sleep: async () => {}
    })
    const { isCut, text } = await big.read(API)
    expect(isCut).toBe(true)
    expect(text.length).toBeLessThan(3_000_000)
    const { fetch } = fakeFetch({ [API]: {} })
    const long = new PoliteReader({ fetch, sleep: async () => {} })
    await expect(
      (async () => {
        for (;;) await long.read(API)
      })()
    ).rejects.toThrow(/at its limit/)
  })
})

describe("looking again", () => {
  /** A file written, a person's edits, and the source changed;  then `--update`. */
  async function updated(
    edit: (text: string) => string,
    changed: Record<string, unknown>,
    others: Record<string, string> = {},
    { olderTool = false, before }: { olderTool?: boolean; before?: (written: PlaceDescription) => void } = {}
  ) {
    const added = ingestOf(STARS, {}, others)
    await added.ingest.add({ address: API, into: "/Stars.spell", name: "stars" })
    const start = edit(added.texts.get("/Stars.spell")!)
    // what the description says it wrote, written the same way:  an older version of the tool
    const written = added.descriptions.get("/Stars.json5")!
    if (olderTool) written.spell = edit(written.spell.join("\n")).split("\n")
    before?.(written)
    const { fetch } = fakeFetch({ ...STARS, ...changed })
    const ingest = new PlaceIngest({
      fetch,
      ask: async () => undefined,
      files: { ...added.files, read: added.files.read, otherSpellBeside: async () => Object.values(others) },
      readThrough: readThroughSpell,
      sleep: async () => {}
    })
    added.texts.set("/Stars.spell", start)
    const result = await ingest.update("/Stars.spell")
    return {
      result,
      text: added.texts.get("/Stars.spell")!,
      description: added.descriptions.get("/Stars.json5")!
    }
  }

  test("a file an older version wrote, in words it no longer writes:  put in today's, each line where it was", async () => {
    const older = (text: string) =>
      text
        .replace(`\t- it writes names like "hair_color"\n`, `\t- a person's hair color is its "hair_color"\n`)
        .replace(
          `- its "height" is a number or "unknown"`,
          `- its "height" is a number  // written as text there;  "unknown" reads as nothing`
        )
    const { result, text } = await updated(older, {}, {}, { olderTool: true })
    expect(text).toContain(`\t- its "height" is a number or "unknown"\n\t- its "mass" is a number\n`)
    expect(text).toContain(`\t- planets live at "/planets"\n\t- it writes names like "hair_color"\n`)
    expect(text).not.toMatch(/written as text|hair color is its/)
    expect(result.couldntChange).toEqual([])
    expect(result.changes.join("\n")).toMatch(/Removed, as its field finds it by its words:  - a person's hair color/)
  })

  test("a note fixed since is gone;  the agent's stay, as it isn't asked again (epic `data` I54)", async () => {
    const stale = `No row read filled person's "mass".`
    const { description } = await updated(
      (same) => same,
      {},
      {},
      {
        before: (written) => {
          written.notes.push(stale)
          written.agentNotes = ["It asks people to be gentle."]
        }
      }
    )
    expect(description.notes).not.toContain(stale)
    expect(description.agentNotes).toEqual(["It asks people to be gentle."])
  })

  test("a description from before agentNotes:  its notes sorted once, the checks' said again, the rest the agent's (epic `data` I54)", async () => {
    const stale = `No row read filled person's "mass".`
    const { description } = await updated(
      (same) => same,
      {},
      {},
      {
        before: (written) => {
          delete written.agentNotes
          written.about.readBy = "an agent"
          written.notes = [stale, "Expected mass to be type 'number', got: x", "It asks people to be gentle."]
        }
      }
    )
    expect(description.notes).toEqual([])
    expect(description.agentNotes).toEqual(["It asks people to be gentle."])
  })

  test("nothing changed:  it says so, and the file's as it was", async () => {
    const { result, text } = await updated((same) => same, {})
    expect(result.changes).toEqual([])
    expect(result.couldntChange).toEqual([])
    expect(text).toBe(`${STARS_SPELL}\n`)
  })

  test("a new field, a field gone that nothing uses, a new type:  each is said, and done", async () => {
    const { mass: _mass, ...withoutMass } = LUKE
    const { result, text, description } = await updated((same) => same, {
      [`${API}/people`]: [
        { ...withoutMass, rank: "Jedi" },
        { ...withoutMass, name: "Leia", url: `${API}/people/2`, rank: "General" }
      ]
    })
    expect(result.changes.join("\n")).toMatch(/people has a new field, "rank"/)
    expect(result.changes.join("\n")).toMatch(/people's "mass" is gone/)
    expect(text).toContain(`\t- its "rank" is text`)
    expect(text).not.toContain(`"mass"`)
    expect(result.couldntChange).toEqual([])
    expect(description.collections.people!.fields.rank).toBeDefined()
  })

  test("a field gone that a program uses:  its line stays, and it says plainly", async () => {
    const { mass: _mass, ...withoutMass } = LUKE
    const program = `to weigh a person:\n\tprint the mass of the person\n`
    const { result, text } = await updated((same) => `${same}\n${program}`, {
      [`${API}/people`]: [withoutMass, { ...withoutMass, url: `${API}/people/2` }]
    })
    expect(text).toContain(`\t- its "mass" is a number`)
    expect(result.couldntChange.join("\n")).toMatch(/"mass" is used/)
  })

  test("what another file beside it uses counts too", async () => {
    const { mass: _mass, ...withoutMass } = LUKE
    const { result, text } = await updated(
      (same) => same,
      { [`${API}/people`]: [withoutMass, { ...withoutMass, url: `${API}/people/2` }] },
      { "/Other.spell": `print the mass of the first person\n` }
    )
    expect(text).toContain(`\t- its "mass" is a number`)
    expect(result.couldntChange.join("\n")).toMatch(/"mass" is used/)
  })

  test("what a person wrote stays:  their lines, and a line of ours they changed", async () => {
    const { result, text } = await updated(
      (same) =>
        same
          .replace(`\t- its "name" is text\n`, `\t- its "name" is text\n\t- to greet:\n\t\tprint "hi"\n`)
          .replace(`\t- its "hair color" is text`, `\t- its "hair color" is one of blond or brown`),
      {
        [`${API}/people`]: [
          { ...LUKE, hair_color: 4 },
          { ...LEIA, hair_color: 5 }
        ]
      }
    )
    expect(text).toContain(`\t\tprint "hi"`)
    expect(text).toContain(`is one of blond or brown`)
    expect(result.changes.join("\n")).toMatch(/"hair_color" holds number now, not text/)
    expect(result.couldntChange.join("\n")).toMatch(/you've changed that line/)
  })

  test("a new collection is added;  one gone stays, for a person", async () => {
    const { result, text } = await updated((same) => same, {
      [API]: { people: `${API}/people`, moons: `${API}/moons` },
      [`${API}/moons`]: [{ id: 1, name: "Endor" }],
      [`${API}/planets`]: undefined
    })
    expect(text).toContain(`a "moon" is a thing:`)
    expect(text).toContain(`\t- moons live at "/moons"`)
    expect(result.changes.join("\n")).toMatch(/New collection:  moons/)
    expect(text).toContain(`a "planet" is a thing:`)
    expect(result.couldntChange.join("\n")).toMatch(/"planets" is gone from the source/)
  })

  test("a person's own key in the description stays, and the words chosen", async () => {
    const added = ingestOf(STARS)
    await added.ingest.add({ address: API, into: "/Stars.spell", name: "stars" })
    const held = added.descriptions.get("/Stars.json5")!
    Object.assign(held, { myNotes: "ask Sam" })
    held.collections.people!.fields.height!.means = "In centimetres"
    const result = await added.ingest.update("/Stars.spell")
    const description = added.descriptions.get("/Stars.json5")! as PlaceDescription & { myNotes?: string }
    expect(result.changes).toEqual([])
    expect(description.myNotes).toBe("ask Sam")
    expect(description.collections.people!.fields.height!.means).toBe("In centimetres")
  })

  test("a new version is said;  and with no description, it stops", async () => {
    const version = new Headers({ "api-version": "2.0", "content-type": "application/json" })
    const { result, description } = await updated((same) => same, {
      [API]: new Response(JSON.stringify(STARS[API]), { headers: version })
    })
    expect(result.changes.join("\n")).toMatch(/Its version:  none named => 2\.0/)
    expect(description.about.version).toEqual({ says: "2.0", where: "the api-version header" })
    await expect(ingestOf(STARS).ingest.update("/None.spell")).rejects.toThrow(/no description/)
  })
})

describe("the demo's real servers", () => {
  let servers: RecipeServers
  let folder: string
  beforeAll(async () => {
    folder = mkdtempSync(join(tmpdir(), "place-ingest-"))
    servers = await startRecipeServers({ port: 0, folder })
  })
  afterAll(async () => {
    await servers.close()
    rmSync(folder, { recursive: true, force: true })
  })

  /** A `PlaceIngest` on the real network, with a stubbed agent that knows nothing. */
  const real = () => {
    const disk = memoryFiles()
    const claude: ClaudeRunner = async () => "{}"
    return {
      ingest: new PlaceIngest({
        fetch: globalThis.fetch,
        ask: async () => undefined,
        files: disk.files,
        readThrough: readThroughSpell,
        claude
      }),
      ...disk
    }
  }

  test("a web server:  one list at its address, its place the address above", async () => {
    const { ingest } = real()
    const { description, spell } = await ingest.add({
      address: `${servers.url}/recipes`,
      into: "/R.spell",
      name: "box"
    })
    expect(description.about).toMatchObject({ kind: "web server", address: servers.url })
    expect(spell).toContain(`- recipes live at "/recipes"`)
    expect(spell).toContain(`- its version is its "version"`)
    expect(description.collections.recipes!.readThrough!.rows).toBeGreaterThan(0)
  })

  test("a graphql server:  its schema says what it holds, and its mutations are never sent", async () => {
    const { ingest } = real()
    const { description, spell } = await ingest.add({
      address: `${servers.url}/graphql`,
      into: "/G.spell",
      name: "box"
    })
    expect(description.about.kind).toBe("graphql server")
    expect(spell).toContain(`a "recipe" is a thing:`)
    expect(description.canDo.write).toMatch(/addRecipe, changeRecipe, removeRecipe.*Never tried/)
    expect(description.collections.recipes!.readThrough!.rows).toBeGreaterThan(0)
  })

  test("a CSV:  its header row says its fields, and its address its kind", async () => {
    const { ingest } = real()
    const { description, spell } = await ingest.add({ address: `${servers.url}/recipes.csv`, into: "/C.spell" })
    expect(description.about).toMatchObject({ kind: "sheet", name: "recipes sheet" })
    expect(spell).toContain(`- its id is its "id"`)
    expect(spell).toContain(`- its "servings" is a number`)
    expect(description.canDo.write).toMatch(/read only/)
    expect(description.collections.recipes!.readThrough!.rows).toBeGreaterThan(0)
  })
})
