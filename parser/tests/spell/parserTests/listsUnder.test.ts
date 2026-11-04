/**
 * A web server's lists under each of its things, and its writes (epic `data` P30):  compiled spell, on `core`, reading a fake
 * server shaped like JSONPlaceholder.
 * - `- a post's comments live at "/posts/{id}/comments"`:  reading a post's comments reads there, the first time it's read.
 * - Adding, changing and removing a thing send a `POST`, a `PATCH` and a `DELETE`;  a thing added takes the id the server answers with.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

const HOST = "https://web.test"

const LINES = [
  `typicode is a web server at "${HOST}":`,
  `\t- posts live at "/posts"`,
  `\t- comments live at "/comments"`,
  `\t- todos live at "/todos"`,
  `\t- a post's comments live at "/posts/{id}/comments"`,
  `a "post" is a thing:`,
  `\t- it lives in typicode`,
  `\t- its "title" is text`,
  `\t- its "comments" is a list of comments`,
  `a "comment" is a thing:`,
  `\t- it lives in typicode`,
  `\t- its "post id" is a number`,
  `\t- its "name" is text`,
  `a "todo" is a thing:`,
  `\t- it lives in typicode`,
  `\t- its "title" is text`,
  `\t- its "completed" is yes or no`
]

/** What the server was asked, in order. */
type Asked = { method: string; url: string; body?: unknown }

/** A server like JSONPlaceholder:  lists by address, and writes answered as if saved. */
function serve(routes: Record<string, unknown>): Asked[] {
  const asked: Asked[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    const method = (init?.method ?? "GET").toUpperCase()
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
    asked.push({ method, url, ...(body !== undefined && { body }) })
    if (method === "POST") return Response.json({ ...body, id: 201 }, { status: 201 })
    if (method === "PATCH") return Response.json({ id: Number(url.split("/").pop()), ...body })
    if (method === "DELETE") return Response.json({})
    const route = routes[url]
    return route === undefined ? new Response("no", { status: 404 }) : Response.json(route)
  })
  return asked
}

/** Every thing of `Class`, whole. */
async function every(Class: unknown): Promise<Array<Record<string, unknown>>> {
  delete (Class as { savedIn: { select?: unknown } }).savedIn.select
  return (await core.savedThings(Class as new () => unknown)).items as Array<Record<string, unknown>>
}

/** How long a write may take to go:  changes wait a moment, to go together. */
const SENT = { timeout: 3000 }

afterEach(() => void vi.unstubAllGlobals())

describe("a list under each thing", () => {
  test("compiles, in either language", () => {
    const { compiled, errors } = parseSpellProject([{ path: "/T.spell", contents: `${LINES.join("\n")}\n` }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`listsUnder: { posts: { comments: "/posts/{id}/comments" } }`)
    expect(compiled).toContain(`get comments() { return core.linked(this, "comments", Comment) }`)
    const es = [
      `typicode es un servidor web en "${HOST}":`,
      `\t- los comentarios de una publicación están en "/posts/{id}/comments"`,
      `una "publicación" es una cosa:`,
      `\t- vive en typicode`,
      `\t- sus "comentarios" es una lista de comentarios`,
      `un "comentario" es una cosa:`,
      `\t- vive en typicode`,
      `\t- su "nombre" es texto`
    ]
    const spanish = parseSpellProject([{ path: "/T.es.spell", contents: `${es.join("\n")}\n` }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toMatch(/listsUnder: \{ publicaci\S*: \{ comentarios: "\/posts\/\{id\}\/comments" \} \}/)
  })

  test("a post's comments are read from the post's own address, the first time something reads them", async () => {
    const asked = serve({
      [`${HOST}/posts`]: [
        { id: 1, title: "One" },
        { id: 2, title: "Two" }
      ],
      [`${HOST}/posts/1/comments`]: [
        { id: 1, postId: 1, name: "first" },
        { id: 2, postId: 1, name: "second" }
      ]
    })
    core.resetRuntime()
    const { Post } = runSpell(LINES)("Post")
    const [one] = await every(Post)
    expect(asked.map(({ url }) => url)).toEqual([`${HOST}/posts`])
    const comments = (await core.answerOf(one, "comments")) as { items: Array<{ name: string; postId: number }> }
    expect(comments.items.map(({ name, postId }) => [name, postId])).toEqual([
      ["first", 1],
      ["second", 1]
    ])
    expect(asked.map(({ url }) => url)).toEqual([`${HOST}/posts`, `${HOST}/posts/1/comments`])
  })
})

describe("writes, answered as if saved", () => {
  test("adding sends a POST, and the thing takes the server's id;  changing sends a PATCH;  removing, a DELETE", async () => {
    const asked = serve({ [`${HOST}/todos`]: [{ id: 1, title: "Milk", completed: false }] })
    core.resetRuntime()
    const { Todo } = runSpell(LINES)("Todo")
    await every(Todo)
    const todo = new (Todo as new () => Record<string, unknown>)()
    todo.title = "Bread"
    await core.saveThing(todo)
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "POST")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "POST")).toMatchObject({
      url: `${HOST}/todos`,
      body: { title: "Bread" }
    })
    await vi.waitFor(() => expect(String(todo.id)).toBe("201"), SENT)
    todo.completed = true
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "PATCH")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "PATCH")).toMatchObject({
      url: `${HOST}/todos/201`,
      body: { completed: true }
    })
    core.removeSaved(todo)
    await vi.waitFor(() => expect(asked.some(({ method }) => method === "DELETE")).toBe(true), SENT)
    expect(asked.find(({ method }) => method === "DELETE")?.url).toBe(`${HOST}/todos/201`)
  }, 15_000)
})
