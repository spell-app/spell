/**
 * Bundle spell-epic's VS Code extension into `out/extension.js`, with spell-epic's checkout built in:
 * the kit's `buildExtension()`, which then LOADS the bundle once, `vscode` stubbed, so a crash as it loads fails the
 * build, here, rather than leaving every window's extension dead (epic `epic-engine` I76).
 * - `ENGINE_ROOT` is the spell-epic checkout this file sits in:  an INSTALLED copy (in VS Code's extensions folder)
 *   still knows whose `epic` command restarts the epic server.  Move the checkout and you must rebuild.
 * - Every repo's files by their package names (`spell/server`, `spell-epic/server/RepoList`;  epic `repo-split`
 *   P14), found as their source files by the kit's `sourceNames()`, which `buildExtension()` bundles with:
 *   esbuild alone finds neither a name without its extension nor a folder's `index.ts`.
 * - Its own settings for every file it bundles, `tsconfig.json`.
 */
import { resolve } from "node:path"

import { buildExtension } from "spell/toolchain/buildExtension"

const here = import.meta.dirname

await buildExtension({
  folder: here,
  external: ["vite-plus/fmt"],
  constants: { ENGINE_ROOT: resolve(here, "..") },
  tsconfig: "tsconfig.json",
  // the assembler's json5.ts loads json5-writer through `import.meta.url` ON FIRST WRITE:
  // the extension only reads JSON5 (the repo list), so the empty `import.meta` of a CommonJS bundle is never reached
  logOverride: { "empty-import-meta": "silent" }
})
