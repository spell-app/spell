import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { render } from "@solidjs/web"
import { memoryHistory } from "@solidjs/router"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"
import { uiReady } from "spell/app/app/solid"
import { appTexts } from "spell/app/app/ui/AppTexts"
import {
  REFERENCE_EDIT_EVENT,
  type ReferenceEditDetail,
  type SpellReferencePage
} from "spell/app/app/components/spell-reference-page"
import { Routes, createAppRouter } from "spell/app/app/pages/routes"

/**
 * `<spell-reference-page>`, a reference page (epic `data` P52, P53), in the browser, on a small place:
 * two tags, a list verified on a deployment, one failed, one with no field types, a write and an action route;
 * and its Spell file, with a person's words as `--` lines and one of the ingest's marks.
 * - The page server is a stand-in `fetch`:  the description, its Spell file and its project's file.
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
        status: { words: "status", type: "text", choices: ["active", "retired"] },
        display_url: { words: "display url", type: "link" }
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
  agentNotes: ["Its demo resets every night."],
  spellCantSay: [],
  spell: []
} as unknown as PlaceDescriptionOnDisk

/** Its Spell file:  the place's prose, a type's words, a field's, and a field the last look found new. */
const SPELL = [
  'acme is a web server at "https://acme.test/api"',
  "\t-- Acme's inventory:  tenants, and the jobs that sync them.",
  '\ttenants live at "/tenancy/tenants/"',
  "",
  'a "tenant" is a thing',
  "\t-- Someone the network is run for.",
  "\tit lives in acme",
  '\tits "status" is one of active or retired',
  "\t\t-- retired tenants stay, for their history.",
  '\tits "display url" is text  // an address',
  "\t\t-- NEW as of 2026-11-18",
  ""
].join("\n")

const PROJECT_FILE = {
  places: {
    acme: {
      dev: { at: "https://dev.acme.test/api", key: "ACME_DEV_KEY" },
      production: { at: "https://acme.test/api", readOnly: true }
    }
  }
}

const cleanups: (() => void)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  vi.unstubAllGlobals()
  await appTexts.useLanguage("en")
})

/** The page server, standing in:  the description, its Spell file and its project's file;  nothing else is there. */
function serve() {
  vi.stubGlobal("fetch", async (url: string | URL | Request) => {
    const address = decodeURIComponent(`${url instanceof Request ? url.url : url}`)
    if (address.endsWith("/Acme.api.json5")) return new Response(JSON.stringify(DESCRIPTION))
    if (address.endsWith("/Acme.api.spell")) return new Response(SPELL)
    if (address.endsWith("/__project.json5")) return new Response(JSON.stringify(PROJECT_FILE))
    return new Response("nope", { status: 404 })
  })
}

/** A `<spell-reference-page>` for `path`, once it has read the place (or found none);  its shadow root. */
async function mount(path = PATH, { editable = false } = {}): Promise<ShadowRoot> {
  await uiReady
  const page = document.createElement("spell-reference-page") as HTMLElement & SpellReferencePage
  page.setAttribute("src", path)
  if (editable) page.setAttribute("editable", "")
  document.body.append(page)
  cleanups.push(() => page.remove())
  await vi.waitFor(() =>
    expect(page.shadowRoot?.querySelector(".SpellReferencePage > :is(header, p:not(.loading))")).toBeTruthy()
  )
  await ElementFixture.settle(page)
  return page.shadowRoot!
}

/** The section titled `label` in `root`, opened, once what's in it has drawn. */
async function opened(root: ParentNode, label: string): Promise<HTMLElement> {
  const section = [...root.querySelectorAll<HTMLElement & { open: boolean }>("ui-section")].find(
    (each) => each.getAttribute("label") === label
  )!
  section.open = true
  section.dispatchEvent(new CustomEvent("ui-opened", { bubbles: true }))
  await ElementFixture.tick()
  await ElementFixture.settle(section)
  return section
}

/** Each item's line in `root`:  its name, then what it says. */
function itemsOf(root: ParentNode): string[][] {
  return [...root.querySelectorAll("spell-reference-item")].map((item) => [
    item.querySelector(".name")!.textContent ?? "",
    item.querySelector(".says")!.textContent ?? ""
  ])
}

