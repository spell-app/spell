import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { createRequire } from "node:module"

import { chromium } from "playwright"

import { COLOR_SCHEME_CLASSES } from "spell/util/persist/persist.types"
import { CodeThemeFile, type CodeThemeColors, type CodeThemeScheme } from "spell/ui/styles/CodeThemeFile"

/****************
 * ### `VscodeThemes`
 * Every Spell theme as a VS Code colour theme, light and dark, for the Spell extension (epic `debut` P22):
 * "Spell Matrix Dark" and the rest, 18 in all, in its `themes/`, listed in its `package.json`'s `contributes.themes`.
 * - Each theme's colours are worked out as a page draws them:  its sheet (on `classic`, over Spell UI's foundation)
 *   in a headless browser, every token of `CodeThemeFile.TOKENS` read off a probe and painted, in each scheme.
 *   - So a theme's `light-dark()`, relative colours and the code's recipe come out exactly as the editor shows them.
 * - Spell UI's `CodeThemeFile` writes each file's JSON;  this finds the sheets and the extension, and writes.
 * - GENERATED, committed, marked in the app folder's `.gitattributes` and the kit's generators list:
 *   `yarn tsx scripts/vscode-themes.ts [--check]`, which the extension's build runs first.
 * - Node only, with Playwright's Chromium:  never in the app.
 ****************/
export class VscodeThemes {
  /** The extension's folder:  the app folder's `vscode/`. */
  static readonly EXTENSION = resolve(import.meta.dirname, "../../vscode")

  /** Where the theme files go, in the extension. */
  static readonly FOLDER = join(VscodeThemes.EXTENSION, "themes")

  /** Every theme file, and the extension's `package.json` listing them:  path => text. */
  static async outputs(): Promise<Array<[path: string, text: string]>> {
    const files = await VscodeThemes.files()
    return [
      ...files.map((file): [string, string] => [join(VscodeThemes.FOLDER, file.fileName), file.text()]),
      [join(VscodeThemes.EXTENSION, "package.json"), VscodeThemes.packageWith(files)]
    ]
  }

  /** Each theme of Spell UI's themes folder, in each scheme, as a VS Code theme:  `glass` light, `glass` dark ... */
  static async files(): Promise<CodeThemeFile[]> {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      const files: CodeThemeFile[] = []
      for (const name of VscodeThemes.themeNames()) {
        await page.setContent(VscodeThemes.html(name))
        // `tsx` names every function it compiles with a helper of its own, which the page lacks
        await page.evaluate(NAMED_FUNCTIONS)
        for (const scheme of SCHEMES) {
          const colors = await page.evaluate(paintedColors, {
            tokens: [...CodeThemeFile.TOKENS],
            scheme: COLOR_SCHEME_CLASSES[scheme],
            opaque: OPAQUE
          })
          files.push(new CodeThemeFile({ name, scheme, colors: colors as CodeThemeColors }))
        }
      }
      return files
    } finally {
      await browser.close()
    }
  }

  /** The themes folder's themes, by their theme files (`<name>.theme.json5`), A to Z. */
  static themeNames(): string[] {
    return readdirSync(STYLES_THEMES)
      .filter((file) => file.endsWith(THEME_FILE))
      .map((file) => file.slice(0, -THEME_FILE.length))
      .sort()
  }

  /** The extension's `package.json` with `contributes.themes` listing `files`, the rest as it was. */
  static packageWith(files: readonly CodeThemeFile[]): string {
    const manifest = JSON.parse(readFileSync(join(VscodeThemes.EXTENSION, "package.json"), "utf8")) as {
      contributes: Record<string, unknown>
    }
    manifest.contributes.themes = files.map((file) => file.contribution)
    return `${JSON.stringify(manifest, null, 2)}\n`
  }

  ////////////////
  // ## The page
  ////////////////

  /** A page wearing theme `name`:  Spell UI's foundation sheets, `classic`, then the theme's sheet, imports inlined. */
  private static html(name: string): string {
    const foundation = FOUNDATION.map((sheet) => readFileSync(join(STYLES, sheet), "utf8"))
    const themes = [CLASSIC, name].map((theme) => VscodeThemes.inlined(join(STYLES_THEMES, `${theme}.css`)))
    return `<!doctype html><style>${[...foundation, ...themes].join("\n")}</style><body></body>`
  }

  /** Sheet `file`'s text with each `@import` replaced by the sheet it names, in place. */
  private static inlined(file: string): string {
    return readFileSync(file, "utf8").replace(IMPORT, (_, path: string) =>
      VscodeThemes.inlined(resolve(dirname(file), path))
    )
  }
}

/** What `tsx` wraps each function in (keeping its name):  for `paintedColors()` in the page. */
const NAMED_FUNCTIONS = "globalThis.__name = (fn) => fn"

/** The schemes each theme is written in. */
const SCHEMES: readonly CodeThemeScheme[] = ["light", "dark"]

/** The tokens a VS Code theme needs opaque, painted over the page:  its surfaces (a glass panel is see-through). */
const OPAQUE = ["--ui-surface", "--ui-surface-muted"]

/** Spell UI's styles folder, found through the package. */
const STYLES = dirname(createRequire(import.meta.url).resolve("spell/ui/styles/StyleGenerator.ts"))

/** Its themes folder. */
const STYLES_THEMES = join(STYLES, "themes")

/** The foundation sheets every page loads, in their order:  what a theme's tokens build on. */
const FOUNDATION = ["layers.css", "tokens.css", "colors.css", "sizes.css"]

/** The base every theme is applied on. */
const CLASSIC = "classic"

/** A theme file's ending. */
const THEME_FILE = ".theme.json5"

/** An `@import "<path>";` line. */
const IMPORT = /@import\s+"([^"]+)";/g

/**
 * IN THE PAGE:  each of `tokens` as painted under `scheme`'s class on `<html>`:  `#rrggbb`, or `#rrggbbaa` when
 * see-through;  the `opaque` ones painted over the page's background.
 * - Self-contained:  Playwright sends its text into the page.
 */
function paintedColors({ tokens, scheme, opaque }: { tokens: string[]; scheme: string; opaque: string[] }) {
  const root = document.documentElement
  root.className = scheme
  root.style.colorScheme = scheme.replace(/^ui-/, "")
  const probe = document.createElement("span")
  document.body.append(probe)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })!
  const computed = (token: string) => {
    probe.style.color = `var(${token})`
    return getComputedStyle(probe).color
  }
  const hex = (bytes: number[]) => `#${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`
  const background = computed("--ui-background")
  const out: Record<string, string> = {}
  for (const token of tokens) {
    context.clearRect(0, 0, 1, 1)
    if (opaque.includes(token)) {
      context.fillStyle = background
      context.fillRect(0, 0, 1, 1)
    }
    context.fillStyle = "#000000"
    context.fillStyle = computed(token)
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    out[token] = hex(alpha === 255 ? [red!, green!, blue!] : [red!, green!, blue!, alpha!])
  }
  probe.remove()
  return out
}
