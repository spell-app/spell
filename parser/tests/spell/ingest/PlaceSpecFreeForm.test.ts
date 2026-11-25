/**
 * A field whose schema doesn't fix its shape, read from a made-up lab service's description:  its jobs' `meta`.
 * - Free-form (`additionalProperties: true`, `{}`, nothing said, or one of several objects):  `its "meta" is an object`,
 *   held whole, whatever keys its rows hold;  never a thing of the keys some rows show, which would drop the others.
 * - Some fields named, and any others allowed (`additionalProperties: true`):  an object type, `a "provenance" is an
 *   object` with its named fields, which keeps the rest.
 * - A map whose values its schema types, or one of several plain kinds:  left out, as before.
 * - A list no schema typed:  a field any row read holds is kept, though other rows don't hold it, inside a field too;
 *   one every row read held empty is text.
 * - A line a person wrote for a field (`its "meta" is text`):  update and verify keep it, and add no second beside it.
 */
import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import type { OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

const LAB = "https://lab.example.test"
const SPEC_AT = `${LAB}/openapi.json`

/** An answer of this schema. */
function answers(schema: object): object {
  return { responses: { "200": { content: { "application/json": { schema } } } } }
}

/** FastAPI's `Optional[dict]`. */
const OPTIONAL_DICT = { anyOf: [{ type: "object", additionalProperties: true }, { type: "null" }] }

const DOCUMENT: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Lab", version: "1.0.0" },
  paths: {
    "/api/jobs": { get: answers({ type: "array", items: { $ref: "#/components/schemas/Job" } }) },
    "/api/jobs/{job_id}": { get: answers({ $ref: "#/components/schemas/Job" }) },
    // nothing said of its answer:  untyped, till a read shows it
    "/api/devices": { get: answers({}) }
  },
  components: {
    schemas: {
      Job: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          meta: OPTIONAL_DICT,
          settings: { type: "object", additionalProperties: true },
          extra: {},
          placement: {
            anyOf: [
              {
                oneOf: [{ $ref: "#/components/schemas/ShelfPlacement" }, { $ref: "#/components/schemas/RackPlacement" }]
              },
              { type: "null" }
            ]
          },
          // its known fields, and any others:  an object type
          provenance: { $ref: "#/components/schemas/Provenance" },
          // a map its schema types, each key its own:  left out
          labels: { type: "object", additionalProperties: { type: "string" } },
          // one of several plain kinds:  left out
          score: { anyOf: [{ type: "integer" }, { type: "string" }] }
        },
        required: ["id", "name"]
      },
      Provenance: {
        type: "object",
        properties: { source: { type: "string" }, checked_at: { type: "string", format: "date-time" } },
        additionalProperties: true
      },
      ShelfPlacement: { type: "object", properties: { kind: { type: "string" }, shelf: { type: "string" } } },
      RackPlacement: { type: "object", properties: { kind: { type: "string" }, rack: { type: "string" } } }
    }
  }
} as OpenApiDocument

/** The lab's jobs:  each `meta` its own keys, one with a key the others lack, and more inside. */
const JOBS = [
  {
    id: "j1",
    name: "warm up",
    meta: { owner: "ada", runs: [1, 2] },
    settings: { gain: 2 },
    placement: null,
    provenance: { source: "scan", checked_at: "2026-11-20T10:00:00Z" }
  },
  {
    id: "j2",
    name: "cool down",
    meta: { owner: "bo", extra_key: true, deep: { a: { b: 1 } } },
    settings: {},
    placement: { kind: "shelf", shelf: "s1" },
    provenance: { source: "hand", by: "bo" }
  }
]

/** The lab's devices, as `devices` says:  the first read holds no port, and no asset yet. */
function devicesOf(later: boolean) {
  return [
    { id: "d1", asset_id: null, data: { rack: "r1", ...(later && { port: "p7" }) } },
    { id: "d2", asset_id: later ? "a9" : null, data: { rack: "r2" } }
  ]
}

