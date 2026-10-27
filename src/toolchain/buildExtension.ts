import Module, { createRequire } from "node:module"
import { resolve } from "node:path"

import { build, type LogLevel } from "esbuild"

import { sourceNames } from "./sourceNames.ts"

/****************
 * ### `buildExtension()`
 * Bundle the VS Code extension in `folder`, its `src/extension.ts` into `out/extension.js`, then LOAD the bundle once,
 * as VS Code would:  a crash as it loads fails the build, here, rather than every window's extension.
 *
 * ```js
 * // an extension's `build.mjs`, which keeps its own steps around this one
 * await buildExtension({ folder: import.meta.dirname, constants: { ENGINE_ROOT: resolve(import.meta.dirname, "..") } })
 * ```
 *
 * - The bundle:  CommonJS for node 20 (VS Code's extension host), `vscode` left out (VS Code hands it in), with source
 *   maps;  every import a package name, found as its source file (`sourceNames()`)
 * - The load check:  the bundle `require()`d with `vscode` a stub that answers every property with itself, so it never
 *   touches a real VS Code;  `activate()` isn't run (`loadOnce()`)
 *   - it catches what runs as a file loads:  a class's static fields, top-level constants
 *   - why:  `EpicConfig.ENGINE_VOICES` read `import.meta.dirname`, empty in a CommonJS bundle, and spell-epic's
 *     extension failed to start in every window (epic `epic-engine` I76)
 * - Its users:  spell-app's language extension and spell-epic's side bar, each `vscode/build.mjs`
 * - Throws what esbuild throws, or what the bundle throws as it loads.
 * - SIDE EFFECT:  writes `out/extension.js` and its map;  prints esbuild's summary and the check's line
 * - Node's modules, esbuild and `sourceNames()` only:  plain `node` runs it from a `build.mjs`, types stripped.
 ****************/
export async function buildExtension({
  folder,
  external = [],
  constants = {},
  tsconfig,
  logOverride
}: ExtensionBuild): Promise<void> {
  const outfile = resolve(folder, "out", "extension.js")
  await build({
    entryPoints: [resolve(folder, "src", "extension.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    external: ["vscode", ...external],
    sourcemap: true,
    tsconfig: tsconfig ? resolve(folder, tsconfig) : undefined,
    plugins: [sourceNames()],
    define: Object.fromEntries(Object.entries(constants).map(([name, value]) => [name, JSON.stringify(value)])),
    logOverride,
    logLevel: "info"
  })
  loadOnce(outfile)
  console.log("  loaded once:  no error as it loads")
}

/** What `buildExtension()` builds, and how. */
export type ExtensionBuild = {
  /** the extension's folder:  its `src/extension.ts` is bundled into its `out/extension.js` */
  folder: string
  /** packages left out of the bundle besides `vscode`, e.g. `vite-plus/fmt` */
  external?: string[]
  /** names the bundle reads as constants, each built in as its value:  `{ ENGINE_ROOT: "/Users/me/spell-epic" }` */
  constants?: Record<string, string | number | boolean>
  /** ONE tsconfig for every file bundled, from `folder` (esbuild's `tsconfig`);  none:  each file's nearest */
  tsconfig?: string
  /** esbuild's messages to quiet or raise, by id (esbuild's `logOverride`):  `{ "empty-import-meta": "silent" }` */
  logOverride?: Record<string, LogLevel>
}

/**
 * Load the built extension `file` as VS Code would, `require()` with `vscode` a stub, and throw what it throws.
 * - the stub answers every property with itself, but `then`:  nothing takes it for a promise
 *   - and through its prototype too:  an `import * as vscode` reads it through esbuild's wrapper (`__toESM()`), an
 *     object made on the stub's prototype, holding none of its properties
 * - node's own loader, `Module._load`, is put back however the load ends
 */
function loadOnce(file: string): void {
  const answers: ProxyHandler<object> = { get: (_target, key) => (key === "then" ? undefined : stub) }
  const wrapped = new Proxy({}, answers)
  const stub: object = new Proxy(function vscode() {}, { ...answers, getPrototypeOf: () => wrapped })
  // `_load` is node's, and not in its types:  every `require()` goes through it
  const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown }
  const load = loader._load
  loader._load = (request, ...rest) => (request === "vscode" ? stub : load(request, ...rest))
  try {
    createRequire(file)(file)
  } finally {
    loader._load = load
  }
}
