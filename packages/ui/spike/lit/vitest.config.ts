import { defineConfig, mergeConfig } from "vitest/config"
import { playwright } from "@vitest/browser-playwright"

import viteConfig from "./vite.config.ts"

/** Browser-mode tests in chromium, on the spike's Vite config (aliases, decorators, CSS targets). */
export default mergeConfig(
  viteConfig,
  defineConfig({
    // the perf test writes `perf-results.json`;  a watched write would reload the run
    server: { watch: { ignored: ["**/perf-results.json"] } },
    test: {
      include: ["src/**/*.test.ts"],
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        instances: [{ browser: "chromium" }]
      }
    }
  })
)
