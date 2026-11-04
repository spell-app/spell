/**
 * The Public Servers example's GitHub, read through the Spell `spell place ingest` wrote for it (epic `data` P28):
 * compiled spell on `core`, against GitHub's answers as they were recorded, never the live network.
 * - Its key, `GITHUB_TOKEN`, is taken when it's set where the program runs, and gone without when it isn't.
 * - Its lists page by their `Link` header.
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
