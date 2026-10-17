import { realpathSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { defineConfig, type TestProjectConfiguration, type UserConfig } from "vite-plus"
import { playwright } from "vite-plus/test/browser-playwright"

/**
 * Spell UI's own config, from spell-app's `ui` package, in the spell-app checkout spell-epic uses (`.spell-app`, the
 * root's link);  by its file:  the package's `exports` don't list it.
 * - HACK: its path in a constant, so `tsc` doesn't follow it:  type-checked here, `ui`'s config meets ITS checkout's
 *   copy of vite's types beside spell-epic's, and comparing the two runs out of stack ("Excessive stack depth
 *   comparing types 'Plugin<any>'").  Spell-app checks that file itself.
 */
const UI_CONFIG = pathToFileURL(resolve(import.meta.dirname, "../../.spell-app/packages/ui/vite.config.ts")).href
const { baseConfig } = (await import(UI_CONFIG)) as { baseConfig: () => UserConfig }

/**
 * vitest config for `@spell-app/epics`, a component pack (`spell dev pack`):  two projects.
 * - `node` -- `src/**`:  the pack's own checks, `pack.test.ts` among them (`spell dev pack check epics`:  `components/__pack/`
 *   is current);  and `tools/**`, the docs tools' own tests
 * - `browser` -- `components/**`:  the `<epic-*>` elements, in a REAL browser (Vitest browser mode + Playwright,
 *   chromium), as Spell UI's are.  `baseConfig()`:  Spell UI's plugins (decorators BEFORE Solid), Solid dedupe,
 *   Lightning CSS;  Spell UI's test helpers come from `$/ui/test/...`
 * - `prefix` / `root`:  the repo root's `vitest.config.ts` lists these as `epics:node` / `epics:browser`, `root`
 *   set to this package, since vitest doesn't nest `projects`.  Own run:  no prefix, `root` is this folder.
 */
/** The tests live in the repo's tests/ folder, at the same paths as the code. */
const TESTS = resolve(import.meta.dirname, "../../tests/epics")

/** spell-epic's root. */
const REPO = resolve(import.meta.dirname, "../..")

/** The spell-app checkout spell-epic uses, by its real path:  the root's link `.spell-app`. */
const SPELL_APP = realpathSync(resolve(REPO, ".spell-app"))

export function epicsProjects({
  prefix = "",
  root
}: { prefix?: string; root?: string } = {}): TestProjectConfiguration[] {
  return [
    {
      resolve: { tsconfigPaths: true },
      ...(root && { root }),
      test: {
        name: `${prefix}node`,
        dir: TESTS,
        environment: "node",
        include: ["src/**/*.test.ts", "tools/**/*.test.{js,ts}"]
      }
    },
    {
      ...baseConfig(),
      ...(root && { root }),
      // Spell UI's files the page fetches, not imports (its icon packs' SVGs, beside `BuiltInPacks.ts`):  they're in
      // the spell-app checkout, outside this repo, which the test server serves only when told
      server: { fs: { allow: [REPO, SPELL_APP] } },
      test: {
        name: `${prefix}browser`,
        dir: TESTS,
        include: ["components/**/*.test.{ts,tsx}"],
        // Spell UI's core first, as a page has it:  its settings for `$/spell-solid` (`test/setup.ts` in spell-app's `ui`)
        setupFiles: [resolve(import.meta.dirname, "../../.spell-app/packages/ui/test/setup.ts")],
        testTimeout: 10_000,
        browser: {
          enabled: true,
          provider: playwright(),
          headless: true,
          instances: [{ browser: "chromium" }]
        }
      }
    }
  ]
}

export default defineConfig({
  test: {
    projects: epicsProjects()
  }
})
