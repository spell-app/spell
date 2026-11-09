/**
 * The Public Servers example's GitHub, read through the Spell `spell place ingest` wrote for it (epic `data` P28):
 * compiled spell on `core`, against GitHub's answers as they were recorded, never the live network.
 * - Its key, `GITHUB_TOKEN`, is taken when it's set where the program runs, and gone without when it isn't.
 * - Its lists page by their `Link` header.
 * - Open Library's (epic `data` P29):  books only by a search, each one's cover on the covers server, its authors by their ids.
 * - Open-Meteo's (epic `data` P33):  a forecast asked for by where it's for, its hours lists side by side, each measure
 *   in the unit its answer names, shown in the reader's own.
 * - The Met Museum's (epic `data` P34):  its search answers ids, each artwork read from its own address only when
 *   something reads it, at the pace its docs ask for.
 * - REST Countries' (epic `data` P35):  every country in one request, each map keyed by a code read as a list of things
 *   with that code.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { runSpellFiles } from "spell/parser/spell/test"

/** The example's API file, as the ingest wrote it. */
const API_FILE = resolve(import.meta.dirname, "../../spaces/@spell/examples/PublicServers/GitHub.api.spell")

const GITHUB = "https://api.github.com"
const PAGE_2 = `${GITHUB}/repositories/130884470/contributors?page=2`

/** GitHub's answers, cut down to a few fields of each, with the headers it sends. */
const ANSWERS: Record<string, { body: unknown; headers?: Record<string, string> }> = {
  [`${GITHUB}/repos/solidjs/solid/contributors?per_page=100`]: {
    body: [{ login: "ryansolid", id: 15204625, contributions: 1907, type: "User" }],
    headers: { link: `<${PAGE_2}>; rel="next", <${GITHUB}/repositories/130884470/contributors?page=5>; rel="last"` }
  },
  [PAGE_2]: { body: [{ login: "thetarnav", id: 24491503, contributions: 50, type: "User" }] },
  [`${GITHUB}/repos/solidjs/solid/issues?per_page=100`]: {
    body: [{ url: `${GITHUB}/repos/solidjs/solid/issues/2500`, number: 2500, title: "Hydration", state: "open" }]
  },
  [`${GITHUB}/users/ryansolid`]: {
    body: { login: "ryansolid", id: 15204625, name: "Ryan Carniato", public_repos: 109, followers: 3871 }
  }
}

/** Answer from `ANSWERS`, noting each address asked, and the key it carried. */
function answerAsRecorded(): Array<{ url: string; key: string | null }> {
  const asked: Array<{ url: string; key: string | null }> = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push({ url, key: new Headers(init?.headers).get("authorization") })
    const answer = ANSWERS[url]
    return answer ? Response.json(answer.body, answer) : new Response("Not Found", { status: 404 })
  })
  return asked
}

/** The example's types, compiled and run. */
function github() {
  return runSpellFiles([{ path: "/GitHub.api.spell", contents: readFileSync(API_FILE, "utf8") }])(
    "Contributor, Issue, User"
  ) as Record<string, (new () => unknown) & { savedIn: { select?: unknown } }>
}

/** Every one of `Class`, whole. */
async function every(Class: (new () => unknown) & { savedIn: { select?: unknown } }) {
  delete Class.savedIn.select
  return (await core.savedThings(Class)).items as Array<Record<string, unknown>>
}

afterEach(() => void vi.unstubAllGlobals())

