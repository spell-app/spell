import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { readJSON5File } from "@spell-app/util/node/json5"
import type { SiteDataFile } from "$/ui/docs-components/docs-components.types"
import { ElementManifests } from "$/ui/tools/ElementManifests"

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

/** A-Z order for `toSorted()`. */
function compare(a: string, b: string): number {
  return a.localeCompare(b)
}
