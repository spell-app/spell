import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import { SiteData, type SiteDataFile, type SiteTag } from "spell-ui/docs-components"

import type { UIDocsApi } from "spell-ui/docs-components/ui-docs-api/UIDocsApi"
import { HashLanding } from "spell-ui/components/ui-toc/HashLanding"

import "spell-ui/docs-components/ui-docs-api"

////////////////
// ## Fixtures
////////////////

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("/src/docs-components/ui-docs-api/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** The real `components.json5`, as a served URL (the examples document real tags). */
const REAL_DATA = Object.values(
  import.meta.glob<string>("/docs/__data/components.json5", { query: "?url", import: "default", eager: true })
)[0]!

/** A tag entry with nothing but `overrides`. */
function tagOf(tag: string, folder: string, overrides: Partial<SiteTag> = {}): SiteTag {
  return {
    tag,
    name: tag,
    folder,
    mainTag: folder,
    main: tag === folder,
    page: tag === folder,
    topics: [],
    aka: [],
    noun: tag.replace(/^x-/, ""),
    attributes: [],
    slots: [],
    events: [],
    parts: [],
    states: [],
    texts: [],
    ...overrides
  }
}

/** `<x-button>` / `<x-or>`:  every kind of row the tables draw. */
const BUTTON = tagOf("x-button", "x-button", {
  description: "A button `does` things.",
  attributes: [
    {
      name: "color",
      kind: "color",
      values: ["red", "blue"],
      valueSet: "hues",
      description: "Hue."
    },
    { name: "size", kind: "size", values: ["small", "large"], valueSet: "sizes", description: "Size." },
    {
      name: "width",
      kind: "width",
      values: ["1", "2", "3", "4", "5"],
      valueSet: "widths",
      description: "Columns."
    },
    { name: "basic", kind: "keyOnly", description: "Less `pronounced`." },
    { name: "selected", kind: "keyOnly", aliases: ["checked"], description: "On." },
    { name: "type", kind: "enum", values: ["button", "submit"], default: "button", description: "Form role." },
    {
      name: "heading-offset",
      kind: "number",
      property: "headingLevelOffset",
      default: 0,
      description: "Shift."
    },
    { name: "text", kind: "string", reflect: false, description: "Shown text." },
    { name: "options", kind: "json", reflect: false, description: "Rich `MenuOption[]`." }
  ],
  events: [
    { name: "ui-toggle", detail: "{ active: boolean }", cancelable: true, description: "Toggled." },
    { name: "ui-click", detail: "{}", description: "Clicked." }
  ],
  slots: [
    { name: "", description: "Content." },
    { name: "icon", description: "Icon." }
  ],
  parts: [{ name: "button", description: "The `<button>`." }],
  states: [{ name: "pressed", description: "Pressed." }],
  texts: [{ key: "busy", text: "Busy `now`", description: "Loading label." }]
})
const OR = tagOf("x-or", "x-button", { description: "An or.", parts: [{ name: "or", description: "The or." }] })

/** The fixture data file. */
const DATA: SiteDataFile = {
  $comment: "test",
  version: 1,
  topics: [],
  components: [BUTTON, OR],
  docs: [],
  families: {
    "x-button": {
      folder: "x-button",
      mainTag: "x-button",
      title: "Button",
      summary: "",
      status: "done",
      docs: false,
      tags: ["x-button", "x-or"],
      tokens: []
    }
  }
} as unknown as SiteDataFile

/** `DATA` as a URL `SiteData` can fetch. */
const DATA_URL = `data:application/json,${encodeURIComponent(JSON.stringify(DATA))}`

////////////////
// ## Helpers
////////////////

/** Render `html` with `url` as the data, and wait for the tables (and every widget in them) to draw. */
async function render(html: string, url = DATA_URL) {
  SiteData.url = url
  const host = await ElementFixture.render<DOMElement>(html)
  await drawn(host)
  return host
}

/** Wait for `host`'s data and every widget in its shadow root. */
async function drawn(host: DOMElement) {
  await (host.component as UIDocsApi).fetched
  await ElementFixture.tick()
  await ElementFixture.settle(host)
  const hosts = [...host.shadowRoot!.querySelectorAll("*")].filter((element) => "ready" in element) as DOMElement[]
  await Promise.all(hosts.map((element) => element.ready))
  await ElementFixture.settle(host)
}

/** `host`'s tables, by title. */
function tablesOf(host: Element): Map<string, HTMLTableElement> {
  const titles = [...host.shadowRoot!.querySelectorAll("[part~=title]")]
  return new Map(titles.map((title) => [title.textContent!, tableAfter(title)]))
}

/** The `<table>` of the `<ui-table>` after `title` (past its note). */
function tableAfter(title: Element): HTMLTableElement {
  let next = title.nextElementSibling
  while (next && next.localName !== "ui-table") next = next.nextElementSibling
  return next!.querySelector("table")!
}

/** The body row of `table` whose name is `name`. */
function rowOf(table: HTMLTableElement, name: string): HTMLTableRowElement {
  return [...table.tBodies[0]!.rows].find((row) => row.cells[0]!.querySelector("code, em")?.textContent === name)!
}

afterAll(() => (SiteData.url = undefined))

////////////////
// ## Tables
////////////////

describe("<ui-docs-api tag>", () => {
  it("draws only the tables the tag has, in order, under titles;  no tag header", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const section = host.shadowRoot!.querySelector("[part~=api]")!
    expect(section.className).toBe("ui api")
    expect([...tablesOf(host).keys()]).toEqual([
      "Attributes",
      "Properties",
      "Events",
      "Slots",
      "Parts",
      "States",
      "Texts"
    ])
    expect(host.shadowRoot!.querySelector("[part~=header]")).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=title]")!.getAttribute("level")).toBe("3")

    const other = await render(`<ui-docs-api tag="x-or"></ui-docs-api>`)
    expect([...tablesOf(other).keys()]).toEqual(["Parts"])
  })

  // a table never stacks (epic `debut` J64):  too wide, it scrolls sideways in `<ui-table>`'s own box
  it("draws Fomantic's compact celled definition tables, never stacked", async () => {
    const host = await render(`<ui-docs-api tag="x-or"></ui-docs-api>`)
    const table = host.shadowRoot!.querySelector("ui-table")!
    for (const name of ["celled", "definition"]) expect(table.hasAttribute(name)).toBe(true)
    expect(table.hasAttribute("stackable")).toBe(false)
    expect(table.getAttribute("padding")).toBe("compact")
    expect(table.getAttribute("stack-by")).toBe("none")
    const native = table.querySelector("table")!
    expect(native.classList.contains("definition")).toBe(true)
    expect(native.getAttribute("aria-label")).toBe("Parts of <x-or>")
    expect(getComputedStyle(native).borderCollapse).toBeTruthy()
  })

  it("draws each attribute:  name and notes, kind, values, default, description with code", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const attributes = tablesOf(host).get("Attributes")!
    expect([...attributes.tHead!.rows[0]!.cells].map((cell) => cell.textContent)).toEqual([
      "Attribute",
      "Kind",
      "Values",
      "Default",
      "Description"
    ])
    expect(rowOf(attributes, "options")).toBeUndefined()

    const basic = rowOf(attributes, "basic")
    expect({
      header: basic.cells[0]!.localName,
      scope: basic.cells[0]!.getAttribute("scope"),
      kind: basic.cells[1]!.textContent,
      default: basic.cells[3]!.querySelector("code")!.textContent,
      code: basic.cells[4]!.querySelector("code")!.textContent,
      description: basic.cells[4]!.textContent
    }).toEqual({
      header: "th",
      scope: "row",
      kind: "boolean",
      default: "false",
      code: "pronounced",
      description: "Less pronounced."
    })

    const selected = rowOf(attributes, "selected").cells[0]!
    expect(selected.querySelector("small")!.textContent).toBe("alias checked")
    const offset = rowOf(attributes, "heading-offset").cells[0]!
    expect(offset.querySelector("small")!.textContent).toBe("property headingLevelOffset")
    expect(rowOf(attributes, "text").cells[0]!.querySelector("small")!.textContent).toBe("not reflected")
    expect(rowOf(attributes, "type").cells[3]!.textContent).toBe("button")
  })

  it("heads every column alike, the first too;  values and descriptions keep a width to read, cells at the top", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const attributes = tablesOf(host).get("Attributes")!
    expect(attributes.tHead!.classList.contains("full-width")).toBe(true)
    const [first, second] = [...attributes.tHead!.rows[0]!.cells].map((cell) => getComputedStyle(cell))
    expect({ weight: first!.fontWeight, background: first!.backgroundColor, color: first!.color }).toEqual({
      weight: second!.fontWeight,
      background: second!.backgroundColor,
      color: second!.color
    })
    const color = rowOf(attributes, "color")
    expect([...color.cells].map((cell) => cell.className)).toEqual(["", "", "values", "", "description"])
    const fontSize = parseFloat(getComputedStyle(color.cells[2]!).fontSize)
    expect(color.cells[2]!.getBoundingClientRect().width).toBeGreaterThanOrEqual(14 * fontSize - 1)
    expect(color.cells[4]!.getBoundingClientRect().width).toBeGreaterThanOrEqual(16 * fontSize - 1)
    expect(getComputedStyle(color.cells[4]!).verticalAlign).toBe("top")
  })

  it("draws values as mini labels:  hues in their colour, a numeric run as one label, the set named", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const attributes = tablesOf(host).get("Attributes")!
    const labels = (name: string) => [...rowOf(attributes, name).cells[2]!.querySelectorAll("ui-label")]

    const hues = labels("color")
    expect(
      hues.map((label) => [
        label.textContent,
        label.getAttribute("color"),
        label.getAttribute("appearance") === "basic"
      ])
    ).toEqual([
      ["red", "red", false],
      ["blue", "blue", false]
    ])
    expect(rowOf(attributes, "color").cells[2]!.querySelector("ui-labels")!.getAttribute("size")).toBe("mini")
    expect(rowOf(attributes, "color").cells[2]!.querySelector("small")!.textContent).toBe("set hues")

    const sizes = labels("size")
    expect(sizes.map((label) => [label.textContent, label.getAttribute("appearance") === "basic"])).toEqual([
      ["small", true],
      ["large", true]
    ])
    expect(labels("width").map((label) => label.textContent)).toEqual(["1 … 5"])
    expect(labels("type").map((label) => label.textContent)).toEqual(["button", "submit"])
    expect(rowOf(attributes, "type").cells[2]!.querySelector("small")).toBeNull()
    expect(labels("basic")).toEqual([])
  })

  it("splits rich data into Properties;  events, slots, parts, states and texts as their own tables", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const tables = tablesOf(host)

    const properties = tables.get("Properties")!
    expect(rowOf(properties, "options").cells[1]!.querySelector("code")!.textContent).toBe("MenuOption[]")

    const events = tables.get("Events")!
    const toggle = rowOf(events, "ui-toggle")
    expect(toggle.cells[0]!.querySelector("small")!.textContent).toBe("cancelable")
    expect(toggle.cells[1]!.querySelector("code")!.textContent).toBe("{ active: boolean }")
    expect(rowOf(events, "ui-click").cells[0]!.querySelector("small")).toBeNull()

    const slots = tables.get("Slots")!
    expect(rowOf(slots, "(default)").cells[0]!.querySelector("em")).not.toBeNull()
    expect(rowOf(slots, "icon")).toBeDefined()

    expect(rowOf(tables.get("Parts")!, "button").cells[1]!.querySelector("code")!.textContent).toBe("<button>")
    expect(rowOf(tables.get("States")!, ":state(pressed)")).toBeDefined()
    const busy = rowOf(tables.get("Texts")!, "busy")
    expect(busy.cells[1]!.querySelector("code")!.textContent).toBe("Busy `now`")
  })

  it("notes how events, parts, states, properties and texts work, under their titles", async () => {
    const host = await render(`<ui-docs-api tag="x-button"></ui-docs-api>`)
    const notes = [...host.shadowRoot!.querySelectorAll("[part~=note]")]
    expect(notes).toHaveLength(5)
    const parts = notes.find((note) => note.textContent!.includes("::part()"))!
    expect(parts.querySelector("code")!.textContent).toBe("::part()")
  })

  it("fires `ui-drawn` with the tags drawn", async () => {
    SiteData.url = DATA_URL
    const tags: string[][] = []
    document.addEventListener("ui-drawn", record)
    try {
      const host = await ElementFixture.render<DOMElement>(`<ui-docs-api tag="x-or"></ui-docs-api>`)
      await drawn(host)
      await ElementFixture.tick()
    } finally {
      document.removeEventListener("ui-drawn", record)
    }
    expect(tags).toEqual([["x-or"]])

    /** Keep one event's tags. */
    function record(event: Event) {
      tags.push((event as CustomEvent<{ tags: string[] }>).detail.tags)
    }
  })
})

