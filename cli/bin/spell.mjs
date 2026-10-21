#!/usr/bin/env node
/**
 * The `spell` command:  runs the kit's `cli/src/main.ts` from THIS checkout, through `tsx` -- no build step.
 * - `tsx` gets the kit's `cli/tsconfig.json` explicitly, so its settings hold from ANY current folder,
 *   while relative paths on the command line still resolve against the caller's.
 *   - `tsx` takes ONE tsconfig for every file it runs:  the settings every repo's commands need are in it (JSX for
 *     spell-app's terminal screens, Ink's).
 * - `$/` imports go by the importing file's own repo (`spell-kit/toolchain/aliases`, epic `repo-split` I12):
 *   `spell` runs every installed repo's source (spell-lang's, spell-app's ...), each with its own alias table.
 * - Every repo's commands:  `main.ts` reads each one's list (`"spell": { "commands" }` in its `package.json`).
 * - Install on your `PATH` with `yarn cli:install`, at the kit's root -- see `cli/scripts/install-cli.mjs`.
 * - NOTE: a symlink to this file works:  node runs the real path, so `import.meta.url` is in the kit.
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { register } from "tsx/esm/api"

/** The kit's `cli/` folder. */
const cliRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
register({ tsconfig: resolve(cliRoot, "tsconfig.json") })
// then every `$/` import by its OWN repo's alias table
await import("spell-kit/toolchain/aliases")
await import(pathToFileURL(resolve(cliRoot, "src/main.ts")).href)
