import { jsonIn, valueAt, WebPlace, type WebPlaceProps } from "./WebPlace"
import {
  canDoAll,
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type ListHandled,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceErrorKind,
  type PlaceRow,
  type SelectingContext
} from "./places.types"

/** How many rows it asks for at a time on a place that pages, when nobody says. */
const GRAPH_PAGE_SIZE = 100

/** What it can do, unless it's told otherwise:  it always asks for only the fields wanted. */
const GRAPH_CAPABILITIES: PlaceCapabilities = {
  kind: "graph service",
  idOf: "id",
  filter: "none",
  sort: "none",
  select: "every field",
  page: "none",
  write: "none",
  atomic: false,
  live: "poll",
  abort: "hard"
}

/** What a server's error code (`extensions.code`) means.  A code not here is a refusal:  it answered, and said no. */
const GRAPH_ERROR_KINDS: Readonly<Record<string, PlaceErrorKind>> = {
  NOT_FOUND: "not found",
  CONFLICT: "out of date",
  OUT_OF_DATE: "out of date"
}

/** The field a selection line asks for, by the name we call it:  `title: name` and `author { name }` both start with it. */
const FIRST_NAME = /^\s*(\w+)/

/** `title: name`:  we call it `title`, the server `name`. */
const ALIAS = /^\s*(\w+)\s*:\s*(\w+)/

/****************
 * ### `GraphPlace`
 * A GraphQL service as a place:  a plain `POST`, with no library, from a mapping (epic `data` P4).
 *
 * ```ts
 * new GraphPlace({
 *   url: "https://example.com/graphql",
 *   collections: {
 *     recipes: {
 *       list: "recipes",
 *       one: "recipe",
 *       fields: ["id", "title: name", "author { name }"],
 *       filter: "RecipeFilter",
 *       insert: { mutation: "addRecipe", input: "RecipeInput!" },
 *       update: { mutation: "changeRecipe", id: "ID!", input: "RecipePatch!" },
 *       delete: { mutation: "removeRecipe", id: "ID!" }
 *     }
 *   }
 * })
 * ```
 *
 * - The query is built from what's asked:  ONLY the fields selected, and the id.
 *   A name it wasn't told of throws, so no text from a query ever reaches the query's text.
 * - Every value goes in a variable.
 * - Mutations are named in the mapping, one per kind of write;  a collection that names none takes none.
 * - An answer with `errors` is an answer:  it's thrown as a `PlaceError`, by its `extensions.code`, so it isn't resent.
 *   A 5xx, or no answer at all, resends (`WebPlace`).
 * - `operations`:  any other query or mutation, by name, for `call()`.
 * - Sends no versions:  no two GraphQL services say them the same way, so the last save wins that field.
 * - No subscriptions.
 ****************/
