/**
 * MOVED:  an epic page in parts (a skeleton plus `parts/<id>.html`) is `PlanParts`, `spell/epic/tool/PlanParts` (epic
 * `epic-components`, P7:  the `epic` tool is TypeScript in `spell-epic`).  This forwards, for old imports.
 * - NOTE:  the API is the class's statics now (`PlanParts.partFile()` ...), not the old free functions;  splitting
 *   and assembling a doc in the new markup is `spell/epic/tool/EpicParts` (P8;  moved from `spell/epic/convert`, I5)
 */
export { PART_EXT, PARTS_DIR, PlanParts } from "spell/epic/tool/PlanParts"