describe("GitHub, through its Spell", () => {
  test("with no key set, as in a browser:  every page of who wrote it, by its Link header, each request without a key", async () => {
    const asked = answerAsRecorded()
    core.resetRuntime()
    const { Contributor } = github()
    const contributors = await every(Contributor!)
    expect(contributors.map(({ login, contributions }) => [login, contributions])).toEqual([
      ["ryansolid", 1907],
      ["thetarnav", 50]
    ])
    expect(asked.map(({ url }) => url)).toEqual([`${GITHUB}/repos/solidjs/solid/contributors?per_page=100`, PAGE_2])
    expect(asked.every(({ key }) => key === null)).toBe(true)
  })

  test("with GITHUB_TOKEN set where it runs, it's sent;  someone found by their login keeps it", async () => {
    const asked = answerAsRecorded()
    core.resetRuntime().keyFrom = (name) => (name === "GITHUB_TOKEN" ? "gh-t0ken" : undefined)
    const { User, Issue } = github()
    const ryan = (await core.savedThingWithId(User as never, "ryansolid")) as unknown as Record<string, unknown>
    expect([ryan.login, ryan.name, ryan.publicRepos]).toEqual(["ryansolid", "Ryan Carniato", 109])
    const [issue] = await every(Issue!)
    expect([issue!.number, issue!.title, issue!.state]).toEqual([2500, "Hydration", "open"])
    expect(asked.map(({ key }) => key)).toEqual(["Bearer gh-t0ken", "Bearer gh-t0ken"])
  })
})

/** The example's Open Library, as the ingest wrote it. */
const OPEN_LIBRARY_FILE = resolve(
  import.meta.dirname,
  "../../spaces/@spell/examples/PublicServers/OpenLibrary.api.spell"
)

const OPEN_LIBRARY = "https://openlibrary.org"

/** Open Library's answers, cut down to a few fields of each. */
const OPEN_LIBRARY_ANSWERS: Record<string, unknown> = {
  [`${OPEN_LIBRARY}/search.json?q=dune`]: {
    numFound: 2,
    docs: [
      {
        key: "/works/OL893414W",
        title: "Dune",
        author_key: ["OL79034A"],
        author_name: ["Frank Herbert"],
        cover_i: 11481354
      },
      { key: "/works/OL893461W", title: "Dune Messiah", author_key: ["OL79034A"], cover_i: 980253 }
    ]
  },
  [`${OPEN_LIBRARY}/works/OL893414W/editions.json`]: {
    links: { self: "/works/OL893414W/editions.json" },
    size: 1,
    entries: [{ key: "/books/OL1M", title: "Dune (Ace)", publish_date: "1990" }]
  },
  [`${OPEN_LIBRARY}/authors/OL79034A.json`]: {
    key: "/authors/OL79034A",
    name: "Frank Herbert",
    birth_date: "8 October 1920"
  }
}

/** Open Library's answers, noting each address asked. */
function answerAsOpenLibrary(): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push(url)
    const answer = OPEN_LIBRARY_ANSWERS[url]
    return answer ? Response.json(answer) : new Response("Not Found", { status: 404 })
  })
  return asked
}

/** A line of our own beside the ingest's, as a page adds one:  whoever wrote a book first, by name. */
const WRITER = ["a book:", "\t- to name its writer:", "\t\treturn the name of the first item of its authors"].join("\n")