export class GraphPlace extends WebPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Each collection's mapping. */
  private readonly collections: Readonly<Record<string, GraphCollection>>
  /** Other queries and mutations, by name. */
  private readonly operations: Readonly<Record<string, string>>
  /** How many rows it asks for at a time. */
  private readonly pageSize: number

  constructor({ collections, can, operations = {}, pageSize = GRAPH_PAGE_SIZE, ...rest }: GraphPlaceProps) {
    super(rest)
    this.collections = collections
    this.operations = operations
    this.pageSize = pageSize
    const all = Object.values(collections)
    const write = (["insert", "update", "delete"] as const).filter((kind) => all.some((mapping) => mapping[kind]))
    const paging = all.find(({ paging }) => paging)?.paging
    const page = paging === "connection" ? "cursor" : (paging ?? "none")
    this.capabilities = { ...GRAPH_CAPABILITIES, write: write.length ? write : "none", page, ...can }
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  ////////////////
  // ## Reading
  ////////////////

  /** One page of `collection`, with only the fields asked for.  - throws `PlaceError`;  `TypeError` for a name it doesn't know */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const mapping = this.mappingOf(collection)
    const { paging } = mapping
    const handled: ListHandled = { ...(query.select && { select: true }) }
    const { argumentTexts, typeTexts, variables } = this.listArguments(mapping, query, handled)
    const selection = this.selectionFor(collection, mapping, query.select)
    const inner =
      paging === "connection" ? `edges { node { ${selection} } } pageInfo { hasNextPage endCursor }` : selection
    const declared = typeTexts.length ? `(${typeTexts.join(", ")})` : ""
    const called = argumentTexts.length ? `(${argumentTexts.join(", ")})` : ""
    const text = `query List${declared} { ${mapping.list}${called} { ${inner} } }`
    const data = (await this.ask(text, variables, context)) as Record<string, unknown>
    const answered = data[mapping.list]
    if (paging === "connection") {
      const { edges, pageInfo } = answered as GraphConnection
      const nextPage = pageInfo.hasNextPage ? pageInfo.endCursor : undefined
      return { rows: edges.map(({ node }) => node), ...(nextPage && { nextPage }), handled }
    }
    if (!Array.isArray(answered)) {
      throw new TypeError(
        `GraphPlace.list():  "${mapping.list}" didn't answer with a list;  say how it pages with \`paging\``
      )
    }
    const rows = answered as PlaceRow[]
    if (paging !== "offset") return { rows, handled }
    const { size, start } = this.offsetPage(query)
    return { rows, ...(rows.length === size && { nextPage: String(start + size) }), handled }
  }

  /** The rows of `collection` with these ids:  one query, if the mapping names `one`;  else it lists and looks. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    if (!ids.length) return []
    const mapping = this.mappingOf(collection)
    const { one, id: idType = "ID!" } = mapping
    const selection = this.selectionFor(collection, mapping, context.select)
    if (!one) {
      const { idOf } = this.capabilities
      const { rows } = await this.list(collection, {}, context)
      return rows.filter((row) => ids.includes(`${row[idOf ?? "id"] as string}`))
    }
    const typeTexts = ids.map((_id, index) => `$id${index}: ${idType}`)
    const parts = ids.map((_id, index) => `row${index}: ${one}(id: $id${index}) { ${selection} }`)
    const variables = Object.fromEntries(ids.map((id, index) => [`id${index}`, id]))
    const data = (await this.ask(
      `query Many(${typeTexts.join(", ")}) { ${parts.join(" ")} }`,
      variables,
      context
    )) as Record<string, PlaceRow | null>
    return Object.values(data).filter((row) => !!row) as PlaceRow[]
  }

  /** Run the operation it was told is called `name`, with `input` as its variables.  - throws `PlaceError` if there's none */
  async call(name: string, input: unknown, context: SelectingContext): Promise<unknown> {
    const text = this.operations[name]
    if (text === undefined) {
      throw new PlaceError(`GraphPlace.call():  no operation is named "${name}";  add it to \`operations\``, {
        cause: { kind: "not found" }
      })
    }
    return this.ask(text, input as Record<string, unknown>, context)
  }

  ////////////////
  // ## Writing
  ////////////////

  /** Make these changes, one mutation at a time, in order.  - throws `PlaceError`;  what came before it stays made */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    const rows: PlaceRow[] = []
    for (const change of changes) {
      const row = await this.makeChange(change, context)
      if (row) rows.push(row)
    }
    return { rows }
  }

  /** One mutation:  its row, if it answered with one.  - throws `PlaceError` `"refused"` if the mapping names none */
  private async makeChange(change: PlaceChange, context: PlaceContext): Promise<PlaceRow | undefined> {
    const { kind, collection, id, fields = {}, changeId } = change
    const mapping = this.mappingOf(collection)
    const mutation = mapping[kind]
    if (!mutation) {
      throw new PlaceError(
        `GraphPlace.apply():  "${collection}" names no mutation to ${kind} with;  add it to its mapping`,
        {
          cause: { kind: "refused", whyNot: "place" }
        }
      )
    }
    const typeTexts: string[] = []
    const argumentTexts: string[] = []
    const variables: Record<string, unknown> = {}
    if (mutation.id && id !== undefined) {
      typeTexts.push(`$id: ${mutation.id}`)
      argumentTexts.push("id: $id")
      variables.id = id
    }
    if (mutation.input) {
      typeTexts.push(`$input: ${mutation.input}`)
      argumentTexts.push("input: $input")
      variables.input = this.onTheWire(mapping, fields)
    }
    const selection =
      kind === "delete" ? mutation.selection : (mutation.selection ?? this.selectionFor(collection, mapping))
    const asked = selection ? ` { ${selection} }` : ""
    const declared = typeTexts.length ? `(${typeTexts.join(", ")})` : ""
    const called = argumentTexts.length ? `(${argumentTexts.join(", ")})` : ""
    const text = `mutation Change${declared} { ${mutation.mutation}${called}${asked} }`
    const data = (await this.ask(text, variables, context, changeId)) as Record<string, unknown>
    const row = data[mutation.mutation]
    return kind !== "delete" && row && typeof row === "object" ? (row as PlaceRow) : undefined
  }

  ////////////////
  // ## The mapping
  ////////////////

  /** `collection`'s mapping.  - throws `TypeError` if it has none:  GraphQL has no default */
  private mappingOf(collection: string): GraphCollection {
    const mapping = this.collections[collection]
    if (!mapping) throw new TypeError(`GraphPlace:  no mapping for "${collection}";  add it to \`collections\``)
    return mapping
  }

  /** What the list's filter, sort and page become:  arguments, their types and their values.  Notes what it did. */
  private listArguments(mapping: GraphCollection, query: ListQuery, handled: ListHandled) {
    const { filter = {}, sort = [] } = query
    const { filter: canFilter, sort: canSort } = this.capabilities
    const argumentTexts: string[] = []
    const typeTexts: string[] = []
    const variables: Record<string, unknown> = {}
    const add = (name: string, type: string, value: unknown) => {
      argumentTexts.push(`${name}: $${name}`)
      typeTexts.push(`$${name}: ${type}`)
      variables[name] = value
    }
    const filtering = Object.keys(filter)
    if (mapping.filter && filtering.length && canDoAll(canFilter, filtering)) {
      add("filter", mapping.filter, this.onTheWire(mapping, filter))
      handled.filter = true
    }
    if (
      mapping.sort &&
      sort.length &&
      canDoAll(
        canSort,
        sort.map(({ field }) => field)
      )
    ) {
      const names = namesOf(mapping)
      add(
        "sort",
        mapping.sort,
        sort.map(({ field, descending }) => ({ field: names[field] ?? field, descending: !!descending }))
      )
      handled.sort = true
    }
    if (mapping.paging === "connection") {
      add("first", "Int", query.page?.size ?? this.pageSize)
      if (query.page?.at !== undefined) add("after", "String", query.page.at)
    } else if (mapping.paging === "offset") {
      const { size, start } = this.offsetPage(query)
      add("limit", "Int", size)
      add("offset", "Int", start)
    }
    return { argumentTexts, typeTexts, variables }
  }

  /** Where this page starts, and how long it is. */
  private offsetPage({ page }: ListQuery): { size: number; start: number } {
    return { size: page?.size ?? this.pageSize, start: Number(page?.at ?? 0) }
  }

  /**
   * What to select:  every field in the mapping, or only those of `select`, and the id.
   * - throws `TypeError` for a name it wasn't told of
   */
  private selectionFor(collection: string, { fields }: GraphCollection, select?: readonly string[]): string {
    if (!select) return fields.join(" ")
    const { idOf } = this.capabilities
    const byName = new Map(fields.map((line) => [FIRST_NAME.exec(line)?.[1], line]))
    const wanted = new Set([...(idOf === undefined ? [] : [idOf]), ...select])
    return [...wanted]
      .map((name) => {
        const line = byName.get(name)
        if (line === undefined) {
          throw new TypeError(`GraphPlace:  "${collection}" has no field "${name}";  add it to its \`fields\``)
        }
        return line
      })
      .join(" ")
  }

  /** `row`, named as the server names its fields. */
  private onTheWire(mapping: GraphCollection, row: PlaceRow): PlaceRow {
    const names = namesOf(mapping)
    return Object.fromEntries(Object.entries(row).map(([field, value]) => [names[field] ?? field, value]))
  }

  /**
   * `POST` one query:  what's in its answer's `data`.
   * - throws `PlaceError` if it answered with `errors`:  a code it knows means what `GRAPH_ERROR_KINDS` says, else refused
   */
  private async ask(
    query: string,
    variables: Record<string, unknown>,
    context: PlaceContext,
    changeId?: string
  ): Promise<unknown> {
    const response = await this.answerTo(
      { url: this.url, method: "POST", data: { query, variables } },
      context,
      changeId
    )
    const { data, errors } = ((await jsonIn(response)) ?? {}) as GraphAnswer
    const [first] = errors ?? []
    if (first) {
      const kind = GRAPH_ERROR_KINDS[`${valueAt(first, "extensions.code") as string}`] ?? "refused"
      const name = /(query|mutation)/.exec(query)?.[1]
      throw new PlaceError(`GraphPlace:  ${name} refused:  ${first.message}`, {
        cause: { kind, ...(kind === "refused" && { whyNot: "place" }) }
      })
    }
    return data ?? {}
  }
}

