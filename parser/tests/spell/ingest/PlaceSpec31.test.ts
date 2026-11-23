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
 * - What a FastAPI service tripped on (epic `data` I140):
 *   - its lists page by `?limit=&offset=`, the most 500;  its search needs `q`
 *   - a nested model's required fields;  a list and an action under each job's steps
 *   - `/api/jobs-archive/{archive_id}`, whose path starts like `/api/jobs`, but isn't under it
 * - And what was left (epic `data` P56):
 *   - its events page by `?take=&skip=`, the most 100, unlike every other list
 *   - its runs are answered only for a team, `?team=infra`, its example
 *   - a job's steps are read from under it, and a step is retried at `/api/jobs/{job_id}/steps/{step_id}/retry`
 *   - its archived jobs, `/api/jobs-archive`, a name whose first word is plural already, in Spanish (I141)
 * - And a list asked for by a question its rows leave out:
 *   its stacks are answered only for a system, `?system=alpha`, and a stack has no `system`
 */

const ACME = "https://jobs.acme.test"
const SPEC_AT = `${ACME}/openapi.json`
const DOCUMENT = JSON.parse(
  readFileSync(join(import.meta.dirname, "openapi/acme-jobs.openapi.json"), "utf8")
) as OpenApiDocument

/**
 * The place's Spell and description, from an ingest of the description:  in Spanish for an `.es.spell` file.
 * - `answer`:  what the running server answers, for a verify after;  the ingest itself reads only the description.
 * - `rows`:  how many it reads at a time, as `it gives up to 20 at a time` says.
 */
async function ingestOf(
  into: string,
  answer: (url: URL) => Response = () => new Response("nope", { status: 404 }),
  rows?: number
) {
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
      return url === SPEC_AT ? Response.json(DOCUMENT) : answer(new URL(url))
    }) as typeof globalThis.fetch,
    ask: async () => undefined,
    files,
    readThrough: readThroughSpell,
    sleep: async () => {},
    now: () => new Date("2026-11-19T12:00:00Z")
  })
  const result = await ingest.add({ address: ACME, spec: SPEC_AT, into, name: "acme jobs", ...(rows && { rows }) })
  const descriptionAt = into.replace(/(\.es)?\.spell$/, ".json5")
  return { ingest, result, texts, descriptions, spell: texts.get(into)!, description: descriptions.get(descriptionAt)! }
}

