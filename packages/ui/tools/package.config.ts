/// <reference types="node" />

import { fileURLToPath } from "node:url"

import type { Bucket, ImportMap, PackageConfig } from "./tools.types.ts"
import { COMPONENTS, SHARED_ENTRIES, SOLID_EXTERNAL } from "../vite.config.ts"

/** Repo root, absolute, with a trailing slash. */
const ROOT = fileURLToPath(new URL("../", import.meta.url))

/**
 * How the tooling reads `@spell/ui`:  entries, externals, peer set, buckets.
 * - Two shared entries:  `core` (every family) and `forms` (families with a form VALUE:  dropdown).
 * - `groups` (`bucket()`):
 *   - `solid-js`, `@solidjs/*`, the fork => `library`
 *   - `forms.ts`, `FormElement`, `FormHost`, `Validator`, `MenuOptions` => `shared:forms`
 *   - a family folder => its own classes / sheet / vocabulary / fallback
 *   - lazy tiers:  runtime services + foundation sheets => `runtime`;  icon name / alias maps => `icons`
 *   - any other `src/` module (incl. `\0` virtual helpers) => `core`
 */
export const PACKAGE: PackageConfig = {
  name: "@spell/ui",
  root: ROOT,
  entries: Object.fromEntries(COMPONENTS.map((name) => [name, `src/components/${name}/index.ts`])),
  shared: [
    { name: "core", entry: SHARED_ENTRIES.core },
    { name: "forms", entry: SHARED_ENTRIES.forms, description: "form base, validation, menu options" }
  ],
  external: (id) => SOLID_EXTERNAL.test(id),
  peerEntry: "tools/peers.ts",
  groups: bucket,
  results: "tools/results"
}

/**
 * Import map entries for `dist/` (the vendored Solid ones come from `vendor/importmap.json`).
 * - `@spell/ui` ~== every family (`dist/index.js`);  `@spell/ui/<family>` one family;  `@spell/ui/core`,
 *   `@spell/ui/forms`.
 */
export const DIST_IMPORTS: ImportMap["imports"] = {
  "@spell/ui": "/dist/index.js",
  "@spell/ui/core": "/dist/core.js",
  "@spell/ui/forms": "/dist/forms.js",
  ...Object.fromEntries(COMPONENTS.map((name) => [`@spell/ui/${name}`, `/dist/${name}.js`]))
}

/** Bucket of one module id (`PACKAGE.groups`). */
function bucket(id: string): Bucket {
  if (id.startsWith("\0")) return "core"
  if (/\/node_modules\/(solid-js|@solidjs|@spell\/solid-element)\/|\/packages\/solid-element\//.test(id)) {
    return "library"
  }
  const src = /\/src\/(.+)$/.exec(id.split("?")[0]!)?.[1]
  if (!src) return "other"
  if (/^(forms\.ts|elements\/(FormElement|FormHost|Validator|MenuOptions)\.ts)$/.test(src)) return "shared:forms"
  const component = /^components\/([\w-]+)\/([\w.-]+)$/.exec(src)
  if (component) {
    const [, family, file] = component as unknown as [string, string, string]
    if (file.endsWith(".css")) return `own:${family}:css`
    if (/\.vocabulary\.\w+\.ts$/.test(file)) return `own:${family}:vocabulary`
    if (file.endsWith(".fallback.ts")) return `own:${family}:fallback`
    return `own:${family}:classes`
  }
  if (src.startsWith("icons/data/") || src.startsWith("icons/glyphs/")) return "icons"
  if (src.startsWith("runtime/") && !/^runtime\/(load|runtime\.types)\.ts$/.test(src)) return "runtime"
  if (src.startsWith("styles/")) return "runtime"
  return "core"
}
