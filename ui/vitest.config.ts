import { configDefaults, defineConfig, type TestProjectConfiguration } from "vite-plus"
import { playwright } from "vite-plus/test/browser-playwright"
import { resolve } from "node:path"

import { browserMode } from "spell/toolchain/browserMode"
import { environment } from "spell/ui/tools/environment"
import { baseConfig } from "./vite.config.ts"

/**
 * Browsers the `browser` project runs in:  chromium only by default, so `yarn review` stays quick.
 * - `SPELL_UI_TEST_ALL=1` (`yarn test:all`;  `environment.isAllBrowsers`) adds firefox and webkit.
 *   Run `yarn test:browsers` once first.
 */
const BROWSERS = environment.isAllBrowsers ? (["chromium", "firefox", "webkit"] as const) : (["chromium"] as const)

/**
 * Where both projects find their tests:  the tests live in the repo's tests/ folder, at the same paths as the code.
 * - Absolute:  a relative `dir` is read from wherever the run starts (the repo root's run too).
 * - The globs below are relative to it.
 * - `root` stays this package, so these still mean this package's files:
 *   `/src/...` globs, `/src/test-helpers/fixtures/...` URLs, `setupFiles`.
 */
const TESTS = resolve(import.meta.dirname, "./tests")

/** Server-render tests:  `*.ssr.test.ts(x)`, anywhere. */
const SSR_TESTS = ["**/*.ssr.test.{ts,tsx}"]

/**
 * Node tooling tests, run with the `ssr` project, in node:  the tools' (`src/tools/`), and Spell UI's `spell` commands'
 * (`src/cli/`:  `spell icon`, `spell ssr`, `spell pack`, `spell design`).
 * - The tests mirror `src/`:  `tests/tools/` tests `src/tools/`, `tests/components/ui-button/` tests
 *   `src/components/ui-button/` ...
 */
const TOOL_TESTS = ["tools/**/*.test.ts", "cli/**/*.test.ts"]

/**
 * Test files that test MOTION itself:  the `motion` project's, with animations ON.
 * - Every other browser test runs with them off (`browser`):  the page asks for reduced motion
 *   (the kit's `browserMode()`;  epic `debut` I77, from Owen's "have CI run in "animation off" mode").
 * - A project of their own, not a switch in the file:
 *   a project's files run side by side in ONE page, and reduced motion is the page's setting.
 * - Each one reads a duration, a transition or a keyframe, or waits for one to run.
 */
const MOTION_TESTS = [
  // the fade's duration token
  "components/ui-dimmer/UIDimmer.test.tsx",
  // slides in and out
  "components/ui-flyout/UIFlyout.test.tsx",
  // the spin's speeds and directions
  "components/ui-loader/UILoader.css.test.ts",
  "components/ui-loader/UILoader.test.tsx",
  // the segmented thumb slides
  "components/ui-menu/UIMenu.test.tsx",
  // waits for the transition before ui-opened / ui-closed
  "components/ui-modal/UIModal.test.tsx",
  // its axe check:  the inverted nag's muted title fails contrast once its background has settled
  // (only motion's mid-fade passed it;  epic `debut` I78)
  "components/ui-nag/UINag.test.tsx",
  // the shimmer
  "components/ui-placeholder/UIPlaceholder.css.test.ts",
  // delays and durations;  and how it swaps under reduced motion, which its test turns on for itself
  "components/ui-reveal/UIReveal.css.test.ts",
  "components/ui-reveal/UIReveal.test.tsx",
  // the flips
  "components/ui-shape/UIShape.test.tsx",
  // the animations themselves
  "components/ui-transition/UITransition.css.test.ts",
  "components/ui-transition/UITransition.test.tsx",
  // buttons press in with a named transition
  "styles/themes/themes.test.ts",
  // showing and hiding animate
  "test-helpers/sharedStates.test.tsx"
]