/** Constructor props of a `GraphPlace`. */
export type GraphPlaceProps = WebPlaceProps & {
  /** Each collection's mapping, by the name we call it. */
  collections: Readonly<Record<string, GraphCollection>>
  /** What this API does for itself:  what's left out comes from the mappings.  Filter and sort are declared per API. */
  can?: Partial<PlaceCapabilities>
  /** Any other query or mutation, by name, for `call()`:  its whole text. */
  operations?: Readonly<Record<string, string>>
  /** How many rows it asks for at a time on a place that pages, when nobody says;  default 100. */
  pageSize?: number
}

/** How one collection maps onto the schema. */
export type GraphCollection = {
  /** The root field that lists it. */
  list: string
  /** The root field that finds one by id, as `one(id: $id)`.  Left out:  it lists, and looks. */
  one?: string
  /** That id's type;  default `ID!`. */
  id?: string
  /**
   * Every field, as a selection says it, by the name we call it:
   * `id`, `title: name` (we say `title`, the server `name`), `author { name }`.
   */
  fields: readonly string[]
  /** The type of its `filter` argument, which takes the filter's fields as an object.  Left out:  it can't. */
  filter?: string
  /** The type of its `sort` argument, which takes a list of `{ field, descending }`.  Left out:  it can't. */
  sort?: string
  /**
   * How a list pages:
   * - `"connection"`:  `first` and `after`, answering `edges { node }` and `pageInfo`
   * - `"offset"`:  `limit` and `offset`, answering the list
   * - Left out:  it doesn't
   */
  paging?: "connection" | "offset"
  /** The mutation that inserts. */
  insert?: GraphMutation
  /** The mutation that updates. */
  update?: GraphMutation
  /** The mutation that deletes. */
  delete?: GraphMutation
}

/** One mutation, as a place calls it:  `mutation(id: $id, input: $input) { ... }`. */
export type GraphMutation = {
  /** Its name. */
  mutation: string
  /** The type of its `id` argument.  Left out:  it takes none. */
  id?: string
  /** The type of its `input` argument, which takes the fields.  Left out:  it takes none. */
  input?: string
  /** What to select of its answer.  Left out:  every field, or nothing for a delete, which usually answers a scalar. */
  selection?: string
}

/** What a server answers. */
type GraphAnswer = {
  /** What was asked for. */
  data?: unknown
  /** What went wrong. */
  errors?: { message: string; extensions?: { code?: string } }[]
}

/** A Relay-style page of rows. */
type GraphConnection = {
  /** The rows. */
  edges: { node: PlaceRow }[]
  /** Where it stands. */
  pageInfo: { hasNextPage: boolean; endCursor?: string }
}

/** Each field's name on the server, by ours:  from the aliases in `fields`. */
function namesOf({ fields }: GraphCollection): Record<string, string> {
  const names: Record<string, string> = {}
  for (const line of fields) {
    const [, ours, theirs] = ALIAS.exec(line) ?? []
    if (ours && theirs) names[ours] = theirs
  }
  return names
}
