import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import type { OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestAsk, IngestFiles, IngestSettings, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"
import type { ClaudeRunner } from "spell/parser/spell/translate/translate.types"

/**
 * A made-up lab's API, read whole from its OpenAPI description:  what a bigger description tripped on.
 * - Its searches are asked for by a LIST of device ids, `?device_ids=a&device_ids=b`, and by an instance id:
 *   fields of several words, joined (`device-ids`), one a list of values.
 * - A list wrapped in its answer, `{ sources: [...], warnings: [...], next_offset }`:  unwrapped, as no other is.
 * - A list whose answer it describes as `{}`:  kept with no fields, for a read to fill, its id a slug.
 * - Beside a shop's place:  a device of each (named apart), and the shop's jobs, copied by the lab untyped (left out);
 *   an inspection inside each one's rows, the lab's found by a verify's read (named apart too).
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
    // its rows wrapped, beside a list of plain values and the next offset
    "/api/sources": {
      get: {
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } }
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SourcesAnswer" } } }
          }
        }
      }
    },
    // its answer described as nothing at all:  `{}`
    "/api/designs": {
      get: { responses: { "200": { description: "OK", content: { "application/json": { schema: {} } } } } }
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
      Ranking: { type: "object", properties: { id: { type: "string" }, score: { type: "number" } } },
      Source: { type: "object", properties: { id: { type: "string" }, supplier: { type: "string" } } },
      SourcesAnswer: {
        type: "object",
        properties: {
          sources: { type: "array", items: { $ref: "#/components/schemas/Source" } },
          warnings: { type: "array", items: { type: "string" } },
          next_offset: { anyOf: [{ type: "integer" }, { type: "null" }] }
        }
      }
    }
  }
} as OpenApiDocument

/** The place's Spell and description, from an ingest of `document` into `into`. */
async function ingestOf(
  document: OpenApiDocument = DOCUMENT,
  into = "Lab.api.spell",
  ask: Partial<IngestAsk> = {},
  beside = { texts: new Map<string, string>(), descriptions: new Map<string, PlaceDescription>() },
  settings: Partial<IngestSettings> = {}
) {
  const { texts, descriptions } = beside
  const files: IngestFiles = {
    read: async (path) => texts.get(path),
    write: async (path, text) => void texts.set(path, text),
    readDescription: async (path) => {
      const held = descriptions.get(path)
      return held && descriptionOnDisk(held)
    },
    writeDescription: async (path, description) =>
      void descriptions.set(path, descriptionFromDisk(structuredClone(description))),
    otherSpellBeside: async (path) => [...texts].filter(([at]) => at !== path).map(([, text]) => text),
    otherDescriptionsBeside: async (path) =>
      [...descriptions].filter(([at]) => at !== path.replace(/\.spell$/, ".json5")).map(([, each]) => each)
  }
  // what it serves as its description:  a test changes it, for a later look
  const fetch = { document, answer: (_url: URL): Response => new Response("nope", { status: 404 }) }
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      return url === SPEC_AT ? Response.json(fetch.document) : fetch.answer(new URL(url))
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-23T12:00:00Z"),
    ...settings
  })
  const result = await ingest.add({ address: LAB, spec: SPEC_AT, into, name: "lab", ...ask })
  // the files beside it:  another place's, ingested before
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

describe("a list whose answer isn't described", () => {
  test("is kept, with no fields yet;  a verify fills its fields from what it reads, and its id field", async () => {
    const { ingest, spell, description, descriptions, fetch } = await ingestOf()
    expect(spell).toMatch(/^\tdesigns live at "\/api\/designs"$/m)
    expect(description.collections.designs).toMatchObject({ state: { is: "untyped" }, fields: {} })
    expect(errorsOf(spell)).toEqual([])
    const design = { slug: "top-level", name: "Top level", modules: 3 }
    fetch.answer = (url) =>
      url.pathname === "/api/designs"
        ? Response.json([design])
        : url.pathname === "/api/designs/top-level"
          ? Response.json(design)
          : new Response("nope", { status: 404 })
    await ingest.verify("Lab.api.spell")
    const designs = descriptions.get("Lab.api.json5")!.collections.designs!
    expect(designs.state).toMatchObject({ is: "verified", rows: 1 })
    expect(designs.idField).toBe("slug")
    expect(Object.keys(designs.fields)).toEqual(expect.arrayContaining(["name", "modules"]))
  })
})