describe("<ui-docs-api family>", () => {
  afterEach(() => history.replaceState(null, "", location.pathname + location.search))

  it("draws every tag of the family under its own linked header, its id the tag", async () => {
    const host = await render(`<ui-docs-api family="x-button"></ui-docs-api>`)
    const blocks = [...host.shadowRoot!.querySelectorAll("[part~=tag]")]
    expect(blocks).toHaveLength(2)
    const headers = [...host.shadowRoot!.querySelectorAll("[part~=header]")]
    expect(
      headers.map((header) => [header.id, header.querySelector("a")!.getAttribute("href"), header.textContent])
    ).toEqual([
      ["x-button", "#x-button", "<x-button>"],
      ["x-or", "#x-or", "<x-or>"]
    ])
    expect(headers[0]!.getAttribute("level")).toBe("3")
    expect(headers[0]!.hasAttribute("dividing")).toBe(true)
    expect(blocks[0]!.querySelector("[part~=title]")!.getAttribute("level")).toBe("4")
    const description = blocks[0]!.querySelector("[part~=description]")!
    expect(description.querySelector("code")!.textContent).toBe("does")
  })

  it("takes any tag of the family, and `level`", async () => {
    const host = await render(`<ui-docs-api family="x-or" level="2"></ui-docs-api>`)
    const headers = [...host.shadowRoot!.querySelectorAll("[part~=header]")]
    expect(headers.map((header) => header.id)).toEqual(["x-button", "x-or"])
    expect(headers[0]!.getAttribute("level")).toBe("2")
    expect(host.shadowRoot!.querySelector("[part~=title]")!.getAttribute("level")).toBe("3")
  })

  it("lands on the tag `location.hash` names, at start and on `hashchange`", async () => {
    const scrolled: Element[] = []
    const spy = vi.spyOn(HashLanding.prototype, "land").mockImplementation(async (target) => {
      scrolled.push((await target)!)
      return true
    })
    try {
      history.replaceState(null, "", "#x-or")
      const host = await render(`<ui-docs-api family="x-button"></ui-docs-api>`)
      await frame()
      const or = host.shadowRoot!.getElementById("x-or")!
      expect(scrolled.some((element) => element === or || element === or.parentElement)).toBe(true)

      scrolled.length = 0
      location.hash = "#x-button"
      await new Promise((resolve) => window.addEventListener("hashchange", resolve, { once: true }))
      await ElementFixture.tick()
      await frame()
      const button = host.shadowRoot!.getElementById("x-button")!
      expect(scrolled.some((element) => element === button || element === button.parentElement)).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
})

describe("<ui-docs-api only>", () => {
  afterEach(() => history.replaceState(null, "", location.pathname + location.search))

  /** `only`'s api inside a page section `sectionId`, drawn. */
  async function inSection(attributes: string, sectionId = "api-attributes") {
    SiteData.url = DATA_URL
    const wrapper = await ElementFixture.render(
      `<ui-section id="${sectionId}" label="X"><ui-docs-api ${attributes}></ui-docs-api></ui-section>`
    )
    const host = wrapper.querySelector<DOMElement>("ui-docs-api")!
    await drawn(host)
    return host
  }

  /** Every `[data-toc]` element of `host`'s shadow root:  its id, text, and whether it's a group. */
  function marked(host: Element) {
    return [...host.shadowRoot!.querySelectorAll("[data-toc]")].map((element) => [
      element.id,
      element.getAttribute("data-toc"),
      element.hasAttribute("data-toc-group")
    ])
  }

  it("draws ONE table, with no title:  the page's section has it", async () => {
    const host = await inSection(`tag="x-button" only="events"`, "api-events")
    expect(host.shadowRoot!.querySelectorAll("ui-table")).toHaveLength(1)
    expect(host.shadowRoot!.querySelector("[part~=title]")).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=note]")!.textContent).toContain("CustomEvent")
    expect(host.shadowRoot!.querySelector("table")!.getAttribute("aria-label")).toBe("Events of <x-button>")
  })

  it("makes every row's name cell an anchor and an \"On this page\" entry, under its section's id", async () => {
    const host = await inSection(`tag="x-button" only="slots"`, "api-slots")
    expect(marked(host)).toEqual([
      ["api-slots-default", "default", false],
      ["api-slots-icon", "icon", false]
    ])
    const cell = host.shadowRoot!.getElementById("api-slots-icon")!
    expect([cell.localName, cell.getAttribute("part")]).toEqual(["th", "member"])
  })

  it("starts its ids with `only` outside a section", async () => {
    const host = await render(`<ui-docs-api tag="x-button" only="states"></ui-docs-api>`)
    expect(marked(host)).toEqual([["states-pressed", "pressed", false]])
  })

  it("heads each tag of a family that has the table, as an entry group;  no summary, nor a tooltip", async () => {
    const parts = await inSection(`family="x-button" only="parts"`, "api-parts")
    expect(marked(parts)).toEqual([
      ["api-parts-x-button", "<x-button>", true],
      ["api-parts-x-button-button", "button", false],
      ["api-parts-x-or", "<x-or>", true],
      ["api-parts-x-or-or", "or", false]
    ])
    const header = parts.shadowRoot!.getElementById("api-parts-x-button")!
    expect(header.hasAttribute("title")).toBe(false)
    expect(parts.shadowRoot!.querySelector("[part~=description]")).toBeNull()
    expect(header.querySelector("a")!.getAttribute("href")).toBe("#x-button")

    const events = await inSection(`family="x-button" only="events"`, "api-events")
    expect(events.shadowRoot!.querySelectorAll("[part~=header]")).toHaveLength(1)
    expect(events.shadowRoot!.querySelectorAll("ui-table")).toHaveLength(1)
  })

  it("`tags`:  lists the family's tags with their summaries, each name a link to its first table", async () => {
    const host = await inSection(`family="x-button" only="tags"`, "api-tags")
    const root = host.shadowRoot!
    expect(root.querySelectorAll("ui-table")).toHaveLength(1)
    expect(root.querySelector("[part~=title]")).toBeNull()
    expect(root.querySelector("[part~=header]")).toBeNull()
    const table = root.querySelector("table")!
    expect(table.getAttribute("aria-label")).toBe("Tags of the x-button family")
    expect([...table.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual(["Tag", "Description"])
    const rows = [...table.querySelectorAll("tbody tr")].map((row) => [
      row.querySelector("th a")?.getAttribute("href"),
      row.querySelector("th")!.textContent,
      row.querySelector("td")!.textContent
    ])
    expect(rows).toEqual([
      ["#x-button", "<x-button>", "A button does things."],
      ["#x-or", "<x-or>", "An or."]
    ])
    // the summary's code span is drawn as code, as visible text
    expect(table.querySelector("tbody td code")!.textContent).toBe("does")
    expect(marked(host)).toEqual([
      ["api-tags-x-button", "<x-button>", false],
      ["api-tags-x-or", "<x-or>", false]
    ])
    await expectAccessible(host)
  })

  it("`tags`:  draws nothing for a single tag", async () => {
    const host = await inSection(`tag="x-button" only="tags"`, "api-tags")
    expect(host.shadowRoot!.querySelector("ui-table")).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=message]")).toBeNull()
  })

  it("draws nothing, and no message, when the tag has no such table", async () => {
    const host = await inSection(`tag="x-or" only="events"`, "api-events")
    expect(host.shadowRoot!.querySelector("ui-table")).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=message]")).toBeNull()
  })

  it("flashes the row `location.hash` names, and doesn't scroll:  the page lands", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {})
    try {
      history.replaceState(null, "", "#api-events-ui-click")
      const host = await inSection(`tag="x-button" only="events"`, "api-events")
      await frame()
      await ElementFixture.settle(host)
      const row = host.shadowRoot!.getElementById("api-events-ui-click")!.closest("tr")!
      expect(row.classList.contains("landed")).toBe(true)
      expect(spy).not.toHaveBeenCalled()
      const other = host.shadowRoot!.getElementById("api-events-ui-toggle")!.closest("tr")!
      expect(other.classList.contains("landed")).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})

/** One animation frame. */
function frame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

////////////////
// ## Messages and states
////////////////

describe("<ui-docs-api> messages and states", () => {
  beforeEach(() => (SiteData.url = DATA_URL))

  it("says when the data has no such tag", async () => {
    const host = await render(`<ui-docs-api tag="x-nope"></ui-docs-api>`)
    const message = host.shadowRoot!.querySelector("[part~=message]")!
    expect({
      tag: message.localName,
      state: message.getAttribute("state"),
      text: message.textContent,
      code: message.querySelector("code")!.textContent
    }).toEqual({ tag: "ui-message", state: "warning", text: "No API data for x-nope.", code: "x-nope" })
    expect(host.matches(":state(error)")).toBe(true)
    expect(host.matches(":state(loading)")).toBe(false)
  })

  it("says when neither `tag` nor `family` is set", async () => {
    const host = await render(`<ui-docs-api></ui-docs-api>`)
    expect(host.shadowRoot!.querySelector("[part~=message]")!.textContent).toBe("Set tag or family.")
  })

  it("says when the data can't be loaded", async () => {
    const host = await render(`<ui-docs-api tag="x-or"></ui-docs-api>`, "/no/such/components.json5")
    const message = host.shadowRoot!.querySelector("[part~=message]")!
    expect(message.getAttribute("state")).toBe("negative")
    expect(message.textContent).toContain("Couldn't load the API data")
    expect(host.matches(":state(error)")).toBe(true)
  })

  it("is `:state(loading)` until the data is in, then follows `tag`", async () => {
    SiteData.url = DATA_URL
    const host = await ElementFixture.render<DOMElement>(`<ui-docs-api tag="x-or"></ui-docs-api>`)
    expect(host.matches(":state(loading)")).toBe(true)
    await drawn(host)
    expect(host.matches(":state(loading)")).toBe(false)
    expect([...tablesOf(host).keys()]).toEqual(["Parts"])

    host.setAttribute("tag", "x-button")
    await drawn(host)
    expect(tablesOf(host).size).toBe(7)
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-docs-api> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    SiteData.url = REAL_DATA
    const root = await ElementFixture.render(EXAMPLES[path]!)
    for (const host of root.querySelectorAll<DOMElement>("ui-docs-api")) await drawn(host)
    await expectAccessible(root)
  })
})
