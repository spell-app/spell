/// <reference types="node" />

import * as vite from "vite"
import { fileURLToPath } from "node:url"

import { SpikeMeasure, type ImportMap, type SpikeConfig } from "../shared/index.ts"
import { COMPONENTS, LIT_EXTERNAL, SHARED_ENTRIES } from "./vite.config.ts"

/** Spike root, absolute. */
const ROOT = fileURLToPath(new URL("./", import.meta.url))

/**
 * How the shared tooling (`spike/shared/`) reads the Lit spike:  entries, externals, peer set, buckets.
 * - Two shared entries:  `core` (every family) and `forms` (families with a form VALUE:  dropdown).
 * - `groups`:
 *   - `lit` => `library`
 *   - the spike's `forms.ts` + `elements/FormElement.ts`, and the foundation's `Validator` / `MenuOptions` =>
 *     `shared:forms`;  the rest of the spike's `src/elements/` + `src/core.ts` => `core`
 *   - a family folder => its own classes;  the shared foundation by `SpikeMeasure.foundationBucket()` (which
 *     also sends `<name>.fallback.ts` to the family, as `fallback`)
 */
export const SPIKE: SpikeConfig = {
  name: "Lit",
  root: ROOT,
  vite,
  entries: Object.fromEntries(COMPONENTS.map((name) => [name, `src/components/${name}/index.ts`])),
  shared: [
    { name: "core", entry: SHARED_ENTRIES.core },
    { name: "forms", entry: SHARED_ENTRIES.forms, description: "form base, validation, menu options" }
  ],
  external: (id) => LIT_EXTERNAL.test(id),
  peerEntry: "peers.ts",
  groups(id) {
    if (/\/node_modules\/(lit|lit-html|lit-element|@lit)\//.test(id)) return "library"
    if (
      /\/spike\/lit\/src\/(forms|elements\/FormElement)\.ts$|\/src\/elements\/(Validator|MenuOptions)\.ts$/.test(id)
    ) {
      return "shared:forms"
    }
    if (/\/spike\/lit\/src\/(elements\/|core\.ts$)/.test(id)) return "core"
    const family = /\/spike\/lit\/src\/components\/(\w+)\//.exec(id)?.[1]
    if (family) return `own:${family}:classes`
    return SpikeMeasure.foundationBucket(id) ?? "other"
  }
}

/**
 * Import map entries for `dist/` (the vendored `lit` ones come from `vendor/importmap.json`).
 * - `@spell/ui` ~== every family (`dist/index.js`);  `@spell/ui/<family>` one family;  `@spell/ui/core`,
 *   `@spell/ui/forms`.
 */
export const DIST_IMPORTS: ImportMap["imports"] = {
  "@spell/ui": "/dist/index.js",
  "@spell/ui/core": "/dist/core.js",
  "@spell/ui/forms": "/dist/forms.js",
  ...Object.fromEntries(COMPONENTS.map((name) => [`@spell/ui/${name}`, `/dist/${name}.js`]))
}
