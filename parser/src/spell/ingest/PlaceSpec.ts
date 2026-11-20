import { P } from "spell/parser/parser"
import { oneOfWords } from "spell/parser/core/schemaWords"

import type {
  CollectionLook,
  FieldDescription,
  FieldKind,
  ListUnderSeen,
  OperationDescription,
  PagesWith,
  PlaceLook
} from "./ingest.types"
import { wordsFor } from "./PlaceShape"

/** The names a list's rows usually go under, in a wrapped answer:  NetBox's `results`. */
const ROWS_NAMES = ["results", "data", "items", "records", "rows"]

/** How deep it reads objects inside objects:  as deep as a look at rows reads (`PlaceShape`'s). */
const DEEPEST_INSIDE = 3

/** The methods that write, and the write each is on a collection's own address. */
const WRITE_METHODS = ["post", "put", "patch", "delete"] as const

/** A local reference's start:  `#/components/schemas/Tenant`. */
const LOCAL_REF = /^#\//

/** A path with a brace in it:  a thing by its id. */
const HAS_BRACE = /\{[^{}/]+\}/

/** What a list's question saying how many is called, when it pages by offset:  FastAPI's `limit`. */
const LIMIT_NAMES = /^(limit|page_?size|per_?page|size|take|top|max_?results)$/i

/** What a list's question saying where from is called, when it pages by offset:  `offset`, FastAPI's `skip`. */
const OFFSET_NAMES = /^(offset|skip|start)$/i

/** What a search's question is called:  `q`, `query`, `search`. */
const SEARCH_NAMES = /^(q|query|search|term|keywords?|text)$/i

/** Why an object that's a map by name is left out:  `custom_fields`. */
const MAP_BY_NAME = "Its schema says it's a map by name, each key its own:  read it by hand, a type of its own."

/** Why something too far inside others is left out. */
const TOO_DEEP = "It's too far inside others:  read it by hand, a type of its own."

/** Why a field that may hold one of several kinds is left out:  `anyOf: [{ type: "integer" }, { type: "string" }]`. */
const SEVERAL_KINDS = "Its schema says it holds one of several kinds:  read it by hand, a type of its own."

/****************
 * ### `PlaceSpec`
 * An OpenAPI description, read whole as a look at a place (epic `data` P49, J250, J253):
 * every path, method, parameter, request body and response, each `$ref` resolved.
 *
 * ```ts
 * const look = new PlaceSpec(document, "https://demo.netbox.dev/api/schema/").lookAt("https://demo.netbox.dev")
 * look.collections[0]  // => { name: "tenants", at: "/api/tenancy/tenants/", fields: { name: { words: "name", type: "text", isRequired: true, ... } }, rows: [] }
 * ```
 *
 * - A look like any other (`PlaceLook`):  `describeLook()` and everything after it stay as they are.
 *   Its collections carry their fields from the schemas, so they read no rows.
 * - A collection is a path its `GET` answers a list at, with no braces;  its thing by id is that path with one
 *   (`/tenants/{id}/`).
 * - What can be done to one:  `add` (a `POST` to its own address), `change` (`PUT` or `PATCH` by id), `delete`, and each
 *   action route under a thing by id, by its last word (`/background-tasks/{id}/enqueue/` is `enqueue`).
 * - ONE thing under each of a collection's things, a `GET` answering one object (`/instances/{id}/snapshot`):
 *   a collection of its own, by its last word too, read as part of its owner
 *   (`recordsUnder()`, epic `from-console` P16).
 * - A reference into another file or address is named in the notes, and its field left untyped:  only local ones are
 *   followed, by a small reader of its own (no dependency).
 * - 3.0's and 3.1's ways to say a field may hold nothing read the same (epic `data` I109):
 *   `nullable: true`, `type: ["string", "null"]`, and FastAPI's `anyOf: [{ $ref }, { type: "null" }]`
 *   are each the one kind, never required.
 * - What FastAPI services say, in a place's existing words (epic `data` I140, P56):
 *   - a list taking `limit` and `offset` pages by offset, `its next page is asked for with "limit" and "offset"`,
 *     up to its limit's `maximum` at a time;  the way most lists do it is the place's, and a list that pages its own
 *     way keeps its own (`pagesWith`), said one step in under its `live at` line
 *   - a list needing its `q` is searched only, `searches are searched at "/api/search"`
 *   - a list needing another question is asked for by it, `runs are asked for by their team`, as Open-Meteo's
 *     forecasts are:  its example is what a verify asks with
 *   - a list under each thing, `/jobs/{job_id}/steps`, is a collection read from there, `a job's steps live at "..."`;
 *     an action on one of those, `/jobs/{job_id}/steps/{step_id}/retry`, is its type's action
 * - Plain data:  it reads nothing, so a test hands it a saved description.
 ****************/
export class PlaceSpec {
  /** The description. */
  readonly document: OpenApiDocument
  /** Where it was read from. */
  readonly at: string
  /** What reading it had to say. */
  private readonly notes: string[] = []

  constructor(document: OpenApiDocument, at: string) {
    this.document = document
    this.at = at
  }

  /** Is this an OpenAPI description, 3.0 or 3.1?  Swagger 2 isn't read yet. */
  static isOne(value: unknown): value is OpenApiDocument {
    const openapi = (value as OpenApiDocument | undefined)?.openapi
    return typeof openapi === "string" && /^3\./.test(openapi)
  }

