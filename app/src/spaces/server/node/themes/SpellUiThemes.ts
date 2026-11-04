import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

import JSON5 from "json5"

import { SRV } from "spell/server"
import { spliceGenerated } from "spell/element-tools/generatedFiles"
import { ThemeFile } from "spell/ui/styles/ThemeFile"
import type { ThemeData } from "spell/ui/styles/styles.types"

/****************
 * ### `SpellUiThemes`
 * Save into Spell UI:  a theme made in the theme editor written as one of Spell's OWN themes (epic `debut` P25), so
 * the builder is how Spell's themes get made.
 * - What it writes, in Spell UI's themes folder (found by package, as spaces finds every other folder):
 *   - `<name>.theme.json5`, the theme file, its first comment saying what it is and that the builder made it
 *   - `<name>.css`, its sheet, made by `ThemeFile` as `yarn gen:styles` makes every theme's
 * - and its name in the theme list (`UI.themes.own`, `Themes.ts`), between its `own:start` / `own:end` markers
 *   (the kit's `spliceGenerated()`), last.
 * - Then it's a file in Spell UI, to review and commit like any other:  the page server's bundle build takes it on
 *   the next reload, and the contrast test checks it by itself (it runs over `own`).
 * - A name already in the list:  refused (`SRV.HttpError(409)`) unless `overwrite`.
 * - A file that isn't a theme:  `SRV.HttpError(400)`, `ThemeFile`'s own words.
 * - WHO may:  the routes' business (`themesRoutes.ts`):  a Spell admin only.
 ****************/
export class SpellUiThemes {
  /** Spell UI's themes folder. */
  readonly folder: string

  /** The file holding the theme list, `Themes.ts`. */
  readonly listFile: string

  constructor({ folder = THEMES_FOLDER, listFile = LIST_FILE }: { folder?: string; listFile?: string } = {}) {
    this.folder = folder
    this.listFile = listFile
  }

  /** The themes in the list, as `Themes.ts` names them between its markers. */
  get names(): string[] {
    const text = readFileSync(this.listFile, "utf8")
    const block = text.slice(text.indexOf(START), text.indexOf(END))
    return [...block.matchAll(/"([\w-]+)"/g)].map((match) => match[1]!)
  }

  /**
   * Write theme file `text` as Spell UI's theme `name`:  its file, its sheet, its place in the list.  Returns the file's
   * name.
   * - throws `SRV.HttpError`:  400 for a name or a file that won't do, 409 for a name already taken (unless `overwrite`)
   */
  save({ name, text, overwrite = false }: { name: string; text: string; overwrite?: boolean }): string {
    if (!NAME.test(name)) {
      throw new SRV.HttpError(400, `SpellUiThemes:  \`${name}\` can't name a theme;  lower case, digits and dashes`)
    }
    const fileName = `${name}.theme.json5`
    const isTaken = this.names.includes(name) || existsSync(join(this.folder, fileName))
    if (isTaken && !overwrite) throw new SRV.HttpError(409, `Spell UI has a theme named ${name} already`)
    let data: ThemeData
    try {
      data = JSON5.parse(text) as ThemeData
    } catch (error) {
      throw new SRV.HttpError(400, `SpellUiThemes:  not a theme file:  ${(error as Error).message}`)
    }
    const { themes, palettes } = this.files()
    let css: string
    try {
      css = new ThemeFile({ name, data, themes: { ...themes, [name]: data }, palettes }).css()
    } catch (error) {
      throw new SRV.HttpError(400, (error as Error).message)
    }
    const title = typeof data.title === "string" && data.title ? data.title : name
    const head = [
      `// ${title}:  a theme made in Spell UI's theme editor, light and dark, and saved into Spell UI (epic \`debut\` P25).`,
      `// - Its sheet, \`${name}.css\`, is GENERATED from this file:  \`yarn gen:styles\` (\`ThemeFile\`).`
    ]
    writeFileSync(join(this.folder, fileName), `${head.join("\n")}\n${JSON.stringify(data, undefined, 2)}\n`)
    writeFileSync(join(this.folder, `${name}.css`), css)
    if (!this.names.includes(name)) this.addToList(name)
    return fileName
  }

  /** Add `name` last to the theme list, between its markers. */
  private addToList(name: string): void {
    const names = [...this.names, name]
    const text = spliceGenerated(readFileSync(this.listFile, "utf8"), {
      file: this.listFile,
      start: START,
      end: END,
      block: (indent) =>
        names.map((each, index) => `${indent}"${each}"${index < names.length - 1 ? "," : ""}\n`).join("")
    })
    writeFileSync(this.listFile, text)
  }

  /** Every theme and palette file of the folder, parsed:  what a theme may build on. */
  private files(): { themes: Record<string, ThemeData>; palettes: Record<string, ThemeData> } {
    const read = (folder: string, ending: string) =>
      Object.fromEntries(
        (existsSync(folder) ? readdirSync(folder) : [])
          .filter((file) => file.endsWith(ending))
          .map((file) => [file.slice(0, -ending.length), JSON5.parse(readFileSync(join(folder, file), "utf8"))])
      ) as Record<string, ThemeData>
    return {
      themes: read(this.folder, ".theme.json5"),
      palettes: read(join(this.folder, "palettes"), ".palette.json5")
    }
  }
}

/** Spell UI's themes folder, found by package. */
const THEMES_FOLDER = join(
  dirname(createRequire(import.meta.url).resolve("spell/ui/styles/StyleGenerator.ts")),
  "themes"
)

/** Spell UI's theme list, found by package. */
const LIST_FILE = createRequire(import.meta.url).resolve("spell/ui/runtime/Themes.ts")

/** The list's markers. */
const START = "// own:start"
const END = "// own:end"

/** A theme's name:  lower case, digits and dashes, a letter first. */
const NAME = /^[a-z][a-z0-9-]*$/
