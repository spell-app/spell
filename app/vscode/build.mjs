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
 *   - Each set's `docs/__data/`, written by its `yarn site:data`:  Spell UI's in the kit's `ui/` folder,
 *     the brand's in spell-brand, beside the kit (an empty set without it).
 *   - So a vocabulary change shows in the editor after the next build and install (`yarn vscode`).
 * - Fails unless our `version` matches `spell`'s -- the two are pinned together.
 * - SIDE EFFECT: also builds `app`'s runner bundle, `dist-runner/`, for "Run Project".
 */
import { execSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
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

// The HTML and CSS data, each set's, as `out/data/<set>.<file>`:
// - Spell UI's from the kit's `ui/` folder
// - the brand's from spell-brand, a project BESIDE the kit;  without it (CI, someone else's checkout), an empty set
const DATA_SETS = {
  "spell-ui": resolve(here, "../../ui/docs/__data"),
  "spell-brand": resolve(here, "../../../spell-brand/docs/__data")
}
const DATA_FILES = ["html-custom-data.json", "css-custom-data.json"]
mkdirSync(resolve(here, "out/data"), { recursive: true })
for (const [set, folder] of Object.entries(DATA_SETS)) {
  for (const file of DATA_FILES) {
    const to = resolve(here, "out/data", `${set}.${file}`)
    if (existsSync(resolve(folder, file))) copyFileSync(resolve(folder, file), to)
    else writeFileSync(to, JSON.stringify({ version: 1.1 }))
  }
}

await buildExtension({ folder: here, constants: { BUILT_IN_SPELL_APP: resolve(here, "..") } })

/** Contents of JSON file `path`. */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}