/** An option-click on `element`. */
function optionClick(element: Element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, altKey: true }))
}

describe("<spell-reference-page>", () => {
  test("its line:  name, address, version, and how many lists are in each state", async () => {
    serve()
    const root = await mount()
    const line = root.querySelector("header")!
    expect(line.getAttribute("part")).toBe("header")
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

  test("EVERY section starts folded, its lists drawn only once it's opened;  each a tag of its own", async () => {
    serve()
    const root = await mount()
    const sections = [...root.querySelectorAll(".SpellReferencePage > spell-reference-section > ui-section")]
    expect(sections.map((section) => section.getAttribute("label"))).toEqual([
      "Where it runs",
      "core",
      "tenancy",
      "Good to know",
      "Notes"
    ])
    expect(sections.every((section) => section.getAttribute("open") === "false")).toBe(true)
    expect(root.querySelectorAll("ui-section ui-section")).toHaveLength(0)
    const core = await opened(root, "core")
    const lists = [...core.querySelectorAll("spell-reference-section > ui-section")]
    expect(lists.map((list) => [list.getAttribute("label"), list.getAttribute("hint")])).toEqual([
      ["jobs", "GET /core/jobs/"],
      ["logs", "GET /core/logs/"]
    ])
    expect(lists.map((list) => list.querySelector("spell-reference-state[slot=badge]")!.textContent)).toEqual([
      "Failed",
      "No field types"
    ])
    expect(core.parentElement!.getAttribute("part")).toBe("section")
  })

  test("a list:  how trying it went, what it can change, its fields, each a line", async () => {
    serve()
    const root = await mount()
    await opened(root, "core")
    const jobs = await opened(root, "jobs")
    // a failure in plain words, with what to do next;  the answer itself in its tooltip
    const failure = [...jobs.querySelectorAll("p.quiet")].find(
      (line) => line.getAttribute("title") === "it answered 403"
    )!
    expect(failure.textContent).toMatch(/^Failed, tried .*\nThe real server didn't accept the key/)
    const inner = [...jobs.querySelectorAll("spell-reference-section > ui-section")]
    expect(inner.map((fold) => [fold.getAttribute("label"), fold.getAttribute("badge")])).toEqual([
      ["What it can change", "1"],
      ["Fields", "1"]
    ])
    expect(jobs.querySelector("spell-reference-item")).toBeNull()
    const changes = await opened(root, "What it can change")
    expect(itemsOf(changes)).toEqual([["enqueue", "POST /core/jobs/{id}/enqueue/ · takes id (number)"]])
    expect(changes.querySelector("spell-reference-item spell-reference-state")!.textContent).toBe("Not tried yet")
    await opened(root, "tenancy")
    const tenants = await opened(root, "tenants")
    expect(tenants.querySelector("spell-reference-state[slot=badge] ui-label")!.getAttribute("title")).toMatch(
      /^Verified, tried on dev, .*\n3 rows read$/
    )
    const fields = await opened(tenants, "Fields")
    expect(itemsOf(fields)).toEqual([
      ["id", "number · says which row is which · set by the server"],
      ["name", "text · required"],
      ["status", "text · one of active, retired"],
      ["display_url", "called display url in Spell · link"]
    ])
  })

  test("a person's words:  the place's prose, a type's, a field's;  the ingest's mark as a label", async () => {
    serve()
    const root = await mount()
    expect(root.querySelector(".words.lede")!.textContent).toBe(
      "Acme's inventory:  tenants, and the jobs that sync them."
    )
    await opened(root, "tenancy")
    const tenants = await opened(root, "tenants")
    expect(tenants.querySelector(":scope > .words")!.textContent).toBe("Someone the network is run for.")
    const fields = await opened(tenants, "Fields")
    const items = [...fields.querySelectorAll("spell-reference-item")]
    expect(items[2]!.querySelector(".words")!.textContent).toBe("retired tenants stay, for their history.")
    expect(items[2]!.querySelector(".words")!.getAttribute("part")).toBe("words")
    expect(items[3]!.querySelector(".head spell-reference-state")!.textContent).toBe("New since 2026-11-18")
    expect(items[0]!.querySelector(".words")).toBeNull()
  })

  test("where it runs:  the deployments its project's file lists", async () => {
    serve()
    const root = await mount()
    const where = await opened(root, "Where it runs")
    const rows = [...where.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent)
    )
    expect(rows).toEqual([
      ["dev", "https://dev.acme.test/api", "ACME_DEV_KEY", ""],
      ["production", "https://acme.test/api", "", "yes"]
    ])
  })

  test("no place there:  says so, and how to make one", async () => {
    serve()
    const root = await mount("@acme/examples/Acme/Nothing.api.json5")
    expect(root.textContent).toContain(
      "Spell couldn't find a description of a data source at @acme/examples/Acme/Nothing.api.json5."
    )
  })

  test("editable:  an option-click opens a field's words;  ⌘-Enter saves them through the page, then they show", async () => {
    serve()
    const root = await mount(PATH, { editable: true })
    await opened(root, "tenancy")
    const tenants = await opened(root, "tenants")
    const fields = await opened(tenants, "Fields")
    const status = fields.querySelectorAll("spell-reference-item")[2]!
    expect(status.getAttribute("title")).toBe("Option-click to edit its description")
    optionClick(status)
    await ElementFixture.tick()
    const box = status.querySelector("textarea")!
    expect(box.value).toBe("retired tenants stay, for their history.")
    expect((root.host as Element).matches(":state(editing)")).toBe(true)
    const saved: ReferenceEditDetail[] = []
    root.host.addEventListener(REFERENCE_EDIT_EVENT, (event) => {
      const detail = (event as CustomEvent<ReferenceEditDetail>).detail
      saved.push(detail)
      const edit = detail.editIn(SPELL)
      detail.waitUntil(Promise.resolve(SPELL.slice(0, edit.start) + edit.newText + SPELL.slice(edit.end)))
    })
    box.value = "A retired tenant stays,\nfor its history."
    box.dispatchEvent(new InputEvent("input", { bubbles: true }))
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }))
    await vi.waitFor(() => expect(status.querySelector("textarea")).toBeNull())
    await ElementFixture.tick()
    expect(saved.map(({ file, key }) => [file, key])).toEqual([
      ["@acme/examples/Acme/Acme.api.spell", "field:tenants:status"]
    ])
    expect(status.querySelector(".words")!.textContent).toBe("A retired tenant stays,\nfor its history.")
  })

  test("editable, and nothing saves:  it says so, and the words stay", async () => {
    serve()
    const root = await mount(PATH, { editable: true })
    optionClick(root.querySelector(".words.lede")!)
    await ElementFixture.tick()
    const box = root.querySelector("textarea")!
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }))
    await vi.waitFor(() => expect(root.querySelector(".WordsBox .error")).not.toBeNull())
    expect(root.querySelector(".WordsBox .error")!.textContent).toMatch(/^Your text wasn't saved, because/)
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    await ElementFixture.tick()
    expect(root.querySelector("textarea")).toBeNull()
    expect(root.querySelector(".words.lede")!.textContent).toMatch(/^Acme's inventory/)
  })

  test("not editable:  an option-click opens nothing", async () => {
    serve()
    const root = await mount()
    optionClick(root.querySelector(".words.lede")!)
    await ElementFixture.tick()
    expect(root.querySelector("textarea")).toBeNull()
  })

  test("in Spanish:  its labels in the reader's language, the words as the file has them", async () => {
    serve()
    await appTexts.useLanguage("es")
    const root = await mount()
    const counts = [...root.querySelectorAll("header ui-label")].map((label) => label.textContent)
    expect(counts).toEqual(["Listas", "Comprobada", "Falló", "Campos sin tipo"])
    expect(root.querySelector(".words.lede")!.textContent).toMatch(/^Acme's inventory/)
    const where = await opened(root, "Dónde funciona")
    expect([...where.querySelectorAll("th")].map((cell) => cell.textContent)).toEqual([
      "Nombre",
      "Dirección",
      "Clave",
      "Solo lectura"
    ])
  })

  test("its route in the editor, /place/<description>, draws it, editable", async () => {
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
      expect(
        host.querySelector("#PlaceReferencePage spell-reference-page")?.shadowRoot?.querySelector("h1")?.textContent
      ).toBe("acme")
    )
    expect(host.querySelector("spell-reference-page")!.hasAttribute("editable")).toBe(true)
  })
})
