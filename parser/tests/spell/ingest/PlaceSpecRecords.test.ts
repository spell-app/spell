import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceSpec, type OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * ONE thing under each thing of a collection, read from an OpenAPI description (epic `from-console` P16):
 * a system's deployment status and its snapshot, each a `GET` under an instance by id that answers one object.
 * - A small description, made up in the shape of a lab's systems API:  not anyone's.
 * - One record's path is under its list's address (`/instances/{id}/status`);  the others are elsewhere, named for the
 *   list by their brace (`{instance_id}`), as real ones are.
 */

const ACME = "https://systems.acme.test"
const SPEC_AT = `${ACME}/openapi.json`

/** A schema reference. */
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

/** One `GET` answering `schema`. */
const answering = (schema: object, tag = "systems") => ({
  get: { tags: [tag], responses: { "200": { content: { "application/json": { schema } } } } }
})

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Acme Systems", version: "1.0" },
  paths: {
    "/api/registry/instances": answering({ type: "array", items: ref("Instance") }),
    "/api/registry/instances/{id}/status": answering(ref("Status")),
    "/api/instance-netlists/{instance_id}/reservation-surface": answering(ref("ReservationSurface")),
    // its one list inside is its own, not its rows:  the components, as deployed
    "/api/systems/instance/{instance_id}/snapshot": answering(ref("Snapshot")),
    // a list under each, which isn't one thing:  still skipped
    "/api/registry/instances/{id}/events": answering({
      type: "object",
      properties: { results: { type: "array", items: ref("Status") } }
    }),
    // no list it could be under
    "/api/widgets/{widget_id}/summary": answering(ref("Status"))
  },
  components: {
    schemas: {
      Instance: {
        type: "object",
        required: ["id", "name"],
        properties: { id: { type: "integer" }, name: { type: "string" } }
      },
      Status: { type: "object", properties: { state: { type: "string" }, ready: { type: "integer" } } },
      ReservationSurface: {
        type: "object",
        properties: { status: { type: "string", enum: ["not deployed", "pending", "succeeded", "failed"] } }
      },
      Snapshot: {
        type: "object",
        properties: {
          taken: { type: "string", format: "date-time" },
          components: { type: "array", items: { type: "object", properties: { name: { type: "string" } } } }
        }
      }
    }
  }
}

/** Files in memory, as `PlaceSpec.test.ts` keeps them. */
function memoryFiles() {
  const texts = new Map<string, string>()
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
    otherSpellBeside: async () => []
  }
  return { files, texts, descriptions }
}

/** An ingest of the description, on `fetch`. */
async function ingested(fetch: typeof globalThis.fetch) {
  const { files, texts, descriptions } = memoryFiles()
  const ingest = new PlaceIngest({
    fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-18T12:00:00Z")
  })
  const result = await ingest.add({ address: ACME, spec: SPEC_AT, into: "Systems.api.spell", name: "acme systems" })
  return { ingest, result, texts, descriptions }
}

/** A `fetch` answering the description, and `routes` by path. */
function serving(routes: Record<string, unknown> = {}) {
  const asked: string[] = []
  const fetch = (async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input}`
    asked.push(url)
    if (url === SPEC_AT) return Response.json(DOCUMENT)
    const route = routes[url.replace(ACME, "").replace(/\?.*$/, "")]
    return route === undefined ? new Response("nope", { status: 404 }) : Response.json(route)
  }) as typeof globalThis.fetch
  return { fetch, asked }
}

describe("PlaceSpec:  one thing under each", () => {
  const look = new PlaceSpec(DOCUMENT, SPEC_AT).lookAt(ACME)

  test("each is a collection by its last word, found at its address, its fields from its schema", () => {
    expect(look.collections.map(({ name }) => name)).toEqual(["instances", "status", "reservation-surface", "snapshot"])
    const snapshot = look.collections.find(({ name }) => name === "snapshot")!
    expect(snapshot.at).toBe("/api/systems/instance/{id}/snapshot")
    expect(snapshot.schemaAt).toBe("#/components/schemas/Snapshot")
    expect(Object.keys(snapshot.fields!)).toEqual(["taken", "components"])
    expect(snapshot.rowsAt).toBeUndefined()
  })

  test("its owner keeps it under each of its things:  by its address, or by its brace", () => {
    expect(look.listsUnder).toEqual([
      { owner: "instances", list: "status", at: "/api/registry/instances/{id}/status", isOne: true },
      {
        owner: "instances",
        list: "reservation-surface",
        at: "/api/instance-netlists/{id}/reservation-surface",
        isOne: true
      },
      { owner: "instances", list: "snapshot", at: "/api/systems/instance/{id}/snapshot", isOne: true }
    ])
    expect(look.notes).toContain(
      "/api/widgets/{widget_id}/summary answers one thing under another, but no list of those is described:  read it by hand."
    )
  })
})

describe("spell place ingest --spec:  one thing under each", () => {
  test("its Spell says where each lives, and its owner's field is that one thing;  it compiles", async () => {
    const { result, texts } = await ingested(serving().fetch)
    expect(result.warnings).toEqual([])
    const spell = texts.get("Systems.api.spell")!
    expect(spell).toMatch(/^\tsnapshots are found at "\/api\/systems\/instance\/\{id\}\/snapshot"$/m)
    expect(spell).toMatch(/^\tan instance's snapshot lives at "\/api\/systems\/instance\/\{id\}\/snapshot"$/m)
    expect(spell).toMatch(
      /^\tan instance's reservation surface lives at "\/api\/instance-netlists\/\{id\}\/reservation-surface"$/m
    )
    expect(spell).toMatch(/^\tits "snapshot" is a snapshot$/m)
    expect(spell).toMatch(/^\tits "reservation surface" is a reservation surface$/m)
    const { compiled, errors } = parseSpellProject([{ path: "/Systems.api.spell", contents: spell }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(`get snapshot() { return core.linked(this, "snapshot", Snapshot) }`)
    expect(compiled).toMatch(/snapshot: "\/api\/systems\/instance\/\{id\}\/snapshot"/)
  })
})

describe("spell place verify:  one thing under each", () => {
  test("each is read under its owner's first thing:  verified with its one row, or failed with why", async () => {
    const { fetch, asked } = serving({
      "/api/registry/instances": [{ id: 7, name: "Lab one" }],
      "/api/registry/instances/7": { id: 7, name: "Lab one" },
      "/api/registry/instances/7/status": { state: "ready", ready: 4 },
      "/api/systems/instance/7/snapshot": { taken: "2026-11-18T10:00:00Z", components: [{ name: "fridge" }] }
    })
    const { ingest, descriptions } = await ingested(fetch)
    const result = await ingest.verify("Systems.api.spell")
    const { collections } = descriptions.get("Systems.api.json5")!
    expect(collections.snapshots!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
    expect(collections.statuses!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(collections.reservation_surfaces!.state).toMatchObject({
      is: "failed",
      status: 404,
      reason: "it answered 404 under instance 7"
    })
    expect(asked).toContain(`${ACME}/api/systems/instance/7/snapshot`)
    expect(result.changes).toContain("snapshots:  unverified => verified.")
  })
})
