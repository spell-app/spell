import { describe, expect, test } from "vite-plus/test"

import type { SiteTag } from "spell/ui/docs-components"

import { ApiModel } from "spell/ui/docs-components/ui-docs-api/ApiModel"

/** `<x-button>`:  a plain attribute and a rich-data one. */
const BUTTON = tagOf("x-button", {
  attributes: [
    { name: "basic", kind: "keyOnly", description: "Less `pronounced`." },
    { name: "options", kind: "json", reflect: false, description: "Rich `MenuOption[]`." }
  ]
})

/** Widths `1` ... `5`:  a numeric run long enough to show as a range. */
const WIDTHS = ["1", "2", "3", "4", "5"]

/** `<x-or>`:  parts only. */
const OR = tagOf("x-or", { parts: [{ name: "or", description: "The or." }] })

describe("ApiModel.sectionsFor()", () => {
  test("leaves out empty tables and keeps rich data apart", () => {
    expect(ApiModel.sectionsFor(OR).map((section) => section.id)).toEqual(["parts"])
    const sections = ApiModel.sectionsFor(BUTTON)
    expect(sections.find((section) => section.id === "properties")!.rows.map((row) => row.key)).toEqual(["options"])
    expect(sections.find((section) => section.id === "attributes")!.rows.map((row) => row.key)).not.toContain("options")
  })

  test("puts a function component's props FIRST and where it's drawn LAST", () => {
    const notice = tagOf("Notice", {
      props: [{ name: "autoHide", type: "boolean", description: "Hide after 3s." }],
      parts: [{ name: "message", description: "The message." }],
      usedIn: [{ name: "AppRoot", file: "packages/app/src/solid/AppRoot.tsx" }]
    })
    const sections = ApiModel.sectionsFor(notice)
    expect(sections.map((section) => section.id)).toEqual(["props", "parts", "usedIn"])
    expect(sections[0]!.rows[0]!.cells).toEqual([
      { type: "name", code: "autoHide", notes: [] },
      { type: "text", text: "`boolean`" },
      { type: "text", text: "Hide after 3s." }
    ])
    expect(sections[2]!.rows[0]!.cells).toEqual([
      { type: "name", code: "AppRoot", notes: [] },
      { type: "text", text: "`packages/app/src/solid/AppRoot.tsx`" }
    ])
  })

  test("notes a required prop", () => {
    const pane = tagOf("RunnerPane", { props: [{ name: "id", type: "Id", required: true, description: "Its id." }] })
    expect(ApiModel.sectionsFor(pane)[0]!.rows[0]!.cells[0]).toEqual({
      type: "name",
      code: "id",
      notes: [{ key: "required" }]
    })
  })
})

describe("ApiModel.sectionIdsFor()", () => {
  test("lists the tables ANY of the tags has, in table order:  a page's API sections", () => {
    expect(ApiModel.sectionIdsFor([OR, BUTTON])).toEqual(["tags", "attributes", "properties", "parts"])
    expect(ApiModel.sectionIdsFor([])).toEqual([])
  })

  test("puts the tags table first for 2+ tags only:  a single tag's page has none", () => {
    expect(ApiModel.sectionIdsFor([BUTTON])).toEqual(["attributes", "properties"])
    expect(ApiModel.sectionIdsFor([OR])).toEqual(["parts"])
  })
})

describe("ApiModel.tagsSectionFor()", () => {
  test("lists each tag in order with its summary, its name linking to its first table", () => {
    const empty = tagOf("x-empty", { description: "Nothing `here`." })
    const section = ApiModel.tagsSectionFor([{ ...BUTTON, description: "A button." }, OR, empty])!
    expect([section.id, section.columns]).toEqual(["tags", ["tag", "description"]])
    expect(section.rows.map((row) => [row.key, row.name])).toEqual([
      ["x-button", "<x-button>"],
      ["x-or", "<x-or>"],
      ["x-empty", "<x-empty>"]
    ])
    expect(section.rows.map((row) => row.cells)).toEqual([
      [
        { type: "name", code: "<x-button>", href: "#x-button", notes: [] },
        { type: "text", text: "A button." }
      ],
      [
        { type: "name", code: "<x-or>", href: "#x-or", notes: [] },
        { type: "text", text: "" }
      ],
      // no tables to link to:  named only
      [
        { type: "name", code: "<x-empty>", notes: [] },
        { type: "text", text: "Nothing `here`." }
      ]
    ])
  })

  test("is undefined for fewer than 2 tags", () => {
    expect(ApiModel.tagsSectionFor([BUTTON])).toBeUndefined()
    expect(ApiModel.tagsSectionFor([])).toBeUndefined()
  })

  test("is never one of a tag's own tables", () => {
    expect(ApiModel.sectionsFor(BUTTON).map((section) => section.id)).not.toContain("tags")
  })
})

