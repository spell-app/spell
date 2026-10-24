/**
 * `spell-types`'s entry:  runs `Declarations.main()` on this process's arguments when imported.
 * - The checkout's bin (`bin/spell-types.ts`, node with types stripped) imports it, and so does the published bin
 *   (`spell publish` writes it), which imports its build.
 */
import { Declarations } from "./declarations.ts"

process.exitCode = Declarations.main(process.argv.slice(2))
