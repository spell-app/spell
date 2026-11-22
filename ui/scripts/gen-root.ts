/**
 * `yarn gen:root [--check]`:  write `src/components/ui-root/UIRoot.catalog.ts`, every component tag => what
 * `<ui-root>` needs BEFORE that tag's family loads:  its folder (which family to import) and its skeleton
 * (`ComponentVocabulary.skeleton`, skeleton text parsed by `SkeletonText` into a `SkeletonSpec`;  a vocabulary
 * without one writes no `skeleton` key).
 * - Run after adding or moving a tag, or changing a skeleton.  `tests/components/ui-root/UIRoot.catalog.test.ts` and
 *   `tests/test-helpers/vocabularies.test.ts` fail while the file is stale.
 * - Formatted as `yarn format` would, in memory, and written only when it changed (`formatted()`, `writeOrCheck()`).
 * - `--check`:  write nothing;  exit 1 if the catalog is stale.
 * - Why generated, not `ComponentDefinitions`:  that roll-up imports every vocabulary (~325 kB of source);  a lib
 *   entry importing it would split each vocabulary into a chunk shared with its family.  The catalog is a few kB.
 * - Reads the vocabularies with the kit's `RootCatalog` (`spell/element-tools/RootCatalog`;  the pack build,
 *   `spell-pack build`, shares it for a component pack's catalog), the way `ComponentDefinitions` does:
 *   every `UI<Name>.en.ts` of every folder, every export with a `tag` and `attributes`.
 * - Scans `components/` AND `src/docs-components/` (the doc-only `<ui-docs-*>` elements):  `<ui-root>` loads
 *   both alike.  A folder name is unique across the two (`RootLoader` finds the family by name alone).
 * - The catalog is a `src/` file, so its own import (`./UIRoot.types`) has no `.ts` extension:  Vite's resolution,
 *   not `tsx`'s.
 * - The catalog and the types file it imports are named through `FamilyFiles`
 *   (`UIRoot.catalog.ts`, `UIRoot.types.ts`).
 * - Also writes `UIRoot.sheets.ts` beside it:  every tag => the optional foundation sheets its family's own shadow
 *   markup uses (`FamilySheetScan`;  epic `solid-2-final` P4).  The runtime adds what its vocabulary can put on a box
 *   (`RootSheets`).  `tests/tools/FamilySheetScan.test.ts` fails while it's stale.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { FamilyFiles } from "spell/ui/tools/FamilyFiles"
import { FamilySheetScan } from "spell/ui/tools/FamilySheetScan"
import { RootCatalog } from "spell/element-tools/RootCatalog"
import { Terminal } from "spell/element-tools/Terminal"
import { writeOrCheck } from "spell/element-tools/generatedFiles"

import { formatted } from "spell/ui/tools/generatedFiles"

/** `src/components/`. */
const COMPONENTS = fileURLToPath(new URL("../src/components/", import.meta.url))

/** `src/docs-components/`:  the doc-only element families. */
const DOCS_COMPONENTS = fileURLToPath(new URL("../src/docs-components/", import.meta.url))

/** `<ui-root>`'s family folder. */
const ROOT_FAMILY = path.join(COMPONENTS, "ui-root")

/** The generated file. */
const OUTPUT = FamilyFiles.path(ROOT_FAMILY, ".catalog.ts")

/** The generated list of each tag's optional sheets. */
const SHEETS_OUTPUT = FamilyFiles.path(ROOT_FAMILY, ".sheets.ts")

/** `src/styles/`:  the optional sheets' CSS. */
const STYLES = fileURLToPath(new URL("../src/styles/", import.meta.url))

/** The module the generated file imports its types from:  the family's types file, without `.ts`. */
const TYPES_MODULE = `./${path.basename(FamilyFiles.path(ROOT_FAMILY, ".types.ts"), ".ts")}`

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
const entries = await RootCatalog.read([COMPONENTS, DOCS_COMPONENTS])
const lines = RootCatalog.lines(entries)
const catalog = `/* GENERATED -- do not edit, run \`yarn gen:root\` (source:  every \`UI<Name>.en.ts\`) */

import type { RootCatalogEntry } from "${TYPES_MODULE}"

/** Every component tag => what \`<ui-root>\` needs before its family loads. */
export const ROOT_CATALOG: Readonly<Record<string, RootCatalogEntry>> = {
${lines.join(",\n")}
}
`
const sheets = FamilySheetScan.module(
  entries,
  FamilySheetScan.read({ roots: [COMPONENTS, DOCS_COMPONENTS], styles: STYLES })
)
const stale = writeOrCheck(
  await formatted([
    [OUTPUT, catalog],
    [SHEETS_OUTPUT, sheets]
  ]),
  { command: "gen:root", isCheck: values.check }
)
if (!values.check) {
  for (const file of [OUTPUT, SHEETS_OUTPUT].map((each) => path.relative(process.cwd(), each))) {
    Terminal.out(stale.includes(file) ? `wrote ${file}` : `${file} unchanged`)
  }
  Terminal.out(`${lines.length} tags`)
}