  /**
   * The place at `address`, as its description says it.
   * - `address`'s own path is taken off each path under it:  `https://acme.test/api` and `/api/jobs/` is `/jobs/`.
   */
  lookAt(address: string): PlaceLook {
    const place = address.replace(/\/+$/, "")
    const prefix = new URL(place.replace(/^file:/, "http:")).pathname.replace(/\/+$/, "")
    const paths = this.document.paths ?? {}
    const collections: CollectionLook[] = []
    const specPaths = new Map<CollectionLook, string>()
    const paged: PagesWith[] = []
    for (const [path, item] of Object.entries(paths)) {
      if (HAS_BRACE.test(path) || !item?.get) continue
      // no list in its answer's schema, but things by id under it:  a collection all the same, untyped till a read fills it
      const rows = this.rowsOf(item.get) ?? (hasThingsUnder(path, paths) ? { item: {} } : undefined)
      if (!rows) continue
      const at = underPlace(path, prefix)
      const search = this.searchOf(item.get)
      const askedBy = this.askedByOf(path, item.get, search?.param)
      const pages = search ? undefined : this.offsetPagingOf(item.get, rows.answer)
      if (pages) paged.push(pages)
      const collection: CollectionLook = {
        name: lastWordOf(path),
        at,
        rows: [],
        paging: rows.nextAt ? "next field" : "none",
        pagesRead: 0,
        hasMore: false,
        ...(rows.rowsAt !== undefined && { rowsAt: rows.rowsAt }),
        ...(rows.nextAt !== undefined && { nextAt: rows.nextAt }),
        ...(this.takesLimit(item) && { takesLimit: true }),
        ...(pages && { pagesWith: pages }),
        ...(askedBy && { askedBy }),
        ...(rows.schemaAt !== undefined && { schemaAt: rows.schemaAt }),
        ...(item.get.tags?.[0] !== undefined && { tag: item.get.tags[0] }),
        // a search needing its question:  `searches are searched at "/api/search"`, never read as a plain list
        ...(search && {
          searchedOnly: true,
          searchedBy: { param: search.param, field: "", searchesEverything: true },
          ...(search.example !== undefined && { searchedFor: search.example })
        }),
        idAt: "id",
        fields: this.withAskedFields(this.fieldsOf(rows.item, rows.schemaAt ?? path), item.get, askedBy, path),
        operations: this.operationsOf(path, at, paths)
      }
      collections.push(collection)
      specPaths.set(collection, path)
    }
    const pagesWith = pagesWithOf(paged)
    const records = this.recordsUnder(paths, prefix, specPaths)
    collections.push(...records.map(({ record }) => record))
    this.actionsDeeper(paths, prefix, records)
    nameApart(collections)
    for (const collection of collections) {
      if (!("id" in (collection.fields ?? {}))) delete collection.idAt
    }
    return {
      address: place,
      collections,
      headers: {},
      docs: this.summary(collections),
      writesOffered: [...new Set(collections.flatMap(({ operations }) => Object.keys(operations ?? {})))],
      ...(records.length && {
        listsUnder: records.map(({ owner, record, isOne }): ListUnderSeen => ({
          owner: owner.name,
          list: record.name,
          at: record.at,
          ...(isOne && { isOne })
        }))
      }),
      docsAt: this.at,
      specAt: this.at,
      ...(this.document.info?.version && {
        version: { says: this.document.info.version, where: "its OpenAPI description" }
      }),
      // every list that pages by offset, the way most do:  `its next page is asked for with "limit" and "offset"`
      ...(pagesWith && { serverTakes: { pagesWith } }),
      notes: [...new Set(this.notes)]
    }
  }

  ////////////////
  // ## Lists
  ////////////////

  /** Where a `GET`'s list is:  its rows' schema, and where they are in a wrapped answer.  `undefined` for no list. */
  private rowsOf(operation: OpenApiOperation): ListAt | undefined {
    const answer = this.resolved(this.answerOf(operation))
    if (!answer) return undefined
    if (answer.type === "array" && answer.items) return { item: answer.items, answer, ...this.itemAt(answer.items) }
    const properties = answer.properties ?? {}
    const lists = Object.entries(properties).filter(([, each]) => this.resolved(each)?.type === "array")
    const [rowsAt, list] = lists.find(([name]) => ROWS_NAMES.includes(name)) ?? (lists.length === 1 ? lists[0]! : [])
    const items = list && this.resolved(list)?.items
    if (!rowsAt || !items) return undefined
    return {
      item: items,
      answer,
      rowsAt,
      ...("next" in properties && { nextAt: "next" }),
      ...this.itemAt(items)
    }
  }

  /** Where an item's schema is, when it's a reference:  `{ schemaAt: "#/components/schemas/Tenant" }`. */
  private itemAt(item: Schema): { schemaAt?: string } {
    const ref = this.refOf(item)
    return ref && LOCAL_REF.test(ref) ? { schemaAt: ref } : {}
  }

