import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { parseSpellProject } from "spell/parser/spell/test"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import { descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceSpec, type OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { Deployment, IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

/**
 * An OpenAPI description read whole as a place (epic `data` P49):  NetBox's public demo's, saved, so no test needs the network.
 * - `openapi/netbox.openapi.json`:  NetBox 4.7.5's description from `https://demo.netbox.dev/api/schema/?format=json`
 *   (15 MB, 322 paths), cut on 2026-11-17 to the paths of six lists (core's jobs, data sources and background tasks;
 *   tenancy's tenants, tenant groups and contacts) and every schema they reach, so it stays small.
 */

const NETBOX = "https://demo.netbox.dev"
const SPEC_AT = `${NETBOX}/api/schema/?format=json`
const DOCUMENT = JSON.parse(
  readFileSync(join(import.meta.dirname, "openapi/netbox.openapi.json"), "utf8")
) as OpenApiDocument

/** A `fetch` answering the description, and nothing else. */
const specFetch = (async (input: RequestInfo | URL) => {
  const url = `${input instanceof Request ? input.url : input}`
  if (url === SPEC_AT) return Response.json(DOCUMENT)
  return new Response("nope", { status: 404 })
}) as typeof globalThis.fetch

/** Files in memory, as `PlaceIngest.test.ts` keeps them. */
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

describe("PlaceSpec", () => {
  const look = new PlaceSpec(DOCUMENT, SPEC_AT).lookAt(NETBOX)
  const named = (name: string) => look.collections.find((each) => each.name === name)!

  test("every list path is a collection, its fields from the schema, no rows read", () => {
    expect(look.collections.map(({ name }) => name).sort()).toEqual([
      "background-tasks",
      "contacts",
      "data-sources",
      "jobs",
      "tenant-groups",
      "tenants"
    ])
    const tenants = named("tenants")
    expect(tenants).toMatchObject({ at: "/api/tenancy/tenants/", rows: [], rowsAt: "results", nextAt: "next" })
    expect(tenants.schemaAt).toBe("#/components/schemas/Tenant")
    expect(tenants.fields!.name).toMatchObject({ type: "text", isRequired: true, maxLetters: 100 })
    // the server writes it:  never required of a new one
    expect(tenants.fields!.id).toMatchObject({ type: "number", isReadOnly: true })
    expect(tenants.fields!.id!.isRequired).toBeUndefined()
    expect(tenants.fields!.created).toMatchObject({ type: "date", format: "date-time" })
    expect(tenants.fields!.group).toMatchObject({ type: "inside", schemaAt: "#/components/schemas/BriefTenantGroup" })
    expect(tenants.fields!.custom_fields!.leftOut).toMatch(/map by name/)
  })

  test("writes and action routes come from the paths, each with its method and what it takes", () => {
    expect(named("tenants").operations).toMatchObject({
      add: { method: "POST", at: "/api/tenancy/tenants/", bodyAt: "#/components/schemas/TenantRequest" },
      change: { method: "PATCH", at: "/api/tenancy/tenants/{id}/", params: { id: "number" } },
      delete: { method: "DELETE", at: "/api/tenancy/tenants/{id}/" }
    })
    expect(named("tenants").operations!.add!.params!.name).toBe("text")
    expect(Object.keys(named("background-tasks").operations!).sort()).toEqual(["delete", "enqueue", "requeue", "stop"])
    expect(named("background-tasks").operations!.enqueue).toMatchObject({
      method: "POST",
      at: "/api/core/background-tasks/{id}/enqueue/",
      state: { is: "unverified" }
    })
    // read only:  its description offers nothing more
    expect(named("jobs").operations).toBeUndefined()
  })

  test("its version and a summary for the agent, never the whole description", () => {
    expect(look.version).toEqual({ says: "4.7.5 (4.7)", where: "its OpenAPI description" })
    expect(look.docs!.length).toBeLessThan(2000)
    expect(look.docs).toMatch(/Tags:  core, tenancy/)
  })

  test("a place's own path is taken off each path under it", () => {
    const under = new PlaceSpec(DOCUMENT, SPEC_AT).lookAt(`${NETBOX}/api`)
    expect(under.collections.find(({ name }) => name === "jobs")!.at).toBe("/core/jobs/")
  })
})

describe("spell place ingest --spec", () => {
  test("writes the whole place from the description, each list unverified, reading nothing else", async () => {
    const { files, texts, descriptions } = memoryFiles()
    const ingest = new PlaceIngest({
      fetch: specFetch,
      ask: async () => undefined,
      files,
      readThrough: readThroughSpell,
      sleep: async () => {},
      now: () => new Date("2026-11-17T12:00:00Z")
    })
    const result = await ingest.add({ address: NETBOX, spec: SPEC_AT, into: "NetBox.api.spell", name: "netbox" })
    expect(result.warnings).toEqual([])
    const description = descriptions.get("NetBox.api.json5")!
    expect(description.about.specAt).toBe(SPEC_AT)
    expect(Object.values(description.collections).map(({ state }) => state?.is)).toEqual([
      "untyped",
      "unverified",
      "unverified",
      "unverified",
      "unverified",
      "unverified"
    ])
    const spell = texts.get("NetBox.api.spell")!
    expect(spell).toMatch(/^netbox is a web server at "https:\/\/demo.netbox.dev"$/m)
    expect(spell).toMatch(/^\ttenants live at "\/api\/tenancy\/tenants\/"$/m)
    expect(spell).toMatch(/^\tits "name" is required text, with maximum length 100$/m)
    // a short copy of another list's thing links to it, by its schema
    expect(spell).toMatch(/^\tits "group" is a tenant group$/m)
    // each type unverified till verify tries it;  what the description offers, and its action routes
    expect(spell).toMatch(
      /^a "job" is a thing\n\tit lives in netbox\n\tthis type is unverified\n\tenabled operations are read$/m
    )
    expect(spell).toMatch(/^\tto sync a data source is at "\/api\/core\/data-sources\/\{id\}\/sync\/"$/m)
    expect(spell).toMatchSnapshot()
  })
})

describe("a private place, its key a token (epic `data` P49)", () => {
  const API = "https://acme.test/api"
  const TOKEN_AT = "https://auth.acme.test/api-keys/{key id}/token"

  /** A source whose list takes only the token, and a token service making it from `k-1:sesame`. */
  const acmeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input}`.replace(/[?#].*$/, "")
    const headers = new Headers(init?.headers)
    if (url === "https://auth.acme.test/api-keys/k-1/token" && init?.method === "POST") {
      const isKey = headers.get("authorization") === `Basic ${btoa("k-1:sesame")}`
      return isKey ? Response.json({ token: "tok-1", expires_in: 600 }) : new Response("no", { status: 401 })
    }
    if (headers.get("authorization") !== "Bearer tok-1") return new Response("no", { status: 401 })
    if (url === API) return Response.json({ jobs: `${API}/jobs` })
    if (url === `${API}/jobs`) return Response.json([{ id: 1, name: "The real payroll run" }])
    return new Response("nope", { status: 404 })
  }) as typeof globalThis.fetch

  test("its rows go to its folder, never its description;  its token is made from the secret, and said", async () => {
    const { files, texts, descriptions } = memoryFiles()
    const away = new Map<string, string>()
    files.writeAway = async (path, text) => void away.set(path, text)
    const ingest = new PlaceIngest({
      fetch: acmeFetch,
      ask: async () => undefined,
      files,
      readThrough: readThroughSpell,
      keyNamed: (name) => (name === "ACME_API_KEY" ? "k-1:sesame" : undefined),
      sleep: async () => {},
      now: () => new Date("2026-11-17T12:00:00Z")
    })
    await ingest.add({
      address: API,
      into: "Acme.api.spell",
      name: "acme",
      keySecret: "ACME_API_KEY",
      tokenFrom: TOKEN_AT,
      dataIsPrivateIn: ""
    })
    const description = descriptions.get("Acme.api.json5")!
    expect(JSON.stringify(description)).not.toContain("payroll")
    expect(description.about).toMatchObject({ tokenFrom: TOKEN_AT, privateDataIn: "~/.spell/places/acme" })
    expect([...away.keys()]).toEqual(["~/.spell/places/acme/Acme.jobs.samples.json"])
    expect(JSON.parse(away.get("~/.spell/places/acme/Acme.jobs.samples.json")!)).toMatchObject({
      page: `${API}/jobs`,
      rows: [{ id: 1, name: "The real payroll run" }]
    })
    const spell = texts.get("Acme.api.spell")!
    expect(spell).toContain(`\tit is authenticated with a token from "${TOKEN_AT}", made with the secret "ACME_API_KEY"`)
    expect(spell).toContain('\tits data is private, located in "~/.spell/places/acme"')
    expect(description.collections.jobs!.state).toMatchObject({ is: "verified", rows: 1 })
  })
})

describe("spell place verify (epic `data` P49)", () => {
  /** A tenant as NetBox's answers hold one, in its schema's shape:  made up, not anyone's data. */
  const TENANT = { id: 1, url: `${NETBOX}/api/tenancy/tenants/1/`, display: "Acme", name: "Acme", slug: "acme" }
  /** NetBox's own answer to a request with no token, as its demo gave it on 2026-11-17. */
  const NO_TOKEN = { detail: "Authentication credentials were not provided." }

  /** The description, and saved answers:  tenants answer, jobs refuse, everything else a list with nothing in it. */
  function answering(base = NETBOX) {
    const asked: string[] = []
    const fetch = (async (input: RequestInfo | URL) => {
      const url = `${input instanceof Request ? input.url : input}`
      asked.push(url)
      if (url === SPEC_AT) return Response.json(DOCUMENT)
      const path = url.replace(base, "").replace(/\?.*$/, "")
      if (path === "/api/tenancy/tenants/") return Response.json({ count: 1, next: null, results: [TENANT] })
      if (path === "/api/tenancy/tenants/1/") return Response.json(TENANT)
      if (path === "/api/core/jobs/") return Response.json(NO_TOKEN, { status: 403 })
      if (path === "/api/core/background-tasks/") return Response.json([{ id: "t-9", status: "queued" }])
      if (path === "/api/core/background-tasks/t-9/") return Response.json({ id: "t-9" })
      return Response.json({ count: 0, next: null, results: [] })
    }) as typeof globalThis.fetch
    return { fetch, asked }
  }

  /** An ingest of the description, then its verify, on `fetch`, with `deployments` in the project's file. */
  async function ingested(fetch: typeof globalThis.fetch, deployments?: Record<string, Deployment>) {
    const { files, texts, descriptions } = memoryFiles()
    if (deployments) files.deploymentsOf = async () => deployments
    const ingest = new PlaceIngest({
      fetch,
      ask: async () => undefined,
      files,
      readThrough: readThroughSpell,
      sleep: async () => {},
      now: () => new Date("2026-11-17T12:00:00Z")
    })
    await ingest.add({ address: NETBOX, spec: SPEC_AT, into: "NetBox.api.spell", name: "netbox" })
    return { ingest, texts, descriptions }
  }

  test("each list and a thing by its id:  verified with its rows, or failed with its status and why", async () => {
    const { fetch } = answering()
    const { ingest, texts, descriptions } = await ingested(fetch)
    const result = await ingest.verify("NetBox.api.spell")
    const { collections } = descriptions.get("NetBox.api.json5")!
    expect(collections.tenants!.state).toEqual({
      is: "verified",
      at: "2026-11-17T12:00:00.000Z",
      status: 200,
      rows: 1
    })
    expect(collections.jobs!.state).toMatchObject({
      is: "failed",
      status: 403,
      reason: "it answered 403:  Authentication credentials were not provided"
    })
    // no schema said its fields:  what it read does
    expect(collections.background_tasks!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(Object.keys(collections.background_tasks!.fields)).toEqual(["id", "status"])
    expect(result.changes).toContain("tenants:  unverified => verified.")
    const spell = texts.get("NetBox.api.spell")!
    expect(spell).toMatch(/^a "tenant" is a thing\n\tit lives in netbox\n\tthis type is verified$/m)
    expect(spell).toMatch(/^a "job" is a thing\n\tit lives in netbox\n\tthis type is failed$/m)
    expect(spell).not.toContain("this type is unverified")
  })

  test("NetBox for real (epic `data` P55):  a list no schema typed reads its wrapped rows;  writes keep its slash", async () => {
    const QUEUE = { name: "default", url: `${NETBOX}/api/core/background-queues/default/`, jobs: 0 }
    const asked: string[] = []
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = `${input instanceof Request ? input.url : input}`
      asked.push(`${init?.method ?? "GET"} ${url}`)
      if (url === SPEC_AT) return Response.json(DOCUMENT)
      const path = url.replace(NETBOX, "").replace(/\?.*$/, "")
      // its queues are named, and their id is their own address
      if (path === "/api/core/background-tasks/") return Response.json({ count: 1, next: null, results: [QUEUE] })
      if (url === QUEUE.url) return Response.json(QUEUE)
      if (path === "/api/tenancy/tenants/") {
        if (init?.method === "POST") return Response.json({ ...TENANT, id: 2 }, { status: 201 })
        return Response.json({ count: 1, next: null, results: [TENANT] })
      }
      if (/^\/api\/tenancy\/tenants\/\d+\/$/.test(path)) {
        return init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(TENANT)
      }
      // NetBox answers 404 to an address without its slash
      if (!path.endsWith("/")) return new Response("Not found", { status: 404 })
      return Response.json({ count: 0, next: null, results: [] })
    }) as typeof globalThis.fetch
    const { ingest, texts, descriptions } = await ingested(fetch)
    await ingest.verify("NetBox.api.spell", { triesWrites: true })
    expect(texts.get("NetBox.api.spell")).toMatch(
      /^a "background task" is a thing\n\tit lives in netbox\n\tthis type is verified$/m
    )
    const { collections, canDo } = descriptions.get("NetBox.api.json5")!
    expect(collections.background_tasks!.state).toMatchObject({ is: "verified", rows: 1 })
    expect(collections.background_tasks!.rowsAt).toBe("results")
    expect(asked).toContain(`GET ${QUEUE.url}`)
    expect(asked.filter((request) => !request.startsWith("GET"))).toEqual([
      `POST ${NETBOX}/api/tenancy/tenants/`,
      `PATCH ${NETBOX}/api/tenancy/tenants/1/`,
      `DELETE ${NETBOX}/api/tenancy/tenants/2/`
    ])
    expect(canDo.write).toMatch(/^Yes:  it took a write of each kind, tried on tenants/)
  })

  test("on a deployment from the project's file;  a read only one takes no writes", async () => {
    const STAGING = "https://staging.netbox.test"
    const { fetch, asked } = answering(STAGING)
    const deployments = { staging: { at: STAGING }, production: { at: NETBOX, readOnly: true } }
    const { ingest, descriptions } = await ingested(fetch, deployments)
    await ingest.verify("NetBox.api.spell", { deployment: "staging" })
    expect(asked).toContain(`${STAGING}/api/tenancy/tenants/`)
    expect(descriptions.get("NetBox.api.json5")!.collections.tenants!.state).toMatchObject({
      is: "verified",
      deployment: "staging"
    })
    await expect(ingest.verify("NetBox.api.spell", { deployment: "production", triesWrites: true })).rejects.toThrow(
      "its production deployment is read only, so nothing is written there"
    )
    await expect(ingest.verify("NetBox.api.spell", { deployment: "dev" })).rejects.toThrow(
      'netbox has no deployment "dev":  staging, production'
    )
  })
})

describe("spell place update, on a place read from its description (epic `data` P49)", () => {
  test("reads it again whole:  nothing new, nothing changes, and each state stays", async () => {
    const { files, texts, descriptions } = memoryFiles()
    const ingest = new PlaceIngest({
      fetch: specFetch,
      ask: async () => undefined,
      files,
      readThrough: readThroughSpell,
      sleep: async () => {},
      now: () => new Date("2026-11-17T12:00:00Z")
    })
    await ingest.add({ address: NETBOX, spec: SPEC_AT, into: "NetBox.api.spell", name: "netbox" })
    const written = texts.get("NetBox.api.spell")!
    // as a person would:  a line of their own
    texts.set("NetBox.api.spell", `${written}\n// mine\n`)
    const result = await ingest.update("NetBox.api.spell")
    expect(result.couldntChange).toEqual([])
    expect(texts.get("NetBox.api.spell")).toBe(`${written}\n// mine\n`)
    expect(descriptions.get("NetBox.api.json5")!.collections.tenants!.state).toEqual({ is: "unverified" })
    expect(result.changes).toEqual([])
  })
})

