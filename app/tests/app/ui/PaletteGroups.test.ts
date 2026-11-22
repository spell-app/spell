import { describe, expect, it } from "vite-plus/test"

import { es } from "spell/ui/components/components.es"
import shippedTable from "spell/app/app/ui/paletteGroups.json"
import { PaletteGroups } from "spell/app/app/ui/PaletteGroups"

describe("PaletteGroups.inGroups()", () => {
  it("files every family once, what it offers ready-made first, then the rest", () => {
    const groups = PaletteGroups.inGroups()
    const tags = groups.flatMap(({ parts }) => parts.map((definition) => definition.tag))
    expect(new Set(tags).size).toBe(tags.length)
    expect(tags).toEqual(expect.arrayContaining(PaletteGroups.readyMade().map((definition) => definition.tag)))
    expect(tags).toEqual(expect.arrayContaining(["ui-tabs", "ui-table", "ui-modal"]))
    // a tag that stands alone, though not its folder's main one (epic `editor` I180)
    expect(tags).toEqual(expect.arrayContaining(["ui-buttons", "ui-steps", "ui-textarea", "ui-cards"]))
    // by today's rule, a part only inside another, and what a page holds once, are never offered;
    // the table (Owen's, on the palette groups page) may still list one on purpose
    const byRule = PaletteGroups.byTopic().flatMap(({ parts }) => parts.map((part) => part.tag))
    expect(byRule).not.toContain("ui-tree-item")
    expect(byRule).not.toContain("ui-tab")
    expect(byRule).not.toContain("ui-or")
    expect(byRule).not.toContain("ui-root")
    expect(tags).not.toContain("ui-root")
    expect(groups.every(({ parts }) => parts.length > 0)).toBe(true)
    // by today's rule, in each topic, the ready-made ones (a snippet of their own) before the rest
    for (const { parts } of PaletteGroups.byTopic()) {
      const readyMade = parts.map((definition) => !!definition.snippet?.startsWith(`<${definition.tag}`))
      expect(readyMade, parts[0]!.tag).toEqual([...readyMade].sort((a, b) => Number(b) - Number(a)))
    }
  })
})

describe("PaletteGroups.inGroups() and its table (epic `editor` T81)", () => {
  it("shows the table's groups and tags in its order;  skips a tag that isn't a component, or named twice", () => {
    const groups = PaletteGroups.inGroups({
      groups: [
        { title: "Mine", tags: ["ui-card", "ui-button", "ui-no-such-tag"] },
        { topic: "buttons", tags: ["ui-buttons", "ui-button"] }
      ]
    })
    expect(groups[0]).toMatchObject({ title: "Mine" })
    expect(groups[0]!.parts.map((definition) => definition.tag)).toEqual(["ui-card", "ui-button"])
    expect(groups[1]!.parts.map((definition) => definition.tag)).toEqual(["ui-buttons"])
  })

  it("files what the table doesn't name by today's rule:  at its topic group's end, else a group of its own", () => {
    const groups = PaletteGroups.inGroups({
      groups: [{ topic: "buttons", tags: ["ui-buttons"] }],
      hidden: ["ui-modal"]
    })
    const tags = groups.flatMap(({ parts }) => parts.map((definition) => definition.tag))
    expect(groups[0]!.parts.map((definition) => definition.tag)).toEqual(["ui-buttons", "ui-button"])
    // every other component still shows, under its topic, in today's order
    expect(groups.slice(1).map(({ topic }) => topic)).toEqual(
      PaletteGroups.byTopic()
        .map(({ topic }) => topic)
        .filter((topic) => topic !== "buttons" && topic !== "dialogs")
    )
    expect(tags).toContain("ui-grid")
    // what it hides doesn't
    expect(tags).not.toContain("ui-modal")
  })

  it("the table it ships with names every component today's rule offers, or hides it:  nothing falls back", () => {
    const named = new Set([...shippedTable.groups.flatMap(({ tags }) => tags), ...shippedTable.hidden])
    const offered = PaletteGroups.byTopic().flatMap(({ parts }) => parts.map(({ tag }) => tag))
    expect(offered.filter((tag) => !named.has(tag))).toEqual([])
  })

  it("names a group by its own title, else its topic in the language", () => {
    expect(PaletteGroups.groupNameIn({ topic: "forms" }, "es")).toBe("formularios")
    expect(PaletteGroups.groupNameIn({ topic: "forms", title: "Fields" }, "es")).toBe("Fields")
    // every topic the palette shows has its own word (some, like `social`, are spelt the same)
    for (const { topic } of PaletteGroups.byTopic()) expect(es.values?.topics, topic).toHaveProperty([topic])
  })
})

describe("PaletteGroups.candidates()", () => {
  it("offers every component but what a page holds once", () => {
    const tags = PaletteGroups.candidates().map(({ tag }) => tag)
    expect(tags).toContain("ui-tab")
    expect(tags).not.toContain("ui-root")
    expect(tags).not.toContain("ui-components")
  })
})
