import { existsSync } from "node:fs"
import { join } from "node:path"

import { SRV } from "spell/server"

/**
 * What every program in a browser runs on, `<spell-viewer>` and the runtime (`yarn build:element`):
 * git-ignored, so nothing else keeps a checkout's current.
 * - The cloud's pages load it (`SpellCloud`), and so do the app's tests that run a program in a browser
 *   (Recipe Box's, the live room's ...):  `browserBundleCheck`, their run's global setup.
 * - Its `sources`:  more than it needs, on purpose:  a needless build costs a minute, a stale one breaks every page.
 * - Apart from `SpellCloud` so a test run's global setup can load it:
 *   NEVER imports `environment`, which Vitest's global setup can't run (`spellSpacesDir.ts` says why).
 */
export const CLOUD_BROWSER_BUNDLE: SRV.BundleSpec = {
  name: "app-element",
  title: "the browser bundle programs run on",
  package: "spell-app",
  cwd: ".",
  run: ["yarn", "build:element"],
  output: "app/dist-element",
  entry: "spell-viewer.js",
  sources: [
    "spell/src/util",
    "spell/src/places",
    "spell/src/element",
    "spell/parser/src",
    "spell/ui/src",
    "spell/app/src/app",
    "spell/app/src/spaces/models",
    "spell/app/app/static",
    "spell/app/app/vite.shared.ts",
    "spell/app/app/vite.solid.config.ts",
    "spell/app/app/vite.element.config.ts",
    "spell/app/app/vite.editor.config.ts",
    "spell/app/app/vite.code.config.ts",
    "yarn.lock"
  ]
}

/**
 * The browser bundle of the checkout at `root` brought up to date when it's there but stale:
 * what a test run does first (`tests/browserBundleCheck.ts`;  epic `language` I163).
 * - Not built at all (CI, a fresh checkout):  left alone, so the tests that need it skip themselves, as they did.
 * - Built, but from older sources, or by hand (`yarn build:element` writes no record):  built again, once.
 *   - Why:  those tests ran on whatever build was there.  One from before a fix to the runtime failed them
 *     for a bug the source no longer had (Recipe Box's Undo took a starting recipe back:  epic `epic-engine` I325).
 * - Returns what it did;  `log` says so when it builds, which takes a minute or two.
 * - throws when the build fails:  a run on a stale bundle would fail anyway, less clearly
 */
export function browserBundleCurrentIfBuilt(
  bundle: Pick<SRV.Bundle, "check" | "build" | "outputDir" | "spec">,
  log: (line: string) => void = console.log
): "not built" | "current" | "rebuilt" {
  if (!existsSync(join(bundle.outputDir, bundle.spec.entry))) return "not built"
  const { stale } = bundle.check()
  if (!stale) return "current"
  log(`Spell's browser bundle is out of date (${stale}):  building it before the tests, which takes a minute or two.`)
  bundle.build()
  return "rebuilt"
}
