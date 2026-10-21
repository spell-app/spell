/**
 * `epic ...`:  the entry of the `epic` command, run by spell-epic's `bin/epic`.
 * - A thin entry:  the command itself is `EpicProgram`, which every verb runs in, without spell (epic `epic-eject` P5).
 * - NOT in the barrel:  importing it runs the command line.
 */
import { EpicProgram } from "./EpicProgram"

await new EpicProgram().parse()
