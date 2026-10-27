/**
 * Bundle the extension into `out/extension.js`:  the kit's `buildExtension()`, which then LOADS the bundle once,
 * `vscode` stubbed, so a crash as it loads fails the build rather than every window's extension.
 * - The installed extension finds the spell-app checkout to run when its server starts, from the window
 *   (`findSpellApp()`, `src/spellAppRoot.ts`):  one build works from every checkout and worktree.
 * - `BUILT_IN_SPELL_APP`, the spell-app checkout this file sits in, is only its last resort:
 *   for a spell file opened in a window with no checkout in it.
 * - Bundles the kit's elements help (`spell/element-tools/jsx-help/...`) and TypeScript 6, which it reads JSX
 *   with:  found by their package names, as source files, by the kit's `sourceNames()`, which `buildExtension()`
 *   bundles with (esbuild alone finds neither a name without its extension nor a folder's `index.ts`).
 * - Copies Spell UI's and Spell Brand's HTML and CSS data into `out/data/`, where `package.json` names them
 *   (`contributes.html.customData`, `contributes.css.customData`).
 *   - From the repos beside this one:  each one's `docs/__data/`, written by its `yarn site:data`.
 *   - So a vocabulary change shows in the editor after the next build and install (`yarn vscode`).
 * - Fails unless our `version` matches `spell`'s -- the two are pinned together.
 * - SIDE EFFECT: also builds `app`'s runner bundle, `dist-runner/`, for "Run Project".
 */
import { execSync } from "child_process"
import { copyFileSync, mkdirSync, readFileSync } from "fs"
import { resolve } from "path"

import { buildExtension } from "spell/toolchain/buildExtension"

const here = import.meta.dirname

// The extension's version is PINNED to spell's (spell-parser's one version, epic `repo-split` P11):  release them
// together.
const { version } = readJson(resolve(here, "package.json"))
const { version: parserVersion } = readJson(resolve(here, "../../parser/package.json"))
if (version !== parserVersion) {
  throw new Error(`vscode extension version ${version} !== spell version ${parserVersion}:  change them together.`)
}

// "Run Project"'s webview code lives in `app` -- see `RunnerPanel.ts`.
execSync("yarn build:runner", { cwd: resolve(here, "../app"), stdio: "inherit" })

// The HTML and CSS data, each set's, as `out/data/<repo>.<file>`.
const DATA_REPOS = ["spell-ui", "spell-brand"]
const DATA_FILES = ["html-custom-data.json", "css-custom-data.json"]
mkdirSync(resolve(here, "out/data"), { recursive: true })
for (const repo of DATA_REPOS) {
  for (const file of DATA_FILES) {
    copyFileSync(resolve(here, "../..", repo, "docs/__data", file), resolve(here, "out/data", `${repo}.${file}`))
  }
}

await buildExtension({ folder: here, constants: { BUILT_IN_SPELL_APP: resolve(here, "..") } })

/** Contents of JSON file `path`. */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}
