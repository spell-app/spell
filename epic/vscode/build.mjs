/**
 * Bundle spell-epic's VS Code extension into `out/extension.js`, with spell-epic's checkout built in.
 * - `ENGINE_ROOT` is the spell-epic checkout this file sits in:  an INSTALLED copy (in VS Code's extensions folder)
 *   still knows whose `epic` command restarts the epic server.  Move the checkout and you must rebuild.
 * - `esbuild` is spell-epic's own, found up the folder tree.
 * - `$/` imports resolve by the IMPORTING file's repo (`repoAliases`, epic `repo-split` I18):  the bundle takes in other
 *   repos' source (spell-server's `Guard.ts` imports `$/server/...`), and this folder's `tsconfig.json` has only
 *   spell-epic's table.
 */
import { aliasedFile } from "@spell-app/toolchain/aliases"
import { build } from "esbuild"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

/**
 * `$/name/...` through the alias table of the repo the importing file is in (`tsconfig.base.json`), as
 * `@spell-app/toolchain/aliases` does for node;  anything it can't place goes on to esbuild's own resolver.
 * @type {import("esbuild").Plugin}
 */
const repoAliases = {
  name: "repo-aliases",
  setup(builder) {
    builder.onResolve({ filter: /^\$\// }, ({ path, importer }) => {
      const file = importer ? aliasedFile(path, importer) : undefined
      return file ? { path: file } : undefined
    })
  }
}

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
  plugins: [repoAliases],
  define: { ENGINE_ROOT: JSON.stringify(resolve(here, "..")) },
  // the assembler's json5.ts loads json5-writer through `import.meta.url` ON FIRST WRITE:
  // the extension only reads JSON5 (the repo list), so the empty `import.meta` of a CommonJS bundle is never reached
  logOverride: { "empty-import-meta": "silent" },
  logLevel: "info"
})
