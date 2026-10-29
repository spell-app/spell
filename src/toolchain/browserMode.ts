/** A browser Vitest's browser mode can run tests in, through Playwright. */
export type TestBrowser = "chromium" | "firefox" | "webkit"

/** What `browserMode()` takes. */
export interface BrowserModeProps {
  /** browsers to run in;  default chromium only */
  browsers?: readonly TestBrowser[]
  /**
   * `"off"` (default):  the page asks for reduced motion.
   * - `"on"`:  no preference, for a project of tests that test motion itself (Spell UI's `motion`)
   */
  animations?: "off" | "on"
}

/** What `browserMode()` hands its `playwright` provider:  Playwright's settings for each page's browser context. */
export interface ProviderSettings {
  /** Playwright's `browser.newContext()` options */
  contextOptions: { reducedMotion: ReducedMotion }
}

/** Playwright's `prefers-reduced-motion` emulation. */
type ReducedMotion = "reduce" | "no-preference"

/**
 * The `browser` block of every Vitest project that runs tests in a REAL browser, in every repo:
 * Vitest browser mode, headless, through Playwright.
 * - `playwright`:  the provider, `playwright` of `vite-plus/test/browser-playwright`, as the CONFIG imports it.
 *   - Not imported here:  a folder may find its own copy of Vitest,
 *     and a provider typed by the kit's copy doesn't fit its config's types.
 * - Animations OFF:  the page asks for reduced motion (`prefers-reduced-motion: reduce`), as a person can.
 *   - Spell UI's elements show and hide at once, and their CSS motion stops (its `reset.css`, `animations.css`).
 *   - So a test never waits on an animation, and a slow machine (CI) can't stretch one past a test's timeout.
 *     Owen, on a Solitaire test that hung after the card flip got its 0.3s turn (epic `debut` I52, I77):
 *     "have CI run in "animation off" mode".
 *   - A FILE of tests of motion itself runs in a project of its own, `animations: "on"`:
 *     Spell UI's `motion` project, its files listed in its `vitest.config.ts` (`MOTION_TESTS`).
 *   - Not by turning it on in the file:  a project's test files run side by side in ONE page,
 *     and the setting is the page's, so it would turn motion on for the files beside it too.
 * - `commands.emulateReducedMotion(reduce)`:  Playwright's media emulation, in every browser;  for one test.
 *   - Its types:  a repo's tests declare it where they use it (Spell UI's `tests/tests.types.ts`).
 * - A fresh object each call:  Vitest names each project's in place.
 */
export function browserMode<Provider>(
  playwright: (settings: ProviderSettings) => Provider,
  { browsers = ["chromium"], animations = "off" }: BrowserModeProps = {}
) {
  return {
    enabled: true,
    provider: playwright({ contextOptions: { reducedMotion: animations === "off" ? "reduce" : "no-preference" } }),
    headless: true,
    commands: { emulateReducedMotion },
    instances: browsers.map((browser) => ({ browser }))
  }
}

/** The part of Playwright's page `emulateReducedMotion()` uses. */
interface MediaPage {
  emulateMedia(options: { reducedMotion: ReducedMotion }): Promise<void>
}

/**
 * Ask for reduced motion (`true`, every browser project's default but `animations: "on"`'s),
 * or say the person has no preference (`false`).
 * - NOT `null`:  that drops the emulation, and the browser's own setting may still ask for reduced motion.
 */
async function emulateReducedMotion({ page }: { page: MediaPage }, reduce: boolean): Promise<void> {
  await page.emulateMedia({ reducedMotion: reduce ? "reduce" : "no-preference" })
}
