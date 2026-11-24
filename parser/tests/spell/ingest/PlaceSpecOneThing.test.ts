/**
 * ONE thing at a web server's own address, not a list:  a made-up rack service's status, version and layout.
 * - Its description says the answer is one object:  one thing from the ingest, `the version lives at "/api/version"`.
 * - Its description says nothing of the answer (`{}`):  an untyped list, till verify reads one object there.
 * - An object holding several lists is one thing, its lists its fields:  `{ nodes: [...], edges: [...] }`.
 * - A `GET` that makes a token is never read.
 * - A field verify reads that Spell can't say is left out, saying why:  a load average's `load_1min`.
 */
import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceSpec, type OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

const RACKS = "https://racks.example.test"
const SPEC_AT = `${RACKS}/openapi.json`

/** An answer of this schema. */
function answers(schema: object): object {
  return { responses: { "200": { content: { "application/json": { schema } } } } }
}

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Racks", version: "1.0.0" },
  paths: {
    "/api/racks": {
      get: answers({ type: "array", items: { $ref: "#/components/schemas/Rack" } })
    },
    "/api/version": { get: answers({ $ref: "#/components/schemas/Version" }) },
    // anything it likes:  FastAPI's `dict`
    "/api/layout": { get: answers({ type: "object", additionalProperties: true }) },
    // two lists, neither a list's rows
    "/api/pictures": { get: answers({ $ref: "#/components/schemas/Pictures" }) },
    // nothing said of its answer
    "/api/heartbeat": { get: answers({}) },
    "/api/load": { get: answers({}) },
    "/api/topology": { get: answers({}) },
    "/api/auth/token": { get: answers({}) },
    // a map from each address to its rack, inside it:  its keys are values
    "/api/rack-of-address": { get: answers({}) }
  },
  components: {
    schemas: {
      Rack: { type: "object", properties: { id: { type: "string" }, row: { type: "string" } } },
      Version: {
        type: "object",
        properties: { version: { type: "string" }, build: { type: "integer" } },
        required: ["version"]
      },
      Picture: { type: "object", properties: { name: { type: "string" } } },
      Pictures: {
        type: "object",
        properties: {
          images: { type: "array", items: { $ref: "#/components/schemas/Picture" } },
          uploaded: { type: "array", items: { $ref: "#/components/schemas/Picture" } }
        }
      }
    }
  }
} as OpenApiDocument

/** What the running service answers, and what it was asked. */
function racks(asked: string[]) {
  return (url: URL): Response => {
    asked.push(`${url.pathname}${url.search}`)
    if (url.pathname === "/api/racks") return Response.json([{ id: "r1", row: "a" }])
    if (url.pathname === "/api/racks/r1") return Response.json({ id: "r1", row: "a" })
    if (url.pathname === "/api/version") return Response.json({ version: "2.1", build: 7 })
    // described as one object, but a list:  the read is right
    if (url.pathname === "/api/layout") return Response.json([{ id: "l1", columns: 4 }])
    if (url.pathname === "/api/layout/l1") return Response.json({ id: "l1", columns: 4 })
    if (url.pathname === "/api/pictures") return Response.json({ images: [{ name: "front" }], uploaded: [] })
    if (url.pathname === "/api/rack-of-address")
      return Response.json({ updated: "today", mapping: { "192.0.2.7": "r1", "192.0.2.8": "r2" } })
    if (url.pathname === "/api/heartbeat") return Response.json({ ok: true, checks: 3 })
    if (url.pathname === "/api/load") return Response.json({ host: "h1", load_1min: 0.5, load_5min: 0.4 })
    if (url.pathname === "/api/topology")
      return Response.json({ nodes: [{ id: 1 }], edges: [{ source: 1, target: 1 }] })
    return Response.json({ detail: "Not Found" }, { status: 404 })
  }
}

/** The service ingested from its description into `into`. */
async function ingestOf(into = "Racks.api.spell", asked: string[] = []) {
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
  const answer = racks(asked)
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      return url === SPEC_AT ? Response.json(DOCUMENT) : answer(new URL(url))
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-23T12:00:00Z")
  })
  await ingest.add({ address: RACKS, spec: SPEC_AT, into, name: "rack room", rows: 20 })
  const description = () => descriptions.get(into.replace(/(\.es)?\.spell$/, ".json5"))!
  return { ingest, texts, description, spell: () => texts.get(into)! }
}

