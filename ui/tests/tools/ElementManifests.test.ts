import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { readJSON5File } from "spell-kit/util/node/json5"
import type { SiteDataFile } from "spell-ui/docs-components/docs-components.types"
import { ElementManifests } from "spell-ui/tools/ElementManifests"

/** Spell UI's folder (the brand's manifests are checked in spell-brand's own tests:  it's above Spell UI). */
const UI = fileURLToPath(new URL("../../", import.meta.url))

/** Its committed site data. */
const DATA = readJSON5File<SiteDataFile>(join(UI, "docs/__data/components.json5"))

describe("ElementManifests.outputs()", () => {
  test("are current (else run `yarn site:data`)", () => {
    for (const [file, text] of new ElementManifests({ data: DATA, packageFolder: UI }).outputs(join(UI, "docs/__data")))
      expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })
})

describe("ElementManifests.jsxOutput()", () => {
  test("is current (else run `yarn site:data`)", async () => {
    const [file, text] = await new ElementManifests({ data: DATA, packageFolder: UI }).jsxOutput()
    expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })
})

describe("ElementManifests.jsxTypes()", () => {
  test("types every component tag in Solid's JSX, its rich data by name, and `prop:` deprecated", () => {
    const text = new ElementManifests({ data: DATA, packageFolder: UI }).jsxTypes()
    for (const tag of DATA.components) expect(text).toContain(`"${tag.tag}": `)
    expect(text).not.toContain('"ui-docs-')
    expect(text).toMatch(/export interface UIButtonAttributes \{[^}]*\n {2}basic\?: boolean \| ""\n/)
    expect(text).toContain("export interface UIButtonJSXAttributes")
    expect(text).toContain("  options?: unknown")
    expect(text).toContain('  "prop:options"?: unknown')
    expect(text).toContain("   * @deprecated write `options` -- `prop:` stays only for compiled spell\n   */\n  \"prop:options\"")
  })

  test("types every tag's events:  its own map, `on-<event>`, and the DOM's maps", () => {
    const text = new ElementManifests({ data: DATA, packageFolder: UI }).jsxTypes()
    expect(text).toContain("export interface UIButtonEventMap {")
    expect(text).toContain('  "on-ui-toggle"?: (event: UIButtonEventMap["ui-toggle"]) => void')
    expect(text).toContain('    "ui-button": UIHTMLElement<UIButtonEventMap>')
    expect(text).toContain('  "ui-change": CustomEvent<unknown>')
    expect(text).toContain("reason: UIT.ModalCloseReason")
  })
})

describe("ElementManifests.jsxDetailType()", () => {
  test("qualifies Spell UI's type names, keeps the DOM's, and throws for one it doesn't know", () => {
    const tag = DATA.components.find((it) => it.tag === "ui-form")!
    const detail = (text: string) =>
      ElementManifests.jsxDetailType(tag, { name: "ui-x", detail: text, description: "" })
    expect(detail("{ value: FieldValue, item: Element, kind: 'Big' }")).toBe(
      "{ value: E.FieldValue, item: Element, kind: 'Big' }"
    )
    expect(() => detail("{ row: TableRow }")).toThrow(/`TableRow`/)
  })
})

describe("ElementManifests.customElements()", () => {
  test("describes every component tag as a Custom Elements Manifest", () => {
    const manifest = new ElementManifests({ data: DATA, packageFolder: UI }).customElements()
    expect(manifest.schemaVersion).toMatch(/^2\./)
    const definitions = manifest.modules.flatMap((module) =>
      module.exports.filter((entry) => entry.kind === "custom-element-definition").map((entry) => String(entry.name))
    )
    expect(definitions.toSorted(compare)).toEqual(DATA.components.map((tag) => tag.tag).toSorted(compare))
    for (const module of manifest.modules) {
      expect(module.kind).toBe("javascript-module")
      for (const declaration of module.declarations) {
        expect(declaration).toMatchObject({ kind: "class", customElement: true })
        expect(declaration.tagName).toMatch(/^ui-[a-z-]+$/)
        expect(declaration.name).toMatch(/^UI[A-Za-z]+$/)
        for (const key of ["attributes", "events", "slots", "cssParts", "cssStates"])
          expect(Array.isArray(declaration[key]), key).toBe(true)
      }
    }
    const button = manifest.modules
      .flatMap((module) => module.declarations)
      .find((entry) => entry.tagName === "ui-button")!
    expect(button.attributes).toContainEqual(expect.objectContaining({ name: "primary", type: { text: "boolean" } }))
    expect(button.events).toContainEqual(expect.objectContaining({ name: "ui-toggle" }))
  })
})

