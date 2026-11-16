import { describe, expect, it } from "vite-plus/test"

import { E } from "spell/ui/core"
import { GROUP_ORDER, PropertyLayouts, type AttributeLike } from "spell/ui/property"

/** A button's attributes, as a vocabulary lists them. */
const ATTRIBUTES: AttributeLike[] = [
  { name: "label", group: "name" },
  { name: "icon", group: "content" },
  { name: "color", group: "appearance" },
  { name: "size" },
  { name: "disabled", group: "states" },
  { name: "link", group: "link" }
]

/** Every shipped layout file's text, by path. */
const LAYOUT_FILES = import.meta.glob<string>("/src/components/*/*.editor.html", {
  eager: true,
  query: "?raw",
  import: "default"
})

/** Every component vocabulary module, by path. */
const VOCABULARY_MODULES = import.meta.glob<Record<string, unknown>>("/src/components/*/*.en.ts", { eager: true })

/** Every component vocabulary, by tag. */
const VOCABULARIES = new Map(
  Object.values(VOCABULARY_MODULES)
    .map((module) => Object.values(module).find(isVocabulary))
    .filter((vocabulary) => !!vocabulary)
    .map((vocabulary) => [vocabulary.tag, vocabulary])
)

/** A module's export that is a component vocabulary. */
function isVocabulary(value: unknown): value is { tag: string; attributes: AttributeLike[] } {
  return !!value && typeof value === "object" && "tag" in value && "attributes" in value
}

/** Each shipped layout, by its tag. */
const LAYOUTS = new Map(
  Object.values(LAYOUT_FILES).map((text) => {
    const layout = PropertyLayouts.parse(text)!
    return [layout.tag, layout]
  })
)

describe("PropertyLayouts", () => {
  it("parse():  its sections in order, a <ui-fields> one row, data-omit left out", () => {
    const layout = PropertyLayouts.parse(`<!-- a note -->
      <ui-property-editor schema="ui-button" data-omit="link">
        <ui-property-group label="Look" data-group="appearance">
          <ui-fields><ui-property name="label"></ui-property><ui-property name="icon"></ui-property></ui-fields>
          <ui-property name="color"></ui-property>
          <ui-fields><ui-property name="size"></ui-property></ui-fields>
        </ui-property-group>
        <ui-property-group label="States" data-group="states">
          <ui-property name="disabled"></ui-property>
        </ui-property-group>
      </ui-property-editor>`)
    expect(layout).toEqual({
      tag: "ui-button",
      omitted: ["link"],
      sections: [
        { group: "appearance", label: "Look", rows: [["label", "icon"], ["color"], ["size"]] },
        { group: "states", label: "States", rows: [["disabled"]] }
      ]
    })
  })

  it("place():  no layout, the vocabulary rule -- a section per group in order, no group in Appearance", () => {
    expect(PropertyLayouts.place(undefined, ATTRIBUTES)).toEqual([
      { group: "name", label: undefined, rows: [["label"]] },
      { group: "content", label: undefined, rows: [["icon"]] },
      { group: "appearance", label: undefined, rows: [["color"], ["size"]] },
      { group: "states", label: undefined, rows: [["disabled"]] },
      { group: "link", label: undefined, rows: [["link"]] }
    ])
  })

  it("place():  an attribute the layout doesn't place shows after its group's rows, or in a section of its own", () => {
    const layout = PropertyLayouts.parse(`<ui-property-editor schema="ui-button" data-omit="link">
      <ui-property-group label="Appearance" data-group="appearance">
        <ui-fields><ui-property name="label"></ui-property><ui-property name="icon"></ui-property></ui-fields>
        <ui-property name="gone"></ui-property>
      </ui-property-group>
    </ui-property-editor>`)!
    expect(PropertyLayouts.unplaced(layout, ATTRIBUTES)).toEqual(["color", "size", "disabled"])
    expect(PropertyLayouts.unknown(layout, ATTRIBUTES)).toEqual(["gone"])
    expect(PropertyLayouts.place(layout, ATTRIBUTES)).toEqual([
      { group: "appearance", label: "Appearance", rows: [["label", "icon"], ["color"], ["size"]] },
      { group: "states", label: undefined, rows: [["disabled"]] }
    ])
  })

  it("place():  `inverted` right after `color`, wherever `color` is (T94)", () => {
    const attributes = [{ name: "inverted", group: "layout" }, ...ATTRIBUTES] as AttributeLike[]
    expect(PropertyLayouts.place(undefined, attributes)[2]).toEqual({
      group: "appearance",
      label: undefined,
      rows: [["color"], ["inverted"], ["size"]]
    })
    const layout = PropertyLayouts.parse(`<ui-property-editor schema="ui-button">
      <ui-property-group label="Look" data-group="layout"><ui-property name="color"></ui-property></ui-property-group>
    </ui-property-editor>`)!
    expect(PropertyLayouts.place(layout, attributes)[0]!.rows).toEqual([["color"], ["inverted"]])
  })

  it("write():  a layout that lays out as the vocabulary rule does", () => {
    const layout = PropertyLayouts.parse(PropertyLayouts.write("ui-button", ATTRIBUTES))!
    expect(layout.omitted).toEqual([])
    expect(PropertyLayouts.place(layout, ATTRIBUTES).map((section) => section.rows)).toEqual(
      PropertyLayouts.place(undefined, ATTRIBUTES).map((section) => section.rows)
    )
  })

  it("load():  a shipped layout, read once;  a tag with none, undefined", async () => {
    const layout = await PropertyLayouts.load("ui-action")
    expect(layout?.sections[0]?.rows[0]).toEqual(["label", "icon"])
    expect(PropertyLayouts.loaded("ui-action")).toBe(layout)
    expect(await PropertyLayouts.load("ui-nothing")).toBeUndefined()
    expect(PropertyLayouts.loaded("ui-nothing")).toBeNull()
  })

  it("GROUP_ORDER is the element's groups, in order", () => {
    expect(GROUP_ORDER).toEqual(E.ATTRIBUTE_GROUPS)
  })
})

