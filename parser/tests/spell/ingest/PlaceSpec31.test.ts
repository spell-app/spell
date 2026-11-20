import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceSpec, type OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * An OpenAPI 3.1 description, in the shape FastAPI writes, read whole as a place (epic `data` I109).
 * - `openapi/acme-jobs.openapi.json`:  made up, not anyone's API.
 *   - A paged list (`{ items, total, limit, offset }`), a search (`{ results, total_count }`), errors as `{ detail }`.
 *   - Every optional field as FastAPI writes it, `anyOf: [{ ... }, { type: "null" }]`;  one in 3.1's own form,
 *     `type: ["integer", "null"]`;  an optional nested model and an optional enum, each a `$ref` in an `anyOf`.
 *   - 3.1's extras, which must not trip it:  `examples`, `const`, `contentMediaType`, `prefixItems`, a union of kinds.
 */

const ACME = "https://jobs.acme.test"
const SPEC_AT = `${ACME}/openapi.json`
const DOCUMENT = JSON.parse(
  readFileSync(join(import.meta.dirname, "openapi/acme-jobs.openapi.json"), "utf8")
) as OpenApiDocument

/** The place's Spell and description, from an ingest of the description:  in Spanish for an `.es.spell` file. */
async function ingestOf(into: string) {
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
    fetch: (async (input: RequestInfo | URL) =>
      `${input instanceof Request ? input.url : input}` === SPEC_AT
        ? Response.json(DOCUMENT)
        : new Response("nope", { status: 404 })) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-19T12:00:00Z")
  })
  const result = await ingest.add({ address: ACME, spec: SPEC_AT, into, name: "acme jobs" })
  return { result, spell: texts.get(into)!, description: descriptions.get(into.replace(/(\.es)?\.spell$/, ".json5"))! }
}

