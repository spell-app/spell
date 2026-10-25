/**
 * `yarn site:data [--check]`:  write the Spell UI site's data, and what editors read about its elements.
 * - The site's data, in `docs/__data/` (`SiteDataBuilder`):
 *   - `components.json5`
 *   - `icons.json5`:  the icon browser's search terms
 *   - `search.json5`:  every page's sections, for `<ui-docs-search>`, read from the pages beside it
 *   - and `pages.json5`, kept complete
 * - From the same data, the editors' element descriptions (`ElementManifests`):
 *   - `custom-elements.json`:  a Custom Elements Manifest
 *   - `html-custom-data.json`:  VS Code's `html.customData`
 *   - `css-custom-data.json`:  its `css.customData`
 *   - and the JSX types of every `<ui-*>` tag, `src/jsx.ts` (`spell-ui/jsx`)
 * - All COMMITTED:  the docs pages fetch them as they are, with no build step.
 *   - Rerun after changing a vocabulary, a family's sheet (its tokens), `pages.json5` or a page's sections.
 *   - `tests/tools/SiteDataBuilder.test.ts` fails while they're stale.
 * - `--check`:  write nothing;  exit 1 (saying which) if any file would change.
 * - JSON5 (epic `epic-workflow` P20):  a comment written by hand into one of the `.json5` files stays when it's
 *   rewritten (`writeOrCheck()`, through the kit server's `keepingCommentsIn()`).
 * - Formatting:  `JSON.stringify(..., 2)`:
 *   oxfmt skips every set's `docs/__data/` (`vite.lint.ts`), so the bytes stay ours.
 *   - `src/jsx.ts` is formatted as `yarn format` would, in memory, as it's written.
 */
import path from "node:path"
import { parseArgs } from "node:util"

import { kb } from "spell/util/number"
import { ElementManifests } from "spell-ui/tools/ElementManifests"
import { SiteDataBuilder } from "spell-ui/tools/SiteDataBuilder"
import { Terminal } from "spell/element-tools/Terminal"

import { type GeneratedOutput, writeOrCheck } from "spell-ui/tools/generatedFiles"

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
const builder = new SiteDataBuilder()
const { data, pages } = await builder.build()
const manifests = new ElementManifests({ data, packageFolder: builder.root })
const outputs: GeneratedOutput[] = [
  [builder.dataFile, SiteDataBuilder.stringify(data)],
  [builder.pagesFile, SiteDataBuilder.stringify(pages)],
  [builder.iconsFile, builder.iconsText()],
  [builder.searchFile, builder.searchText()],
  ...manifests.outputs(builder.dataFolder),
  await manifests.jsxOutput()
]

const stale = writeOrCheck(outputs, { command: "site:data", isCheck: values.check })
if (!values.check) {
  const size = kb(Buffer.byteLength(outputs[0]![1]))
  Terminal.out(
    `site data:  ${data.components.length} component tags + ${data.docs.length} docs tags, ` +
      `${Object.keys(data.families).length} families, ${size};  ` +
      (stale.length ? `wrote ${stale.map((file) => path.basename(file)).join(", ")}` : "unchanged")
  )
}
