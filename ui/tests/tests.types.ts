/**
 * What `ui`'s Vitest settings (`packages/ui/vitest.config.ts`) add to Vitest's types, for `ui`'s tests:
 * - `inject("ci")`:  running on CI, so a timing test skips its budget (the dropdown's speed test)
 * - `commands.emulateReducedMotion()`:  a browser command turning "reduced motion" on or off
 *   - ON in the `browser` project:  animations off (the kit's `browserMode()`, `spell/toolchain/browserMode`)
 *   - OFF in the `motion` project, the tests of motion itself (`MOTION_TESTS`);  the reveal's test turns it on there
 * - Here, beside the tests that use them (decision J28 of epic `people-and-orgs`):
 *   an augmentation reaches only the copy of Vitest its own file finds,
 *   and a test in this folder finds the repo root's copy.
 */

declare module "vitest" {
  /** What `provide` hands the browser tests, read with `inject()` (`packages/ui/vitest.config.ts`). */
  export interface ProvidedContext {
    /** Running on CI:  skip timing budgets a shared runner can't hold. */
    ci: boolean
  }
}

declare module "vitest/browser" {
  /** Custom commands of every browser project (`browser.commands`:  the kit's `browserMode()`). */
  interface BrowserCommands {
    /**
     * `prefers-reduced-motion`:  `reduce` (`true`, the `browser` project's), or `no-preference` (`false`, `motion`'s);
     * through Playwright, in every browser.
     */
    emulateReducedMotion(reduce: boolean): Promise<void>
  }
}

export {}
