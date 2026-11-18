import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { readThroughSpell } from "spell/parser/cli/placeIngest"
import { PlaceIngest, descriptionFromDisk, descriptionOnDisk } from "spell/parser/spell/ingest/PlaceIngest"
import { PlaceSpec, type OpenApiDocument } from "spell/parser/spell/ingest/PlaceSpec"
import type { IngestFiles, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

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
    expect(spell).toMatchSnapshot()
  })
})