  /** The schema of an operation's answer, 200 or the first 2xx, as JSON. */
  private answerOf(operation: OpenApiOperation): Schema | undefined {
    const responses = operation.responses ?? {}
    const status = "200" in responses ? "200" : Object.keys(responses).find((code) => /^2/.test(code))
    const answer = status === undefined ? undefined : this.resolved(responses[status])
    return jsonSchemaIn(answer?.content)
  }

  /** Does its list take a `limit`, so it can be asked for more at a time? */
  private takesLimit(item: OpenApiPathItem): boolean {
    return (item.get?.parameters ?? []).some((each) => this.resolved(each)?.name === "limit")
  }

  /** A list's query parameters, each resolved. */
  private queryParamsOf(operation: OpenApiOperation): OpenApiParameter[] {
    return (operation.parameters ?? [])
      .map((each) => this.resolved(each))
      .filter((each): each is OpenApiParameter => each?.in === "query" && typeof each.name === "string")
  }

  /**
   * How a list pages by offset (epic `data` I140):  FastAPI's `?limit=&offset=`, its answer `{ items, total, limit, offset }`.
   * - Its questions, else its wrapped answer's fields of those names.
   * - `most`:  its limit's schema's `maximum`, so a read never asks for more than it gives (a 422).
   * - `undefined`:  it doesn't, as far as its description says.
   */
  private offsetPagingOf(operation: OpenApiOperation, answer: Schema | undefined): PagesWith | undefined {
    const params = this.queryParamsOf(operation)
    const limit = params.find(({ name }) => LIMIT_NAMES.test(name!))
    const offset = params.find(({ name }) => OFFSET_NAMES.test(name!))
    if (limit && offset) {
      const most = this.resolved(limit.schema)?.maximum
      return { limit: limit.name!, offset: offset.name!, ...(most !== undefined && { most }) }
    }
    const said = Object.keys(this.propertiesOf(answer))
    const limitSaid = said.find((name) => LIMIT_NAMES.test(name))
    const offsetSaid = said.find((name) => OFFSET_NAMES.test(name))
    return limitSaid && offsetSaid ? { limit: limitSaid, offset: offsetSaid } : undefined
  }

  /**
   * The search a list is, when it can't be asked without its question (epic `data` I140):
   * FastAPI's `/api/search?q=`, `q` required.
   * - `example`:  what its description says to search for, its parameter's `example` or first `examples`.
   */
  private searchOf(operation: OpenApiOperation): { param: string; example?: string } | undefined {
    const param = this.queryParamsOf(operation).find(({ name, required }) => required && SEARCH_NAMES.test(name!))
    if (!param) return undefined
    const example = this.exampleOf(param)
    return { param: param.name!, ...(example !== undefined && { example }) }
  }

  /**
   * What a list is asked for by, each question it can't be answered without besides its search's (epic `data` P56):
   * `GET /api/runs?team=infra`, `team` required.
   * - Its value:  the example its description gives, which a verify asks with;  `""` for none, said in the notes.
   * - Written as Open-Meteo's forecasts are (epic `data` P33, J191):  `runs are asked for by their team`, so a `where`
   *   on that field goes to the server.
   * - `undefined` for a list that needs nothing.
   */
  private askedByOf(
    path: string,
    operation: OpenApiOperation,
    search: string | undefined
  ): Record<string, string> | undefined {
    const needed = this.queryParamsOf(operation).filter(({ name, required }) => required && name !== search)
    if (!needed.length) return undefined
    const askedBy: Record<string, string> = {}
    for (const param of needed) askedBy[param.name!] = this.exampleOf(param) ?? ""
    const unsaid = needed.filter(({ name }) => askedBy[name!] === "").map(({ name }) => `"${name}"`)
    if (unsaid.length) {
      this.notes.push(
        `${path} can't be read without ${unsaid.join(" and ")}, and its description gives no example to try:  verify skips it.`
      )
    }
    return askedBy
  }

  /**
   * `fields`, with one for each question a list is asked for by that its rows leave out (epic `from-console` P15):
   * layer stacks asked for by `?system=`, with no `system` in a stack, get `its "system" is text`.
   * - Typed by the question's own schema.
   * - So `layer stacks are asked for by their system` names a field, and a read's `where its system is "x"` holds
   *   for what it reads:  the place writes the asked value onto each row (`RestCollection.askedBy`).
   * - Not for a list no schema typed:  a read fills its fields.
   * - SIDE EFFECT:  changes `fields`.
   */
  private withAskedFields(
    fields: Record<string, FieldDescription>,
    operation: OpenApiOperation,
    askedBy: Record<string, string> | undefined,
    path: string
  ): Record<string, FieldDescription> {
    if (!askedBy || !Object.keys(fields).length) return fields
    for (const param of this.queryParamsOf(operation)) {
      const name = param.name!
      if (!(name in askedBy) || name in fields) continue
      fields[name] = this.fieldOf(name, param.schema ?? {}, `${path}?${name}`, false, 0, new Set())
    }
    return withSpellsOwnWordsApart(fields, 0)
  }

  /** What a parameter's description says to ask with:  its `example`, its first `examples`, or its schema's. */
  private exampleOf(param: OpenApiParameter): string | undefined {
    const schema = this.resolved(param.schema)
    const example = [param.example, ...(Array.isArray(param.examples) ? param.examples : []), schema?.example].find(
      (each) => typeof each === "string" || typeof each === "number"
    )
    return example === undefined ? undefined : `${example}`
  }

