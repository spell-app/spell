import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import type { OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * What `spell place verify` reads of a place read from its OpenAPI description:  one thing by its id only where the
 * description has a route for it, by the field that route names;  and a list asked a question another list answers.
 * - A made-up bakery:  ovens with no read by id, racks only deleted by id, recipes read by a `recipe_id` while a
 *   person made their `slug` the id;  shelves its server won't list without an oven (its description says nothing
 *   of that), trays its description says need one (with no example), and crates that need a truck, which no list has.
 */

const BAKERY = "https://bakery.test"
const SPEC_AT = `${BAKERY}/openapi.json`

/** Real values, as a server holds them:  none is ever kept in the description or the Spell. */
const OVEN_ID = "oven-7f3a9c"
const RECIPE_ID = "rcp-51e0d2"

/** A list answer of `schema`'s rows. */
function listOf(schema: string): unknown {
  return {
    "200": {
      description: "OK",
      content: { "application/json": { schema: { type: "array", items: { $ref: `#/components/schemas/${schema}` } } } }
    }
  }
}

/** One thing's answer. */
function oneOf(schema: string): unknown {
  return {
    "200": {
      description: "OK",
      content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } }
    }
  }
}

/** A question its description lists:  needed, or not. */
function question(name: string, required = false): Record<string, unknown> {
  return { name, in: "query", required, schema: { type: "string" } }
}

/** An object schema of these text fields. */
function thing(...fields: string[]): Record<string, unknown> {
  return { type: "object", properties: Object.fromEntries(fields.map((field) => [field, { type: "string" }])) }
}

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Bakery", version: "1.0.0" },
  paths: {
    "/api/ovens": { get: { responses: listOf("Oven") } },
    "/api/racks": { get: { responses: listOf("Rack") } },
    "/api/racks/{rack_id}": { delete: { responses: { "204": { description: "Gone" } } } },
    "/api/recipes": { get: { responses: listOf("Recipe") } },
    "/api/recipes/{recipe_id}": { get: { responses: oneOf("Recipe") } },
    // its server answers 400 without an oven, though its description says neither is needed
    "/api/shelves": { get: { parameters: [question("bakery"), question("oven_id")], responses: listOf("Shelf") } },
    "/api/trays": { get: { parameters: [question("oven_id", true)], responses: listOf("Tray") } },
    "/api/crates": { get: { parameters: [question("truck_id", true)], responses: listOf("Crate") } }
  },
  components: {
    schemas: {
      Oven: thing("oven_id", "name"),
      Rack: thing("rack_id", "name"),
      Recipe: thing("recipe_id", "slug", "name"),
      Shelf: thing("shelf_id", "level"),
      Tray: thing("tray_id", "size"),
      Crate: thing("crate_id", "weight")
    }
  }
} as OpenApiDocument

/** The bakery's server:  each list, and the one route it reads a thing by its id at. */
function answerFor(url: URL): Response {
  const oven = url.searchParams.get("oven_id")
  switch (url.pathname) {
    case "/api/ovens":
      return Response.json([{ oven_id: OVEN_ID, name: "Big" }])
    case "/api/racks":
      return Response.json([{ rack_id: "rack-1", name: "Left" }])
    case "/api/recipes":
      return Response.json([
        { recipe_id: RECIPE_ID, slug: "rye", name: "Rye" },
        { recipe_id: "rcp-9b77aa", slug: "spelt", name: "Spelt" }
      ])
    case `/api/recipes/${RECIPE_ID}`:
      return Response.json({ recipe_id: RECIPE_ID, slug: "rye", name: "Rye" })
    case "/api/shelves":
      return oven === OVEN_ID
        ? Response.json([{ shelf_id: "shelf-1", level: "2" }])
        : Response.json({ detail: "Provide an oven" }, { status: 400 })
    case "/api/trays":
      return oven === OVEN_ID
        ? Response.json([{ tray_id: "tray-1", size: "half" }])
        : Response.json({ detail: "oven_id" }, { status: 422 })
    default:
      return new Response("nope", { status: 404 })
  }
}

