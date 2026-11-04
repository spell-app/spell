/**
 * The Public Servers example's JSONPlaceholder, through the Spell `spell place ingest` wrote for it (epic `data` P30):
 * compiled spell on `core`, against JSONPlaceholder's answers as they were recorded, never the live network.
 * - A post's comments, and a person's todos, are read from the post's and the person's own addresses.
 * - Its page adds a todo, ticks it and removes it:  a `POST`, a `PATCH` and a `DELETE`, each answered as if saved.
 * - JSONPlaceholder keeps nothing, so each answer is checked, never a read back.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { runSpellFiles } from "spell/parser/spell/test"

// Spell UI, as a spellml drawing names its components:  `<header>` is `<ui-header>`
import "spell/app/spaces/models/spellUIPack"

/** The example's folder. */
const FOLDER = resolve(import.meta.dirname, "../../spaces/@spell/examples/PublicServers")

const SERVER = "https://jsonplaceholder.typicode.com"

/** JSONPlaceholder's answers to reads, cut down to a few of each. */
const READS: Record<string, unknown> = {
  [`${SERVER}/posts`]: [{ userId: 1, id: 1, title: "sunt aut facere", body: "quia et suscipit" }],
  [`${SERVER}/posts/1/comments`]: [
    { postId: 1, id: 1, name: "id labore ex et quam laborum", email: "Eliseo@gardner.biz", body: "laudantium enim" },
    { postId: 1, id: 2, name: "quo vero reiciendis", email: "Jayne_Kuhic@sydney.com", body: "est natus enim" }
  ],
  [`${SERVER}/users/1`]: { id: 1, name: "Leanne Graham", username: "Bret" },
  [`${SERVER}/todos`]: [
    { userId: 1, id: 1, title: "delectus aut autem", completed: false },
    { userId: 1, id: 2, title: "quis ut nam facilis", completed: false },
    { userId: 2, id: 21, title: "suscipit repellat esse", completed: true }
  ],
  [`${SERVER}/users/1/todos`]: [
    { userId: 1, id: 1, title: "delectus aut autem", completed: false },
    { userId: 1, id: 2, title: "quis ut nam facilis", completed: false }
  ]
}

/** What the server was asked, in order. */
type Asked = { method: string; url: string; body?: Record<string, unknown> }

/**
 * Answer as JSONPlaceholder did when it was asked (2026-11-04):
 * - adding:  201, what was sent and the id 201, whatever id came with it
 * - changing a thing it never kept:  200, only what was sent
 * - deleting:  200, `{}`
 */
function answerAsRecorded(): Asked[] {
  const asked: Asked[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    const method = (init?.method ?? "GET").toUpperCase()
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
    asked.push({ method, url, ...(body && { body }) })
    if (method === "POST") return Response.json({ ...body, id: 201 }, { status: 201 })
    if (method === "PATCH") return Response.json(body)
    if (method === "DELETE") return Response.json({})
    const answer = READS[url]
    return answer === undefined ? new Response("{}", { status: 404 }) : Response.json(answer)
  })
  return asked
}

/** The example's API file and its page, compiled and run. */
function jsonPlaceholder() {
  const files = ["JSONPlaceholder.api.spell", "JSONPlaceholder.spellml"].map((name) => ({
    path: `/${name}`,
    contents: readFileSync(resolve(FOLDER, name), "utf8")
  }))
  return runSpellFiles(files)("Post, JsonplaceholderUser, JsonplaceholderPage") as Record<
    string,
    (new () => Record<string, any>) & { savedIn?: { select?: unknown } }
  >
}

/** How long a write may take to go:  changes wait a moment, to go together. */
const SENT = { timeout: 3000 }

afterEach(() => void vi.unstubAllGlobals())

describe("JSONPlaceholder, through its Spell", () => {
  test("a post's comments come from the post's own address, the first time they're read", async () => {
    const asked = answerAsRecorded()
    core.resetRuntime()
    const { Post } = jsonPlaceholder()
    delete Post!.savedIn!.select
    const [post] = (await core.savedThings(Post!)).items as Array<Record<string, unknown>>
    expect(post!.title).toBe("sunt aut facere")
    const comments = (await core.answerOf(post, "comments")) as { items: Array<Record<string, unknown>> }
    expect(comments.items.map(({ email, postId }) => [email, postId])).toEqual([
      ["Eliseo@gardner.biz", 1],
      ["Jayne_Kuhic@sydney.com", 1]
    ])
    expect(asked.map(({ url }) => url)).toEqual([`${SERVER}/posts`, `${SERVER}/posts/1/comments`])
  })

  test("its page adds a todo, ticks it and removes it:  each answered as if saved", async () => {
    const asked = answerAsRecorded()
    core.resetRuntime()
    const { JsonplaceholderUser, JsonplaceholderPage } = jsonPlaceholder()
    const person = (await core.savedThingWithId(JsonplaceholderUser as never, 1)) as unknown as Record<string, unknown>
    const todos = (await core.answerOf(person, "todos")) as { items: Array<Record<string, unknown>> }
    expect(todos.items.map(({ title }) => title)).toEqual(["delectus aut autem", "quis ut nam facilis"])
    expect(asked.map(({ url }) => url)).toEqual([`${SERVER}/users/1`, `${SERVER}/users/1/todos`])

    const page = new JsonplaceholderPage!()
    const theirs = (await core.answerOf(page, "todos")) as { items: Array<Record<string, unknown>> }
    expect(theirs.items).toHaveLength(2)
    page.newTodo.title = "Water the plants"
    const todo = page.newTodo
    await page.addTheNewTodo()
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "POST")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "POST")).toMatchObject({
      url: `${SERVER}/todos`,
      body: { userId: 1, title: "Water the plants" }
    })
    // it took the id the server answered with
    await vi.waitFor(() => expect(`${todo.id}`).toBe("201"), SENT)
    expect(page.newTodo).not.toBe(todo)
    // theirs, from every todo, takes it:  a list read from under them wouldn't
    expect(theirs.items).toContain(todo)
    expect(todos.items).not.toContain(todo)

    todo.completed = true
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "PATCH")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "PATCH")).toMatchObject({
      url: `${SERVER}/todos/201`,
      body: { completed: true }
    })

    core.removeSaved(todo)
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "DELETE")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "DELETE")?.url).toBe(`${SERVER}/todos/201`)
  }, 15_000)
})
