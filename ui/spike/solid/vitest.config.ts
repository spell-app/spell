import { defineConfig } from "vitest/config"
import { playwright } from "@vitest/browser-playwright"
import solid from "@solidjs/vite-plugin"

import { standardDecorators } from "../../vite.decorators.ts"
import { shared } from "./vite.shared.ts"

/**
 * Tests:  every component test runs in a REAL browser (chromium), as in the repo;  `*.ssr.test.tsx` runs in node.
 * - Each project gets its OWN Solid plugin instance:  the plugin picks its posture (client, or server build of
 *   `@solidjs/web` with `renderToString`) from `test.environment` of the config it's created in, and never sees
 *   a project's `environment` through `extends: true`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "browser",
          testTimeout: 10_000,
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.ssr.test.{ts,tsx}"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }]
          }
        }
      },
      {
        ...shared,
        plugins: [standardDecorators(), solid()],
        test: {
          name: "ssr",
          environment: "node",
          // vitest stubs CSS imports by default;  the DSD string needs the real `?inline` sheets
          css: { include: [/.+/] },
          include: ["src/**/*.ssr.test.{ts,tsx}"]
        }
      }
    ]
  }
})
