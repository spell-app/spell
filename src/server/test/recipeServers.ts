/**
 * Two small servers over one box of recipes, for trying places against something real (epic `data` P4).
 * - `restHandler()`:  a web service, with its own names (`name`, where we say `title`), and what a real one varies in:
 *   versions by field, by `ETag` or none;  pages by offset, by cursor in its answer, by `Link` header, or none.
 * - `graphHandler()`:  a GraphQL service, by a small reader of the queries `GraphPlace` writes:  no library.
 *   It answers ONLY the fields asked for, and an error for one it hasn't got, as a real one does.
 * - `RecipeBox`:  what they share, so a program can change back-end and find the same recipes.
 *   - The demo's own is a CSV file (`RecipeFile`);  a test's is in memory.
 * - `scripts/recipe-servers.ts` runs them, for the recipe box demo;  `RestPlace`'s and `GraphPlace`'s tests serve them.
 * - `DemoGuard`:  what lets a local page reach the demo's place server and live room (`scripts/recipe-servers.ts`).
 * - Node only;  a test helper:  nothing here is careful about anything but being a fair fake.
 */
import { SRV, type Handler } from "spell/server"

/** One recipe, as these servers name its fields. */
export type WireRecipe = {
  id: string
  name: string
  cuisine: string
  servings: number
  notes: string
  version: number
}

/** The recipes every box starts with. */
export const FIRST_RECIPES: readonly Omit<WireRecipe, "version">[] = [
  { id: "r-1", name: "Tomato soup", cuisine: "Italian", servings: 4, notes: "Roast the tomatoes first." },
  { id: "r-2", name: "Dal", cuisine: "Indian", servings: 6, notes: "Temper the spices last." },
  { id: "r-3", name: "Tacos al pastor", cuisine: "Mexican", servings: 4, notes: "Pineapple on top." },
  { id: "r-4", name: "Margherita", cuisine: "Italian", servings: 2, notes: "A very hot oven." },
  { id: "r-5", name: "Chana masala", cuisine: "Indian", servings: 4, notes: "Better the next day." }
]

/** How many requests it remembers:  a page left polling mustn't grow it for ever. */
const ASKS_KEPT = 10_000

/** What it's asked for one request:  for a test to look at. */
export type RecipeAsk = {
  /** The method. */
  method: string
  /** The path, with no query. */
  path: string
  /** The query. */
  query: Record<string, unknown>
  /** The body, parsed. */
  body?: Record<string, unknown>
  /** The headers it was sent. */
  headers: Record<string, string | string[] | undefined>
}

/****************
 * ### `RecipeBox`
 * The recipes, and what's been asked of them.
 ****************/
export class RecipeBox {
  /** Each recipe, in the order added. */
  readonly recipes = new Map<string, WireRecipe>()
  /** What's been asked, oldest first. */
  readonly asks: RecipeAsk[] = []
  /** What each change's id made:  a change sent again is answered with this, and made once. */
  readonly changesMade = new Map<string, WireRecipe>()
  /** A request answered from here on waits for this, so a test can catch one under way. */
  holdAnswers: Promise<void> | undefined
  /** How many requests were cut off by the asker before their answer:  a real abort reaches the server. */
  cutOff = 0
  /** How many recipes it's made ids for. */
  private idsMade = 0
  /** The last version it gave. */
  private lastVersion = 0

  constructor(recipes: readonly Omit<WireRecipe, "version">[] = FIRST_RECIPES) {
    for (const recipe of recipes) this.recipes.set(recipe.id, { ...recipe, version: ++this.lastVersion })
  }

  /** Add a recipe:  the id it came with, or a new one. */
  add(fields: Partial<WireRecipe>): WireRecipe {
    let id = fields.id
    while (id === undefined || (fields.id === undefined && this.recipes.has(id))) id = `made-${++this.idsMade}`
    const recipe: WireRecipe = {
      name: "",
      cuisine: "",
      servings: 0,
      notes: "",
      ...fields,
      id,
      version: ++this.lastVersion
    }
    this.recipes.set(id, recipe)
    return recipe
  }

  /** Change a recipe:  its version moves on.  This is also how a test is someone else. */
  change(id: string, fields: Partial<WireRecipe>): WireRecipe {
    const recipe = { ...this.recipes.get(id)!, ...fields, id, version: ++this.lastVersion }
    this.recipes.set(id, recipe)
    return recipe
  }

  /** Take a recipe out. */
  remove(id: string): void {
    this.recipes.delete(id)
  }

