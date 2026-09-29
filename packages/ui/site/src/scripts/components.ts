/**
 * Auto-loader for live examples:  imports the component module for every undefined `ui-*` tag on the page.
 * - Why:  MDX treats `<script>` as JSX (it is NOT bundled like an `.astro` script), so an MDX page can't
 *   import a component client-side on its own.  This makes every page "just work":  write `<ui-button>` in
 *   an example and `$/components/button/button.ts` loads, on the pages that use it only.
 * - Convention:  `ui-<name>` lives in `src/components/<name>/<name>.ts` (see `AGENTS.md`).  A module that
 *   defines several tags (`ui-dropdown` + `ui-option`) covers the others by being imported for its main one.
 * - Imports source through the `$` alias, so the site always shows the working tree, not a build.
 */
const MODULES = import.meta.glob(["$/components/*/*.ts", "!$/components/**/*.test.ts", "!$/components/**/*.*.ts"])

/** `ui-<name>` -> loader for `src/components/<name>/<name>.ts`. */
const LOADERS = new Map<string, () => Promise<unknown>>()
for (const [path, load] of Object.entries(MODULES)) {
  const match = /\/components\/([^/]+)\/\1\.ts$/.exec(path)
  if (match) LOADERS.set(`ui-${match[1]}`, load)
}

/**
 * Import the module for each distinct undefined `ui-*` tag under `root`.
 * - Tags with no module (not built yet, or defined by another tag's module) are skipped silently.
 * - Resolves when every import has settled;  a failing module is logged, not thrown, so one broken
 *   component can't take the rest of the page down.
 */
export async function loadComponents(root: ParentNode = document): Promise<void> {
  const tags = new Set<string>()
  for (const el of root.querySelectorAll(":not(:defined)")) {
    if (el.localName.startsWith("ui-")) tags.add(el.localName)
  }
  const pending = [...tags].flatMap((tag) => LOADERS.get(tag) ?? [])
  const results = await Promise.allSettled(pending.map((load) => load()))
  for (const result of results) {
    if (result.status === "rejected") console.error("[site] component failed to load", result.reason)
  }
}