/** The bakery ingested from its description, then verified against its server:  what was asked, and what it wrote. */
async function verified(beforeVerify: (description: PlaceDescription) => void = () => {}) {
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
  const asked: string[] = []
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = new URL(`${input instanceof Request ? input.url : input}`)
      if (url.href === SPEC_AT) return Response.json(DOCUMENT)
      asked.push(`${url.pathname}${url.search}`)
      return answerFor(url)
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-23T12:00:00Z")
  })
  await ingest.add({ address: BAKERY, spec: SPEC_AT, into: "Bakery.api.spell", name: "bakery" })
  beforeVerify(descriptions.get("Bakery.api.json5")!)
  asked.length = 0
  await ingest.verify("Bakery.api.spell")
  const description = descriptions.get("Bakery.api.json5")!
  return { asked, description, spell: texts.get("Bakery.api.spell")!, collections: description.collections }
}

describe("verify reads one thing by its id", () => {
  test("not where its description has no route for one:  verified, saying so, never guessed at", async () => {
    const { asked, collections } = await verified()
    expect(collections.ovens!.state).toMatchObject({
      is: "verified",
      reason: "no read by id:  its description has no route for one"
    })
    // only deleted by id:  no read
    expect(collections.racks!.state).toMatchObject({ is: "verified", reason: expect.stringMatching(/^no read by id/) })
    expect(asked.filter((each) => /^\/api\/(ovens|racks)\//.test(each))).toEqual([])
  })

  test("at its description's own route, by the field its brace names, not the id a person picked", async () => {
    const { asked, collections, spell } = await verified((description) => {
      description.collections.recipes!.idField = "slug"
    })
    expect(collections.recipes!.oneAt).toBe("/api/recipes/{recipe_id}")
    expect(asked).toContain(`/api/recipes/${RECIPE_ID}`)
    expect(asked).not.toContain("/api/recipes/rye")
    expect(collections.recipes!.state).toMatchObject({ is: "verified", rows: 2 })
    expect(collections.recipes!.state!.reason).toBeUndefined()
    // that field is its id now, so the place reads one where its server does
    expect(collections.recipes!.idField).toBe("recipe_id")
    expect(spell).toMatch(/^\ta recipe's id is its "recipe_id"$/m)
  })

  test("an ingest takes its id from that route too", async () => {
    const { collections } = await verified()
    expect(collections.recipes!.idField).toBe("recipe_id")
  })
})

describe("a list asked a question another list's things answer", () => {
  test("refusing to answer with none, though its description says none is needed:  asked again with a real one", async () => {
    const { asked, collections, spell } = await verified()
    expect(collections.shelves!.asksFrom).toEqual({ oven_id: "/api/ovens" })
    expect(asked).toContain(`/api/shelves?oven_id=${OVEN_ID}`)
    expect(collections.shelves!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(collections.shelves!.askedBy).toEqual({ oven_id: "" })
    expect(spell).toMatch(/^\tshelves are asked for by their oven-id$/m)
    expect(spell).toMatch(/^\tits "oven id" is text$/m)
  })

  test("needing one its description gives no example of:  asked with a real one", async () => {
    const { asked, collections } = await verified()
    expect(asked).toContain(`/api/trays?oven_id=${OVEN_ID}`)
    expect(collections.trays!.state).toMatchObject({ is: "verified", rows: 1 })
  })

  test("needing one no list answers:  skipped, needing a question, not failed", async () => {
    const { asked, collections } = await verified()
    expect(asked.filter((each) => each.startsWith("/api/crates"))).toEqual([])
    expect(collections.crates!.state).toEqual({ is: "unverified", reason: "needs a question:  truck_id" })
  })

  test("no real value is kept, in the description or the Spell, and the place compiles", async () => {
    const { description, spell } = await verified()
    for (const value of [OVEN_ID, RECIPE_ID]) {
      expect(JSON.stringify(description)).not.toContain(value)
      expect(spell).not.toContain(value)
    }
    expect(parseSpellProject([{ path: "/Bakery.api.spell", contents: spell }]).files[0]!.errors).toEqual([])
  })
})
