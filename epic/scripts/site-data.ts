/**
 * `yarn site:data [--check]`:  Epic UI's data, `src/docs/__data/components.json5` and `search.json5`,
 * from the epics pack's definitions and the set's pages (`EpicUISite`;  epic `epic-workflow` P10).
 * - Written through the kit's `writeOrCheck()`:  only what changed, keeping the comments in a `.json5` file.
 * - `--check`:  write nothing;  exit 1 while either file is stale (`EpicUISite.test.ts` checks the same)
 * - Rerun after adding or changing an element, or a page's sections;  commit what it writes.
 */
import { join } from "node:path"

import { writeOrCheck } from "spell/element-tools/generatedFiles"
import { Terminal } from "spell/element-tools/Terminal"
import { EpicUISite } from "spell-epic/site/EpicUISite"

const site = new EpicUISite()
const isCheck = process.argv.includes("--check")
const outputs = Object.entries(site.files()).map(([name, text]): [string, string] => [
  join(site.folder, "__data", name),
  text
])
const stale = writeOrCheck(outputs, { command: "site:data", isCheck })
Terminal.out(
  `Epic UI's data:  ${stale.length ? `${stale.length} file${stale.length === 1 ? "" : "s"} ${isCheck ? "stale" : "written"}` : "current"}`
)
