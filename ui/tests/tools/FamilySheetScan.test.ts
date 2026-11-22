import { fileURLToPath } from "node:url"

import { beforeAll, describe, expect, it } from "vite-plus/test"

import { RootCatalog } from "spell/element-tools/RootCatalog"
import { FamilySheetScan } from "spell/ui/tools/FamilySheetScan"
import { ROOT_SHEETS } from "spell/ui/components/ui-root/UIRoot.sheets"

/** Every family folder `yarn gen:root` reads. */
const ROOTS = ["components", "docs-components"].map((folder) =>
  fileURLToPath(new URL(`../../src/${folder}/`, import.meta.url))
)

/** `src/styles/`. */
const STYLES = fileURLToPath(new URL("../../src/styles/", import.meta.url))

/** Folder => the optional sheets its code uses, scanned once. */
let byFolder: ReturnType<typeof FamilySheetScan.read>

/** Every tag => its folder. */
let catalog: Awaited<ReturnType<typeof RootCatalog.read>>

beforeAll(async () => {
  byFolder = FamilySheetScan.read({ roots: ROOTS, styles: STYLES })
  catalog = await RootCatalog.read(ROOTS)
})

describe("FamilySheetScan.read()", () => {
  it("UIRoot.sheets.ts is current (else run `yarn gen:root`)", () => {
    const expected = Object.fromEntries(
      Object.entries(catalog).map(([tag, { folder }]) => [tag, byFolder[folder] ?? []])
    )
    expect(ROOT_SHEETS).toEqual(expected)
  })

  it("finds no optional sheet in a plain family's own markup:  its vocabulary's colours and sizes come at run time", () => {
    expect(byFolder["ui-icon"]).toEqual([])
    expect(byFolder["ui-item"]).toEqual([])
  })

  it("gives every optional sheet to a family that draws markup it didn't write", () => {
    expect(byFolder["ui-markdown"]).toEqual(["colors-shared", "sizes-shared", "utilities", "animations"])
  })

  it("finds a utility class in a family's markup", () => {
    expect(byFolder["ui-docs-api"]).toContain("utilities")
  })

  // `UI.transitions` adopts the animations into a root the first time it animates a box there, but a family whose
  // own CSS runs one of `animations.css`'s keyframes needs them from the start:  the scan lists it
  it("lists no family for the animations by its CSS alone:  every family's spinner is its own keyframes", () => {
    const animated = Object.entries(byFolder).filter(
      ([folder, sheets]) => sheets.includes("animations") && !ALL_SHEETS.has(folder)
    )
    expect(animated).toEqual([])
  })
})

/** Families that draw markup they didn't write, so take every optional sheet. */
const ALL_SHEETS = new Set(["ui-code", "ui-example", "ui-include", "ui-markdown", "ui-mermaid-diagram"])
