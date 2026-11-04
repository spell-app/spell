/**
 * `yarn tsx scripts/vscode-themes.ts [--check]`:  writes every Spell theme as a VS Code colour theme, light and dark,
 * into the extension's `themes/`, and lists them in its `package.json` (`VscodeThemes`, epic `debut` P22).
 * - `--check`:  writes nothing;  exits 1 if any is out of date.  The app's tests check it too (`VscodeThemes.test.ts`).
 * - The extension's build runs it first (`vscode/build.mjs`):  a theme changed shows in VS Code after
 *   `spell app vscode`.
 */
import { relative } from "node:path"

import { writeOrCheck } from "spell/element-tools/generatedFiles"
import { VscodeThemes } from "spell/app/cli/VscodeThemes"

const isCheck = process.argv.includes("--check")
const stale = writeOrCheck(await VscodeThemes.outputs(), { command: "tsx scripts/vscode-themes.ts", isCheck })
console.info(
  stale.length === 0
    ? "The VS Code themes are up to date."
    : `${isCheck ? "Out of date" : "Wrote"}:  ${stale.map((file) => relative(process.cwd(), file)).join(", ")}`
)
