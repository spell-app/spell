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
    expect(spell).toContain(`- its "type" is a type`)
    expect(spell).toContain(`- its "hidden" is yes or no, stored as "is_hidden"`)
    expect(spell).toContain(`- its "location area encounters" is text  // an address`)
    expect(spell).not.toMatch(/generation i/)
    const pokemon = descriptions.get("/P.json5")!.collections.pokemon!
    expect(pokemon).toMatchObject({ idField: "url", listsGive: ["name"] })
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
    expect(description.notes).toContain("Everything is public.")
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
    { olderTool = false }: { olderTool?: boolean } = {}
  ) {
    const added = ingestOf(STARS, {}, others)
    await added.ingest.add({ address: API, into: "/Stars.spell", name: "stars" })
    const start = edit(added.texts.get("/Stars.spell")!)
    // what the description says it wrote, written the same way:  an older version of the tool
    const written = added.descriptions.get("/Stars.json5")!
    if (olderTool) written.spell = edit(written.spell.join("\n")).split("\n")
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
