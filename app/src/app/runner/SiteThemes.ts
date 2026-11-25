import { MissingResourceError } from "spell/util/spell/ResponseErrors"
import { parseJSON5 } from "spell/util/spell/json"
import type { ThemeData } from "spell/ui/styles/styles.types"
import { SpellUrls } from "spell/parser/spell/SpellUrls"
import { fetchJSON, fetchText } from "./fetchFresh"

/****************
 * ### `SiteThemes`
 * The theme a running site wears, `galaxy guide is a site with theme "mockup"`, as its host gives it
 * (`SiteHost.themeTokens()`):  the editor's Run (`RunSite`) and a page's `<spell-viewer>` (`SpellAppRunner`).
 * - The PROJECT's own first, `<name>.theme.json5` in the running program's folder, beside its Spell, or in a project
 *   it imports;  else one of Spell UI's own (`UI.themes`).
 *   - So a project's `matrix.theme.json5` wins over Spell UI's Matrix, for its site.
 *   - Which theme files there are, its server says first, in one answer (`SpellUrls.themesUrl()`):  so a name no
 *     project has, Spell UI's own, asks for no file, and the browser logs no 404.
 *     - A folder that isn't a project on Spell's server (a test's):  its own theme file, asked for as before.
 *   - A project's theme is defined into the page's ONE registry, which the editor around the site wears too:
 *     one named like Spell UI's is defined under a name of its own (`matrix@project`, `sheetName()`), as
 *     `UI.themes.define()` refuses Spell UI's names;  so the editor keeps Spell UI's.
 * - A project's theme file is a theme file as Spell UI's are (`ThemeFile`, `theme.schema.json`):  its names checked
 *   against the theme tree, a mistake thrown naming the file.
 *   - `extends`:  another of the project's themes, else one of Spell UI's, as a site's theme is looked for;
 *     its own name (`matrix` extending `"matrix"`) is Spell UI's.  Its sheet goes first, its own values after.
 *   - No `palette` or `rules`:  those are files of Spell UI's themes folder (`ThemeFile.standaloneCss()`).
 * - Read afresh each time a site starts, so an edit to the file shows on the next run.
 * - No Solid, no editor:  both hosts use it.
 * - Spell UI's runtime from `spell/ui/core`, never `spell/ui`:  a page's `<spell-viewer>` shares the page's core, and
 *   loads the rest of Spell UI tag by tag, never all of it (the app's `sharedSolid()`).
 *   - The theme tree (`ThemeTokens`, `ThemeFile`) is bundled into each build:  plain data, nothing a page shares.
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
    const { UI } = await import("spell/ui/core")
    const [themes] = await Promise.all([SiteThemes.themesFor(projectFolder), UI.load()])
    const sheetName = await SiteThemes.sheetFor(name, { projectFolder, themes })
    const [scoped, sheet] = await Promise.all([
      UI.themes.scopedTokens(sheetName, SITE_SCOPE),
      UI.themes.load(sheetName)
    ])
    SiteThemes.addFontsOf(sheetName, sheet)
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
   * The project themes read from folder `projectFolder` so far (`tokens()`), each with the theme of Spell UI's it
   * builds on, through any of the project's it extends:  what the editor's theme menu offers
   * (`EditorTheme.offerProjectThemes()`).
   * - `name`:  its name in `UI.themes`;  `file`, its file's name, only when that differs (`matrix@project`, `matrix`).
   * - `base`:  `undefined` for one that extends nothing.
   */
  static readIn(projectFolder: string): { name: string; file?: string; title?: string; base?: string }[] {
    return Object.entries(PROJECT_THEMES)
      .filter(([name]) => PROJECT_FOLDERS[name] === projectFolder)
      .map(([name, data]) => ({
        name,
        ...(FILE_NAMES[name] !== name && { file: FILE_NAMES[name] }),
        ...(data.title && { title: data.title }),
        ...SiteThemes.baseOf(name)
      }))
  }

  /**
   * The name in `UI.themes` of project theme `name`:  itself, or, named like one of Spell UI's, `<name>@project`.
   */
  private static sheetName(name: string, isBuiltIn: boolean): string {
    return isBuiltIn ? `${name}${PROJECT_SUFFIX}` : name
  }

  /** The theme of Spell UI's project theme `name` builds on, through the project's it extends:  `{ base }`, or `{}`. */
  private static baseOf(name: string): { base?: string } {
    const seen = new Set<string>()
    let base = PROJECT_THEMES[name]?.extends
    while (base && PROJECT_THEMES[base] && !seen.has(base)) {
      seen.add(base)
      base = PROJECT_THEMES[base]!.extends
    }
    return base && !PROJECT_THEMES[base] ? { base } : {}
  }

  /**
   * The theme files a site in `projectFolder` may wear, by name, its server says (`SpellUrls.themesUrl()`):  the
   * project's own, then those of the projects it imports.
   * - `{}`:  no folder.  `undefined`:  a folder its server can't say of, not a project's (`/spaces/...`), or no answer.
   */
  private static async themesFor(projectFolder: string | undefined): Promise<ThemeFiles | undefined> {
    if (!projectFolder) return {}
    if (!projectFolder.startsWith(SpellUrls.SPACES)) return undefined
    return fetchJSON<ThemeFiles>(SpellUrls.THEMES + projectFolder.slice(SpellUrls.SPACES.length))
  }

  /**
   * The name in `UI.themes` of theme `name` for a site in `looking.projectFolder`:  the project's own first, or an
   * import's, read and defined (`sheetName()`), what it extends before it;  else Spell UI's.
   * - Its file is the one `looking.themes` names;  none there, it asks for none.  With no `themes`, the project's
   *   folder's, if it's there.
   * - `seen`:  the themes on the way here, so one extending itself is said, not followed forever.
   * - Rejects as `tokens()` does.
   */
  private static async sheetFor(name: string, looking: Looking, seen: readonly string[] = []): Promise<string> {
    const { UI } = await import("spell/ui/core")
    if (seen.includes(name)) {
      throw new TypeError(`SiteThemes:  theme \`${name}\` extends itself, through ${[...seen, name].join(" > ")}`)
    }
    const { projectFolder, themes } = looking
    const fileName = `${name}.theme.json5`
    const guess = projectFolder && !themes ? `${projectFolder}/${fileName}` : undefined
    const listed = themes && Object.hasOwn(themes, name) ? themes[name] : undefined
    const text = listed ? await fetchText(listed) : guess ? await SiteThemes.fileText(guess) : undefined
    if (projectFolder && text !== undefined) {
      const data = parseJSON5(text, fileName) as ThemeData
      return SiteThemes.defineFromProject(name, data, looking, seen)
    }
    if (UI.themes.isBuiltIn(name)) return name
    const inProject = guess
      ? `the project has no \`${guess}\``
      : projectFolder
        ? `neither the project nor a project it imports has \`${fileName}\``
        : "there's no project folder to look in"
    throw new TypeError(
      `SiteThemes:  no theme \`${name}\`:  ${inProject}, ` +
        `and Spell UI has none of that name (${UI.themes.own.join(", ")});  ` +
        `make \`${fileName}\` beside the site's Spell, or name one of Spell UI's`
    )
  }

  /**
   * Define project theme `name`, its file's `data`, in `UI.themes`:  what it extends first (`sheetFor()`);
   * its name there back.
   * - Extending its own name:  Spell UI's theme of that name (a project's `matrix` built on Spell UI's).
   */
  private static async defineFromProject(
    name: string,
    data: ThemeData,
    looking: Looking,
    seen: readonly string[]
  ): Promise<string> {
    const { UI } = await import("spell/ui/core")
    const extended = data.extends
    const base =
      extended === name && UI.themes.isBuiltIn(name)
        ? name
        : extended && (await SiteThemes.sheetFor(extended, looking, [...seen, name]))
    // what it extends, for `ThemeFile`'s checks:  Spell UI's files, and the project's read so far, by their names in
    // `UI.themes`, so a project's `matrix` never hides Spell UI's
    // - imported as it's needed, not with the host:  only a project's theme needs the theme tree
    // - directly:  the `spell/ui/styles` barrel carries every foundation sheet as text, which a host never needs
    const [{ ThemeFile }, { ThemeTokens }] = await Promise.all([
      import("spell/ui/styles/ThemeFile"),
      import("spell/ui/components/ui-theme-editor/ThemeTokens")
    ])
    const sheetData: ThemeData = base ? { ...data, extends: base } : data
    const themes = { ...(await ThemeTokens.load()).themes, ...PROJECT_THEMES }
    const file = new ThemeFile({ name, data: sheetData, themes })
    const sheetName = SiteThemes.sheetName(name, UI.themes.isBuiltIn(name))
    UI.themes.define(sheetName, file.standaloneCss(base ? await UI.themes.load(base) : ""))
    PROJECT_THEMES[sheetName] = sheetData
    PROJECT_FOLDERS[sheetName] = looking.projectFolder ?? ""
    FILE_NAMES[sheetName] = name
    return sheetName
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

/**
 * The project themes read so far, by their names in `UI.themes`:  what a later one may extend, for `ThemeFile`'s
 * checks;  each `extends` that name too.
 */
const PROJECT_THEMES: Record<string, ThemeData> = {}

/** The folder each project theme was read from, by its name in `UI.themes` (`readIn()`). */
const PROJECT_FOLDERS: Record<string, string> = {}

/** Each project theme's file name, `matrix`, by its name in `UI.themes`, `matrix@project` (`readIn()`). */
const FILE_NAMES: Record<string, string> = {}

/** Theme files by theme name, as a site's server lists them:  `{ harbor: "/spaces/@acme/brand/harbor.theme.json5" }`. */
type ThemeFiles = Record<string, string>

/**
 * Where `SiteThemes.sheetFor()` looks:  the running program's folder, and the theme files its server lists
 * (`themesFor()`);  `themes` `undefined`:  its server listed none.
 */
type Looking = { projectFolder: string | undefined; themes: ThemeFiles | undefined }

/** What a project theme named like one of Spell UI's is called in `UI.themes`, after its name (`sheetName()`). */
const PROJECT_SUFFIX = "@project"