/** The lab ingested from its description into `into`;  `later()`, its devices as they answer later. */
async function ingestOf(into = "Lab.api.spell") {
  const texts = new Map<string, string>()
  const descriptions = new Map<string, PlaceDescription>()
  let isLater = false
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
  const answer = (url: URL): Response => {
    if (url.pathname === "/api/jobs") return Response.json(JOBS)
    const job = JOBS.find(({ id }) => url.pathname === `/api/jobs/${id}`)
    if (job) return Response.json(job)
    if (url.pathname === "/api/devices") return Response.json(devicesOf(isLater))
    return Response.json({ detail: "Not Found" }, { status: 404 })
  }
  const ingest = new PlaceIngest({
    fetch: (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      return url === SPEC_AT ? Response.json(DOCUMENT) : answer(new URL(url))
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-25T12:00:00Z")
  })
  await ingest.add({ address: LAB, spec: SPEC_AT, into, name: "lab", rows: 20 })
  const descriptionPath = into.replace(/(\.es)?\.spell$/, ".json5")
  return {
    ingest,
    texts,
    description: () => descriptions.get(descriptionPath)!,
    spell: () => texts.get(into)!,
    later: () => void (isLater = true)
  }
}

/** The errors compiling `text`. */
function errorsOf(text: string, path = "/Lab.api.spell"): unknown[] {
  return parseSpellProject([{ path, contents: text }]).files[0]!.errors
}

/** The lines of the job's type in `text`. */
function jobLines(text: string): string[] {
  const at = text.indexOf('a "job" is a thing')
  const end = text.indexOf("\n\n", at)
  return text.slice(at, end < 0 ? undefined : end).split("\n")
}

describe("a free-form field", () => {
  test("is an object:  `additionalProperties: true`, nothing said, one of several objects;  the file compiles", async () => {
    const { spell, description } = await ingestOf()
    const { fields } = description().collections.jobs!
    for (const name of ["meta", "settings", "extra", "placement"]) {
      expect(fields[name], name).toMatchObject({ type: "object", isFreeForm: true })
      expect(fields[name]!.leftOut, name).toBeUndefined()
    }
    expect(spell()).toMatch(/^\tits "meta" is an object$/m)
    expect(spell()).toMatch(/^\tits "settings" is an object$/m)
    expect(spell()).toMatch(/^\tits "extra" is an object$/m)
    expect(spell()).toMatch(/^\tits "placement" is an object$/m)
    // a map its schema types, and one of several plain kinds:  left out, as before
    expect(fields.labels!.leftOut).toMatch(/map by name/)
    expect(fields.score!.leftOut).toMatch(/several kinds/)
    expect(spell()).not.toMatch(/its "(labels|score)"/)
    // never a thing of its rows' keys
    expect(spell()).not.toMatch(/"(job meta|meta|placement)" is a thing/)
    expect(errorsOf(spell())).toEqual([])
  })

  test("verify:  the rows' objects, each with keys of its own, match it;  it stays an object", async () => {
    const { ingest, spell, description } = await ingestOf()
    const result = await ingest.verify("Lab.api.spell")
    const jobs = description().collections.jobs!
    expect(jobs.state).toMatchObject({ is: "verified", rows: 2 })
    expect(jobs.fields.meta).toMatchObject({ type: "object", isFreeForm: true })
    expect(jobs.fields.meta!.inside).toBeUndefined()
    expect(jobs.fields.placement).toMatchObject({ type: "object" })
    expect(spell()).toMatch(/^\tits "meta" is an object$/m)
    expect(result.changes.join("\n")).not.toMatch(/meta|placement/)
    expect(errorsOf(spell())).toEqual([])
  })

  test("a page reads its keys:  `the owner of its meta`", () => {
    const text = [
      'lab is a web server at "https://lab.example.test"',
      "\tcheck it every 30 seconds",
      "",
      'a "job" is a thing',
      "\tit lives in lab",
      '\tits "meta" is an object',
      '\tits "owner" is the owner of its meta'
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Lab.api.spell", contents: `${text}\n` }]).files
    expect(file!.errors).toEqual([])
    expect(String(file!.compiled)).toContain("this.meta.owner")
  })

  test("Spanish:  the same place, and the file parses clean", async () => {
    const { spell } = await ingestOf("Lab.api.es.spell")
    expect(errorsOf(spell(), "/Lab.api.es.spell")).toEqual([])
  })
})

describe("a field with known fields, that allows others", () => {
  test("is an object type:  its known fields typed, the rest kept;  verify matches rows with keys of their own", async () => {
    const { ingest, spell, description } = await ingestOf()
    expect(description().collections.jobs!.fields.provenance).toMatchObject({ type: "inside", keepsEveryKey: true })
    expect(spell()).toMatch(/^\tits "provenance" is a provenance$/m)
    expect(spell()).toMatch(/^a "provenance" is an object\n\tits "source" is text\n\tits "checked at" is a date$/m)
    // one that names its fields and allows no others stays a thing
    expect(spell()).not.toMatch(/"(shelf placement|rack placement)" is an object/)
    expect(errorsOf(spell())).toEqual([])
    await ingest.verify("Lab.api.spell")
    expect(description().collections.jobs!.state).toMatchObject({ is: "verified", rows: 2 })
    expect(spell()).toMatch(/^a "provenance" is an object$/m)
    expect(errorsOf(spell())).toEqual([])
  })
})

describe("a field only some rows hold, in a list no schema typed", () => {
  test("verify keeps a field any row read holds, inside one too;  one read empty is text till a value says more", async () => {
    const { ingest, spell, description, later } = await ingestOf()
    await ingest.verify("Lab.api.spell")
    const devices = () => description().collections.devices!
    expect(devices().fields.asset_id).toMatchObject({ type: "nothing" })
    expect(spell()).toMatch(/^\tits "asset id" is text$/m)
    expect(Object.keys(devices().fields.data!.inside!)).toEqual(["rack"])
    later()
    const result = await ingest.verify("Lab.api.spell")
    expect(Object.keys(devices().fields.data!.inside!)).toEqual(["rack", "port"])
    expect(devices().fields.asset_id).toMatchObject({ words: "asset id", type: "text" })
    expect(result.changes.join("\n")).toMatch(/devices:  fields its rows hold, new:  asset_id, data\.port\./)
    expect(spell()).toMatch(/^\tits "port" is text$/m)
    expect(spell().match(/its "asset id"/g)).toHaveLength(1)
    expect(errorsOf(spell())).toEqual([])
  })

  test("update keeps the fields its rows showed:  its description still says nothing of them", async () => {
    const { ingest, spell, description, later } = await ingestOf()
    later()
    await ingest.verify("Lab.api.spell")
    await ingest.update("Lab.api.spell")
    expect(Object.keys(description().collections.devices!.fields.data!.inside!)).toEqual(["rack", "port"])
    expect(spell()).toMatch(/^\tits "port" is text$/m)
  })
})

describe("a line a person wrote for a field", () => {
  test("update and verify keep it, and add no second line for that field beside it", async () => {
    const { ingest, texts, spell, description } = await ingestOf()
    // as an older ingest left it:  meta and placement left out, and a person's lines for them
    const held = description()
    for (const name of ["meta", "placement"]) {
      held.collections.jobs!.fields[name] = { words: name, type: "inside", leftOut: "It's too far inside others." }
    }
    held.spell = held.spell!.filter((line) => !/its "(meta|placement)"/.test(line))
    const handWritten = spell()
      .replace(/^\tits "meta" is an object\n/m, "")
      .replace(/^\tits "placement" is an object\n/m, "")
      .replace(
        /^(\tits "name" is required text)$/m,
        '$1\n\tits "meta" is text\n\t\t// By hand\n\tits "placement" is an object, stored as "placement"'
      )
    texts.set("Lab.api.spell", handWritten)
    const updated = await ingest.update("Lab.api.spell")
    const lines = jobLines(spell())
    expect(lines.filter((line) => /its "meta"/.test(line))).toEqual(['\tits "meta" is text'])
    expect(lines).toContain("\t\t// By hand")
    expect(lines.filter((line) => /"placement"/.test(line))).toEqual([
      '\tits "placement" is an object, stored as "placement"'
    ])
    expect(updated.couldntChange.join("\n")).toMatch(
      /It would add "its "meta" is an object", but your line reads that field already, so yours stays:  its "meta" is text/
    )
    await ingest.verify("Lab.api.spell")
    expect(jobLines(spell()).filter((line) => /its "(meta|placement)"/.test(line))).toHaveLength(2)
    expect(errorsOf(spell())).toEqual([])
  })
})
