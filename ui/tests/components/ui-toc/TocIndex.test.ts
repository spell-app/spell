import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { TocIndex } from "spell-ui/components/ui-toc/TocIndex"
import type { TocEntry } from "spell-ui/components/ui-toc/UIToc.types"

/** Two sections:  `types` holding `button` and `group` (holding `or`), and `states` with nothing under it. */
const TREE: TocEntry[] = [entryOf("types", [entryOf("button"), entryOf("group", [entryOf("or")])]), entryOf("states")]

describe("TocIndex.slug()", () => {
  test("makes lowercase words joined by `-`, accents dropped, apostrophes splitting;  `section` when nothing is left", () => {
    expect(TocIndex.slug("Labeled Icon")).toBe("labeled-icon")
    expect(TocIndex.slug("  Émphasis & More! ")).toBe("emphasis-more")
    expect(TocIndex.slug("---")).toBe("section")
    expect(TocIndex.slug("Spell UI’s own")).toBe("spell-ui-s-own")
  })
})

describe("TocIndex.flatten()", () => {
  test("lists every entry depth first:  page order", () => {
    expect(TocIndex.flatten(TREE).map((entry) => entry.id)).toEqual(["types", "button", "group", "or", "states"])
  })
})

describe("TocIndex.pathTo()", () => {
  test("names the ids from the top section down to the entry;  [] when it isn't listed", () => {
    expect(TocIndex.pathTo(TREE, "or")).toEqual(["types", "group", "or"])
    expect(TocIndex.pathTo(TREE, "states")).toEqual(["states"])
    expect(TocIndex.pathTo(TREE, "nope")).toEqual([])
    expect(TocIndex.pathTo(TREE, undefined)).toEqual([])
  })
})

describe("TocIndex.sectionOf()", () => {
  test("finds the top-level section holding an entry at any depth, or being it", () => {
    expect(TocIndex.sectionOf(TREE, "or")).toBe(TREE[0])
    expect(TocIndex.sectionOf(TREE, "states")).toBe(TREE[1])
    expect(TocIndex.sectionOf(TREE, "nope")).toBeUndefined()
  })
})

describe("TocIndex.decode()", () => {
  test("decodes a hash, and keeps one that isn't valid percent-encoding as it is", () => {
    expect(TocIndex.decode("caf%C3%A9")).toBe("café")
    expect(TocIndex.decode("100%")).toBe("100%")
  })
})

describe("TocIndex.scan() over a `<ui-docs-api>`'s shadow root", () => {
  // the docs widget's barrel names itself;  a stub here, so the test names it
  beforeEach(() => TocIndex.addShadowHost("ui-docs-api"))
  afterEach(() => TocIndex.reset())

  test("lists its marked elements under the section around it, a group holding the ones after it", () => {
    const root = document.createElement("div")
    root.innerHTML = `
      <ui-section id="api-parts" label="Parts"><ui-docs-api></ui-docs-api></ui-section>
      <ui-section id="api-states" label="States"><ui-docs-api></ui-docs-api></ui-section>`
    const [parts, states] = [...root.querySelectorAll("ui-docs-api")].map((host) => host.attachShadow({ mode: "open" }))
    parts!.innerHTML = `
      <h3 id="api-parts-x-button" data-toc="<x-button>" data-toc-group></h3>
      <table><tr><th id="api-parts-x-button-button" data-toc="button"></th></tr></table>
      <h3 id="api-parts-x-or" data-toc="<x-or>" data-toc-group></h3>
      <table><tr><th id="api-parts-x-or-or" data-toc="or"></th><th data-toc="no id:  not listed"></th></tr></table>`
    states!.innerHTML = `<table><tr><th id="api-states-open" data-toc="open"></th></tr></table>`
    const shape = (entries: readonly TocEntry[]): unknown[] =>
      entries.map((entry) => (entry.entries.length ? [entry.text, shape(entry.entries)] : entry.text))
    expect(shape(TocIndex.scan(root))).toEqual([
      [
        "Parts",
        [
          ["<x-button>", ["button"]],
          ["<x-or>", ["or"]]
        ]
      ],
      ["States", ["open"]]
    ])
    const or = TocIndex.flatten(TocIndex.scan(root)).find((entry) => entry.id === "api-parts-x-or-or")!
    expect(TocIndex.lightElementOf(or.target)).toBe(root.querySelector("ui-docs-api"))
  })

  test("finds an id in the page, else in a `<ui-docs-api>`'s shadow root", () => {
    const host = document.body.appendChild(document.createElement("ui-docs-api"))
    try {
      host.attachShadow({ mode: "open" }).innerHTML = `<span id="api-x-y"></span>`
      expect(TocIndex.elementById(document, "api-x-y")?.localName).toBe("span")
      expect(TocIndex.elementById(document, "nope")).toBeUndefined()
    } finally {
      host.remove()
    }
  })
})

/** An entry `id` (its text the id), with `entries` under it;  its target a detached `<div>`. */
function entryOf(id: string, entries: TocEntry[] = []): TocEntry {
  return { id, text: id, target: document.createElement("div"), entries }
}

describe("TocIndex.reached()", () => {
  test("names the last target whose top has reached its line, skipping the hidden;  none above the first", () => {
    const box = document.createElement("div")
    box.innerHTML = `<p id="a" style="height: 50px"></p><p id="b" hidden></p><p id="c" style="height: 50px"></p>`
    document.body.append(box)
    try {
      const targets = [...box.children]
      const topOf = (id: string) => document.getElementById(id)!.getBoundingClientRect().top
      expect(TocIndex.reached(targets, () => topOf("a") - 1)).toBeUndefined()
      expect(TocIndex.reached(targets, () => topOf("a"))?.id).toBe("a")
      expect(TocIndex.reached(targets, () => topOf("c") + 1)?.id).toBe("c")
      expect(
        TocIndex.reached(
          targets,
          () => topOf("c"),
          (target) => target.id !== "c"
        )?.id
      ).toBe("a")
    } finally {
      box.remove()
    }
  })
})

describe("TocIndex.addShadowHost()", () => {
  afterEach(() => TocIndex.reset())

  test("reads no shadow root until a family names its tag, then each tag once", () => {
    expect(TocIndex.shadowHosts).toBeUndefined()
    TocIndex.addShadowHost("ui-docs-api")
    TocIndex.addShadowHost("x-rows")
    TocIndex.addShadowHost("ui-docs-api")
    expect(TocIndex.shadowHosts).toBe("ui-docs-api, x-rows")
  })

  test("a host it wasn't told of is light DOM only:  its shadow entries aren't listed", () => {
    const root = document.createElement("div")
    root.innerHTML = `<ui-section id="api" label="API"><x-rows></x-rows></ui-section>`
    const shadow = root.querySelector("x-rows")!.attachShadow({ mode: "open" })
    shadow.innerHTML = `<span id="row" data-toc="row"></span>`
    expect(TocIndex.scan(root)[0]!.entries).toEqual([])
    TocIndex.addShadowHost("x-rows")
    expect(TocIndex.scan(root)[0]!.entries.map((entry) => entry.text)).toEqual(["row"])
  })
})
