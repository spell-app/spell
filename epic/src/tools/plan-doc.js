/**
 * MOVED:  the `epic` tool is TypeScript in `src/tool/` (epic `epic-components`, P7),
 * which `epic <verb>` runs in its own process (`EpicTools.planDoc()`).
 * This file forwards:
 * - its API, for old imports (`shared.test.js`, other tools):
 *   - `PlanDoc` and its types
 *   - the files and git (`PlanDocFiles`;  `sharedDocLog()` as before)
 *   - the command line (`PlanDocCommands`)
 * - its command line, for callers that still run THIS file:
 *   `yarn plan-doc` in `spell-epic`, `epic worktree` reading summaries, a checkout on older code
 *   - under `tsx`, with this package's `tsconfig.json` for the aliases
 */

import { PlanDocCommands } from "spell-epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"

export * from "spell-epic/tool/planDoc.types"
export { PlanDoc } from "spell-epic/tool/PlanDoc"
export { PlanDocCommands } from "spell-epic/tool/PlanDocCommands"
export { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"

/** `PlanDocFiles.sharedDocLog()`:  a shared doc's commits, from `checkout`'s history (`shared.test.js`). */
export const sharedDocLog = PlanDocFiles.sharedDocLog

if (import.meta.main) {
  process.exitCode = await new PlanDocCommands().run(process.argv.slice(2))
}