describe("Open Library, through its Spell", () => {
  test("a search for a book:  its cover's address on the covers server, and its first author, read from their record", async () => {
    const asked = answerAsOpenLibrary()
    core.resetRuntime()
    const { Book } = runSpellFiles([
      { path: "/OpenLibrary.api.spell", contents: readFileSync(OPEN_LIBRARY_FILE, "utf8") },
      { path: "/Writer.spell", contents: `${WRITER}\n` }
    ])("Book") as Record<string, (new () => unknown) & { savedIn: { select?: unknown } }>
    delete Book!.savedIn.select
    const books = (await core.savedThings(Book!, { search: { title: "dune" } })).items as Array<
      Record<string, unknown> & { nameItsWriter(): Promise<string> }
    >
    expect(books.map(({ title }) => title)).toEqual(["Dune", "Dune Messiah"])
    const [dune] = books
    expect(dune!.coverI).toBe("https://covers.openlibrary.org/b/id/11481354-M.jpg")
    expect(await dune!.nameItsWriter()).toBe("Frank Herbert")
    expect(asked).toEqual([`${OPEN_LIBRARY}/search.json?q=dune`, `${OPEN_LIBRARY}/authors/OL79034A.json`])
  })

  test("a book's editions, read from its own list when something reads them (T114)", async () => {
    const asked = answerAsOpenLibrary()
    core.resetRuntime()
    const { Book, Edition } = runSpellFiles([
      { path: "/OpenLibrary.api.spell", contents: readFileSync(OPEN_LIBRARY_FILE, "utf8") },
      { path: "/Editions.spell", contents: "a book:\n\t- to list its printings:\n\t\treturn its editions\n" }
    ])("Book, Edition") as Record<string, (new () => unknown) & { savedIn: { select?: unknown } }>
    delete Book!.savedIn.select
    delete Edition!.savedIn.select
    const [dune] = (await core.savedThings(Book!, { search: { title: "dune" } })).items as Array<
      Record<string, unknown> & { listItsPrintings(): Promise<{ items: Array<Record<string, unknown>> }> }
    >
    expect(asked).toEqual([`${OPEN_LIBRARY}/search.json?q=dune`])
    const [edition] = (await dune!.listItsPrintings()).items
    expect([edition!.id, edition!.title]).toEqual(["/books/OL1M", "Dune (Ace)"])
    expect(asked.at(-1)).toBe(`${OPEN_LIBRARY}/works/OL893414W/editions.json`)
  })

  test("every book, with no search, won't compile:  it says how to search", () => {
    const lines = [readFileSync(OPEN_LIBRARY_FILE, "utf8"), "set found to every book"].join("\n")
    expect(() => runSpellFiles([{ path: "/OpenLibrary.api.spell", contents: lines }])).toThrow(
      /books are only found by a search, with no list of them all/
    )
  })
})

/** The example's Open-Meteo, as the ingest wrote it. */
const OPEN_METEO_FILE = resolve(import.meta.dirname, "../../spaces/@spell/examples/PublicServers/OpenMeteo.api.spell")

/** What its forecasts are asked for at, with Berlin's latitude and longitude, as `RestPlace` asks. */
const BERLIN = `https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto&forecast_days=2&latitude=52.52&longitude=13.41`

/** Open-Meteo's answer for Berlin, cut down to tomorrow's first three hours:  for the nearest place it has, `52.52`'s. */
const BERLIN_ANSWER = {
  latitude: 52.52,
  longitude: 13.419998,
  utc_offset_seconds: 3600,
  timezone: "Europe/Berlin",
  timezone_abbreviation: "GMT+1",
  elevation: 38,
  hourly_units: { time: "iso8601", temperature_2m: "°C", precipitation: "mm", wind_speed_10m: "km/h" },
  hourly: {
    time: ["2026-11-06T00:00", "2026-11-06T01:00", "2026-11-06T02:00"],
    temperature_2m: [10, 4.5, -2],
    precipitation: [0, 25.4, 0.3],
    wind_speed_10m: [6, 16.1, 5.2]
  }
}