  ////////////////
  // ## One thing under each
  ////////////////

  /**
   * What's kept under each thing of a collection, at an address of its own:  a `GET` under a thing by id.
   * - ONE thing, answering one object, `/instances/{id}/snapshot` (epic `from-console` P16, `ListUnderSeen.isOne`).
   * - Or a list of them, `/jobs/{job_id}/steps` (epic `data` P56):  a job's steps, `a job's steps live at "..."`.
   *   - A field of its owner's holding them inside its row, by the same name, gives way to it:  read from there.
   * - Each is a collection of its own:
   *   - named by its last word, as an action is (`snapshot`, `steps`)
   *   - its fields from its schema, found at that address
   * - Its owner:  the collection whose address it's under,
   *   else the one its brace or the word before it names (`/systems/instance/{instance_id}/snapshot` is under `instances`).
   * - One with no owner found is said in the notes, and left out.
   * - `path`:  where its description has it, braces as written, for an action deeper under it (`actionsDeeper()`).
   */
  private recordsUnder(
    paths: Readonly<Record<string, OpenApiPathItem | undefined>>,
    prefix: string,
    specPaths: ReadonlyMap<CollectionLook, string>
  ): RecordUnder[] {
    const found: RecordUnder[] = []
    for (const [path, item] of Object.entries(paths)) {
      const words = path.replace(/^\/+|\/+$/g, "").split("/")
      const get = item?.get
      if (!get || words.filter((word) => HAS_BRACE.test(word)).length !== 1 || !HAS_BRACE.test(words.at(-2) ?? ""))
        continue
      const answer = this.answerOf(get)
      const isOne = this.isOneThing(answer)
      const list = isOne ? undefined : this.rowsOf(get)
      if (!isOne && !list) continue
      const owner = ownerOf(words, specPaths)
      if (!owner) {
        const what = isOne ? "one thing" : "a list"
        this.notes.push(`${path} answers ${what} under another, but no list of those is described:  read it by hand.`)
        continue
      }
      const schema = list ? list.item : answer!
      const { schemaAt } = list ?? this.itemAt(answer!)
      const name = lastWordOf(path)
      const fields = this.fieldsOf(schema, schemaAt ?? path)
      // a list under each:  its owner's own copy inside its row, by the same name, is read from there instead
      if (list && owner.fields?.[name]?.inside) delete owner.fields[name]
      found.push({
        owner,
        path,
        isOne,
        record: {
          name,
          at: underPlace(path, prefix).replace(HAS_BRACE, "{id}"),
          rows: [],
          paging: "none",
          pagesRead: 0,
          hasMore: false,
          ...(list?.rowsAt !== undefined && { rowsAt: list.rowsAt }),
          ...(schemaAt !== undefined && { schemaAt }),
          ...(get.tags?.[0] !== undefined && { tag: get.tags[0] }),
          ...("id" in fields && { idAt: "id" }),
          fields
        }
      })
    }
    return found
  }

  /**
   * SIDE EFFECT:  each action on something in a list under a thing, by its last word, is that list's type's
   * (epic `data` P56):  `POST /jobs/{job_id}/steps/{step_id}/retry` is a step's `retry`.
   * - Its braces stay as written:  the place fills each from the step, and from where it read the step
   *   (`RestPlace.call()`), so `{job_id}` is its job's.
   * - One under nothing read as a list is said in the notes, to read by hand.
   */
  private actionsDeeper(
    paths: Readonly<Record<string, OpenApiPathItem | undefined>>,
    prefix: string,
    records: readonly RecordUnder[]
  ): void {
    for (const [path, item] of Object.entries(paths)) {
      const words = path.replace(/^\/+|\/+$/g, "").split("/")
      if (!item || words.filter((word) => HAS_BRACE.test(word)).length < 2 || !HAS_BRACE.test(words.at(-2) ?? ""))
        continue
      const under = `/${words.slice(0, -2).join("/")}`
      const list = records.find(({ path: at, isOne }) => !isOne && at.replace(/\/+$/, "") === under)
      for (const method of WRITE_METHODS) {
        const operation = item[method]
        if (!operation) continue
        if (!list) {
          const owner = words.filter((word) => !HAS_BRACE.test(word)).at(-2) ?? ""
          this.notes.push(
            `${method.toUpperCase()} ${path} acts on something inside ${articledWords(owner)}:  read it by hand.`
          )
          continue
        }
        const verb = wordsFor(words.at(-1)!)
        const operations = (list.record.operations ??= {})
        const name = verb in operations ? `${verb} ${method}` : verb
        operations[name] = this.operationFor(method.toUpperCase(), underPlace(path, prefix), operation, path)
        break
      }
    }
  }

  /** Is `answer` one object with fields, not a list, nor one wrapped under a name a list's rows go under? */
  private isOneThing(answer: Schema | undefined): boolean {
    const resolved = this.resolved(answer)
    if (!resolved || resolved.type === "array") return false
    const properties = this.propertiesOf(resolved)
    const isWrappedList = ROWS_NAMES.some(
      (name) => properties[name] && this.resolved(properties[name])?.type === "array"
    )
    return !isWrappedList && Object.keys(properties).length > 0
  }

  ////////////////
  // ## Writes and actions
  ////////////////

