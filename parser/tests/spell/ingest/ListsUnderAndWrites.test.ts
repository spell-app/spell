import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { PlaceIngest, descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceIngest"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * `spell place ingest` on a server shaped like JSONPlaceholder (epic `data` P30):
 * - the lists it keeps under each thing, found where one collection's rows name another's things by id
 * - a write of each kind, tried only when it's told it may (`--try-writes`), and what each answered
 * - a type another Spell file beside it already declares, named for the place
 * - Every read through the Spell really runs:  `readThroughSpell()`, compiled spell on `core`, as the command does.
 */

const API = "https://typicode.test"

const POSTS = [
  { userId: 1, commentId: 1, id: 1, title: "One", body: "first" },
  { userId: 1, commentId: 2, id: 2, title: "Two", body: "second" }
]
const COMMENTS = [
  { postId: 1, id: 1, name: "a", email: "a@x.test", body: "yes" },
  { postId: 2, id: 2, name: "b", email: "b@x.test", body: "no" }
]
const USERS = [{ id: 1, name: "Leanne", username: "Bret" }]

/**
 * JSONPlaceholder's way:  any address under a thing answers, the real ones with only that thing's;
 * a write answered as if saved, and kept nowhere.
 */
function typicode(): { fetch: typeof globalThis.fetch; asked: Array<{ method: string; url: string }> } {
  const routes: Record<string, unknown> = {
    [`${API}/posts`]: POSTS,
    [`${API}/comments`]: COMMENTS,
    [`${API}/users`]: USERS,
    [`${API}/posts/1/comments`]: [COMMENTS[0]],
    // not a list of its own:  every one, as JSONPlaceholder answers, each naming its own comment
    [`${API}/comments/1/posts`]: POSTS,
    [`${API}/users/1/posts`]: POSTS
  }
  const asked: Array<{ method: string; url: string }> = []
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`.replace(
      /[?#].*$/,
      ""
    )
    const method = init?.method ?? "GET"
    asked.push({ method, url })
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {}
    if (method === "POST") return Response.json({ ...body, id: 101 }, { status: 201 })
    if (method === "PATCH") return Response.json(body)
    if (method === "DELETE") return Response.json({})
    const route = routes[url]
    return route === undefined ? new Response("{}", { status: 404 }) : Response.json(route)
  }) as typeof globalThis.fetch
  return { fetch, asked }
}

/** Files in memory, with `beside` the project's other Spell. */
function memoryFiles(beside: Record<string, string> = {}) {
  const texts = new Map(Object.entries(beside))
  const descriptions = new Map<string, PlaceDescription>()
  const files: IngestFiles = {
    read: async (path) => texts.get(path),
    write: async (path, text) => void texts.set(path, text),
    readDescription: async (path) => {
      const held = descriptions.get(path)
      return held && descriptionOnDisk(held)
    },
    writeDescription: async (path, description) =>
      void descriptions.set(path, descriptionFromDisk(structuredClone(description))),
    listInProject: async () => {},
    otherSpellBeside: async (path) => [...texts].filter(([other]) => other !== path).map(([, text]) => text)
  }
  return { files, texts }
}

/** A `PlaceIngest` on the fake server, with no agent, and no one to ask. */
function ingestOf(beside?: Record<string, string>) {
  const { fetch, asked } = typicode()
  const disk = memoryFiles(beside)
  const ingest = new PlaceIngest({
    fetch,
    ask: async () => undefined,
    files: disk.files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-04T12:00:00Z")
  })
  return { ingest, asked, ...disk }
}

const COLLECTIONS = ["posts=/posts", "comments=/comments", "users=/users"]

describe("a list under each thing", () => {
  test("found only where one collection's rows name another's things, and only a real one:  its line, and its owner's", async () => {
    const { ingest, asked } = ingestOf()
    const { spell, description, warnings } = await ingest.add({
      address: API,
      kind: "web server",
      into: "/Typicode.api.spell",
      collections: COLLECTIONS
    })
    expect(spell).toContain(`\t- a post's comments live at "/posts/{id}/comments"`)
    expect(spell).toContain(`\t- a user's posts live at "/users/{id}/posts"`)
    expect(spell).not.toContain("a comment's posts")
    expect(spell).toMatch(/a "post" is a thing:[^]*?\t- its "comments" is a list of comments\n/)
    expect(description.collections.posts!.listsUnder).toEqual({ comments: "/posts/{id}/comments" })
    // a read through it found nothing to complain of:  a post's comments are read from the post's own address
    expect(warnings.join()).not.toMatch(/comments/)
    // asked only where a field names the other:  a comment's post id, a post's comment id and user id
    const under = asked.filter(({ url }) => /\/\d+\//.test(url)).map(({ url }) => url.slice(API.length))
    expect(under).toEqual(["/posts/1/comments", "/comments/1/posts", "/users/1/posts"])
    expect(asked.filter(({ method }) => method !== "GET")).toEqual([])
  })

  test("a type another Spell file beside it declares goes by the place's name", async () => {
    const { ingest } = ingestOf({
      "/GitHub.api.spell": `github is a web server at "https://x":\n\na "user" is a thing:\n`
    })
    const { spell } = await ingest.add({
      address: API,
      kind: "web server",
      into: "/Typicode.api.spell",
      name: "typicode",
      collections: COLLECTIONS
    })
    expect(spell).toContain(`a "typicode user" is a thing:`)
    expect(spell).toContain(`\t- a typicode user's posts live at "/users/{id}/posts"`)
    expect(spell).toContain(`\t- typicode users live at "/users"`)
  })
})

describe("writes", () => {
  test("tried only when it's told it may:  one of each, and what each answered, and that it keeps nothing", async () => {
    const without = ingestOf()
    const plain = await without.ingest.add({
      address: API,
      kind: "web server",
      into: "/Typicode.api.spell",
      collections: COLLECTIONS
    })
    expect(without.asked.filter(({ method }) => method !== "GET")).toEqual([])
    expect(plain.description.canDo.write).toMatch(/never tried/i)

    const { ingest, asked } = ingestOf()
    const { description } = await ingest.add({
      address: API,
      kind: "web server",
      into: "/Typicode.api.spell",
      collections: COLLECTIONS,
      triesWrites: true
    })
    expect(asked.filter(({ method }) => method !== "GET").map(({ method, url }) => `${method} ${url}`)).toEqual([
      `POST ${API}/posts`,
      `PATCH ${API}/posts/1`,
      `DELETE ${API}/posts/101`
    ])
    expect(description.about.triesWrites).toBe(true)
    expect(description.canDo.write).toBe(
      "Yes:  it took a write of each kind, tried on posts (adding 201, changing 200, deleting 200).  It answers as if saved, and keeps nothing:  what was added, as 101, wasn't there when read again."
    )
  })
})