describe("the shipped layouts", () => {
  it("every Spell UI component has one, named for its tag", () => {
    const missing = [...VOCABULARIES.keys()].filter((tag) => !LAYOUTS.has(tag))
    // a new tag:  its layout file, `<tag>.editor.html` beside its vocabulary, starts as `PropertyLayouts.write()` writes it
    expect(
      missing,
      missing.map((tag) => PropertyLayouts.write(tag, VOCABULARIES.get(tag)!.attributes)).join("\n")
    ).toEqual([])
    for (const [path, text] of Object.entries(LAYOUT_FILES)) {
      expect(path.endsWith(`/${PropertyLayouts.parse(text)!.tag}.editor.html`), path).toBe(true)
    }
    expect(PropertyLayouts.tags.sort()).toEqual([...LAYOUTS.keys()].sort())
  })

  it("each names only its tag's real attributes, and real groups", () => {
    const wrong: string[] = []
    for (const [tag, layout] of LAYOUTS) {
      const vocabulary = VOCABULARIES.get(tag)
      if (!vocabulary) {
        wrong.push(`${tag}:  no such tag`)
        continue
      }
      const unknown = PropertyLayouts.unknown(layout, vocabulary.attributes)
      if (unknown.length) wrong.push(`${tag} has no ${unknown.join(", ")}`)
      for (const section of layout.sections) {
        if (!section.group || !GROUP_ORDER.includes(section.group)) wrong.push(`${tag}:  a section of no group`)
      }
    }
    expect(wrong).toEqual([])
  })

  it("each places every attribute of its tag, or leaves it out on purpose", () => {
    const unplaced = [...LAYOUTS]
      .map(([tag, layout]) => [tag, PropertyLayouts.unplaced(layout, VOCABULARIES.get(tag)?.attributes ?? [])] as const)
      .filter(([, names]) => names.length)
      .map(([tag, names]) => `${tag} has attributes its layout doesn't place:  ${names.join(", ")}`)
    expect(unplaced).toEqual([])
  })
})
