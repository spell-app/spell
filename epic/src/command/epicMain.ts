/**
 * `epic ...`:  the entry of the `epic` command, run by spell-epic's `bin/epic` (and, in spell-app, by its CLI's
 * `bin/epic.mjs` and `spell epic ...`).
 * - A thin entry:  the command itself is `EpicProgram`, which every verb runs in, without spell (epic `epic-eject` P5).
 * - NOT in the barrel:  importing it runs the command line.
 */
import { EpicProgram } from "./EpicProgram"

// `spell epic ...`:  the old spelling;  from here on, the command line reads as `epic ...`
if (process.argv[2] === "epic") process.argv.splice(2, 1)

await new EpicProgram().parse()