  /** Called before each request is answered:  a box with its recipes somewhere else looks there. */
  readOutsideChanges(): void {}
}

/** How a `restHandler()` behaves. */
export type RestServerProps = {
  /** How it says versions:  a field in every row, an `ETag` on answers about one thing, or not at all. */
  versions?: "field" | "etag" | "none"
  /** How its list pages. */
  paging?: "offset" | "cursor" | "link" | "none"
  /** Does its `POST` make the id? */
  makesIds?: boolean
}

/** A recipe's address. */
const ONE_RECIPE = /^\/recipes\/([^/]+)$/

/**
 * The web service, at `/recipes`.
 * - `?name=...`, `?cuisine=...` filter;  `?sort=name,-servings` orders;  `?fields=id,name` selects.
 * - An update with `versions` needs `If-Match`:  428 with none, 412 with an old one.
 * - An `Idempotency-Key` it's seen answers what that change made, and makes nothing.
 * - An unknown id:  404.  `{ "refuse": true }` in a body:  422.
 */
export function restHandler(box: RecipeBox, props: RestServerProps = {}): Handler {
  const { versions = "none", paging = "none", makesIds = false } = props
  const tag = (recipe: WireRecipe) => (versions === "etag" ? `"v${recipe.version}"` : `${recipe.version}`)
  const wire = (recipe: WireRecipe) => {
    if (versions === "field") return recipe
    const { version: _version, ...rest } = recipe
    return rest
  }
  return async (request, reply, next) => {
    if (answeredAcrossOrigins(request, reply)) return
    const { path, method } = request
    const isList = path === "/recipes"
    const one = ONE_RECIPE.exec(path)
    if (!isList && !one) return next()
    const body = await bodyOf(request)
    await noteAsk(box, request, reply, body)

    if (isList && method === "GET") return listRecipes(box, request, reply, { paging, wire })

    if (isList && method === "POST") {
      const key = request.get("Idempotency-Key")
      const made = key === undefined ? undefined : box.changesMade.get(key)
      if (made) return void reply.status(201).json(wire(made))
      if (body?.refuse) return void reply.status(422).json({ error: "this box won't take that" })
      const { id, ...fields } = body ?? {}
      const recipe = box.add({ ...fields, ...(!makesIds && { id: id as string }) })
      if (key !== undefined) box.changesMade.set(key, recipe)
      if (versions === "etag") reply.set("ETag", tag(recipe))
      return void reply.status(201).json(wire(recipe))
    }

    if (!one) return next()
    const id = decodeURIComponent(one[1]!)
    const recipe = box.recipes.get(id)
    if (!recipe) return void reply.status(404).json({ error: `no recipe "${id}"` })
    if (method === "GET") {
      if (versions === "etag") reply.set("ETag", tag(recipe))
      return void reply.json(wire(recipe))
    }
    if (method === "DELETE") {
      box.remove(id)
      return void reply.status(204).end()
    }
    if (method === "PATCH" || method === "PUT") {
      if (body?.refuse) return void reply.status(422).json({ error: "this box won't take that" })
      const asked = request.get("If-Match")
      if (versions !== "none") {
        if (asked === undefined) return void reply.status(428).json({ error: "say which version:  If-Match" })
        if (asked !== tag(recipe)) return void reply.status(412).json({ error: "that recipe has moved on" })
      }
      const changed = box.change(id, body ?? {})
      if (versions === "etag") reply.set("ETag", tag(changed))
      return void reply.json(wire(changed))
    }
    next()
  }
}

/** Answer `GET /recipes`. */
function listRecipes(
  box: RecipeBox,
  request: SRV.Request,
  reply: SRV.Reply,
  { paging, wire }: { paging: string; wire: (recipe: WireRecipe) => Partial<WireRecipe> }
): void {
  const { sort, fields, limit, offset, cursor, ...filter } = request.query as Record<string, string | undefined>
  let rows = [...box.recipes.values()].filter((recipe) =>
    Object.entries(filter).every(([field, value]) => `${recipe[field as keyof WireRecipe]}` === value)
  )
  for (const each of (sort ?? "").split(",").filter(Boolean).reverse()) {
    const isDown = each.startsWith("-")
    const field = (isDown ? each.slice(1) : each) as keyof WireRecipe
    rows = [...rows].sort(
      (one, other) => (one[field] < other[field] ? -1 : one[field] > other[field] ? 1 : 0) * (isDown ? -1 : 1)
    )
  }
  const start = Number(offset ?? cursor ?? 0)
  const size = limit === undefined ? (paging === "none" ? rows.length : 2) : Number(limit)
  const end = start + size
  const page = (paging === "none" ? rows : rows.slice(start, end)).map(wire)
  const selected = fields ? page.map((row) => selectFrom(row, fields.split(","))) : page
  const hasMore = paging !== "none" && end < rows.length
  if (paging === "cursor") {
    reply.json({ data: selected, meta: { next: hasMore ? String(end) : null } })
    return
  }
  if (paging === "link" && hasMore) {
    reply.set("Link", `<http://${request.get("Host")}/recipes?cursor=${end}&limit=${size}>; rel="next"`)
  }
  reply.json(selected)
}