  /**
   * What can be done to the collection at `path` besides reading, by name:  see the class.
   * - `at` is its address under the place's, for the addresses it writes.
   */
  private operationsOf(
    path: string,
    at: string,
    paths: Readonly<Record<string, OpenApiPathItem | undefined>>
  ): Record<string, OperationDescription> | undefined {
    const operations: Record<string, OperationDescription> = {}
    const under = (other: string) => `${at}${other.slice(path.length)}`
    const own = paths[path]
    if (own?.post) operations.add = this.operationFor("POST", at, own.post)
    for (const [other, item] of Object.entries(paths)) {
      if (!item || !isUnder(other, path)) continue
      const rest = other
        .slice(path.length)
        .replace(/^\/|\/$/g, "")
        .split("/")
      if (!HAS_BRACE.test(rest[0] ?? "")) continue
      if (rest.length === 1) {
        // the thing by id:  a change, and a delete
        const change = item.patch
          ? (["PATCH", item.patch] as const)
          : item.put
            ? (["PUT", item.put] as const)
            : undefined
        if (change) operations.change = this.operationFor(change[0], under(other), change[1], other)
        if (item.delete) operations.delete = this.operationFor("DELETE", under(other), item.delete, other)
        continue
      }
      // deeper:  an action on something inside a thing, `/{job_id}/steps/{step_id}/retry`, is that thing's
      // (`actionsDeeper()`)
      if (rest.length > 2) continue
      // an action route under a thing by id, by its last word:  `/{id}/enqueue/`, NOT a list under it (a `GET`)
      if (rest.length !== 2) continue
      const verb = wordsFor(rest[1]!)
      for (const method of WRITE_METHODS) {
        const operation = item[method]
        if (!operation) continue
        const name = verb in operations ? `${verb} ${method}` : verb
        operations[name] = this.operationFor(method.toUpperCase(), under(other), operation, other)
        break
      }
    }
    return Object.keys(operations).length ? operations : undefined
  }

  /** One operation:  its method, its address, and what it takes, each brace and body field. */
  private operationFor(method: string, at: string, operation: OpenApiOperation, path = at): OperationDescription {
    const params: Record<string, FieldKind> = {}
    for (const brace of path.matchAll(/\{([^{}/]+)\}/g)) {
      const parameter = (operation.parameters ?? [])
        .map((each) => this.resolved(each))
        .find((each) => each?.name === brace[1])
      params[brace[1]!] = kindOfSchema(this.resolved(parameter?.schema)) ?? "text"
    }
    const body = jsonSchemaIn(this.resolved(operation.requestBody)?.content)
    // a body of one thing or a list of them, NetBox's:  the one
    const one = this.resolved(body)?.oneOf?.find((each) => this.resolved(each)?.type !== "array") ?? body
    for (const [name, field] of Object.entries(this.propertiesOf(one))) {
      if (!this.resolved(field)?.readOnly) params[name] = kindOfSchema(this.resolved(field)) ?? "inside"
    }
    const ref = one && this.refOf(one)
    const bodyAt = ref && LOCAL_REF.test(ref) ? ref : undefined
    return {
      method,
      at,
      ...(Object.keys(params).length && { params }),
      ...(bodyAt && { bodyAt }),
      state: { is: "unverified" }
    }
  }

  ////////////////
  // ## Fields
  ////////////////

  /** Each field of `schema`, as a look at rows would describe it, with what the schema says more. */
  private fieldsOf(
    schema: Schema,
    at: string,
    depth = 0,
    seen: ReadonlySet<string> = new Set()
  ): Record<string, FieldDescription> {
    const resolved = this.resolved(schema)
    const required = new Set(resolved?.required ?? this.allOfRequired(schema))
    const fields: Record<string, FieldDescription> = {}
    for (const [name, field] of Object.entries(this.propertiesOf(schema))) {
      fields[name] = this.fieldOf(name, field, `${at}/properties/${name}`, required.has(name), depth, seen)
    }
    return withSpellsOwnWordsApart(fields, depth)
  }

