/// <reference types="node" />

import * as vite from "vite"
import { fileURLToPath } from "node:url"

import { SpikeMeasure, type ImportMap, type SpikeConfig } from "../shared/index.ts"
import { COMPONENTS, SHARED_ENTRIES, SOLID_EXTERNAL } from "./vite.config.ts"

/** Spike root, absolute. */
const ROOT = fileURLToPath(new URL("./", import.meta.url))

/**
 * How the shared tooling (`spike/shared/`) reads the Solid spike:  entries, externals, peer set, buckets.
 * - Two shared entries:  `core` (every family) and `forms` (families with a form VALUE:  dropdown).
 * - `groups`:
 *   - `solid-js`, `@solidjs/*`, the fork => `library`
 *   - the spike's `forms.ts`, `FormElement`, `FormHost`, and the foundation's `Validator` / `MenuOptions` =>
 *     `shared:forms`;  the rest of the spike's `src/*.ts(x)` => `core`
 *   - a family folder => its own classes;  the shared foundation by `SpikeMeasure.foundationBucket()` (which
 *     also sends `<name>.fallback.ts` to the family, as `fallback`)
 */
export const SPIKE: SpikeConfig = {
  name: "Solid",
  root: ROOT,
  vite,
  entries: Object.fromEntries(COMPONENTS.map((name) => [name, `src/components/${name}/index.ts`])),
  shared: [
    { name: "core", entry: SHARED_ENTRIES.core },
    { name: "forms", entry: SHARED_ENTRIES.forms, description: "form base, validation, menu options" }
  ],
  external: (id) => SOLID_EXTERNAL.test(id),
  peerEntry: "peers.ts",
  groups(id) {
    if (/\/node_modules\/(solid-js|@solidjs|@spell\/solid-element)\/|\/spike\/solid-element\//.test(id)) {
      return "library"
    }
    if (
      /\/spike\/solid\/src\/(forms|FormElement|FormHost)\.tsx?$|\/src\/elements\/(Validator|MenuOptions)\.ts$/.test(id)
    ) {
      return "shared:forms"
    }
    if (/\/spike\/solid\/src\/[\w.]+\.tsx?$/.test(id)) return "core"
    const family = /\/spike\/solid\/src\/components\/(\w+)\//.exec(id)?.[1]
    if (family) return `own:${family}:classes`
    return SpikeMeasure.foundationBucket(id) ?? "other"
  }
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
