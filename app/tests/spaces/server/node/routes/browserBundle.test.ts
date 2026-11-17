import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { repoDir } from "spell/app/spaces/server/node/spellSpacesDir"
import { browserBundleCurrentIfBuilt, CLOUD_BROWSER_BUNDLE } from "spell/app/spaces/server/node/routes/browserBundle"

/** A bundle that says what `check()` finds, and counts its builds. */
function fakeBundle(outputDir: string, stale?: string) {
  return {
    outputDir,
    spec: CLOUD_BROWSER_BUNDLE,
    builds: 0,
    check: () => ({ name: "app-element", output: "app/dist-element", sources: "abc", ...(stale && { stale }) }),
    build() {
      this.builds++
      return { name: "app-element", sources: "abc", seconds: 0 }
    }
  }
}

describe("the browser bundle, before a test run (epic `language` I163)", () => {
  const folders: string[] = []
  afterEach(() => folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true })))

  /** An output folder, holding the bundle's entry or not. */
  function outputFolder({ built }: { built: boolean }): string {
    const folder = mkdtempSync(join(tmpdir(), "spell-browser-bundle-"))
    folders.push(folder)
    mkdirSync(folder, { recursive: true })
    if (built) writeFileSync(join(folder, CLOUD_BROWSER_BUNDLE.entry), "")
    return folder
  }

  test("built from older sources:  built again, so the tests run what the source says", () => {
    const bundle = fakeBundle(outputFolder({ built: true }), "built from older sources")
    const said: string[] = []
    expect(browserBundleCurrentIfBuilt(bundle, (line) => said.push(line))).toBe("rebuilt")
    expect(bundle.builds).toBe(1)
    expect(said[0]).toContain("out of date (built from older sources)")
  })

  test("current:  left as it is", () => {
    const bundle = fakeBundle(outputFolder({ built: true }))
    expect(browserBundleCurrentIfBuilt(bundle, () => {})).toBe("current")
    expect(bundle.builds).toBe(0)
  })

  test("never built (CI):  left alone, so the tests that need it skip themselves", () => {
    const bundle = fakeBundle(outputFolder({ built: false }), "never built")
    expect(browserBundleCurrentIfBuilt(bundle, () => {})).toBe("not built")
    expect(bundle.builds).toBe(0)
  })

  // Recipe Box's Edit screen test failed on a build from before epic `epic-engine` I325's fix to the core
  test("the runtime's code is among its sources:  a change to the core makes it stale", () => {
    const sources = new SRV.Bundle(repoDir, CLOUD_BROWSER_BUNDLE).sourceFiles()
    expect(sources).toContain("spell/parser/src/core/undoing.ts")
    expect(sources).toContain("spell/app/src/app/runner/spellRuntime.ts")
  })
})