describe("PlaceSpec, an OpenAPI 3.1 description as FastAPI writes it", () => {
  const look = new PlaceSpec(DOCUMENT, SPEC_AT).lookAt(ACME)
  const named = (name: string) => look.collections.find((each) => each.name === name)!
  const jobs = named("jobs")
  const fields = jobs.fields!

  test("its paged list and its search are collections, their rows under `items` and `results`", () => {
    expect(look.collections.map(({ name }) => name).sort()).toEqual([
      "events",
      "jobs",
      "jobs-archive",
      "runs",
      "search",
      "stacks",
      "steps"
    ])
    expect(jobs).toMatchObject({ at: "/api/jobs", rowsAt: "items", takesLimit: true })
    expect(jobs.schemaAt).toBe("#/components/schemas/Job")
    expect(named("search")).toMatchObject({ at: "/api/search", rowsAt: "results" })
    expect(named("search").fields!.snippet).toMatchObject({ type: "text" })
  })

  test("its lists page by offset, as their questions say, up to their limit's maximum", () => {
    expect(look.serverTakes).toEqual({ pagesWith: { limit: "limit", offset: "offset", most: 500 } })
    expect(jobs.paging).toBe("none")
    // the one that pages unlike the rest keeps its own way (epic `data` P56)
    expect(named("events").pagesWith).toEqual({ limit: "take", offset: "skip", most: 100 })
    expect(jobs.pagesWith).toEqual({ limit: "limit", offset: "offset", most: 500 })
  })

  test("a list answered only for a team is asked for by it, with its example (epic `data` P56)", () => {
    expect(named("runs")).toMatchObject({ at: "/api/runs", askedBy: { team: "infra" } })
    expect(named("runs").searchedOnly).toBeUndefined()
  })

  test("a list asked for by a question its rows leave out has a field for it, typed by the question", () => {
    const stacks = named("stacks")
    expect(stacks).toMatchObject({ at: "/api/stacks", askedBy: { system: "alpha" } })
    expect(stacks.fields!.system).toMatchObject({ words: "system", type: "text" })
    expect(stacks.fields!.system!.isRequired).toBeUndefined()
    // a field its rows have already is theirs:  a run's team
    expect(named("runs").fields!.team).toMatchObject({ schemaAt: "#/components/schemas/Run/properties/team" })
  })

  test("a search needing its question is searched only, for its example, never a plain list", () => {
    expect(named("search")).toMatchObject({
      searchedOnly: true,
      searchedBy: { param: "q", field: "", searchesEverything: true },
      searchedFor: "nightly"
    })
    expect(jobs.searchedOnly).toBeUndefined()
  })

  test("a job's steps are a list under each job, and retrying one a step's action;  a path that only starts like it isn't its", () => {
    expect(look.notes).toEqual([])
    expect(look.listsUnder).toEqual([{ owner: "jobs", list: "steps", at: "/api/jobs/{id}/steps" }])
    const steps = named("steps")
    expect(steps).toMatchObject({ at: "/api/jobs/{id}/steps", schemaAt: "#/components/schemas/Step", idAt: "id" })
    // its braces as written:  the place fills them from the step, and from where it read it
    expect(steps.operations).toEqual({
      retry: {
        method: "POST",
        at: "/api/jobs/{job_id}/steps/{step_id}/retry",
        params: { job_id: "text", step_id: "number" },
        state: { is: "unverified" }
      }
    })
    // the job's own copy of its steps, inside its row, gives way to the list under it
    expect(fields.steps).toBeUndefined()
    expect(named("jobs-archive").fields!.steps).toMatchObject({ type: "inside", isListInside: true })
    expect(Object.values(jobs.operations!).map(({ at }) => at)).not.toContain("/api/jobs-archive/{archive_id}")
  })

  test("a list whose question is required besides a search's is said;  a word's start isn't a path under it", () => {
    const answers = (schema: object) => ({
      responses: { "200": { content: { "application/json": { schema } } } }
    })
    const document: OpenApiDocument = {
      openapi: "3.1.0",
      paths: {
        // an object, no list:  a collection only if things by id are under it, and `/api/stats-history/{id}` isn't
        "/api/stats": { get: answers({ type: "object", properties: { count: { type: "integer" } } }) },
        "/api/stats-history/{id}": { get: answers({ type: "object", properties: { id: { type: "integer" } } }) },
        "/api/reports": {
          get: {
            parameters: [{ name: "team", in: "query", required: true, schema: { type: "string" } }],
            ...answers({ type: "array", items: { type: "object", properties: { id: { type: "integer" } } } })
          }
        }
      }
    }
    const other = new PlaceSpec(document, SPEC_AT).lookAt(ACME)
    expect(other.collections.map(({ name }) => name)).toEqual(["reports"])
    // asked for by it, with nothing to try it with
    expect(other.collections[0]!.askedBy).toEqual({ team: "" })
    expect(other.notes).toContain(
      '/api/reports can\'t be read without "team", and its description gives no example to try:  verify skips it.'
    )
    expect(other.serverTakes).toBeUndefined()
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
    // an archived job's steps are its own, inside it:  no list of them is under it
    const steps = named("jobs-archive").fields!.steps!
    expect(steps).toMatchObject({ type: "inside", isListInside: true, insideSchemaAt: "#/components/schemas/Step" })
    expect(steps.inside!.seconds).toMatchObject({ type: "number" })
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
    // offset paging and the search, in the words a place already says them with (epic `data` I140)
    expect(spell).toMatch(/^\tits rows are its "items"$/m)
    expect(spell).toMatch(/^\tits next page is asked for with "limit" and "offset"$/m)
    expect(spell).toMatch(/^\tit gives up to 500 at a time$/m)
    expect(spell).toMatch(/^\tit searches everything with "q"$/m)
    expect(spell).toMatch(/^\tsearches are searched at "\/api\/search"$/m)
    // a nested model's required fields
    expect(spell).toMatch(
      /^an "owner" is a thing\n\tits "number" is a required number, stored as "id"\n\tits "email" is required text$/m
    )
    // a list paging its own way, one step in under its line (epic `data` P56)
    expect(spell).toMatch(
      /^\tevents live at "\/api\/events"\n\t\tits next page is asked for with "take" and "skip"\n\t\tit gives up to 100 at a time$/m
    )
    // a list answered only for a team, a where on it sent
    expect(spell).toMatch(/^\truns are asked for by their team$/m)
    // and for a system its rows leave out:  the field, and the line naming it
    expect(spell).toMatch(/^a "stack" is a thing\n[^]*?\tits "system" is text$/m)
    expect(spell).toMatch(/^\tstacks are asked for by their system$/m)
    // a job's steps, read from under it, and a step's action
    expect(spell).toMatch(/^\ta job's steps live at "\/api\/jobs\/\{id\}\/steps"$/m)
    expect(spell).not.toMatch(/steps are found at/)
    expect(spell).toMatch(/^\tto retry a step is at "\/api\/jobs\/\{job_id\}\/steps\/\{step_id\}\/retry"$/m)
    expect(spell).toMatch(/^a "job" is a thing\n[^]*?\tits "steps" is a list of steps$/m)
    expect(spell).toMatch(
      /^a "step" is a thing\n\tit lives in acme jobs\n\tthis type is unverified\n\tenabled operations are read, retry\n\tits "name" is required text$/m
    )
    expect(spell).toMatch(/^\tjobs archives live at "\/api\/jobs-archive"$/m)
    const { files } = parseSpellProject([{ path: "/AcmeJobs.api.spell", contents: spell }])
    expect(files[0]!.errors).toEqual([])
    expect(spell).toMatchSnapshot()
  })

  test("Spanish:  the same place, and the file parses clean", async () => {
    const { spell } = await ingestOf("AcmeJobs.api.es.spell")
    expect(spell).toMatch(/^\tsu "stage" como uno de build, test o deploy$/m)
    expect(spell).toMatch(/^\tsu página siguiente se pide con "limit" y "offset"$/m)
    expect(spell).toMatch(/^\tlos searches se buscan en "\/api\/search"$/m)
    expect(spell).toMatch(/^\tsu "email" es texto obligatorio$/m)
    // its own paging stays one step in;  a name whose first word is plural already keeps every word (I141)
    expect(spell).toMatch(/^\t\tsu página siguiente se pide con "take" y "skip"\n\t\tda hasta 100 a la vez$/m)
    expect(spell).toMatch(/^\tlos jobs archive están en "\/api\/jobs-archive"$/m)
    expect(spell).not.toMatch(/jobses/)
    // a list asked for by a question its rows leave out:  the field, and the line naming it
    expect(spell).toMatch(/^un "stack" es una cosa\n[^]*?\tsu "system" es texto$/m)
    expect(spell).toMatch(/^\tlos stackes se piden por su system$/m)
    const { files } = parseSpellProject([{ path: "/AcmeJobs.api.es.spell", contents: spell }])
    expect(files[0]!.errors).toEqual([])
  })
})

describe("spell place verify, of a FastAPI service", () => {
  const JOB = {
    id: "6f1c",
    name: "nightly build",
    description: null,
    status: "queued",
    created_at: "2026-11-19T12:00:00Z"
  }

  /**
   * FastAPI's answers:  a page of jobs, one by id, a search that refuses to be asked without `q`,
   * runs that refuse to be asked without a team, and a job's steps.
   */
  function fastApi(url: URL): Response {
    if (url.pathname === "/api/jobs") return Response.json({ items: [JOB], total: 1, limit: 50, offset: 0 })
    if (url.pathname === "/api/runs" && url.searchParams.get("team") === "infra")
      return Response.json({ items: [{ id: 1, team: "infra", state: "done" }], total: 1 })
    if (url.pathname === "/api/runs")
      return Response.json({ detail: [{ loc: ["query", "team"], msg: "Field required" }] }, { status: 422 })
    // a 400 without its system, as a server that needs one but whose description may not say so
    if (url.pathname === "/api/stacks")
      return url.searchParams.get("system") === "alpha"
        ? Response.json({ items: [{ id: 7, name: "top" }], total: 1 })
        : Response.json({ detail: "Provide a `system`" }, { status: 400 })
    if (url.pathname === "/api/stacks/7") return Response.json({ id: 7, name: "top" })
    if (url.pathname === "/api/runs/1") return Response.json({ id: 1, team: "infra", state: "done" })
    if (url.pathname === "/api/jobs/6f1c/steps") return Response.json([{ id: 3, name: "build", seconds: 12 }])
    if (url.pathname === "/api/jobs/6f1c") return Response.json(JOB)
    if (url.pathname === "/api/search" && url.searchParams.get("q"))
      return Response.json({
        results: [{ id: "6f1c", title: "nightly build", score: 1, snippet: null }],
        total_count: 1
      })
    if (url.pathname === "/api/search")
      return Response.json(
        { detail: [{ loc: ["query", "q"], msg: "Field required", type: "missing" }] },
        { status: 422 }
      )
    return Response.json({ detail: "Not Found" }, { status: 404 })
  }

  test("its search is asked for its example, not read bare into a 422;  its list read as a page of items", async () => {
    const { ingest, descriptions } = await ingestOf("AcmeJobs.api.spell", fastApi)
    const result = await ingest.verify("AcmeJobs.api.spell")
    const { collections } = descriptions.get("AcmeJobs.api.json5")!
    expect(collections.searches!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
    expect(collections.jobs!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
    expect(result.changes).toContain("searches:  unverified => verified.")
  })

  test("its runs are asked for their example team, and a job's steps under its first job (epic `data` P56)", async () => {
    const { ingest, descriptions } = await ingestOf("AcmeJobs.api.spell", fastApi)
    await ingest.verify("AcmeJobs.api.spell")
    const { collections } = descriptions.get("AcmeJobs.api.json5")!
    expect(collections.runs!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
    expect(collections.steps!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
    // and its stacks for their example system, which the server won't answer without
    expect(collections.stacks!.state).toMatchObject({ is: "verified", status: 200, rows: 1 })
  })

  test("each list is asked for a page of the place's size, by its own limit's name, up to the most it gives", async () => {
    const asked: string[] = []
    const { ingest } = await ingestOf(
      "AcmeJobs.api.spell",
      (url) => {
        asked.push(`${url.pathname}${url.search}`)
        return fastApi(url)
      },
      1000
    )
    await ingest.verify("AcmeJobs.api.spell")
    expect(asked).toContain("/api/jobs?limit=500")
    expect(asked).toContain("/api/events?take=100")
  })

  test("a refusal says FastAPI's own message:  `detail`, a list of what was wrong", async () => {
    const { ingest, descriptions } = await ingestOf("AcmeJobs.api.spell", (url) =>
      url.pathname === "/api/jobs"
        ? Response.json(
            { detail: [{ loc: ["query", "limit"], msg: "Input should be less than 500" }] },
            { status: 422 }
          )
        : fastApi(url)
    )
    await ingest.verify("AcmeJobs.api.spell")
    expect(descriptions.get("AcmeJobs.api.json5")!.collections.jobs!.state).toMatchObject({
      is: "failed",
      status: 422,
      reason: "it answered 422:  Input should be less than 500"
    })
  })
})
