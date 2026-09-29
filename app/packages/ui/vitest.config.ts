import { defineConfig } from "vitest/config"
import { playwright } from "@vitest/browser-playwright"
import { fileURLToPath } from "node:url"

import { standardDecorators } from "./vite.decorators.ts"

/** Absolute path of `src/`, target of the `$` import alias. */
const SRC = fileURLToPath(new URL("./src", import.meta.url))

/**
 * Every test runs in a REAL browser (Vitest browser mode + Playwright):  custom elements, shadow DOM,
 * `adoptedStyleSheets`, anchor positioning and axe all need one, and jsdom fakes too much of it.
 * - chromium only by default, so `yarn review` stays quick.
 * - `UI_TEST_ALL=1` (`yarn test:all`) adds firefox and webkit -- run `yarn test:browsers` once first.
 */
const BROWSERS = process.env.UI_TEST_ALL ? (["chromium", "firefox", "webkit"] as const) : (["chromium"] as const)

export default defineConfig({
  plugins: [standardDecorators()],
  resolve: {
    alias: {
      $: SRC
    }
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      drafts: { customMedia: true }
    }
  },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: BROWSERS.map((browser) => ({ browser }))
    }
  }
})
