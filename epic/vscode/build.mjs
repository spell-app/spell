/**
 * Bundle spell-epic's VS Code extension into `out/extension.js`, with spell-epic's checkout built in.
 * - `ENGINE_ROOT` is the spell-epic checkout this file sits in:  an INSTALLED copy (in VS Code's extensions folder)
 *   still knows whose `epic` command restarts the epic server.  Move the checkout and you must rebuild.
 * - `esbuild` is spell-epic's own, found up the folder tree.
 * - Every repo's files by their package names (`spell-kit/server`, `spell-epic/server/RepoList`;  epic `repo-split`
 *   P14), found as their source files by the kit's `sourceNames()`:  esbuild alone finds neither a name without its extension
 *   nor a folder's `index.ts`.
 */
import { build } from "esbuild"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { sourceNames } from "spell-kit/toolchain/sourceNames"

const here = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [resolve(here, "src/extension.ts")],
  outfile: resolve(here, "out/extension.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode", "vite-plus/fmt"],
  sourcemap: true,
  tsconfig: resolve(here, "tsconfig.json"),
  plugins: [sourceNames()],
  define: { ENGINE_ROOT: JSON.stringify(resolve(here, "..")) },
  // the assembler's json5.ts loads json5-writer through `import.meta.url` ON FIRST WRITE:
  // the extension only reads JSON5 (the repo list), so the empty `import.meta` of a CommonJS bundle is never reached
  logOverride: { "empty-import-meta": "silent" },
  logLevel: "info"
})