describe("a list wrapped in its answer, as no other is", () => {
  test("is a list of its one list of things, and a read through the Spell unwraps it", async () => {
    const { spell, description } = await ingestOf()
    expect(spell).toMatch(/^\tsources live at "\/api\/sources"$/m)
    expect(description.collections.sources).toMatchObject({ rowsAt: "sources" })
    expect(Object.keys(description.collections.sources!.fields)).toContain("supplier")
    expect(spell).not.toMatch(/its rows are/)
    expect(errorsOf(spell)).toEqual([])
  })
})

describe("read only, rows at a time, how often it's checked:  as it was told", () => {
  test("written into the place, writes it describes kept off, and kept by an update", async () => {
    const { ingest, spell, description } = await ingestOf(DOCUMENT, "Lab.api.spell", {
      readOnly: true,
      rows: 20,
      checkEvery: 30
    })
    expect(spell).toMatch(/^\tit is read only$/m)
    expect(spell).toMatch(/^\tit gives up to 20 at a time$/m)
    expect(spell).toMatch(/^\tcheck it every 30 seconds$/m)
    expect(description.about).toMatchObject({ readOnly: true, rows: 20, checkEvery: 30 })
    expect(errorsOf(spell)).toEqual([])
    const { spell: again } = await ingest.update("Lab.api.spell")
    expect(again).toMatch(/^\tit is read only$/m)
    expect(again).toMatch(/^\tit gives up to 20 at a time$/m)
    expect(again).toMatch(/^\tcheck it every 30 seconds$/m)
  })
})

