#!/usr/bin/env node
/**
 * The `spell` command:  runs the kit's `src/cli/main.ts` from THIS checkout, through `tsx` -- no build step.
 * - `tsx` gets the kit's node settings explicitly, so they hold from ANY current folder,
 *   while relative paths on the command line still resolve against the caller's.
 *   - `tsx` takes ONE tsconfig for every file it runs:  the settings every repo's commands need are in it (JSX for
 *     spell-app's terminal screens, Ink's).
 *   - It's `tsconfig.tsx.json`, not `tsconfig.node.json` itself:  `tsx` applies a tsconfig only to the files it
 *     includes, and that one includes only the kit's folders (epic `repo-split` I69).
 * - It runs every installed repo's source (spell-lang's, spell-app's ...), each file imported by its package name
 *   (epic `repo-split` P14):  no alias hook.
 * - Every repo's commands:  `main.ts` reads each one's list (`"spell": { "commands" }` in its `package.json`).
 * - Install on your `PATH` with `yarn cli:install`, at the kit's root -- see `scripts/install-cli.mjs`.
 * - NOTE: a symlink to this file works:  node runs the real path, so `import.meta.url` is in the kit.
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { register } from "tsx/esm/api"

/** The kit's root:  this file is in its `bin/`. */
const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
register({ tsconfig: resolve(kitRoot, "tsconfig.tsx.json") })
await import(pathToFileURL(resolve(kitRoot, "src/cli/main.ts")).href)