describe("ElementManifests.htmlCustomData()", () => {
  test("gives VS Code every tag, with values for value sets", () => {
    const custom = new ElementManifests({ data: DATA, packageFolder: UI }).htmlCustomData()
    expect(custom.tags.map((tag) => tag.name).toSorted(compare)).toEqual(
      DATA.components.map((tag) => tag.tag).toSorted(compare)
    )
    const size = custom.tags
      .find((tag) => tag.name === "ui-button")!
      .attributes.find((attribute) => attribute.name === "size")!
    expect(size.values?.map((value) => value.name)).toContain("small")
  })
})

describe("ElementManifests.cssCustomData()", () => {
  test("gives VS Code every family's custom properties, and every part and custom state by name", () => {
    const custom = new ElementManifests({ data: DATA, packageFolder: UI }).cssCustomData()
    const tokens = DATA.components
      .filter((tag) => tag.main)
      .flatMap((tag) => DATA.families[tag.folder]!.tokens.map((token) => token.name))
    expect(custom.properties.map((property) => property.name).toSorted(compare)).toEqual(
      [...new Set(tokens)].toSorted(compare)
    )
    expect(
      custom.properties.find((property) => property.name === "--ui-button-padding-block")?.description.value
    ).toMatch(/`<ui-button>`'s token\.  Default:  `.+`/)
    const open = custom.pseudoClasses.find((state) => state.name === ":state(open)")!
    expect(open.description.value).toContain("- `<ui-dropdown>`:  ")
    expect(custom.pseudoElements.map((part) => part.name)).toContain("::part(icon)")
  })
})

describe("ElementManifests.pascal()", () => {
  test("names a tag's class, `ui-` dropped", () => {
    expect(ElementManifests.pascal("ui-breadcrumb-section")).toBe("BreadcrumbSection")
  })
})

describe("ElementManifests.typeText()", () => {
  test("types a flag as boolean, a value set as a union, either as both", () => {
    expect(ElementManifests.typeText({ name: "basic", kind: "keyOnly", description: "" })).toBe("boolean")
    expect(ElementManifests.typeText({ name: "size", kind: "enum", values: ["small", "large"], description: "" })).toBe(
      '"small" | "large"'
    )
    expect(
      ElementManifests.typeText({ name: "attached", kind: "keyOrValueAndKey", values: ["top"], description: "" })
    ).toBe('boolean | "top"')
  })
})

describe("ElementManifests.jsxType()", () => {
  test('takes a number as its text too, a flag as `""` too, and keeps a value set offered beside free text', () => {
    expect(ElementManifests.jsxType({ name: "basic", kind: "keyOnly", description: "" })).toBe('boolean | ""')
    expect(
      ElementManifests.jsxType({ name: "attached", kind: "keyOrValueAndKey", values: ["top"], description: "" })
    ).toBe('boolean | "" | "top"')
    expect(ElementManifests.jsxType({ name: "max", kind: "number", description: "" })).toBe("number | `${number}`")
    expect(ElementManifests.jsxType({ name: "width", kind: "width", values: ["1", "2"], description: "" })).toBe(
      '"1" | "2" | (string & {})'
    )
  })
})

/** A-Z order for `toSorted()`. */
function compare(a: string, b: string): number {
  return a.localeCompare(b)
}