/** `row`, with only `fields`. */
function selectFrom(row: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([field]) => fields.includes(field)))
}

////////////////
// ## GraphQL
////////////////

/** One thing a query selects. */
type Selected = {
  /** The key it answers under. */
  key: string
  /** The server's name for it. */
  name: string
  /** Its arguments:  each `name: $variable`. */
  args: Record<string, string>
  /** What's selected of it. */
  inside: Selected[]
}

/** The one schema it knows:  what's selectable of a recipe. */
const RECIPE_FIELDS = new Set(["id", "name", "cuisine", "servings", "notes", "version"])

/**
 * The GraphQL service, at `/graphql`:
 * - `recipes(filter, first, after) { edges { node } pageInfo { hasNextPage endCursor } }`
 * - `recipe(id)`
 * - `addRecipe(input)`, `changeRecipe(id, input)`, `removeRecipe(id)`
 */
export function graphHandler(box: RecipeBox): Handler {
  return async (request, reply, next) => {
    if (answeredAcrossOrigins(request, reply)) return
    if (request.path !== "/graphql" || request.method !== "POST") return next()
    const body = (await bodyOf(request)) as { query: string; variables?: Record<string, unknown> }
    await noteAsk(box, request, reply, body)
    const { query, variables = {} } = body
    try {
      const data: Record<string, unknown> = {}
      for (const selected of readSelection(query)) data[selected.key] = answerTo(box, selected, variables)
      reply.json({ data })
    } catch (error) {
      const { message, code } = error as GraphFailure
      reply.json({ errors: [{ message, extensions: { code } }] })
    }
  }
}

/** What a query's asked for went wrong. */
class GraphFailure extends Error {
  constructor(
    message: string,
    /** Its `extensions.code`. */
    readonly code: string
  ) {
    super(message)
  }
}

/** Answer one root field. */
function answerTo(box: RecipeBox, { name, args, inside }: Selected, variables: Record<string, unknown>): unknown {
  const value = (arg: string) => variables[(args[arg] ?? "").slice(1)]
  const row = (recipe: WireRecipe | undefined) => recipe && selectRow(recipe, inside)
  const id = value("id") as string
  const known = () => {
    const recipe = box.recipes.get(id)
    if (!recipe) throw new GraphFailure(`no recipe "${id}"`, "NOT_FOUND")
    return recipe
  }
  switch (name) {
    case "recipes": {
      const filter = (value("filter") ?? {}) as Record<string, unknown>
      const rows = [...box.recipes.values()].filter((recipe) =>
        Object.entries(filter).every(([field, wanted]) => recipe[field as keyof WireRecipe] === wanted)
      )
      const start = Number(value("after") ?? 0)
      const size = Number(value("first") ?? rows.length)
      const end = start + size
      const edges = inside.find((each) => each.name === "edges")?.inside[0]?.inside ?? []
      return {
        edges: rows.slice(start, end).map((recipe) => ({ node: selectRow(recipe, edges) })),
        pageInfo: { hasNextPage: end < rows.length, endCursor: String(end) }
      }
    }
    case "recipe":
      return row(box.recipes.get(id)) ?? null
    case "addRecipe": {
      const input = value("input") as Partial<WireRecipe> & { refuse?: boolean }
      if (input.refuse) throw new GraphFailure("this box won't take that", "BAD_USER_INPUT")
      return row(box.add(input))
    }
    case "changeRecipe": {
      known()
      return row(box.change(id, value("input") as Partial<WireRecipe>))
    }
    case "removeRecipe":
      known()
      box.remove(id)
      return true
    default:
      throw new GraphFailure(`no field "${name}"`, "GRAPHQL_VALIDATION_FAILED")
  }
}

