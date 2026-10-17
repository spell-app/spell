/**
 * Bundle spell-epic's VS Code extension into `out/extension.js`, with spell-epic's checkout built in.
 * - `ENGINE_ROOT` is the spell-epic checkout this file sits in:  an INSTALLED copy (in VS Code's extensions folder)
 *   still knows whose `epic` command restarts the epic server.  Move the checkout and you must rebuild.
 * - `esbuild` is spell-epic's own, found up the folder tree;  the alias table (`$/epics/...`, `$/server`) is the
 *   root's `tsconfig.base.json`, through this folder's `tsconfig.json`.
 */
import { build } from "esbuild"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [resolve(here, "src/extension.ts")],
  outfile: resolve(here, "out/extension.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  sourcemap: true,
  tsconfig: resolve(here, "tsconfig.json"),
  define: { ENGINE_ROOT: JSON.stringify(resolve(here, "..")) },
  // the assembler's json5.ts loads json5-writer through `import.meta.url` ON FIRST WRITE:  the extension only reads
  // JSON5 (the repo list), so the empty `import.meta` of a CommonJS bundle is never reached
  logOverride: { "empty-import-meta": "silent" },
  logLevel: "info"
})