/**
 * Three projects:
 * - `browser` -- every test but SSR, in a REAL browser (Vitest browser mode + Playwright), animations off.
 *   - Custom elements, shadow DOM, `adoptedStyleSheets`, anchor positioning and axe all need one,
 *     and jsdom fakes too much of it.
 * - `motion` -- `MOTION_TESTS`, the same, with animations on.
 * - `ssr` -- `*.ssr.test.tsx` in node, under `@solidjs/web`'s server build (`renderToString`).
 *   - Also the node tooling's own tests, and the `spell` commands' (`TOOL_TESTS`).
 * - Each project gets its OWN Solid plugin instance (`baseConfig()`):
 *   - the plugin picks its posture (client, or the server build of `@solidjs/web`)
 *     from `test.environment` of the config it's created in
 *   - it never sees a project's `environment` through `extends: true`
 * - NOTE: `ssr` runs FIRST:  it writes `.cache/ssr-button.html`, which `tests/test-helpers/dsd.test.ts` imports.
 *   - `yarn test` here runs the projects one after the other.
 *   - In the root's single run, `sequence.groupOrder` does it:
 *     vitest runs project groups in ascending order, and a group finishes before the next starts.
 * - `prefix` / `root`:  the repo root's `vitest.config.ts` lists these with `ui:` names and `root` set to this package,
 *   since vitest doesn't nest `projects`.
 *   - Own run:  no prefix, `root` is the config's folder.
 */
export function uiProjects({ prefix = "", root }: { prefix?: string; root?: string } = {}): TestProjectConfiguration[] {
  return [
    {
      ...baseConfig(),
      ...(root && { root }),
      test: {
        name: `${prefix}ssr`,
        sequence: { groupOrder: 0 },
        environment: "node",
        // vitest stubs CSS imports by default;  the DSD string needs the real `?inline` sheets
        css: { include: [/.+/] },
        dir: TESTS,
        include: [...SSR_TESTS, ...TOOL_TESTS]
      }
    },
    browserProject({
      name: `${prefix}browser`,
      root,
      include: ["**/*.test.{ts,tsx}"],
      exclude: [...SSR_TESTS, ...TOOL_TESTS, ...MOTION_TESTS],
      animations: "off"
    }),
    browserProject({ name: `${prefix}motion`, root, include: MOTION_TESTS, animations: "on" })
  ]
}

/** What `browserProject()` takes:  where its tests are, and whether their page asks for reduced motion. */
interface BrowserProjectProps {
  /** the project's name, `browser` or `motion`, with the root's prefix */
  name: string
  /** the root's run:  this package's folder */
  root: string | undefined
  /** its tests, in `TESTS` */
  include: string[]
  /** tests of `include` it leaves to another project */
  exclude?: string[]
  /** `"off"`:  reduced motion (the kit's `browserMode()`);  `"on"`:  `MOTION_TESTS` */
  animations: "off" | "on"
}

/** A project of tests in a REAL browser:  `browser`, or `motion` (above). */
function browserProject({
  name,
  root,
  include,
  exclude = [],
  animations
}: BrowserProjectProps): TestProjectConfiguration {
  return {
    ...baseConfig(),
    ...(root && { root }),
    test: {
      name,
      sequence: { groupOrder: animations === "off" ? 1 : 2 },
      dir: TESTS,
      include,
      exclude: [...configDefaults.exclude, ...exclude],
      setupFiles: ["./src/test-helpers/setup.ts"],
      // a guard:  an element bug that halts rendering must fail its test, not hang the run
      testTimeout: 10_000,
      // Test files of one browser run in parallel iframes of ONE page, which has ONE focus:
      // - firefox and webkit hand it to whichever iframe asked last,
      //   so `focus()` / Tab / Escape tests of another file fail
      // - Chromium fakes focus for every frame, so the quick single-browser run keeps its parallelism
      fileParallelism: !environment.isAllBrowsers,
      // `inject("ci")` in a test:  timing budgets are skipped on a shared CI runner (`tests/tests.types.ts`);
      // `CI=false` / `CI=0` count as not CI
      provide: { ci: environment.isCI },
      browser: browserMode(playwright, { browsers: BROWSERS, animations })
    }
  }
}

export default defineConfig({
  test: {
    projects: uiProjects()
  }
})
