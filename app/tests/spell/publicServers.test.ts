/**
 * The Public Servers example's GitHub, read through the Spell `spell place ingest` wrote for it (epic `data` P28):
 * compiled spell on `core`, against GitHub's answers as they were recorded, never the live network.
 * - Its key, `GITHUB_TOKEN`, is taken when it's set where the program runs, and gone without when it isn't.
 * - Its lists page by their `Link` header.
 * - Open Library's (epic `data` P29):  books only by a search, each one's cover on the covers server, its authors by their ids.
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
  [`${GITHUB}/repos/solidjs/solid/contributors`]: {
    body: [{ login: "ryansolid", id: 15204625, contributions: 1907, type: "User" }],
    headers: { link: `<${PAGE_2}>; rel="next", <${GITHUB}/repositories/130884470/contributors?page=5>; rel="last"` }
  },
  [PAGE_2]: { body: [{ login: "thetarnav", id: 24491503, contributions: 50, type: "User" }] },
  [`${GITHUB}/repos/solidjs/solid/issues`]: {
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
    expect(asked.map(({ url }) => url)).toEqual([`${GITHUB}/repos/solidjs/solid/contributors`, PAGE_2])
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
  [`${OPEN_LIBRARY}/authors/OL79034A.json`]: {
    key: "/authors/OL79034A",
    name: "Frank Herbert",
    birth_date: "8 October 1920"
  }
}

/** A line of our own beside the ingest's, as a page adds one:  whoever wrote a book first, by name. */
const WRITER = ["a book:", "\t- to name its writer:", "\t\treturn the name of the first item of its authors"].join("\n")

describe("Open Library, through its Spell", () => {
  test("a search for a book:  its cover's address on the covers server, and its first author, read from their record", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
      asked.push(url)
      const answer = OPEN_LIBRARY_ANSWERS[url]
      return answer ? Response.json(answer) : new Response("Not Found", { status: 404 })
    })
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

  test("every book, with no search, won't compile:  it says how to search", () => {
    const lines = [readFileSync(OPEN_LIBRARY_FILE, "utf8"), "set found to every book"].join("\n")
    expect(() => runSpellFiles([{ path: "/OpenLibrary.api.spell", contents: lines }])).toThrow(
      /books are only found by a search, with no list of them all/
    )
  })
})
