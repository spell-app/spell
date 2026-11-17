import type { TestProject } from "vite-plus/test/node"

import { SRV } from "spell/server"
import { repoDir } from "spell/app/spaces/server/node/spellSpacesDir"
import { browserBundleCurrentIfBuilt, CLOUD_BROWSER_BUNDLE } from "spell/app/spaces/server/node/routes/browserBundle"

/**
 * Builds the browser bundle (`yarn build:element`) again before a test run, when it's there but stale
 * (epic `language` I163).
 * - The tests that run a program in a browser load it:  Recipe Box's, the live room's, read gathering's, the cloud's.
 *   - Git-ignored, so nothing else keeps a checkout's current:  they ran on whatever build was there,
 *     and one from before a fix to the runtime failed them for a bug the source no longer had.
 * - Not built at all (CI):  left alone, and those tests skip themselves.
 * - The app's Vitest settings run this once per run (its `globalSetup`), for the root project only.
 * - NEVER imports `environment`:  Vitest's global setup can't load it (`spellSpacesDir.ts` says why).
 */
export default function browserBundleCheck(project: TestProject): void {
  if (!project.isRootProject()) return
  browserBundleCurrentIfBuilt(new SRV.Bundle(repoDir, CLOUD_BROWSER_BUNDLE))
}
