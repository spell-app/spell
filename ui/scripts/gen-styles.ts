/**
 * `yarn gen:styles [--check]`:  regenerate every generated sheet in `src/styles/`.
 * - `tokens.css`, `colors.css`, `sizes.css`, from `styles.en.ts` (`StyleGenerator`).
 * - Each theme's sheet, from its theme file (`ThemeFile`;  epic `debut` P18):
 *   `themes/<name>.theme.json5` => `themes/<name>.css`, `themes/palettes/<name>.palette.json5` => `palettes/<name>.css`;
 *   and `themes/theme.schema.json`, from the theme tree.
 * - The generated sheets are COMMITTED, so consumers need no build step;  rerun after any vocabulary or theme change.
 * - `--check`:  write nothing;  exit 1 if a sheet is stale.
 * - NOTE: imports the generators' leaf files, not the `spell/ui/styles` barrel -- the barrel pulls in `?raw` / `?inline`
 *   CSS imports that only Vite understands.
 */
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { readJSON5File } from "spell/util/node/json5"
import { StyleGenerator } from "spell/ui/styles/StyleGenerator"
import { ThemeFile } from "spell/ui/styles/ThemeFile"
import type { ThemeData } from "spell/ui/styles/styles.types"
import { Terminal } from "spell/element-tools/Terminal"
import { type GeneratedOutput, writeOrCheck } from "spell/element-tools/generatedFiles"

import { formatted } from "spell/ui/tools/generatedFiles"

/****************
 * ### `GenStylesCommand`
 * Writes the generated sheets, formatted as `yarn format` would (so it's a no-op on them), only those that changed,
 * and says so.
 ****************/
class GenStylesCommand {
  /** `src/styles/`, where the sheets live. */
  readonly directory = fileURLToPath(new URL("../src/styles/", import.meta.url))

  /** `src/styles/themes/`, where the theme files and their sheets live. */
  readonly themesDirectory = `${this.directory}themes/`

  /**
   * Write every sheet that changed (`isCheck`:  write none, fail on a stale one), report.
   * - SIDE EFFECT:  overwrites the generated files, or sets `process.exitCode`.
   * - throws a `TypeError` on a mistake in a theme file, naming it
   */
  async run({ isCheck }: { isCheck: boolean }) {
    const outputs: GeneratedOutput[] = Object.entries(new StyleGenerator().sheets()).map(([name, css]) => [
      `${this.directory}${name}`,
      css
    ])
    const sheets = ThemeFile.sheets({
      themes: this.themeFiles("", "theme"),
      palettes: this.themeFiles("palettes/", "palette")
    })
    for (const [path, css] of Object.entries(sheets)) outputs.push([`${this.themesDirectory}${path}`, css])
    outputs.push([`${this.themesDirectory}theme.schema.json`, `${JSON.stringify(ThemeFile.schema(), undefined, 2)}\n`])
    const stale = writeOrCheck(await formatted(outputs), { command: "gen:styles", isCheck })
    if (isCheck) return
    for (const path of stale) Terminal.out(`wrote ${path}`)
    Terminal.out(`${outputs.length - stale.length} of ${outputs.length} generated sheets unchanged`)
  }

  /** Every `<name>.<kind>.json5` in the themes folder's `folder`, parsed, by name. */
  private themeFiles(folder: string, kind: string): Record<string, ThemeData> {
    const suffix = `.${kind}.json5`
    const names = readdirSync(`${this.themesDirectory}${folder}`).filter((file) => file.endsWith(suffix))
    return Object.fromEntries(
      names.map((file) => [
        file.slice(0, -suffix.length),
        readJSON5File<ThemeData>(`${this.themesDirectory}${folder}${file}`)
      ])
    )
  }
}

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } })
await new GenStylesCommand().run({ isCheck: values.check })