  /** One field:  see `fieldsOf()`. */
  private fieldOf(
    name: string,
    schema: Schema,
    at: string,
    isRequired: boolean,
    depth: number,
    seen: ReadonlySet<string>
  ): FieldDescription {
    const pointer = this.refOf(schema)
    const schemaAt = pointer && LOCAL_REF.test(pointer) ? pointer : at
    const field = this.resolved(schema) ?? {}
    const words = wordsFor(name)
    const said: Partial<FieldDescription> = {
      schemaAt,
      ...(field.readOnly && { isReadOnly: true }),
      ...(isRequired && !field.readOnly && !field.nullable && { isRequired: true }),
      ...(field.example !== undefined && typeof field.example !== "object" && { example: field.example }),
      ...(field.format !== undefined && { format: field.format }),
      ...(field.minLength !== undefined && { minLetters: field.minLength }),
      ...(field.maxLength !== undefined && { maxLetters: field.maxLength }),
      ...(field.minimum !== undefined && { minimum: field.minimum }),
      ...(field.maximum !== undefined && { maximum: field.maximum })
    }
    if (pointer && !LOCAL_REF.test(pointer)) {
      this.notes.push(
        `"${name}" is described in another file, ${pointer}:  only this file's schemas are read, so it's left untyped.`
      )
      return { words, type: "text", ...said, leftOut: `Its schema is in another file, ${pointer}.` }
    }
    const choices = field.enum?.filter((each) => each !== null && each !== "").map(String)
    if (choices?.length && oneOfWords(choices)) said.choices = choices
    const kind = kindOfSchema(field)
    if (kind) {
      const yesOrNo = kind === "yes or no" ? /^(?:is|has) (.+)$/.exec(words)?.[1] : undefined
      return { words: yesOrNo ?? words, type: kind, ...said }
    }
    const isList = field.type === "array"
    const inside = isList ? (field.items ?? {}) : schema
    const ref = this.refOf(inside)
    if (ref && seen.has(ref))
      return { words, type: "inside", ...said, isItsOwner: true, ...(isList && { isListInside: true }) }
    if (!Object.keys(this.propertiesOf(inside)).length) {
      const resolvedInside = this.resolved(inside)
      const leftOut =
        resolvedInside?.additionalProperties !== undefined
          ? MAP_BY_NAME
          : isSeveralKinds(resolvedInside)
            ? SEVERAL_KINDS
            : TOO_DEEP
      return { words, type: "inside", ...said, leftOut }
    }
    if (depth >= DEEPEST_INSIDE) return { words, type: "inside", ...said, leftOut: TOO_DEEP }
    const next = ref ? new Set([...seen, ref]) : seen
    return {
      words,
      type: "inside",
      ...said,
      inside: this.fieldsOf(inside, ref ?? `${at}/items`, depth + 1, next),
      ...(ref && LOCAL_REF.test(ref) && { insideSchemaAt: ref }),
      ...(isList && { isListInside: true })
    }
  }

  /** The properties of `schema`, its `allOf`s' merged. */
  private propertiesOf(schema: Schema | undefined): Record<string, Schema> {
    const resolved = this.resolved(schema)
    if (!resolved) return {}
    const merged: Record<string, Schema> = {}
    for (const part of resolved.allOf ?? []) Object.assign(merged, this.propertiesOf(part))
    return { ...merged, ...resolved.properties }
  }

  /** What an `allOf`'s parts say every thing has. */
  private allOfRequired(schema: Schema): string[] {
    return (this.resolved(schema)?.allOf ?? []).flatMap((part) => this.resolved(part)?.required ?? [])
  }

  /**
   * The reference a schema is:  its own, or an `allOf` of one, or an `anyOf` / `oneOf` of one and nothing else
   * (FastAPI's `anyOf: [{ $ref }, { type: "null" }]`).
   * - What names the type inside, and says a schema holds itself.
   */
  private refOf(schema: Schema): string | undefined {
    if (schema.$ref) return schema.$ref
    const allOf = schema.allOf?.find((each) => each.$ref)?.$ref
    if (allOf) return allOf
    const others = (schema.anyOf ?? schema.oneOf)?.filter((each) => !isNothing(each))
    return others?.length === 1 ? others[0]!.$ref : undefined
  }

  ////////////////
  // ## References
  ////////////////

  /**
   * `value` with its local `$ref` followed, as deep as it goes;  one `allOf` of a single reference too
   * (`{ allOf: [{ $ref }], nullable: true }`, NetBox's).
   * - An `anyOf` / `oneOf` of one kind and nothing (FastAPI's `Optional[...]`) is that kind, `nullable`;
   *   and its 3.1 forms are read as 3.0's (`plainSchema()`):  a type list, `const`, `examples`.
   * - A reference into another file, or one that isn't there:  `undefined`, said in the notes.
   */
  resolved<Value extends { $ref?: string }>(value: Value | undefined): Value | undefined {
    let each: Value | undefined = value
    for (let hops = 0; each?.$ref && hops < 32; hops++) {
      if (!LOCAL_REF.test(each.$ref)) {
        this.notes.push(`${each.$ref} is in another file:  only this file's references are read.`)
        return undefined
      }
      const found = pointedAt(this.document, each.$ref) as Value | undefined
      if (found === undefined) this.notes.push(`${each.$ref} isn't in the description.`)
      each = found
    }
    const schema = each as Schema | undefined
    if (!schema || typeof schema !== "object") return each
    const single = schema.allOf
    if (single?.length === 1 && !schema.properties) {
      const { allOf: _one, ...rest } = schema
      return plainSchema({ ...(this.resolved(single[0]) as object), ...rest }) as Value
    }
    const others = schema.anyOf ?? schema.oneOf
    const kinds = others?.filter((other) => !isNothing(this.resolved(other)))
    if (others && kinds?.length === 1 && !schema.properties) {
      const { anyOf: _any, oneOf: _one, ...rest } = schema
      const mayBeNothing = kinds.length < others.length
      return plainSchema({
        ...(this.resolved(kinds[0]) as object),
        ...rest,
        ...(mayBeNothing && { nullable: true })
      }) as Value
    }
    return plainSchema(schema) as Value
  }

