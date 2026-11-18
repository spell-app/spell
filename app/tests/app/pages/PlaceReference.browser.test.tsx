import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { render } from "@solidjs/web"
import { memoryHistory } from "@solidjs/router"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"
import { uiReady } from "spell/app/app/solid"
import { PlaceReference } from "spell/app/app/pages/PlaceReference"
import { Routes, createAppRouter } from "spell/app/app/pages/routes"

/**
 * `<PlaceReference>`, a place's reference page (epic `data` P52), in the browser, on a small description:
 * two tags, a list verified on a deployment, one failed, one with no field types, a write and an action route.
 * - The page server is a stand-in `fetch`:  the description and its project's file, as `SitePlaces` reads them.
 */

const PATH = "@acme/examples/Acme/Acme.api.json5"

const DESCRIPTION = {
  about: {
    name: "acme",
    kind: "web server",
    address: "https://acme.test/api",
    lookedAt: "2026-11-17T21:00:00.000Z",
    fingerprint: "abc",
    version: { says: "4.7", where: "its OpenAPI description" },
    readBy: "nobody"
  },
  canDo: { read: "", write: "", live: "", limits: "", browsers: "" },
  // said once on disk:  each list reads it back
  allCollections: { idField: "id", paging: "next field" },
  collections: {
    tenants: {
      type: "tenant",
      at: "/tenancy/tenants/",
      rowsSeen: 3,
      tag: "tenancy",
      state: { is: "verified", at: "2026-11-17T21:30:00.000Z", deployment: "dev", rows: 3 },
      operations: {
        add: { method: "POST", at: "/tenancy/tenants/", params: { name: "text" }, state: { is: "unverified" } }
      },
      fields: {
        id: { words: "id", type: "number", isReadOnly: true },
        name: { words: "name", type: "text", isRequired: true },
        status: { words: "status", type: "text", choices: ["active", "retired"] }
      }
    },
    jobs: {
      type: "job",
      at: "/core/jobs/",
      rowsSeen: 0,
      tag: "core",
      state: { is: "failed", at: "2026-11-17T21:31:00.000Z", status: 403, reason: "it answered 403" },
      operations: {
        enqueue: { method: "POST", at: "/core/jobs/{id}/enqueue/", params: { id: "number" } }
      },
      fields: { id: { words: "id", type: "number" } }
    },
    logs: { type: "log", at: "/core/logs/", rowsSeen: 0, tag: "core", state: { is: "untyped" }, fields: {} }
  },
  notes: ["NetBox's demo needs a key to read."],
  spellCantSay: [],
  spell: []
} as unknown as PlaceDescriptionOnDisk

const PROJECT_FILE = {
  places: {
    acme: {
      dev: { at: "https://dev.acme.test/api", key: "ACME_DEV_KEY" },
      production: { at: "https://acme.test/api", readOnly: true }
    }
  }
}

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  vi.unstubAllGlobals()
})

/** The page server, standing in:  the description and its project's file;  nothing else is there. */
function serve() {
  vi.stubGlobal("fetch", async (url: string | URL | Request) => {
    const address = decodeURIComponent(`${url instanceof Request ? url.url : url}`)
    if (address.endsWith("/Acme.api.json5")) return new Response(JSON.stringify(DESCRIPTION))
    if (address.endsWith("/__project.json5")) return new Response(JSON.stringify(PROJECT_FILE))
    return new Response("nope", { status: 404 })
  })
}

/** `<PlaceReference>` drawn for `path`, once it has read the place (or found none). */
async function mount(path = PATH): Promise<HTMLElement> {
  await uiReady
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(() => <PlaceReference path={path} />, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  await vi.waitFor(() => expect(host.querySelector(".PlaceReference > :is(header, p:not(.loading))")).not.toBeNull())
  await ElementFixture.settle(host)
  return host
}

/** The section titled `label` in `host`, opened, once what's in it has drawn. */
async function opened(host: HTMLElement, label: string): Promise<HTMLElement> {
  const section = [...host.querySelectorAll<HTMLElement & { open: boolean }>("ui-section")].find(
    (each) => each.getAttribute("label") === label
  )!
  section.open = true
  section.dispatchEvent(new CustomEvent("ui-opened", { bubbles: true }))
  await ElementFixture.settle(host)
  return section
}

/** A table's rows, each its cells' text. */
function rowsOf(table: Element | null): string[][] {
  return [...(table?.querySelectorAll("tbody tr") ?? [])].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? "")
  )
}