describe("NetBox's shapes that broke a whole description (epic `data` I106)", () => {
  /** A schema of NetBox's shape:  an id, an address and the fields given. */
  const thing = (properties: Record<string, unknown>) => ({
    type: "object",
    properties: {
      id: { type: "integer", readOnly: true },
      url: { type: "string", format: "uri", readOnly: true },
      ...properties
    }
  })
  /** A list of `schema`'s, as each `?format=json` description's lists are:  NetBox's paginated answer. */
  const ref = (schema: string) => ({ $ref: `#/components/schemas/${schema}` })
  const listOf = (schema: string) => ({
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  count: { type: "integer" },
                  next: { type: "string" },
                  results: { type: "array", items: ref(schema) }
                }
              }
            }
          }
        }
      }
    }
  })
  /** NetBox's small "value and label" object, written in place:  a console port's `speed`, a module bay's `status`. */
  const valueAndLabel = (values: unknown[], labels: string[]) => ({
    type: "object",
    properties: {
      value: { enum: values, type: typeof values[0] === "number" ? "integer" : "string" },
      label: { enum: labels, type: "string" }
    }
  })

  /** The place NetBox's shapes in `document` make:  its Spell and its description;  in Spanish for an `.es.spell` file. */
  async function ingestOf(document: Record<string, unknown>, into = "NetBox.api.spell") {
    const { files, texts, descriptions } = memoryFiles()
    const ingest = new PlaceIngest({
      fetch: (async (input: RequestInfo | URL) =>
        `${input instanceof Request ? input.url : input}` === SPEC_AT
          ? Response.json({ openapi: "3.0.3", info: { title: "NetBox REST API", version: "4.7.5" }, ...document })
          : new Response("nope", { status: 404 })) as typeof globalThis.fetch,
      ask: async () => undefined,
      files,
      readThrough: readThroughSpell,
      sleep: async () => {},
      now: () => new Date("2026-11-17T12:00:00Z")
    })
    await ingest.add({ address: NETBOX, spec: SPEC_AT, into, name: "netbox" })
    return { spell: texts.get(into)!, description: descriptions.get(into.replace(/(\.es)?\.spell$/, ".json5"))! }
  }

  test("a type inside is named after its schema:  three lists share one, and none is left out", async () => {
    const { spell, description } = await ingestOf({
      paths: {
        "/api/dcim/module-bay-types/": listOf("ModuleBayType"),
        "/api/dcim/module-bays/": listOf("ModuleBay"),
        "/api/dcim/module-types/": listOf("ModuleType"),
        "/api/dcim/front-port-templates/": listOf("FrontPortTemplate")
      },
      components: {
        schemas: {
          ModuleBayType: thing({ name: { type: "string" } }),
          BriefModuleBayType: thing({ name: { type: "string" }, slug: { type: "string" } }),
          ModuleBay: thing({
            name: { type: "string" },
            module_bay_types: { type: "array", items: ref("BriefModuleBayType") }
          }),
          ModuleType: thing({
            model: { type: "string" },
            module_bay_types: { type: "array", items: ref("BriefModuleBayType") }
          }),
          FrontPortTemplate: thing({
            name: { type: "string" },
            rear_ports: { type: "array", items: ref("FrontPortTemplateMapping") }
          }),
          FrontPortTemplateMapping: {
            type: "object",
            properties: { position: { type: "integer" }, rear_port: { type: "integer" } }
          }
        }
      }
    })
    expect(Object.values(description.collections).filter(({ leftOut }) => leftOut)).toEqual([])
    expect(spell.match(/^a "module bay type summary" is a thing$/gm)).toHaveLength(1)
    expect(spell.match(/^\tits "module bay types" is a list of module bay type summaries$/gm)).toHaveLength(2)
    expect(spell).toMatch(/^\tits "rear ports" is a list of front port template mappings$/m)
    expect(spell).not.toContain("module bay module bay type")
  })

  test("a line Spell can't read is left out where it is:  never the same words in another list", async () => {
    // a type's name of five words:  more than Spell reads, so its first line fails, and each line under it
    const { spell, description } = await ingestOf({
      paths: {
        "/api/dcim/device-types/": listOf("DeviceType"),
        "/api/dcim/virtual-circuit-termination-role-sets/": listOf("RoleSet")
      },
      components: {
        schemas: {
          DeviceType: thing({ name: { type: "string" }, manufacturer: { type: "string" } }),
          RoleSet: thing({ name: { type: "string" }, manufacturer: { type: "string" } })
        }
      }
    })
    const { device_types, virtual_circuit_termination_role_sets } = description.collections
    expect(virtual_circuit_termination_role_sets!.leftOut).toMatch(/Spell couldn't read its line/)
    // the same words in another list stay
    expect(device_types!.leftOut).toBeUndefined()
    expect(Object.values(device_types!.fields).filter(({ leftOut }) => leftOut)).toEqual([])
    expect(spell).toMatch(
      /^a "device type" is a thing\n(?:\t.*\n)*?\tits "name" is text\n\tits "manufacturer" is text$/m
    )
  })

  test("a type inside whose first line Spell can't read leaves out the fields holding it, never their list", async () => {
    const { spell, description } = await ingestOf({
      paths: { "/api/dcim/module-bays/": listOf("ModuleBay") },
      components: {
        schemas: {
          // no name of four words or fewer to give the type inside:  its schema's, its field's and its owner's are longer
          ModuleBay: thing({
            name: { type: "string" },
            installed_module_bay_type_part: ref("BriefInstalledModuleBayTypePart")
          }),
          BriefInstalledModuleBayTypePart: { type: "object", properties: { name: { type: "string" } } }
        }
      }
    })
    const { module_bays } = description.collections
    expect(module_bays!.leftOut).toBeUndefined()
    expect(module_bays!.fields.installed_module_bay_type_part!.leftOut).toMatch(/Spell couldn't read its line/)
    expect(module_bays!.fields.name!.leftOut).toBeUndefined()
    expect(spell).toMatch(/^a "module bay" is a thing$/m)
  })

  test("a type inside named like one of Spell's measures says whose it is:  a console port's speed", async () => {
    const { spell, description } = await ingestOf({
      paths: { "/api/dcim/console-ports/": listOf("ConsolePort"), "/api/dcim/module-bays/": listOf("ModuleBay") },
      components: {
        schemas: {
          ConsolePort: thing({ speed: valueAndLabel([1200, 2400], ["1200 bps", "2400 bps"]) }),
          ModuleBay: thing({ status: valueAndLabel(["active", "planned"], ["Active", "Planned"]) })
        }
      }
    })
    expect(spell).toMatch(/^\tits "speed" is a console port speed$/m)
    expect(spell).toMatch(/^a "console port speed" is a thing\n\tits "value" is a number\n\tits "label" is text$/m)
    expect(spell).toMatch(/^a "status" is a thing\n\tits "value" is text\n\tits "label" is text$/m)
    expect(description.notes.filter((note) => note.startsWith("Left out"))).toEqual([])
  })

  describe("a field's choices are written `as one of`, as a sentence says them, and read back (epic `data` J289)", () => {
    const SITES = {
      paths: { "/api/dcim/sites/": listOf("Site") },
      components: {
        schemas: { Site: thing({ status: { type: "string", enum: ["active", "planned", "retired"], maxLength: 20 } }) }
      }
    }

    test("English:  `as one of`", async () => {
      const { spell } = await ingestOf(SITES)
      expect(spell).toMatch(/^\tits "status" as one of active, planned or retired, with maximum length 20$/m)
      const { files } = parseSpellProject([{ path: "/NetBox.api.spell", contents: spell }])
      expect(files[0]!.errors).toEqual([])
    })

    test("Spanish:  `como uno de`", async () => {
      const { spell } = await ingestOf(SITES, "NetBox.api.es.spell")
      expect(spell).toMatch(/^\tsu "status" como uno de active, planned o retired,? con longitud máxima 20$/m)
      const { files } = parseSpellProject([{ path: "/NetBox.api.es.spell", contents: spell }])
      expect(files[0]!.errors).toEqual([])
    })
  })
})