describe("Open-Meteo, through its Spell", () => {
  afterEach(() => core.useMeasureSystem(undefined))

  test("Berlin's forecast, asked for by where it is:  its hours, each a time and its measures, in °F to a reader in the US", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push(url)
      return url === BERLIN ? Response.json(BERLIN_ANSWER) : new Response("{}", { status: 400 })
    })
    core.resetRuntime()
    const { Forecast } = runSpellFiles([
      { path: "/OpenMeteo.api.spell", contents: readFileSync(OPEN_METEO_FILE, "utf8") }
    ])("Forecast") as Record<string, (new () => unknown) & { savedIn: { select?: unknown } }>
    delete Forecast!.savedIn.select
    const [berlin] = (await core.savedThings(Forecast!, { filter: { latitude: 52.52, longitude: 13.41 } }))
      .items as Array<Record<string, unknown> & { hours: { items: Array<Record<string, unknown>> } }>
    expect(asked).toEqual([BERLIN])
    expect([berlin!.timezone, berlin!.latitude]).toEqual(["Europe/Berlin", 52.52])
    const hours = berlin!.hours.items
    expect(hours.map(({ temperature, precipitation, windSpeed }) => [temperature, precipitation, windSpeed])).toEqual([
      [10, 0, 6],
      [4.5, 25.4, 16.1],
      [-2, 0.3, 5.2]
    ])
    expect((hours[0]!.time as Date).getHours()).toBe(0)
    core.useMeasureSystem("us")
    expect(hours.map(({ temperature }) => core.measureShown(temperature, "Temperature", "celsius"))).toEqual([
      "50 °F",
      "40.1 °F",
      "28.4 °F"
    ])
    expect(core.measureShown(hours[1]!.precipitation, "Length", "millimeter")).toBe("1 in")
    core.useMeasureSystem("metric")
    expect(core.measureShown(hours[0]!.temperature, "Temperature", "celsius")).toBe("10 °C")
  })

  test("every forecast, without where it's for, won't compile:  it says what to give", () => {
    const lines = [
      readFileSync(OPEN_METEO_FILE, "utf8"),
      "set found to every forecast where its latitude is 52.52"
    ].join("\n")
    expect(() => runSpellFiles([{ path: "/OpenMeteo.api.spell", contents: lines }])).toThrow(
      /forecasts are only found by their latitude, longitude/
    )
  })
})

/** The example's Met Museum, as the ingest wrote it. */
const MET_MUSEUM_FILE = resolve(import.meta.dirname, "../../spaces/@spell/examples/PublicServers/MetMuseum.api.spell")

const MET = "https://collectionapi.metmuseum.org/public/collection"

/** What a search for sunflowers finds:  ids only, thirty of them, as the Met answers. */
const SUNFLOWER_IDS = Array.from({ length: 30 }, (_, at) => 436524 + at)

/** Each artwork's own answer, cut down to a few fields:  only the ones a test reads are ever asked for. */
function artworkAnswer(id: number) {
  return {
    objectID: id,
    title: id === 436524 ? "Sunflowers" : `Artwork ${id}`,
    artistDisplayName: "Vincent van Gogh",
    objectDate: "1887",
    primaryImageSmall: `https://images.metmuseum.org/CRDImages/ep/web-large/${id}.jpg`,
    tags: [{ term: "Sunflowers" }]
  }
}

/** Its search, as a program asks it:  a page of 500 at a time, by offset. */
const SEARCH_ASKED = `${MET}/v1.1/search?q=sunflowers&limit=500&offset=0`

/** The Met's answers, noting each address asked. */
function answerAsTheMet(): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push(url)
    if (url === SEARCH_ASKED) return Response.json({ total: 178, objectIDs: SUNFLOWER_IDS })
    if (url === `${MET}/v1/objects?limit=500&offset=0`) return Response.json({ total: 4, objectIDs: [1, 2, 3, 4] })
    const id = /\/v1\/objects\/(\d+)$/.exec(url)?.[1]
    return id ? Response.json(artworkAnswer(Number(id))) : new Response("Not Found", { status: 404 })
  })
  return asked
}

/** The example's Met Museum, compiled and run. */
function metMuseum() {
  core.resetRuntime()
  const { Artwork } = runSpellFiles([
    { path: "/MetMuseum.api.spell", contents: readFileSync(MET_MUSEUM_FILE, "utf8") }
  ])("Artwork") as Record<string, (new () => unknown) & { savedIn: { select?: unknown } }>
  delete Artwork!.savedIn.select
  return Artwork!
}