describe("<PlaceReference>", () => {
  test("its line:  name, address, version, and how many lists are in each state", async () => {
    serve()
    const host = await mount()
    const line = host.querySelector(".PlaceReference > header")!
    expect(line.querySelector("h1")!.textContent).toBe("acme")
    expect(line.textContent).toContain("https://acme.test/api")
    expect(line.textContent).toContain("Version 4.7")
    const counts = [...line.querySelectorAll("ui-label")].map((label) => [
      label.textContent,
      label.getAttribute("detail")
    ])
    expect(counts).toEqual([
      ["Lists", "3"],
      ["Verified", "1"],
      ["Failed", "1"],
      ["No field types", "1"]
    ])
  })

  test("EVERY section starts folded, its lists drawn only once it's opened;  tags in order", async () => {
    serve()
    const host = await mount()
    const sections = [...host.querySelectorAll(".PlaceReference > ui-section")]
    expect(sections.map((section) => section.getAttribute("label"))).toEqual([
      "Where it runs",
      "core",
      "tenancy",
      "Notes"
    ])
    expect(sections.every((section) => section.getAttribute("open") === "false")).toBe(true)
    expect(host.querySelectorAll("ui-section ui-section")).toHaveLength(0)
    const core = await opened(host, "core")
    const lists = [...core.querySelectorAll("ui-section")]
    expect(lists.map((list) => [list.getAttribute("label"), list.getAttribute("hint")])).toEqual([
      ["jobs", "GET /core/jobs/"],
      ["logs", "GET /core/logs/"]
    ])
    expect(lists.map((list) => list.querySelector("ui-label[slot=badge]")!.textContent)).toEqual([
      "Failed",
      "No field types"
    ])
  })

  test("a list:  how trying it went, its writes and action routes with what they take, its fields", async () => {
    serve()
    const host = await mount()
    await opened(host, "core")
    const jobs = await opened(host, "jobs")
    // a failure in plain words, with what to do next;  the answer itself in its tooltip
    const failure = [...jobs.querySelectorAll("p.quiet")].find(
      (line) => line.getAttribute("title") === "it answered 403"
    )!
    expect(failure.textContent).toMatch(/^Failed, tried .*\nThe real server didn't accept the key/)
    // what it can change and its fields:  folds of their own, folded, their row counts their badges
    const inner = [...jobs.querySelectorAll("ui-section")]
    expect(inner.map((fold) => [fold.getAttribute("label"), fold.getAttribute("badge")])).toEqual([
      ["What it can change", "1"],
      ["Fields", "1"]
    ])
    expect(jobs.querySelector("ui-table")).toBeNull()
    const changes = await opened(host, "What it can change")
    expect(rowsOf(changes.querySelector("ui-table"))).toEqual([
      ["enqueue", "POST /core/jobs/{id}/enqueue/", "id (number)", "Not tried yet"]
    ])
    // the address in the code face, the state a mini label, and neither wraps
    const cells = changes.querySelectorAll("tbody td")
    expect(cells[1]!.querySelector("code")).not.toBeNull()
    expect(cells[3]!.querySelector("ui-label[size=mini]")).not.toBeNull()
    expect(getComputedStyle(cells[1]!).whiteSpace).toBe("nowrap")
    await opened(host, "tenancy")
    const tenants = await opened(host, "tenants")
    expect(tenants.querySelector("ui-label[slot=badge]")!.getAttribute("title")).toMatch(
      /^Verified, tried on dev, .*\n3 rows read$/
    )
    const fields = await opened(tenants, "Fields")
    expect(rowsOf(fields.querySelector("ui-table"))).toEqual([
      ["id", "id", "number", "says which row is which;  set by the server"],
      ["name", "name", "text", "required"],
      ["status", "status", "text", "one of active, retired"]
    ])
  })

  test("where it runs:  the deployments its project's file lists", async () => {
    serve()
    const host = await mount()
    const where = await opened(host, "Where it runs")
    expect(rowsOf(where.querySelector("ui-table"))).toEqual([
      ["dev", "https://dev.acme.test/api", "ACME_DEV_KEY", ""],
      ["production", "https://acme.test/api", "", "yes"]
    ])
  })

  test("no place there:  says so, and how to make one", async () => {
    serve()
    const host = await mount("@acme/examples/Acme/Nothing.api.json5")
    expect(host.textContent).toContain(
      "Spell couldn't find a description of a data source at @acme/examples/Acme/Nothing.api.json5."
    )
  })

  test("its route, /place/<description>, draws it", async () => {
    serve()
    await uiReady
    const host = document.createElement("div")
    document.body.append(host)
    const dispose = render(() => <Routes router={createAppRouter(memoryHistory(`/place/${PATH}`))} />, host)
    cleanups.push(() => {
      dispose()
      host.remove()
    })
    await vi.waitFor(() =>
      expect(host.querySelector("#PlaceReferencePage .PlaceReference h1")?.textContent).toBe("acme")
    )
  })
})
