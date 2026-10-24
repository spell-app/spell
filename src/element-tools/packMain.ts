/**
 * `spell-pack`'s entry:  runs `ComponentPack.main()` on this process's arguments when imported.
 * - The checkout's bin (`bin/spell-pack.mjs`, through `tsx`) imports it, and so does the published bin
 *   (`spell publish` writes it), which imports its build.
 */
import { ComponentPack } from "./ComponentPack.ts"

process.exitCode = await ComponentPack.main(process.argv.slice(2))
