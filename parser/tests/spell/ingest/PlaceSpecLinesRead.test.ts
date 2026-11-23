import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import type { OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type {
  FieldDescription,
  IngestFiles,
  IngestSettings,
  PlaceDescription
} from "spell/parser/spell/ingest/ingest.types"
import type { ClaudeRunner } from "spell/parser/spell/translate/translate.types"

/**
 * Every kind of line the ingest writes is one Spell reads:  none left out for Spell not reading it.
 * - A made-up bakery's API, read whole from its OpenAPI description, its fields named by an agent the way one did:
 *   a yes or no `is sliced` and `has seeds`, a choice that needs a stored-as, a length beside a stored-as.
 * - Its types inside a row named in a plural (`LoafExtras`, `BakeData`), one beside its own singular (`LoafExtra`).
 * - A `GET` at its own address, `/`, its front page.
 */

const BAKERY = "https://bakery.test"
const SPEC_AT = `${BAKERY}/openapi.json`

/** A list answer of `schema`'s rows. */
function listOf(schema: string): unknown {
  return {
    "200": {
      description: "OK",
      content: { "application/json": { schema: { type: "array", items: { $ref: `#/components/schemas/${schema}` } } } }
    }
  }
}

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Bakery", version: "1.0.0" },
  paths: {
    // its front page, as a web server serves it:  described as nothing at all
    "/": { get: { responses: { "200": { description: "OK", content: { "application/json": { schema: {} } } } } } },
    "/api/loaves": { get: { responses: listOf("Loaf") } }
  },
  components: {
    schemas: {
      Loaf: {
        type: "object",
        properties: {
          loaf_id: { type: "string" },
          is_sliced: { type: "boolean" },
          has_seeds: { type: "boolean" },
          state: { type: "string", enum: ["rising", "baked", "sold"] },
          zip_1: { type: "string", maxLength: 10 },
          extras: { $ref: "#/components/schemas/LoafExtras" },
          data: { $ref: "#/components/schemas/BakeData" }
        }
      },
      LoafExtras: {
        type: "object",
        properties: {
          crust: { $ref: "#/components/schemas/LoafExtra" },
          crumb: { $ref: "#/components/schemas/LoafExtra" }
        }
      },
      LoafExtra: { type: "object", properties: { available: { type: "boolean" }, reason: { type: "string" } } },
      BakeData: { type: "object", properties: { temperature: { type: "number" } } }
    }
  }
} as OpenApiDocument

/** An agent naming the loaves' fields as one did:  a yes or no by its `is` and `has`, a choice and a field its own way. */
const AGENT: ClaudeRunner = async () =>
  JSON.stringify({
    placeName: "",
    notes: [],
    collections: [
      {
        name: "loaves",
        typeWords: "loaf",
        about: "",
        idField: "loaf_id",
        fields: [
          { field: "is_sliced", words: "is sliced", means: "whether it's sliced" },
          { field: "has_seeds", words: "has seeds", means: "whether it has seeds" },
          { field: "state", words: "loaf state", means: "where it is in its baking" },
          { field: "zip_1", words: "zip one", means: "its first zip code" }
        ]
      }
    ]
  })

/** The bakery ingested, its agent naming its fields:  its Spell and description. */
async function ingestOf(settings: Partial<IngestSettings> = {}) {
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
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      return url === SPEC_AT ? Response.json(DOCUMENT) : new Response("nope", { status: 404 })
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-23T12:00:00Z"),
    claude: AGENT,
    claudeVia: "a test",
    ...settings
  })
  await ingest.add({ address: BAKERY, spec: SPEC_AT, into: "Bakery.api.spell", name: "bakery" })
  return { ingest, texts, descriptions, spell: () => texts.get("Bakery.api.spell")! }
}

/** Every field `description` leaves out, inside a row's too, by why. */
function leftOutOf(description: PlaceDescription): string[] {
  const of = (fields: Record<string, FieldDescription>): string[] =>
    Object.values(fields).flatMap(({ leftOut, inside }) => [...(leftOut ? [leftOut] : []), ...of(inside ?? {})])
  return Object.values(description.collections).flatMap(({ leftOut, fields }) => [
    ...(leftOut ? [leftOut] : []),
    ...of(fields)
  ])
}

/** `spell`'s errors, compiled alone. */
function errorsOf(spell: string): unknown[] {
  return parseSpellProject([{ path: "/Bakery.api.spell", contents: spell }]).files[0]!.errors
}

