/// <reference types="node" />

import { fileURLToPath } from "node:url"

import type { Bucket, ImportMap, PackageConfig } from "./tools.types.ts"
import { COMPONENTS, ENTRIES, SHARED_ENTRIES, SOLID_EXTERNAL } from "spell-ui/vite.config.ts"
import { VocabularyFiles } from "spell/element-tools/VocabularyFiles"

/** Repo root, absolute, with a trailing slash. */
const ROOT = fileURLToPath(new URL("../../", import.meta.url))

/**
 * Lib entries measured for their effect on the others' chunks, not as tiers (`PackageConfig.extra`).
 * - `styles` too, so the checks see its chunk:  code there once split Rolldown's helpers into a
 *   `rolldown-runtime-<hash>.js` that only a real `yarn build` wrote (epic `wwod-spell-ui`, I13).
 */
const EXTRA_ENTRIES = { api: ENTRIES.api!, styles: ENTRIES.styles! }

/**
 * How the tooling reads `spell-ui`:  entries, externals, peer set, buckets.
 * - Two shared entries:  `core` (every family) and `forms` (families with a form VALUE:  dropdown, input, checkbox, form).
 * - `groups` (`bucket()`):
 *   - `solid-js`, `@solidjs/*` => `library`
 *   - `forms.ts`, `FormComponent`, `DOMFormControl`, `Validator`, `MenuOptions`, `HighlightedOption`, `ControlLabels`
 *     (+ `LabelWatch`, `PopoverPanel`) =>
 *     `shared:forms`
 *   - a family folder => its own classes / sheet / vocabulary / fallback
 *     (`SkeletonText`, which no page loads, is the kit's since epic `repo-split` P10)
 *   - `api.ts` and the two barrels it namespaces (`E`, `V`) => `extra:api`:  only `api.js` holds them
 *   - `src/styles/` (the foundation sheets as text, the style vocabulary) => `extra:styles`:
 *     only `styles.js` holds them
 *   - lazy tiers:
 *     - runtime services + the theme sheets (`styles/themes/`, loaded by `UI.themes`) => `runtime`
 *     - icon name / alias maps => `icons`
 *     - `data`:
 *       - a family's lazily imported data (`components/ui-<family>/data/`, the emoji chunks)
 *       - the Temporal polyfill (`temporal-polyfill`, loaded only where the browser lacks `Temporal`)
 *       - the source elements' engines' libraries (highlight.js, marked, DOMPurify), loaded on first use
 *       - a language's names (`components.es.ts`, each tag's `UI<Name>.es.ts`), loaded by a page in that language
 *   - `src/docs-components/` (the doc-only `<ui-docs-*>` families) => `docs`:  never in the lib build, which a check
 *     flags (`docsBundled`);  only the docs site's bundle adds them (`DocsFamilies`)
 *   - any other `src/` module (incl. `\0` virtual helpers) => `core`
 */
export const PACKAGE: PackageConfig = {
  name: "spell-ui",
  root: ROOT,
  entries: Object.fromEntries(COMPONENTS.map((name) => [name, `src/components/${name}/index.ts`])),
  shared: [
    { name: "core", entry: SHARED_ENTRIES.core },
    { name: "forms", entry: SHARED_ENTRIES.forms, description: "form base, validation, menu options" }
  ],
  extra: EXTRA_ENTRIES,
  external: (id) => SOLID_EXTERNAL.test(id),
  peerEntry: "src/tools/peers.ts",
  groups: bucket,
  results: "results"
}

/**
 * Import map entries for `dist/` (the vendored Solid ones come from `vendor/importmap.json`).
 * - `spell-ui` ~== every family (`dist/index.js`);  `spell-ui/ui-<family>` one family;
 *   `spell-ui/core`, `spell-ui/forms`;  `spell-ui/api` the `E` / `V` namespaces.
 */
export const DIST_IMPORTS: ImportMap["imports"] = {
  "spell-ui": "/dist/index.js",
  "spell-ui/core": "/dist/core.js",
  "spell-ui/forms": "/dist/forms.js",
  "spell-ui/api": "/dist/api.js",
  ...Object.fromEntries(COMPONENTS.map((name) => [`spell-ui/${name}`, `/dist/${name}.js`]))
}

/** Bucket of one module id (`PACKAGE.groups`). */
function bucket(id: string): Bucket {
  if (id.startsWith("\0")) return "core"
  // `runtime.types.ts` reads `version` from it;  the bundler inlines the one string into `core`
  if (id === `${ROOT}package.json`) return "core"
  if (/\/node_modules\/(solid-js|@solidjs)\//.test(id)) {
    return "library"
  }
  if (/\/node_modules\/(temporal-(polyfill|utils)|highlight\.js|marked|dompurify)\//.test(id)) return "data"
  // a path under a `src/`:  Spell UI's (its families in `src/components/`) or the kit's
  const file = id.split("?")[0]!
  const src = /\/src\/(.+)$/.exec(file)?.[1]
  if (!src) return "other"
  if (
    /^(forms\.ts|elements\/(FormComponent|DOMFormControl|Validator|MenuOptions|HighlightedOption|ControlLabels|LabelWatch|PopoverPanel)\.ts)$/.test(
      src
    )
  )
    return "shared:forms"
  if (/^(api\.ts|elements\/index\.ts|vocabulary\/vocabulary\.api\.ts)$/.test(src)) return "extra:api"
  if (/^components\/[\w-]+\/data\//.test(src)) return "data"
  if (src.startsWith("docs-components/")) return "docs"
  // a language's names (`components.es.ts`, each tag's `UI<Name>.es.ts`):  a lazy chunk only its pages load
  if (/^components\/components\.[a-z]{2}\.ts$/.test(src)) return "data"
  const language = VocabularyFiles.languageOf(src.split("/").pop()!)
  if (src.startsWith("components/") && language && language !== "en") return "data"
  const component = /^components\/([\w-]+)\/([\w.-]+)$/.exec(src)
  if (component) {
    const [, family, file] = component as unknown as [string, string, string]
    if (file.endsWith(".css")) return `own:${family}:css`
    if (VocabularyFiles.languageOf(file)) return `own:${family}:vocabulary`
    if (file.endsWith(".fallback.ts")) return `own:${family}:fallback`
    return `own:${family}:classes`
  }
  if (src.startsWith("icons/data/") || src.startsWith("icons/icon-packs/")) return "icons"
  if (src.startsWith("runtime/") && !/^runtime\/(load|runtime\.types)\.ts$/.test(src)) return "runtime"
  if (src.startsWith("styles/themes/")) return "runtime"
  if (src.startsWith("styles/")) return "extra:styles"
  return "core"
}