describe("ApiModel.onlyFor() / sectionIdFor()", () => {
  test("write a table's id as `only` does, and read it back;  nothing for an unknown value", () => {
    expect(ApiModel.onlyFor("usedIn")).toBe("used-in")
    expect(ApiModel.onlyFor("attributes")).toBe("attributes")
    expect(ApiModel.sectionIdFor("used-in")).toBe("usedIn")
    expect(ApiModel.sectionIdFor("events")).toBe("events")
    expect(ApiModel.sectionIdFor("usedIn")).toBeUndefined()
    expect(ApiModel.sectionIdFor(undefined)).toBeUndefined()
  })
})

describe("ApiModel rows' names", () => {
  test('name each row as the "On this page" list shows it:  a property camelCased, a bare state, `default`', () => {
    const tag = tagOf("x-tag", {
      attributes: [
        { name: "basic", kind: "keyOnly", description: "" },
        { name: "column-defs", kind: "json", description: "" }
      ],
      slots: [
        { name: "", description: "" },
        { name: "icon", description: "" }
      ],
      states: [{ name: "open", description: "" }]
    })
    const names = Object.fromEntries(
      ApiModel.sectionsFor(tag).map((section) => [section.id, section.rows.map((row) => row.name)])
    )
    expect(names).toEqual({
      attributes: ["basic"],
      properties: ["columnDefs"],
      slots: ["default", "icon"],
      states: ["open"]
    })
  })
})

describe("ApiModel.propertyFor()", () => {
  test("camelCases the name, unless the attribute names its property", () => {
    expect(ApiModel.propertyFor({ name: "column-defs", kind: "json", description: "" })).toBe("columnDefs")
    expect(ApiModel.propertyFor({ name: "x", kind: "number", property: "y", description: "" })).toBe("y")
  })
})

describe("ApiModel.defaultFor()", () => {
  test("shows a declared default, `false` for a boolean, and nothing for free text", () => {
    expect(ApiModel.defaultFor({ name: "x", kind: "keyOnly", description: "" })).toBe("false")
    expect(ApiModel.defaultFor({ name: "x", kind: "string", description: "" })).toBeUndefined()
    expect(ApiModel.defaultFor({ name: "x", kind: "number", default: 0, description: "" })).toBe("0")
  })
})

describe("ApiModel.kindLabelFor()", () => {
  test("names a kind as an author reads it", () => {
    expect(ApiModel.kindLabelFor("keyOrValueAndKey")).toBe("boolean or value")
  })
})

describe("ApiModel.valuesFor()", () => {
  test("marks hues as swatches and a run of 4+ whole numbers as a range;  nothing without values", () => {
    expect(
      ApiModel.valuesFor({ name: "color", kind: "color", values: ["red", "blue"], valueSet: "hues", description: "" })
    ).toEqual({ type: "values", values: ["red", "blue"], set: "hues", isSwatch: true, isRange: false })
    expect(ApiModel.valuesFor({ name: "width", kind: "width", values: WIDTHS, description: "" })).toEqual({
      type: "values",
      values: WIDTHS,
      isSwatch: false,
      isRange: true
    })
    expect(ApiModel.valuesFor({ name: "span", kind: "enum", values: ["1", "2", "3"], description: "" })).toMatchObject({
      isRange: false
    })
    expect(ApiModel.valuesFor({ name: "basic", kind: "keyOnly", description: "" })).toBeUndefined()
  })
})

describe("ApiModel.labelsFor()", () => {
  test("collapses a range to ONE `first … last` label;  other values stay one label each", () => {
    expect(ApiModel.labelsFor(valuesCell(WIDTHS, true))).toEqual(["1 … 5"])
    expect(ApiModel.labelsFor(valuesCell(["button", "submit"], false))).toEqual(["button", "submit"])
  })
})

/** A tag entry of family `x-button` with nothing but `overrides`. */
function tagOf(tag: string, overrides: Partial<SiteTag>): SiteTag {
  return {
    tag,
    name: tag,
    folder: "x-button",
    mainTag: "x-button",
    main: tag === "x-button",
    page: tag === "x-button",
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

/** A Values cell of `values`, no swatches. */
function valuesCell(values: string[], isRange: boolean) {
  return { type: "values" as const, values, isSwatch: false, isRange }
}
