import { MissingResourceError } from "spell/util/spell/ResponseErrors"
import { parseJSON5 } from "spell/util/spell/json"
import type { ThemeData } from "spell/ui/styles/styles.types"
import { fetchText } from "./fetchFresh"

/****************
 * ### `SiteThemes`
 * The theme a running site wears, `galaxy guide is a site with theme "mockup"`, as its host gives it
 * (`SiteHost.themeTokens()`):  the editor's Run (`RunSite`) and a page's `<spell-viewer>` (`SpellAppRunner`).
 * - One of Spell UI's own (`UI.themes`), else the PROJECT's own (epic `old-console-redo` P1):
 *   `<name>.theme.json5` in the running program's folder, beside its Spell.
 *   - Spell UI's first:  a project's theme is defined into the page's one registry, and can't replace one of
 *     Spell UI's (`UI.themes.define()`);  the editor around the site wears those too.
 * - A project's theme file is a theme file as Spell UI's are (`ThemeFile`, `theme.schema.json`):  its names checked
 *   against the theme tree, a mistake thrown naming the file.
 *   - `extends`:  one of Spell UI's themes, or another of the project's;  its sheet goes first, its own values after.
 *   - No `palette` or `rules`:  those are files of Spell UI's themes folder (`ThemeFile.standaloneCss()`).
 * - Read afresh each time a site starts, so an edit to the file shows on the next run.
 * - No Solid, no editor:  both hosts use it.
 ****************/
export class SiteThemes {
  /**
   * Theme `name`'s look for a running site alone (epic `mockup` P8):  its tokens as one block of declarations, worn
   * inline by the site's frame, so the page around it keeps its own theme.
   * - Spell UI's own scoping (`UI.themes.scopedTokens()`), kept to the theme's plain rules:  the light and dark of a
   *   value say it themselves (`light-dark()`), so a scheme's own rules aren't needed.
   * - Its fonts join the page:  a font a shadow root declares isn't loaded, so the theme's `@font-face` rules go in a
   *   sheet of the page's own, once per theme.
   * - NOT the theme's rules on Spell UI's class words (Mockup's uneven corners):  those go on the whole page or
   *   nowhere, and the page around the site isn't the site's.
   * - `projectFolder`:  the running program's folder (`/spaces/@spell/examples/Harbor`), where a theme of its own is.
   * - Rejects on a theme in neither place, naming both;  on a project theme file that won't read, or has a mistake.
   */
  static async tokens(name: string, projectFolder: string | undefined): Promise<string> {
    const { UI } = await import("spell/ui")
    await UI.load()
    if (!UI.themes.isBuiltIn(name)) await SiteThemes.defineFromProject(name, projectFolder)
    const [scoped, sheet] = await Promise.all([UI.themes.scopedTokens(name, SITE_SCOPE), UI.themes.load(name)])
    SiteThemes.addFontsOf(name, sheet)
    const rules = new CSSStyleSheet()
    rules.replaceSync(scoped)
    return [...rules.cssRules]
      .filter(
        (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === `:root ${SITE_SCOPE}`
      )
      .map((rule) => rule.style.cssText)
      .join("  ")
  }

  /**
   * Read theme `name` from the project's folder, and define it in `UI.themes`:  what it extends first, when that's
   * the project's too.
   * - `seen`:  the themes on the way here, so one extending itself is said, not followed forever.
   * - Rejects as `tokens()` does.
   */
  private static async defineFromProject(
    name: string,
    projectFolder: string | undefined,
    seen: readonly string[] = []
  ): Promise<void> {
    const { UI } = await import("spell/ui")
    if (seen.includes(name)) {
      throw new TypeError(`SiteThemes:  theme \`${name}\` extends itself, through ${[...seen, name].join(" > ")}`)
    }
    const fileName = `${name}.theme.json5`
    const url = projectFolder && `${projectFolder}/${fileName}`
    const text = url ? await SiteThemes.fileText(url) : undefined
    if (text === undefined) {
      const inProject = url ? `no \`${url}\`` : "no project folder to look in"
      throw new TypeError(
        `SiteThemes:  no theme \`${name}\`:  Spell UI has none of that name (${UI.themes.own.join(", ")}), ` +
          `and the project has ${inProject};  make \`${fileName}\` beside the site's Spell, or name one of Spell UI's`
      )
    }
    const data = parseJSON5(text, fileName) as ThemeData
    const base = data.extends
    if (base && !UI.themes.isBuiltIn(base)) await SiteThemes.defineFromProject(base, projectFolder, [...seen, name])
    // what it extends, for `ThemeFile`'s checks:  Spell UI's files, and the project's read so far
    // - imported as it's needed, not with the host:  only a project's theme needs the theme tree
    // - directly:  the `spell/ui/styles` barrel carries every foundation sheet as text, which a host never needs
    const [{ ThemeFile }, { ThemeTokens }] = await Promise.all([
      import("spell/ui/styles/ThemeFile"),
      import("spell/ui/components/ui-theme-editor/ThemeTokens")
    ])
    const themes = { ...(await ThemeTokens.load()).themes, ...PROJECT_THEMES }
    const file = new ThemeFile({ name, data, themes })
    UI.themes.define(name, file.standaloneCss(base ? await UI.themes.load(base) : ""))
    PROJECT_THEMES[name] = data
  }

  /** The text at `url`;  `undefined` when nothing's there.  Any other failure rejects. */
  private static async fileText(url: string): Promise<string | undefined> {
    try {
      return await fetchText(url)
    } catch (error) {
      if (error instanceof MissingResourceError) return undefined
      throw error
    }
  }

  /** Theme `name`'s `@font-face` rules, out of its sheet's text, into a sheet of the page's own:  once per theme. */
  private static addFontsOf(name: string, sheetText: string): void {
    if (FONTS_ADDED.has(name)) return
    FONTS_ADDED.add(name)
    const fonts = sheetText.match(FONT_FACE) ?? []
    if (!fonts.length) return
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(fonts.join("\n"))
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
  }
}

/** The selector a site's theme is scoped to, for `UI.themes.scopedTokens()`:  the rules come back on `:root` it. */
const SITE_SCOPE = ".spell-site-frame"

/** A theme sheet's `@font-face` rules, in its CSS text (none nest a brace). */
const FONT_FACE = /@font-face\s*\{[^}]*\}/g

/** The themes whose fonts the page has. */
const FONTS_ADDED = new Set<string>()

/** The project themes read so far, by name:  what a later one may extend, for `ThemeFile`'s checks. */
const PROJECT_THEMES: Record<string, ThemeData> = {}