describe("beside another place", () => {
  /** A shop's place, ingested first:  its own devices and jobs, each typed. */
  const SHOP: OpenApiDocument = {
    openapi: "3.1.0",
    info: { title: "Shop", version: "1.0.0" },
    paths: {
      "/api/devices": { get: { responses: listOf("Device") } },
      "/api/jobs": { get: { responses: listOf("Job") } }
    },
    components: {
      schemas: {
        Device: {
          type: "object",
          properties: {
            id: { type: "string" },
            aisle: { type: "string" },
            inspection: { type: "object", properties: { by: { type: "string" }, passed: { type: "boolean" } } }
          }
        },
        Job: { type: "object", properties: { id: { type: "string" }, state: { type: "string" } } }
      }
    }
  } as OpenApiDocument

  /** The lab, with its copy of the shop's jobs:  a route its description says nothing of. */
  const WITH_COPY = structuredClone(DOCUMENT)
  WITH_COPY.paths!["/api/v1/proxy/jobs"] = {
    get: { responses: { "200": { content: { "application/json": { schema: {} } } } } }
  }

  /** The shop ingested into Shop.api.spell, then the lab beside it, read by `settings`' agent. */
  async function besideShop(settings: Partial<IngestSettings> = {}) {
    const beside = { texts: new Map<string, string>(), descriptions: new Map<string, PlaceDescription>() }
    const shop = await ingestOf(SHOP, "Shop.api.spell", { name: "shop" }, beside)
    expect(errorsOf(shop.spell, "/Shop.api.spell")).toEqual([])
    return ingestOf(WITH_COPY, "Lab.api.spell", {}, beside, settings)
  }

  test("a list whose rows are the other place's is left out, saying which place has them", async () => {
    const { spell, description } = await besideShop()
    expect(spell).not.toMatch(/proxy/)
    expect(description.collections.jobs!.leftOut).toMatch(/its rows are shop's jobs, read there/)
    expect(description.notes).toContainEqual(
      expect.stringMatching(/^Left out the collection "jobs":  its rows are shop's jobs/)
    )
  })

  test("a type both have is named apart here, and the note says to rename the other's in its own file", async () => {
    const { spell, description, texts } = await besideShop()
    expect(spell).toMatch(/^a "lab device" is a thing$/m)
    expect(description.notes).toContainEqual(
      expect.stringMatching(
        /^"device" is shop's too, so this one is a "lab device":  .*rename shop's in its own file, a "shop device"/
      )
    )
    const project = [...texts].map(([path, contents]) => ({ path: `/${path}`, contents }))
    expect(parseSpellProject(project).files.flatMap(({ errors }) => errors)).toEqual([])
  })

  test("named apart after the agent names its types:  an agent naming one the bare word can't undo it", async () => {
    // an agent that calls the lab's devices plain devices, whatever they were named before it
    const claude: ClaudeRunner = async () =>
      JSON.stringify({
        placeName: "",
        notes: [],
        collections: ["devices", "lab_devices"].map((name) => ({
          name,
          typeWords: "device",
          about: "",
          idField: "",
          fields: []
        }))
      })
    const { spell, texts } = await besideShop({ claude, claudeVia: "a test" })
    expect(spell).toMatch(/^a "lab device" is a thing$/m)
    expect(spell).not.toMatch(/^a "device" is a thing$/m)
    const project = [...texts].map(([path, contents]) => ({ path: `/${path}`, contents }))
    expect(parseSpellProject(project).files.flatMap(({ errors }) => errors)).toEqual([])
  })
  /** Its designs' rows, read by a verify:  each with an inspection, as the shop's devices have. */
  function answerDesigns(fetch: { answer: (url: URL) => Response }): void {
    const design = { slug: "top-level", name: "Top level", inspection: { by: "ana", passed: true, at: "bench 2" } }
    fetch.answer = (url) =>
      url.pathname === "/api/designs"
        ? Response.json([design])
        : url.pathname === "/api/designs/top-level"
          ? Response.json(design)
          : new Response("nope", { status: 404 })
  }

  /** Every error in the project:  each file beside the others. */
  function projectErrors(texts: ReadonlyMap<string, string>): unknown[] {
    const project = [...texts].map(([path, contents]) => ({ path: `/${path}`, contents }))
    return parseSpellProject(project).files.flatMap(({ errors }) => errors)
  }

  test("a type a verify's read makes is named apart too:  the lab's inspection, beside the shop's", async () => {
    const { ingest, texts, fetch, descriptions } = await besideShop()
    expect(texts.get("Shop.api.spell")).toMatch(/^an "inspection" is a thing$/m)
    answerDesigns(fetch)
    const { spell } = await ingest.verify("Lab.api.spell")
    expect(spell).toMatch(/^a "lab inspection" is a thing$/m)
    expect(spell).toMatch(/^\tits "inspection" is a lab inspection$/m)
    expect(spell).not.toMatch(/^an "inspection" is a thing$/m)
    expect(descriptions.get("Lab.api.json5")!.notes).toContainEqual(
      expect.stringMatching(/^"inspection" is shop's too, so this one is a "lab inspection"/)
    )
    expect(projectErrors(texts)).toEqual([])
  })

  test("verified again, and looked at again by an update, it stays apart and the project compiles", async () => {
    const { ingest, texts, fetch } = await besideShop()
    answerDesigns(fetch)
    await ingest.verify("Lab.api.spell")
    const { spell: again } = await ingest.verify("Lab.api.spell")
    expect(again).toMatch(/^a "lab inspection" is a thing$/m)
    expect(projectErrors(texts)).toEqual([])
    const { spell: updated } = await ingest.update("Lab.api.spell")
    expect(updated).not.toMatch(/^an "inspection" is a thing$/m)
    expect(projectErrors(texts)).toEqual([])
  })
})

describe("verify's question", () => {
  /** The lab, with a search and a list asked for by a team, each with an example of two words. */
  const WITH_QUESTIONS = structuredClone(DOCUMENT)
  WITH_QUESTIONS.paths!["/api/finds"] = {
    get: {
      parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" }, example: "dune sand" }],
      responses: listOf("Device")
    }
  } as never
  WITH_QUESTIONS.paths!["/api/rosters"] = {
    get: {
      parameters: [{ name: "team", in: "query", required: true, schema: { type: "string" }, example: "red team" }],
      responses: listOf("Device")
    }
  } as never

  /** Every address verify asked, after an ingest and `edit` to its description. */
  async function askedByVerify(edit: (description: PlaceDescription) => void = () => {}) {
    const { ingest, descriptions, fetch } = await ingestOf(WITH_QUESTIONS)
    edit(descriptions.get("Lab.api.json5")!)
    const asked: string[] = []
    fetch.answer = (url) => {
      asked.push(`${url.pathname}${url.search}`)
      return Response.json([{ id: "d1", name: "probe" }])
    }
    await ingest.verify("Lab.api.spell")
    return asked
  }

  test("a space goes as %20, a search's and a list's question alike", async () => {
    const asked = await askedByVerify()
    expect(asked).toContain("/api/finds?q=dune%20sand")
    expect(asked).toContain("/api/rosters?team=red%20team")
  })

  test("each question goes beside the others, and a list of values goes as its question repeated", async () => {
    const asked = await askedByVerify((description) => {
      const rosters = Object.values(description.collections).find(({ at }) => at === "/api/rosters")!
      rosters.askedBy = { ...rosters.askedBy, device: ["d1", "d2"] as never }
    })
    expect(asked).toContain("/api/rosters?team=red%20team&device=d1&device=d2")
  })
})
