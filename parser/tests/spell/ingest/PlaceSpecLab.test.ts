import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import type { OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * A made-up lab's API, read whole from its OpenAPI description:  what a bigger description tripped on.
 * - Its searches are asked for by a LIST of device ids, `?device_ids=a&device_ids=b`, and by an instance id:
 *   fields of several words, joined (`device-ids`), one a list of values.
 * - A question Spell can't say, `1st_page`:  its line is left out, the rest written.
 */

const LAB = "https://lab.test"
const SPEC_AT = `${LAB}/openapi.json`

/** A list answer of `schema`'s rows. */
function listOf(schema: string): unknown {
  return {
    "200": {
      description: "OK",
      content: { "application/json": { schema: { type: "array", items: { $ref: `#/components/schemas/${schema}` } } } }
    }
  }
}

/** A required question. */
function needs(name: string, schema: Record<string, unknown>): Record<string, unknown> {
  return { name, in: "query", required: true, schema }
}

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Lab", version: "1.0.0" },
  paths: {
    "/api/devices": { get: { responses: listOf("Device") } },
    "/api/measurements/search": {
      get: {
        parameters: [needs("device_ids", { type: "array", items: { type: "string" } })],
        responses: listOf("Measurement")
      }
    },
    "/api/stacks": {
      get: { parameters: [needs("instance_id", { type: "string" })], responses: listOf("Stack") }
    },
    "/api/rankings": {
      get: { parameters: [needs("1st_page", { type: "string" })], responses: listOf("Ranking") }
    }
  },
  components: {
    schemas: {
      Device: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
      Measurement: { type: "object", properties: { id: { type: "string" }, value: { type: "number" } } },
      Stack: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
      Ranking: { type: "object", properties: { id: { type: "string" }, score: { type: "number" } } }
    }
  }
} as OpenApiDocument

/** The place's Spell and description, from an ingest of `document` into `into`. */
async function ingestOf(document: OpenApiDocument = DOCUMENT, into = "Lab.api.spell") {
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
  // what it serves as its description:  a test changes it, for a later look
  const fetch = { document }
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      return url === SPEC_AT ? Response.json(fetch.document) : new Response("nope", { status: 404 })
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-23T12:00:00Z")
  })
  const result = await ingest.add({ address: LAB, spec: SPEC_AT, into, name: "lab" })
  const description = descriptions.get(into.replace(/\.spell$/, ".json5"))!
  return { ingest, result, texts, descriptions, fetch, spell: texts.get(into)!, description }
}

/** `spell`'s errors, compiled alone. */
function errorsOf(spell: string, path = "/Lab.api.spell"): unknown[] {
  return parseSpellProject([{ path, contents: spell }]).files[0]!.errors
}

describe("asked for by a list of values, and by fields of several words", () => {
  test("its searches are asked for by their device-ids, a list;  its stacks by their instance-id", async () => {
    const { spell } = await ingestOf()
    expect(spell).toMatch(/^\tsearches are asked for by their device-ids$/m)
    expect(spell).toMatch(/^\tstacks are asked for by their instance-id$/m)
    expect(spell).toMatch(/^\tits "device ids" is a list of text$/m)
    expect(errorsOf(spell)).toEqual([])
  })

  test("a line Spell can't read is left out, saying why, and the rest of the place is written", async () => {
    const { spell, description } = await ingestOf()
    expect(spell).not.toMatch(/asked for by their 1st/)
    expect(spell).toMatch(/^\trankings live at "\/api\/rankings"$/m)
    expect(description.linesLeftOut).toEqual({ "asked:rankings": expect.stringMatching(/asked for by their 1st-page/) })
    expect(description.notes).toContainEqual(expect.stringMatching(/^Left out a line:  .*1st-page/))
  })
})

describe("a person's names, kept by spell place update", () => {
  test("a type and its list renamed in the file, and a field added by hand, stay after an update", async () => {
    const { ingest, texts } = await ingestOf()
    const renamed = texts
      .get("Lab.api.spell")!
      .replace(`devices live at "/api/devices"`, `instruments live at "/api/devices"`)
      .replace(`a "device" is a thing`, `an "instrument" is a thing`)
      .replace(`\tits "name" is text\n`, `\tits "name" is text\n\tits "serial" is text\n`)
    texts.set("Lab.api.spell", renamed)
    expect(errorsOf(renamed)).toEqual([])
    const { spell, couldntChange } = await ingest.update("Lab.api.spell")
    expect(spell).toMatch(/^\tinstruments live at "\/api\/devices"$/m)
    expect(spell).toMatch(/^an "instrument" is a thing\n[^]*?\tits "name" is text\n\tits "serial" is text$/m)
    expect(spell).not.toMatch(/a "device" is a thing/)
    expect(couldntChange).toEqual([])
    expect(errorsOf(spell)).toEqual([])
  })

  test("a renamed type still takes what a later look finds:  a new field goes under the person's name", async () => {
    const withModel = structuredClone(DOCUMENT)
    const device = withModel.components!.schemas!.Device as { properties: Record<string, unknown> }
    const { ingest, texts, fetch } = await ingestOf()
    texts.set(
      "Lab.api.spell",
      texts
        .get("Lab.api.spell")!
        .replace(`devices live at "/api/devices"`, `instruments live at "/api/devices"`)
        .replace(`a "device" is a thing`, `an "instrument" is a thing`)
    )
    device.properties.model = { type: "string" }
    fetch.document = withModel
    const { spell, couldntChange } = await ingest.update("Lab.api.spell")
    expect(spell).toMatch(/^an "instrument" is a thing\n[^]*?\tits "model" is text$/m)
    expect(spell).not.toMatch(/"device"/)
    expect(couldntChange).toEqual([])
    expect(errorsOf(spell)).toEqual([])
  })
})
