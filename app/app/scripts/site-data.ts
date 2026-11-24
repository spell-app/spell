/**
 * `yarn site:data [--check]`:  the data of App UI's guide, `app/docs/__data/components.json5`,
 * from `app/docs/__data/pages.json5` (hand-kept), the web components' vocabularies and the Solid components' source
 * (`AppUIDataBuilder`, in `src/app/tools/`).
 * - The guide's pages read it (`<ui-docs-api>`'s tables), as they are:  COMMITTED.
 * - Rerun it after changing a documented component's banner, props or uses, a vocabulary, or `pages.json5`;
 *   `tests/app/tools/AppUIDataBuilder.test.ts` fails while it's stale.
 * - Written through the kit's `writeOrCheck()`:  only what changed, keeping the comments in a `.json5` file.
 * - `--check`:  write nothing;  exit 1 if a file would change.
 */
import { parseArgs } from "node:util"

import { writeOrCheck } from "spell/element-tools/generatedFiles"
import { Terminal } from "spell/element-tools/Terminal"
import { SiteDataBuilder } from "spell/ui/tools/SiteDataBuilder"

import { AppUIDataBuilder } from "spell/app/app/tools/AppUIDataBuilder"

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
const builder = new AppUIDataBuilder()
const data = await builder.build()
const stale = writeOrCheck(
  [[builder.dataFile, SiteDataBuilder.stringify(data)]],
  { command: "site:data", isCheck: values.check }
)
const names = stale.join(", ")
Terminal.out(
  `app site data:  ${data.components.length} tags on ${Object.keys(data.families).length} pages, ` +
    `${data.topics.length} groups;  ${stale.length ? (values.check ? "stale" : "wrote") + ` ${names}` : "unchanged"}`
)