describe("The Met Museum, through its Spell", () => {
  test("a search answers ids:  only the artworks read are asked for, each from its own address", async () => {
    const asked = answerAsTheMet()
    const Artwork = metMuseum()
    const found = (await core.savedThings(Artwork, { search: { "*": "sunflowers" } })).items as Array<
      Record<string, unknown>
    >
    // a thing's id is text, whatever the server sends
    expect(found.map(({ id }) => id)).toEqual(SUNFLOWER_IDS.map(String))
    expect(asked).toEqual([SEARCH_ASKED])
    // the first three drawn:  each read whole the first time something reads what the list left out
    for (const artwork of found.slice(0, 3)) void artwork.title
    await vi.waitFor(() => expect(found.slice(0, 3).every(({ title }) => title)).toBe(true))
    expect(found.slice(0, 3).map(({ title, artistDisplayName }) => [title, artistDisplayName])).toEqual([
      ["Sunflowers", "Vincent van Gogh"],
      ["Artwork 436525", "Vincent van Gogh"],
      ["Artwork 436526", "Vincent van Gogh"]
    ])
    expect(asked).toEqual([
      SEARCH_ASKED,
      `${MET}/v1/objects/436524`,
      `${MET}/v1/objects/436525`,
      `${MET}/v1/objects/436526`
    ])
  })

  test("every artwork is its list of ids, read in one request, none of them whole", async () => {
    const asked = answerAsTheMet()
    const Artwork = metMuseum()
    const every = (await core.savedThings(Artwork)).items as Array<Record<string, unknown>>
    expect(every.map(({ id }) => id)).toEqual(["1", "2", "3", "4"])
    expect(asked).toEqual([`${MET}/v1/objects?limit=500&offset=0`])
  })

  test("its search reads past its first page, by offset:  a full page, then the rest (T122)", async () => {
    const ids = Array.from({ length: 500 }, (_each, index) => index + 1)
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      asked.push(`${input as string}`)
      return Response.json({ objectIDs: `${input as string}`.includes("offset=0") ? ids : [501, 502] })
    })
    const found = (await core.savedThings(metMuseum(), { search: { "*": "sunflowers" } })).items
    expect(found).toHaveLength(502)
    expect(asked).toEqual([SEARCH_ASKED, `${MET}/v1.1/search?q=sunflowers&limit=500&offset=500`])
  })

  test("a search that finds nothing answers no list at all, and that's no artworks (T122)", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ total: 0, objectIDs: null }))
    expect((await core.savedThings(metMuseum(), { search: { "*": "zzqqx" } })).items).toEqual([])
  })

  test("its pace, from its docs:  80 requests a second, each waiting its turn", async () => {
    const asked = answerAsTheMet()
    const Artwork = metMuseum()
    const found = (await core.savedThings(Artwork, { search: { "*": "sunflowers" } })).items as Array<
      Record<string, unknown>
    >
    const started = Date.now()
    for (const artwork of found.slice(0, 9)) void artwork.title
    await vi.waitFor(() => expect(found.slice(0, 9).every(({ title }) => title)).toBe(true))
    // the search went first:  nine more, an eightieth of a second apart, take a tenth of a second at least
    expect(asked).toHaveLength(10)
    expect(Date.now() - started).toBeGreaterThanOrEqual(100)
  })

  test("every artwork matching the search compiles to the Met's own search;  a place that doesn't search all of each thing refuses it", () => {
    const api = readFileSync(MET_MUSEUM_FILE, "utf8")
    const reads = (lines: string) => () =>
      runSpellFiles([{ path: "/MetMuseum.api.spell", contents: `${lines}\nset found to every artwork matching "sun"` }])
    expect(reads(api)).not.toThrow()
    expect(reads(api.replace(/\t- it searches everything with .*\n/, ""))).toThrow(
      /artworks are found this way only in a place that searches all of each thing/
    )
  })
})

/** The example's REST Countries, as the ingest wrote it. */
const REST_COUNTRIES_FILE = resolve(
  import.meta.dirname,
  "../../spaces/@spell/examples/PublicServers/RestCountries.api.spell"
)