  /** What the agent reads of it:  a summary, never the whole description (J248). */
  private summary(collections: readonly CollectionLook[]): string {
    const { info, openapi } = this.document
    const tags = [...new Set(collections.map(({ tag }) => tag).filter(Boolean))]
    return [
      `${info?.title ?? "An API"}, OpenAPI ${openapi}${info?.version ? `, version ${info.version}` : ""}.`,
      ...(info?.description ? [info.description.slice(0, 2000)] : []),
      ...(tags.length ? [`Tags:  ${tags.join(", ")}.`] : []),
      `Its lists:  ${collections.map(({ name, at }) => `${name} (${at})`).join(", ")}.`
    ].join("\n")
  }
}

////////////////
// ## Helpers
////////////////

/** The JSON schema of a body or an answer's content:  `application/json`'s, else any `+json`. */
function jsonSchemaIn(content: Record<string, { schema?: Schema }> | undefined): Schema | undefined {
  if (!content) return undefined
  const type = Object.keys(content).find((each) => /json/i.test(each))
  return type === undefined ? undefined : content[type]?.schema
}

/** What a plain schema holds, in a field's words:  `undefined` for an object, or a list of them. */
function kindOfSchema(_schema: Schema | undefined): FieldKind | undefined {
  if (!_schema) return undefined
  const { type, format, items } = plainSchema(_schema)
  if (type === "string" && (format === "date" || format === "date-time")) return "date"
  if (type === "string" && (format === "uri" || format === "url")) return "link"
  if (type === "string") return "text"
  if (type === "integer" || type === "number") return "number"
  if (type === "boolean") return "yes or no"
  if (type === "null") return "nothing"
  if (type === "array" && items) {
    const item = kindOfSchema(items.$ref ? undefined : items)
    if (item === "link") return "list of links"
    if (item === "text" || item === "date") return "list of text"
    if (item === "number") return "list of numbers"
  }
  return undefined
}

/**
 * `fields`, renamed where Spell has the word already, as a look at rows does (`PlaceShape.fieldsOf()`):
 * every thing has a type, so a `type` is its `kind`;  inside another, an `id` is a `number` it has.
 */
function withSpellsOwnWordsApart(
  fields: Record<string, FieldDescription>,
  depth: number
): Record<string, FieldDescription> {
  const taken = (words: string) => Object.values(fields).some((field) => field.words === words)
  if (depth && fields.id && !taken("number")) fields.id.words = "number"
  if (fields.type && !taken("kind")) fields.type.words = "kind"
  return fields
}

/**
 * `schema` in 3.0's words, for what OpenAPI 3.1 (JSON Schema's) says otherwise (epic `data` I109):
 * - a type list with `"null"` in it:  the one type left, `nullable`;  several left stay a list, read by hand
 * - `const`:  an `enum` of its one value
 * - `examples`, a list:  its first is the `example`
 * - The same object back when there's nothing to change:  pure, so the free helpers use it too.
 */
function plainSchema(schema: Schema): Schema {
  const { type } = schema
  const types = Array.isArray(type) ? type.filter((each) => each !== "null") : undefined
  const isNullable = Array.isArray(type) && types!.length < type.length
  const hasConst = schema.const !== undefined && schema.enum === undefined
  const hasExamples = Array.isArray(schema.examples) && schema.example === undefined && schema.examples.length > 0
  if (!types && !hasConst && !hasExamples) return schema
  return {
    ...schema,
    ...(types && { type: types.length === 1 ? types[0] : types.length ? types : "null" }),
    ...(isNullable && { nullable: true }),
    ...(hasConst && { enum: [schema.const] }),
    ...(hasExamples && { example: (schema.examples as unknown[])[0] })
  }
}

/** Is `schema` the one that says "nothing":  `{ type: "null" }`, `{ const: null }`, `{ enum: [null] }`? */
function isNothing(schema: Schema | undefined): boolean {
  if (!schema) return false
  const { type } = schema
  if (type === "null" || (Array.isArray(type) && type.every((each) => each === "null"))) return true
  if (schema.const === null) return true
  return Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every((each) => each === null)
}

/** Does `schema` hold one of several kinds:  an `anyOf` / `oneOf` left, or a type list of two or more? */
function isSeveralKinds(schema: Schema | undefined): boolean {
  return Boolean(schema?.anyOf ?? schema?.oneOf) || Array.isArray(schema?.type)
}

/** Is there a thing by id under `path`:  `/background-tasks/{id}/`? */
function hasThingsUnder(path: string, paths: Readonly<Record<string, OpenApiPathItem | undefined>>): boolean {
  return Object.keys(paths).some((other) => isUnder(other, path) && HAS_BRACE.test(other.slice(path.length)))
}

/**
 * Is `other` a path under `path`, a word at a time:  `/api/jobs/{id}` is under `/api/jobs`;
 * `/api/jobs-archive/{id}` isn't (epic `data` I140).
 */
function isUnder(other: string, path: string): boolean {
  return other.startsWith(`${path.replace(/\/+$/, "")}/`) && other.replace(/\/+$/, "") !== path.replace(/\/+$/, "")
}

/** One thing of a collection, in words:  `jobs` => `a job`. */
function articledWords(collection: string): string {
  const one = P.singularize(wordsFor(collection))
  return `${/^[aeiou]/i.test(one) ? "an" : "a"} ${one}`
}