describe("one thing at its own address", () => {
  test("an answer described as one object is one thing;  one with several lists too, its lists its fields", async () => {
    const { spell, description } = await ingestOf()
    expect(spell()).toMatch(/^\tthe version lives at "\/api\/version"$/m)
    expect(spell()).toMatch(/^\tthe layout lives at "\/api\/layout"$/m)
    expect(spell()).toMatch(/^\tthe picture lives at "\/api\/pictures"$/m)
    expect(spell()).toMatch(/^\tracks live at "\/api\/racks"$/m)
    expect(description().collections.versions).toMatchObject({ isOne: true, state: { is: "unverified" } })
    expect(Object.keys(description().collections.pictures!.fields)).toEqual(["images", "uploaded"])
    // said nothing of:  a list, untyped, till a read shows it
    expect(spell()).toMatch(/^\theartbeats live at "\/api\/heartbeat"$/m)
    expect(description().collections.heartbeats!.isOne).toBeUndefined()
    const { files } = parseSpellProject([{ path: "/Racks.api.spell", contents: spell() }])
    expect(files[0]!.errors).toEqual([])
  })

  test("a GET that makes a token is never read:  left out, saying why", async () => {
    const { spell, description } = await ingestOf()
    expect(spell()).not.toMatch(/token/)
    expect(description().notes).toContain(
      'Left out "/api/auth/token":  a GET there makes a token, or signs in or out, so it\'s never read.'
    )
  })

  test("verify:  an untyped list answering one object is one thing from then on, its fields what it read", async () => {
    const asked: string[] = []
    const { ingest, spell, description } = await ingestOf("Racks.api.spell", asked)
    await ingest.verify("Racks.api.spell")
    const { collections } = description()
    // described as one thing, answering a list:  a list from then on
    expect(collections.layouts!.isOne).toBeUndefined()
    expect(collections.layouts!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(spell()).toMatch(/^\tlayouts live at "\/api\/layout"$/m)
    for (const each of ["heartbeats", "topologies", "versions", "pictures"]) {
      expect(collections[each], each).toMatchObject({ isOne: true, state: { is: "verified", rows: 1 } })
    }
    expect(collections.racks!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(Object.keys(collections.heartbeats!.fields)).toEqual(["ok", "checks"])
    expect(Object.keys(collections.topologies!.fields)).toEqual(["nodes", "edges"])
    // keyed by its values:  one thing, its fields left unsaid, no value a field's name
    expect(collections.rack_of_addresses).toMatchObject({ isOne: true, state: { is: "verified" }, fields: {} })
    expect(JSON.stringify(description())).not.toContain("192.0.2")
    expect(spell()).not.toContain("192")
    expect(spell()).toMatch(/^\tthe heartbeat lives at "\/api\/heartbeat"$/m)
    expect(spell()).toMatch(/^\tthe topology lives at "\/api\/topology"$/m)
    expect(spell()).not.toMatch(/live at "\/api\/(heartbeat|topology)"/)
    // one thing is asked for with no page;  nothing makes a token
    expect(asked).toContain("/api/version")
    expect(asked).toContain("/api/heartbeat")
    expect(asked.some((each) => each.startsWith("/api/auth"))).toBe(false)
    const { files } = parseSpellProject([{ path: "/Racks.api.spell", contents: spell() }])
    expect(files[0]!.errors).toEqual([])
  })

  test("verify:  a field it read that Spell can't say is left out, saying why, and the file still compiles", async () => {
    const { ingest, spell, description } = await ingestOf()
    await ingest.verify("Racks.api.spell")
    const { fields } = description().collections.loads!
    expect(fields.host!.leftOut).toBeUndefined()
    expect(fields.load_1min!.leftOut).toMatch(/^Spell couldn't read its line/)
    expect(spell()).toMatch(/^\tits "host" is text$/m)
    expect(spell()).not.toMatch(/its "load \d/)
    const { files } = parseSpellProject([{ path: "/Racks.api.spell", contents: spell() }])
    expect(files[0]!.errors).toEqual([])
  })

  test("Spanish:  the same place, and the file parses clean", async () => {
    const { spell } = await ingestOf("Racks.api.es.spell")
    expect(spell()).toMatch(/^\t(el|la) \S+ está en "\/api\/version"$/m)
    const { files } = parseSpellProject([{ path: "/Racks.api.es.spell", contents: spell() }])
    expect(files[0]!.errors).toEqual([])
  })
})

describe("two lists of one name, one word up their paths the same too", () => {
  test("each is named by a word further up, never a version's:  neither is lost", () => {
    const list = answers({ type: "array", items: { type: "object", properties: { id: { type: "string" } } } })
    const document = {
      openapi: "3.1.0",
      paths: { "/api/v1/upkeep/calendar": { get: list }, "/api/v1/beta/upkeep/calendar": { get: list } }
    } as OpenApiDocument
    const look = new PlaceSpec(document, SPEC_AT).lookAt(RACKS)
    expect(look.collections.map(({ name, at }) => `${name} ${at}`)).toEqual([
      "upkeep calendar /api/v1/upkeep/calendar",
      "beta upkeep calendar /api/v1/beta/upkeep/calendar"
    ])
  })
})