/** Where every country is, all 250 at once:  the data REST Countries serves, as its own repository keeps it. */
const COUNTRIES = "https://cdn.jsdelivr.net/gh/mledoze/countries@5.1.0/countries.json"

/** Two of its countries, cut down to what the test reads:  each map keyed by a code, as it sends them. */
const COUNTRIES_ANSWER = [
  {
    name: {
      common: "Switzerland",
      official: "Swiss Confederation",
      native: {
        fra: { official: "Confédération suisse", common: "Suisse" },
        deu: { official: "Schweizerische Eidgenossenschaft", common: "Schweiz" }
      }
    },
    ccn3: "756",
    capital: ["Bern"],
    region: "Europe",
    currencies: { CHF: { name: "Swiss franc", symbol: "Fr." } },
    languages: { fra: "French", gsw: "Swiss German", ita: "Italian", roh: "Romansh" },
    translations: {
      fra: { official: "Confédération suisse", common: "Suisse" },
      spa: { official: "Confederación Suiza", common: "Suiza" }
    }
  },
  {
    name: { common: "Zimbabwe", official: "Republic of Zimbabwe", native: {} },
    ccn3: "716",
    capital: ["Harare"],
    region: "Africa",
    currencies: { USD: { name: "United States dollar", symbol: "$" }, ZWG: { name: "Zimbabwe Gold", symbol: "ZiG" } },
    languages: { eng: "English", sna: "Shona" },
    translations: { fra: { official: "République du Zimbabwe", common: "Zimbabwe" } }
  }
]

/** A list of things inside a country, as the core reads it. */
type Things = { items: Array<Record<string, unknown>> }

describe("REST Countries, through its Spell", () => {
  test("every country in one request:  its money, its languages and its names, each keyed by a code, a list of things with that code", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push(url)
      return url === COUNTRIES ? Response.json(COUNTRIES_ANSWER) : new Response("Not Found", { status: 404 })
    })
    core.resetRuntime()
    // its name in a language, as the example reads it:  the translation with that code
    const nameIn = [
      "to french name (a country):",
      '\treturn the common of the first translation in its translations where its code is "fra"'
    ]
    const contents = [readFileSync(REST_COUNTRIES_FILE, "utf8"), ...nameIn].join("\n")
    const { Country } = runSpellFiles([{ path: "/RestCountries.api.spell", contents }])("Country") as {
      Country: (new () => unknown) & { savedIn: { select?: unknown } }
    }
    delete Country.savedIn.select
    const [switzerland, zimbabwe] = (await core.savedThings(Country, {})).items as Array<
      Record<string, unknown> & {
        currencies: Things
        languages: Things
        name: { native: Things }
        frenchName: () => unknown
      }
    >
    // no paging:  one request, every country
    expect(asked).toEqual([COUNTRIES])
    expect(zimbabwe!.currencies.items.map(({ code, name, symbol }) => [code, name, symbol])).toEqual([
      ["USD", "United States dollar", "$"],
      ["ZWG", "Zimbabwe Gold", "ZiG"]
    ])
    // a code holding only a name:  `"fra": "French"` is a language whose code is `fra`
    expect(switzerland!.languages.items.map(({ code, name }) => `${code} ${name}`)).toEqual([
      "fra French",
      "gsw Swiss German",
      "ita Italian",
      "roh Romansh"
    ])
    expect([switzerland!.frenchName(), zimbabwe!.frenchName()]).toEqual(["Suisse", "Zimbabwe"])
    expect(switzerland!.name.native.items.map(({ code, common }) => [code, common])).toEqual([
      ["fra", "Suisse"],
      ["deu", "Schweiz"]
    ])
    // an empty map is an empty list;  a code in digits stays as it's written
    expect(zimbabwe!.name.native.items).toEqual([])
    expect([switzerland!.ccn3, zimbabwe!.ccn3]).toEqual(["756", "716"])
  })
})