/** How every list that pages by offset pages, the way most of them do:  `undefined` for none. */
function pagesWithOf(paged: readonly PagesWith[]): PagesWith | undefined {
  const counts = new Map<string, number>()
  for (const { limit, offset } of paged) counts.set(`${limit} ${offset}`, (counts.get(`${limit} ${offset}`) ?? 0) + 1)
  const [usual] = [...counts.entries()].sort(([, a], [, b]) => b - a)[0] ?? []
  if (!usual) return undefined
  const [limit, offset] = usual.split(" ") as [string, string]
  const mosts = paged.filter((each) => each.limit === limit && each.offset === offset && each.most !== undefined)
  const most = mosts.length ? Math.min(...mosts.map((each) => each.most!)) : undefined
  return { limit, offset, ...(most !== undefined && { most }) }
}

/** `path` under the place's own path, `prefix`:  `/api/jobs/` under `/api` is `/jobs/`. */
function underPlace(path: string, prefix: string): string {
  return prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path
}

/**
 * The collection a path of one thing under another's is under, by the path's `words` (see `recordsUnder()`):
 * the one at the address before its brace, else the one its brace's name or the word before it names, if just one.
 */
function ownerOf(words: readonly string[], specPaths: ReadonlyMap<CollectionLook, string>): CollectionLook | undefined {
  const before = `/${words.slice(0, -2).join("/")}`
  for (const [collection, path] of specPaths) if (path.replace(/\/+$/, "") === before) return collection
  const brace = words.at(-2)!.replace(/[{}]/g, "")
  const named = [brace.replace(/[-_ ]?id$/i, ""), words.at(-3) ?? ""].map((each) => P.singularize(wordsFor(each)))
  for (const name of named) {
    if (!name) continue
    const matching = [...specPaths.keys()].filter((collection) => P.singularize(wordsFor(collection.name)) === name)
    if (matching.length === 1) return matching[0]
  }
  return undefined
}

/** A path's last word:  `/api/tenancy/tenant-groups/` => `tenant-groups`. */
function lastWordOf(path: string): string {
  return path.replace(/\/+$/, "").split("/").pop() ?? path
}

/**
 * SIDE EFFECT:  two collections with one name are named by the word before it too:
 * NetBox's `/dcim/interfaces/` and `/virtualization/interfaces/`, `dcim interfaces` and `virtualization interfaces`.
 */
function nameApart(collections: CollectionLook[]): void {
  const counts = new Map<string, number>()
  for (const { name } of collections) counts.set(name, (counts.get(name) ?? 0) + 1)
  for (const collection of collections) {
    if (counts.get(collection.name)! < 2) continue
    const words = collection.at.replace(/\/+$/, "").split("/")
    collection.name = `${words.filter((word) => !HAS_BRACE.test(word)).at(-2) ?? ""} ${collection.name}`.trim()
  }
}

/** What a JSON pointer, `#/components/schemas/Tenant`, points at in `document`. */
function pointedAt(document: unknown, pointer: string): unknown {
  let each: unknown = document
  for (const part of pointer.slice(2).split("/")) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~")
    each = (each as Record<string, unknown> | undefined)?.[key]
  }
  return each
}

////////////////
// ## Its shapes
////////////////

/** A schema, as far as it's read:  JSON Schema's, as OpenAPI 3.0 and 3.1 have it. */
export type Schema = {
  $ref?: string
  /** One type, or 3.1's list of them:  `["string", "null"]`. */
  type?: string | string[]
  format?: string
  properties?: Record<string, Schema>
  additionalProperties?: unknown
  items?: Schema
  required?: string[]
  enum?: unknown[]
  /** 3.1's one legal value. */
  const?: unknown
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  readOnly?: boolean
  nullable?: boolean
  example?: unknown
  /** 3.1's examples, a list. */
  examples?: unknown
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  description?: string
}

/** Where a list is:  its rows' schema, and where they are in a wrapped answer. */
type ListAt = { item: Schema; answer?: Schema; rowsAt?: string; nextAt?: string; schemaAt?: string }

/** One thing or list under each thing of a collection:  see `PlaceSpec.recordsUnder()`. */
type RecordUnder = {
  /** The collection whose things it's under. */
  owner: CollectionLook
  /** It, a collection of its own. */
  record: CollectionLook
  /** Where its description has it, braces as written:  `/api/jobs/{job_id}/steps`. */
  path: string
  /** ONE thing under each, not a list. */
  isOne: boolean
}

/** A parameter, as far as it's read. */
type OpenApiParameter = {
  $ref?: string
  name?: string
  in?: string
  required?: boolean
  schema?: Schema
  example?: unknown
  /** 3.1's, or a map of named examples. */
  examples?: unknown
}

/** One operation. */
export type OpenApiOperation = {
  operationId?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: OpenApiParameter[]
  requestBody?: { $ref?: string; content?: Record<string, { schema?: Schema }> }
  responses?: Record<string, { $ref?: string; content?: Record<string, { schema?: Schema }> }>
}

/** What one path offers, by method. */
export type OpenApiPathItem = Partial<Record<"get" | "post" | "put" | "patch" | "delete", OpenApiOperation>>

/** An OpenAPI description, as far as it's read. */
export type OpenApiDocument = {
  openapi?: string
  swagger?: string
  info?: { title?: string; version?: string; description?: string }
  servers?: Array<{ url?: string }>
  paths?: Record<string, OpenApiPathItem | undefined>
  components?: { schemas?: Record<string, Schema> }
}
