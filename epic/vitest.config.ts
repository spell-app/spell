import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type TestProjectConfiguration, type UserConfig } from "vite-plus"
import { playwright } from "vite-plus/test/browser-playwright"

import { standardDecorators } from "spell/toolchain/decorators"

/**
 * Spell UI's own config, from the `spell-ui` workspace (spell-ui, a child repo of the top `spell` install, epic
 * `epic-engine` P10), by its package entry (`./vite.config.ts`).
 * - HACK: its specifier in a constant, so `tsc` doesn't follow it:  type-checked here, `ui`'s config meets ITS repo's
 *   view of vite's types beside spell-epic's, and comparing the two runs out of stack ("Excessive stack depth
 *   comparing types 'Plugin<any>'").  spell-ui checks that file itself.
 */
const UI_CONFIG = "spell-ui/vite.config.ts"
const { baseConfig } = (await import(UI_CONFIG)) as { baseConfig: () => UserConfig }

/**
 * vitest config for `spell-epic`, a component pack (`spell-pack`):  two projects, over `tests/`.
 * - `node` -- everything but the elements:  the epic code's tests, `pack.test.ts` among them (`spell-pack check`:
 *   `src/components/__pack/` is current), and `tools/**`, the docs tools' own tests
 * - `browser` -- `components/**`:  the `<epic-*>` elements, in a REAL browser (Vitest browser mode + Playwright,
 *   chromium), as Spell UI's are.  `baseConfig()`:  Spell UI's plugins (decorators BEFORE Solid), Solid dedupe,
 *   Lightning CSS;  the test helpers come from the kit (`spell/test-helpers/...`)
 * - NOT here:  the window script's and the extension's tests (`tests/window.test.mjs`, `tests/vscode/`), plain
 *   `node --test` (`yarn test:scripts`)
 * - `prefix` / `root`:  for a config that lists these beside others (`epics:node` / `epics:browser`), `root` set to
 *   this folder, since vitest doesn't nest `projects`.  Own run:  no prefix, `root` is this folder.
 */
/** The tests live in tests/, at the same paths as the code in src/. */
const TESTS = resolve(import.meta.dirname, "tests")

/** Spell UI's test setup (`spell-ui/test-helpers/setup.ts`), by Node's resolver:  wherever the install put spell-ui. */
const UI_SETUP = fileURLToPath(import.meta.resolve("spell-ui/test-helpers/setup.ts"))

export function epicsProjects({
  prefix = "",
  root
}: { prefix?: string; root?: string } = {}): TestProjectConfiguration[] {
  return [
    {
      ...(root && { root }),
      // the kit's files lowered too:  the docs runtime imports `spell/util/persist`, whose `UndoStack` has decorators
      // (epic `prefs-and-undo`);  Vite's own transform leaves them, and node can't run them
      plugins: [standardDecorators()],
      test: {
        name: `${prefix}node`,
        dir: TESTS,
        environment: "node",
        include: ["**/*.test.{js,ts}"],
        exclude: ["**/node_modules/**", "components/**", "vscode/**"]
      }
    },
    {
      ...baseConfig(),
      ...(root && { root }),
      // Spell UI's files the page fetches, not imports (its icon packs' SVGs, beside `BuiltInPacks.ts`), and the
      // hoisted `node_modules`:  in the top `spell` repo, outside this one, which Vite's default allow list covers (the
      // workspace root it finds above, the top's `package.json` with its `workspaces`;  epic `epic-engine` P10)
      test: {
        name: `${prefix}browser`,
        dir: TESTS,
        include: ["components/**/*.test.{ts,tsx}"],
        // Spell UI's core first, as a page has it:  its settings for `spell/element` (spell-ui's
        // `test/setup.ts`)
        setupFiles: [UI_SETUP],
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