describe("each kind of line the ingest writes", () => {
  test("a yes or no the agent calls `is sliced` or `has seeds` is `sliced`, `seeds`:  what Spell reads", async () => {
    const { spell, descriptions } = await ingestOf()
    expect(spell()).toMatch(/^\tits "sliced" is yes or no, stored as "is_sliced"$/m)
    expect(spell()).toMatch(/^\tits "seeds" is yes or no, stored as "has_seeds"$/m)
    // what the agent said it means is kept
    expect(descriptions.get("Bakery.api.json5")!.collections.loaves!.fields.is_sliced).toMatchObject({
      words: "sliced",
      means: "whether it's sliced"
    })
  })

  test("a choice is its source's own words, needing no stored-as Spell would read as one more choice", async () => {
    const { spell } = await ingestOf()
    expect(spell()).toMatch(/^\tits "state" as one of rising, baked or sold$/m)
    expect(spell()).not.toMatch(/loaf state/)
  })

  test("a length is said after its stored-as, the order Spell reads them in", async () => {
    const { spell } = await ingestOf()
    expect(spell()).toMatch(/^\tits "zip one" is text, stored as "zip_1", with maximum length 10$/m)
  })

  test("a type inside a row is named as ONE thing, and never as another schema's", async () => {
    const { spell } = await ingestOf()
    // `BakeData`:  `a bake data` reads as many
    expect(spell()).toMatch(/^\tits "data" is a bake datum$/m)
    expect(spell()).toMatch(/^a "bake datum" is a thing$/m)
    // `LoafExtras`, beside `LoafExtra`:  `loaf extra` is that one's
    expect(spell()).toMatch(/^\tits "extras" is a loaf extras set$/m)
    expect(spell()).toMatch(
      /^a "loaf extras set" is a thing\n\tits "crust" is a loaf extra\n\tits "crumb" is a loaf extra$/m
    )
    expect(spell()).toMatch(/^a "loaf extra" is a thing\n\tits "available" is yes or no\n\tits "reason" is text$/m)
  })

  test("a type the agent names in a plural is ONE of it, as Spell reads a type", async () => {
    // `a bake data` reads as many
    const claude: ClaudeRunner = async () =>
      JSON.stringify({
        placeName: "",
        notes: [],
        collections: [{ name: "loaves", typeWords: "bake data", about: "", idField: "loaf_id", fields: [] }]
      })
    const { spell } = await ingestOf({ claude })
    expect(spell()).toMatch(/^a "bake datum" is a thing$/m)
    expect(spell()).toMatch(/^\tbake data live at "\/api\/loaves"$/m)
    expect(errorsOf(spell())).toEqual([])
  })

  test("its front page, `/`, names no list:  left out, said in its notes", async () => {
    const { spell, descriptions } = await ingestOf()
    const description = descriptions.get("Bakery.api.json5")!
    expect(Object.values(description.collections).map(({ at }) => at)).toEqual(["/api/loaves"])
    expect(description.notes).toContain(`Left out "/":  the server's own address, which names no list.`)
    expect(spell()).not.toMatch(/live at "\/"/)
  })

  test("so nothing is left out for Spell not reading it, and the place compiles", async () => {
    const { spell, descriptions } = await ingestOf()
    expect(leftOutOf(descriptions.get("Bakery.api.json5")!)).toEqual([])
    expect(descriptions.get("Bakery.api.json5")!.linesLeftOut).toBeUndefined()
    expect(errorsOf(spell())).toEqual([])
  })
})

describe("a line Spell couldn't read before", () => {
  test("is tried again on a look again, in the words Spell reads now", async () => {
    const { ingest, descriptions, spell } = await ingestOf()
    // as an older Spell wrote it:  its words `is sliced`, its line left out
    const before = descriptions.get("Bakery.api.json5")!
    const sliced = before.collections.loaves!.fields.is_sliced!
    sliced.words = "is sliced"
    sliced.leftOut = `Spell couldn't read its line:  its "is sliced" is yes or no -- Don't understand it`
    before.notes.push(`Left out loaves's "is_sliced":  ${sliced.leftOut}`)
    await ingest.update("Bakery.api.spell")
    const after = descriptions.get("Bakery.api.json5")!
    expect(after.collections.loaves!.fields.is_sliced).toMatchObject({ words: "sliced" })
    expect(after.collections.loaves!.fields.is_sliced!.leftOut).toBeUndefined()
    expect(after.notes.filter((note) => note.includes("couldn't read"))).toEqual([])
    expect(spell()).toMatch(/^\tits "sliced" is yes or no, stored as "is_sliced"$/m)
    expect(errorsOf(spell())).toEqual([])
  })
})
