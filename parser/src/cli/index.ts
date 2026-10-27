/**
 * Barrel for the language's `spell` commands (`spell-parser/cli`):  their flags' types and the `"language"` hook's.
 * - Types only, today:  the command list is `spell-parser/cli/commands`,
 *   and the commands' work is spell-app's, behind the hook (epic `repo-split` P13).
 */
export type * from "./cli.types"
