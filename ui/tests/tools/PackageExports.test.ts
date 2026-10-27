import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

/**
 * `package.json`'s `exports`:  an explicit key for EVERY folder barrel (`src/<folder>/index.ts`), before `"./*"`
 * (epic `repo-split` P14).
 * - Why:  `tsx`, run from ANOTHER repo (through the `node_modules/spell-ui` link), finds a file without its extension
 *   but not a folder's `index`;  so `spell-ui/property` needs its own key, where `spell-ui/property/PropertyEditorPages`
 *   doesn't.
 * - The package's own barrel, `src/index.ts`, is `"."`.
 * - A new family (`src/components/ui-<name>/`) or folder adds its key.
 */

/** spell-ui's root:  this file is in `tests/tools/`. */
const ROOT = fileURLToPath(new URL("../../", import.meta.url))

/** Folders whose `index.ts` no other code imports as a folder:  page scripts and test data. */
const NOT_BARRELS = /\/(templates|fixtures|examples|demo)\//

describe("package.json exports", () => {
  test("every folder barrel has its own key, pointing at its index.ts", () => {
    const exports = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).exports as Record<string, unknown>
    const barrels = (readdirSync(join(ROOT, "src"), { recursive: true }) as string[])
      .map((path) => relative(ROOT, join(ROOT, "src", path)))
      .filter((path) => path.endsWith("/index.ts") && path !== "src/index.ts" && !NOT_BARRELS.test(`/${path}`))
    const missing = barrels.filter((barrel) => {
      const key = `./${barrel.slice("src/".length, -"/index.ts".length)}`
      return (exports[key] as { default?: string } | undefined)?.default !== `./${barrel}`
    })
    expect(missing).toEqual([])
  })
})