describe("PlaceSpec, an OpenAPI 3.1 description as FastAPI writes it", () => {
  const look = new PlaceSpec(DOCUMENT, SPEC_AT).lookAt(ACME)
  const named = (name: string) => look.collections.find((each) => each.name === name)!
  const jobs = named("jobs")
  const fields = jobs.fields!

  test("its paged list and its search are collections, their rows under `items` and `results`", () => {
    expect(look.collections.map(({ name }) => name).sort()).toEqual(["jobs", "search"])
    expect(jobs).toMatchObject({ at: "/api/jobs", rowsAt: "items", takesLimit: true })
    expect(jobs.schemaAt).toBe("#/components/schemas/Job")
    expect(named("search")).toMatchObject({ at: "/api/search", rowsAt: "results" })
    expect(named("search").fields!.snippet).toMatchObject({ type: "text" })
    expect(look.notes).toEqual([])
  })

  test("a field that may be nothing is its one kind, never required:  `anyOf` with null, or a type list", () => {
    expect(fields.name).toMatchObject({ type: "text", isRequired: true, maxLetters: 200 })
    // required, but it may be null:  so a thing needn't have one
    expect(fields.description).toMatchObject({ type: "text" })
    expect(fields.description!.isRequired).toBeUndefined()
    expect(fields.priority).toEqual(expect.objectContaining({ type: "number", minimum: 0, maximum: 10 }))
    expect(fields.retries).toMatchObject({ type: "number" })
    expect(fields.finished_at).toMatchObject({ type: "date", format: "date-time" })
  })

  test("a uuid, a datetime, an enum by `$ref`, and one in an `anyOf` with null", () => {
    expect(fields.id).toMatchObject({ type: "text", format: "uuid", isRequired: true })
    expect(fields.created_at).toMatchObject({ type: "date", format: "date-time", isRequired: true })
    expect(fields.status).toMatchObject({
      type: "text",
      isRequired: true,
      choices: ["queued", "running", "done", "failed"]
    })
    expect(fields.stage).toMatchObject({ type: "text", choices: ["build", "test", "deploy"] })
    expect(fields.stage!.isRequired).toBeUndefined()
  })

  test("an optional nested model and a list of models are types inside, named by their schemas", () => {
    expect(fields.owner).toMatchObject({
      type: "inside",
      schemaAt: "#/components/schemas/Owner",
      insideSchemaAt: "#/components/schemas/Owner"
    })
    expect(fields.owner!.inside!.email).toMatchObject({ type: "text", example: "alice@acme.test", format: "email" })
    expect(fields.owner!.inside!.team).toMatchObject({ type: "text" })
    expect(fields.steps).toMatchObject({
      type: "inside",
      isListInside: true,
      insideSchemaAt: "#/components/schemas/Step"
    })
    expect(fields.steps!.inside!.seconds).toMatchObject({ type: "number" })
    expect(fields.labels).toMatchObject({ type: "list of text" })
  })

  test("3.1's extras don't trip it:  `examples`, `const`, `contentMediaType`, `prefixItems`, a union of kinds", () => {
    expect(fields.name!.example).toBe("nightly build")
    expect(fields.source).toMatchObject({ type: "text", choices: ["api"] })
    expect(fields.log).toMatchObject({ type: "text" })
    expect(fields.window!.leftOut).toBeDefined()
    expect(fields.result!.leftOut).toMatch(/one of several kinds/)
  })

  test("its writes and its action route, each body's fields typed through `anyOf`", () => {
    expect(jobs.operations).toMatchObject({
      add: {
        method: "POST",
        at: "/api/jobs",
        bodyAt: "#/components/schemas/JobCreate",
        params: { name: "text", description: "text", priority: "number", owner_id: "number" }
      },
      change: { method: "PATCH", at: "/api/jobs/{job_id}", params: { job_id: "text", name: "text", stage: "text" } },
      delete: { method: "DELETE", at: "/api/jobs/{job_id}" },
      complete: {
        method: "POST",
        at: "/api/jobs/{job_id}/complete",
        bodyAt: "#/components/schemas/JobCompletion",
        params: { job_id: "text", succeeded: "yes or no", note: "text" }
      }
    })
  })

  test("`nullable: true`, 3.0's way, reads the same as 3.1's", () => {
    const document: OpenApiDocument = {
      openapi: "3.0.3",
      paths: {
        "/api/things": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["name", "note"],
                        properties: { name: { type: "string" }, note: { type: "string", nullable: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    const { fields: things } = new PlaceSpec(document, SPEC_AT).lookAt(ACME).collections[0]!
    expect(things!.name).toMatchObject({ type: "text", isRequired: true })
    expect(things!.note).toMatchObject({ type: "text" })
    expect(things!.note!.isRequired).toBeUndefined()
  })
})

describe("spell place ingest --spec, of a FastAPI 3.1 description", () => {
  test("English:  every field typed, and the file parses clean", async () => {
    const { result, spell, description } = await ingestOf("AcmeJobs.api.spell")
    expect(result.warnings).toEqual([])
    expect(Object.values(description.collections).filter(({ leftOut }) => leftOut)).toEqual([])
    expect(spell).toMatch(/^\tits "name" is required text, with maximum length 200$/m)
    expect(spell).toMatch(/^\tits "description" is text$/m)
    expect(spell).toMatch(/^\tits "priority" is a number$/m)
    expect(spell).toMatch(/^\tits "status" as one of queued, running, done or failed$/m)
    expect(spell).toMatch(/^\tits "stage" as one of build, test or deploy$/m)
    expect(spell).toMatch(/^\tits "finished at" is a date$/m)
    expect(spell).toMatch(/^\tto complete a job is at "\/api\/jobs\/\{job_id\}\/complete"$/m)
    const { files } = parseSpellProject([{ path: "/AcmeJobs.api.spell", contents: spell }])
    expect(files[0]!.errors).toEqual([])
    expect(spell).toMatchSnapshot()
  })

  test("Spanish:  the same place, and the file parses clean", async () => {
    const { spell } = await ingestOf("AcmeJobs.api.es.spell")
    expect(spell).toMatch(/^\tsu "stage" como uno de build, test o deploy$/m)
    const { files } = parseSpellProject([{ path: "/AcmeJobs.api.es.spell", contents: spell }])
    expect(files[0]!.errors).toEqual([])
  })
})