/** `recipe`, with only what's selected, each under its alias. */
function selectRow(recipe: WireRecipe, selection: readonly Selected[]): Record<string, unknown> {
  return Object.fromEntries(
    selection.map(({ key, name }) => {
      if (!RECIPE_FIELDS.has(name))
        throw new GraphFailure(`a recipe has no field "${name}"`, "GRAPHQL_VALIDATION_FAILED")
      return [key, recipe[name as keyof WireRecipe]]
    })
  )
}

/** The root selection of `query`, as `GraphPlace` writes one. */
function readSelection(query: string): Selected[] {
  const tokens: string[] = query.match(/[{}()]|[$\w]+|:|!|\[|\]/g) ?? []
  let at = tokens.indexOf("{") + 1
  /** What's between here and the matching `}`. */
  const readBlock = (): Selected[] => {
    const selected: Selected[] = []
    while (at < tokens.length && tokens[at] !== "}") {
      const key = tokens[at++]!
      let name = key
      if (tokens[at] === ":") {
        name = tokens[at + 1]!
        at += 2
      }
      const args: Record<string, string> = {}
      if (tokens[at] === "(") {
        at++
        while (tokens[at] !== ")") {
          args[tokens[at]!] = tokens[at + 2]!
          at += 3
        }
        at++
      }
      let inside: Selected[] = []
      if (tokens[at] === "{") {
        at++
        inside = readBlock()
        at++
      }
      selected.push({ key, name, args, inside })
    }
    return selected
  }
  return readBlock()
}

////////////////
// ## Both
////////////////

/**
 * Every answer says any page may read it, which the demo needs:  its page is on another port.
 * - Answers `OPTIONS`, and says so.
 */
export function answeredAcrossOrigins(request: SRV.Request, reply: SRV.Reply): boolean {
  reply.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, If-Match, Idempotency-Key, x-server-token",
    "Access-Control-Expose-Headers": "ETag, Link",
    "Cache-Control": "no-store"
  })
  if (request.method !== "OPTIONS") return false
  reply.status(204).end()
  return true
}

/** The JSON a request brought. */
async function bodyOf(request: SRV.Request): Promise<Record<string, unknown> | undefined> {
  const text = (await SRV.readBody(request.raw)).toString()
  return text ? (JSON.parse(text) as Record<string, unknown>) : undefined
}

/** Write down what's asked, and wait while the box holds answers.  An asker that gives up is counted. */
async function noteAsk(
  box: RecipeBox,
  { method, path, query, headers }: SRV.Request,
  reply: SRV.Reply,
  body: Record<string, unknown> | undefined
): Promise<void> {
  box.asks.push({ method, path, query, headers, ...(body && { body }) })
  if (box.asks.length > ASKS_KEPT) box.asks.shift()
  reply.raw.once("close", () => {
    if (!reply.raw.writableEnded) box.cutOff++
  })
  await box.holdAnswers
  box.readOutsideChanges()
}

/** The token the demo's place server wants:  the demo's page knows it. */
export const DEMO_TOKEN = "recipe-box-demo"

/** A page on any local port. */
const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/

/**
 * The demo's guard:  its pages are served from elsewhere (the page server, the editor), on other ports,
 * so they can't know this run's token, and aren't this server's own origin.
 * - Any page on this machine may write, token or no token:  the editor's running program has no way to say a token.
 *   - A browser sets `Origin` itself, so a page can't lie about it.
 * - With no `Origin`, not a page:  the fixed token.
 * - Fine ONLY for a demo on your own machine:  a page on it can change this folder,
 *   and spend a Google Sheet's key, if the servers were started with one.
 *   The fixed token, written in the demo's own page, never stopped that either.
 */
export class DemoGuard extends SRV.Guard {
  constructor() {
    super({ token: DEMO_TOKEN })
  }

  /** Any local page;  anything else that isn't a page, with the token. */
  checkWrite(request: SRV.Request): void {
    const origin = request.get("origin")
    if (origin) {
      if (!LOCAL_ORIGIN.test(origin)) throw new SRV.HttpError(403, "wrong origin")
      return
    }
    if (request.get("x-server-token") !== DEMO_TOKEN) throw new SRV.HttpError(403, "bad token")
  }
}

/** Both servers, each at its own address, for one box.  What `scripts/recipe-servers.ts` runs. */
export function bothHandlers(box: RecipeBox, props: RestServerProps = { versions: "field" }): Handler {
  const rest = restHandler(box, props)
  const graph = graphHandler(box)
  return (request, reply, next) => {
    if (request.path === "/graphql") return graph(request, reply, next)
    return rest(request, reply, next)
  }
}
