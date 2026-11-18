import { oneOfWords } from "spell/parser/core/schemaWords"

import type { CollectionLook, FieldDescription, FieldKind, OperationDescription, PlaceLook } from "./ingest.types"
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

/** Why an object that's a map by name is left out:  `custom_fields`. */
const MAP_BY_NAME = "Its schema says it's a map by name, each key its own:  read it by hand, a type of its own."

/** Why something too far inside others is left out. */
const TOO_DEEP = "It's too far inside others:  read it by hand, a type of its own."

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
 * - A reference into another file or address is named in the notes, and its field left untyped:  only local ones are
 *   followed, by a small reader of its own (no dependency).
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
    for (const [path, item] of Object.entries(paths)) {
      if (HAS_BRACE.test(path) || !item?.get) continue
      // no list in its answer's schema, but things by id under it:  a collection all the same, untyped till a read fills it
      const rows = this.rowsOf(item.get) ?? (hasThingsUnder(path, paths) ? { item: {} } : undefined)
      if (!rows) continue
      const at = prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path
      collections.push({
        name: lastWordOf(path),
        at,
        rows: [],
        paging: rows.nextAt ? "next field" : "none",
        pagesRead: 0,
        hasMore: false,
        ...(rows.rowsAt !== undefined && { rowsAt: rows.rowsAt }),
        ...(rows.nextAt !== undefined && { nextAt: rows.nextAt }),
        ...(this.takesLimit(item) && { takesLimit: true }),
        ...(rows.schemaAt !== undefined && { schemaAt: rows.schemaAt }),
        ...(item.get.tags?.[0] !== undefined && { tag: item.get.tags[0] }),
        idAt: "id",
        fields: this.fieldsOf(rows.item, rows.schemaAt ?? path),
        operations: this.operationsOf(path, at, paths)
      })
    }
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
      docsAt: this.at,
      specAt: this.at,
      ...(this.document.info?.version && {
        version: { says: this.document.info.version, where: "its OpenAPI description" }
      }),
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
    if (answer.type === "array" && answer.items) return { item: answer.items, ...this.itemAt(answer.items) }
    const properties = answer.properties ?? {}
    const lists = Object.entries(properties).filter(([, each]) => this.resolved(each)?.type === "array")
    const [rowsAt, list] = lists.find(([name]) => ROWS_NAMES.includes(name)) ?? (lists.length === 1 ? lists[0]! : [])
    const items = list && this.resolved(list)?.items
    if (!rowsAt || !items) return undefined
    return {
      item: items,
      rowsAt,
      ...("next" in properties && { nextAt: "next" }),
      ...this.itemAt(items)
    }
  }

  /** Where an item's schema is, when it's a reference:  `{ schemaAt: "#/components/schemas/Tenant" }`. */
  private itemAt(item: Schema): { schemaAt?: string } {
    return item.$ref && LOCAL_REF.test(item.$ref) ? { schemaAt: item.$ref } : {}
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
      if (!item || !other.startsWith(path) || other === path) continue
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
    const bodyAt = one?.$ref && LOCAL_REF.test(one.$ref) ? one.$ref : undefined
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
    const pointer = schema.$ref ?? schema.allOf?.find((each) => each.$ref)?.$ref
    const schemaAt = pointer && LOCAL_REF.test(pointer) ? pointer : at
    const field = this.resolved(schema) ?? {}
    const words = wordsFor(name)
    const said: Partial<FieldDescription> = {
      schemaAt,
      ...(field.readOnly && { isReadOnly: true }),
      ...(isRequired && !field.readOnly && { isRequired: true }),
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
      const leftOut = this.resolved(inside)?.additionalProperties !== undefined ? MAP_BY_NAME : TOO_DEEP
      return { words, type: "inside", ...said, leftOut }
    }
    if (depth >= DEEPEST_INSIDE) return { words, type: "inside", ...said, leftOut: TOO_DEEP }
    const next = ref ? new Set([...seen, ref]) : seen
    return {
      words,
      type: "inside",
      ...said,
      inside: this.fieldsOf(inside, ref ?? `${at}/items`, depth + 1, next),
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

  /** The local reference a schema is, or an `allOf` of one:  what says a schema holds itself. */
  private refOf(schema: Schema): string | undefined {
    return schema.$ref ?? schema.allOf?.find((each) => each.$ref)?.$ref
  }

  ////////////////
  // ## References
  ////////////////

  /**
   * `value` with its local `$ref` followed, as deep as it goes;  one `allOf` of a single reference too
   * (`{ allOf: [{ $ref }], nullable: true }`, NetBox's).
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
    const single = (each as Schema | undefined)?.allOf
    if (single?.length === 1 && !(each as Schema).properties) {
      const { allOf: _one, ...rest } = each as Schema
      return { ...(this.resolved(single[0]) as object), ...rest } as Value
    }
    return each
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
function kindOfSchema(schema: Schema | undefined): FieldKind | undefined {
  if (!schema) return undefined
  const { type, format, items } = schema
  if (type === "string" && (format === "date" || format === "date-time")) return "date"
  if (type === "string" && (format === "uri" || format === "url")) return "link"
  if (type === "string") return "text"
  if (type === "integer" || type === "number") return "number"
  if (type === "boolean") return "yes or no"
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

/** Is there a thing by id under `path`:  `/background-tasks/{id}/`? */
function hasThingsUnder(path: string, paths: Readonly<Record<string, OpenApiPathItem | undefined>>): boolean {
  return Object.keys(paths).some((other) => other.startsWith(path) && HAS_BRACE.test(other.slice(path.length)))
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
    collection.name = `${words.at(-2) ?? ""} ${collection.name}`.trim()
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
  type?: string
  format?: string
  properties?: Record<string, Schema>
  additionalProperties?: unknown
  items?: Schema
  required?: string[]
  enum?: unknown[]
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  readOnly?: boolean
  nullable?: boolean
  example?: unknown
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  description?: string
}

/** Where a list is:  its rows' schema, and where they are in a wrapped answer. */
type ListAt = { item: Schema; rowsAt?: string; nextAt?: string; schemaAt?: string }

/** A parameter, as far as it's read. */
type OpenApiParameter = { $ref?: string; name?: string; in?: string; required?: boolean; schema?: Schema }

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
