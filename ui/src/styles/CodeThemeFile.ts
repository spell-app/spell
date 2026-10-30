import { codeRoles } from "./styles.en"

/****************
 * ### `CodeThemeFile`
 * One Spell theme, in one scheme, as a VS Code colour theme (epic `debut` P22, Owen:  "make a VSC theme to match each
 * theme, in both light and dark"):  "Spell Matrix Dark" wears Matrix's surfaces, accent and code colours.
 * - Takes the theme's colours already worked out (`CodeThemeColors`:  each token as the browser paints it, `#rrggbb`
 *   or `#rrggbbaa`), and writes the theme's JSON:
 *   - `tokenColors`:  the code's roles (`codeRoles`) onto TextMate scopes, Spell's grammars' and the common ones, so
 *     TypeScript, CSS and JSON look right too
 *   - `semanticTokenColors`:  the language server's token types (`type`, `parameter`, `comment.heading1` ...)
 *   - `colors`:  the editor's own (`code > editor`) and the workbench's, from the theme's surfaces, borders, text
 *     and primary:  side bar and activity bar the page, the editor the panel, tabs, status bar, buttons, lists
 * - PURE:  colours in, JSON out, no file system and no browser, as `ThemeFile`.
 *   The Spell extension's build works the colours out in a headless browser (`vscodeThemes.ts`, in the app folder)
 *   and writes each file into its `themes/`.
 * - Imports only its own folder's vocabulary:  never the element layer.
 ****************/
export class CodeThemeFile {
  /** the theme's name:  `matrix` */
  readonly name: string

  /** the scheme this file is:  `light` or `dark` */
  readonly scheme: CodeThemeScheme

  /** the theme's colours in that scheme, by token */
  readonly colors: CodeThemeColors

  constructor({ name, scheme, colors }: CodeThemeFileProps) {
    this.name = name
    this.scheme = scheme
    this.colors = colors
  }

  /** Its title in VS Code's theme picker:  `Spell Matrix Dark`;  the Spell theme's, `Spell Dark`. */
  get label(): string {
    return ["Spell", ...(this.name === SPELL ? [] : [titleOf(this.name)]), titleOf(this.scheme)].join(" ")
  }

  /** Its file's name, in the extension's `themes/`:  `spell-matrix-dark.json`;  the Spell theme's, `spell-dark.json`. */
  get fileName(): string {
    return `${["spell", ...(this.name === SPELL ? [] : [this.name]), this.scheme].join("-")}.json`
  }

  /** Its entry in the extension's `contributes.themes`. */
  get contribution(): CodeThemeContribution {
    return { label: this.label, uiTheme: this.scheme === "dark" ? "vs-dark" : "vs", path: `./themes/${this.fileName}` }
  }

  /** The theme, as VS Code reads a colour theme file. */
  json(): Record<string, unknown> {
    return {
      $schema: "vscode://schemas/color-theme",
      name: this.label,
      type: this.scheme,
      semanticHighlighting: true,
      colors: this.workbench(),
      tokenColors: this.tokenColors(),
      semanticTokenColors: this.semanticTokenColors()
    }
  }

  /** `json()` as the file's text:  2 spaces, a newline at its end. */
  text(): string {
    return `${JSON.stringify(this.json(), null, 2)}\n`
  }

  ////////////////
  // ## Code
  ////////////////

  /** Role `role`'s colour:  `--ui-code-<role>` (`text`:  `--ui-code-color`). */
  role(role: CodeThemeRole): string {
    return this.color(role === "text" ? "--ui-code-color" : `--ui-code-${role}`)
  }

  /** `tokenColors`:  each role onto its TextMate scopes (`SCOPES`);  headings bold, comments italic. */
  private tokenColors(): Array<Record<string, unknown>> {
    return Object.entries(SCOPES).map(([role, scope]) => ({
      name: role,
      scope,
      settings: {
        foreground: this.role(role as CodeThemeRole),
        ...(FONT_STYLES[role as CodeThemeRole] && { fontStyle: FONT_STYLES[role as CodeThemeRole] })
      }
    }))
  }

  /** `semanticTokenColors`:  the language server's token types (`SEMANTIC`), headings bold and italic. */
  private semanticTokenColors(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [token, role] of Object.entries(SEMANTIC)) {
      const style = FONT_STYLES[role]
      out[token] = style
        ? { foreground: this.role(role), bold: style.includes("bold"), italic: style.includes("italic") }
        : this.role(role)
    }
    return out
  }

  ////////////////
  // ## The workbench
  ////////////////

  /**
   * `colors`:  the editor's and the workbench's, about 40 keys, from the theme's own:
   * - the side bar, activity bar, panel and title bar the page;  the editor and its tabs the panel
   * - text, muted text and borders;  the primary for buttons, badges, focus and the status bar
   */
  private workbench(): Record<string, string> {
    const page = this.color("--ui-background")
    const panel = this.color("--ui-surface")
    const inset = this.color("--ui-surface-muted")
    const text = this.color("--ui-text-color")
    const muted = this.color("--ui-text-muted")
    const border = this.color("--ui-border-color")
    const primary = this.color("--ui-primary")
    const onPrimary = this.color("--ui-primary-on")
    return {
      foreground: text,
      descriptionForeground: muted,
      focusBorder: primary,
      "widget.border": border,
      "selection.background": this.color("--ui-code-selection"),
      "editor.background": panel,
      "editor.foreground": this.role("text"),
      "editorCursor.foreground": this.color("--ui-code-cursor"),
      "editor.selectionBackground": this.color("--ui-code-selection"),
      "editor.lineHighlightBackground": this.color("--ui-code-current-line"),
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": this.color("--ui-code-gutter-color"),
      "editorLineNumber.activeForeground": this.color("--ui-code-gutter-active"),
      "editorBracketMatch.background": this.color("--ui-code-bracket"),
      "editorBracketMatch.border": this.color("--ui-code-bracket"),
      "editor.findMatchBackground": this.color("--ui-code-find"),
      "editor.findMatchHighlightBackground": this.color("--ui-code-find"),
      "editorGutter.background": panel,
      "editorWidget.background": inset,
      "editorWidget.border": border,
      "editorHoverWidget.background": inset,
      "editorHoverWidget.border": border,
      "editorSuggestWidget.background": inset,
      "editorSuggestWidget.border": border,
      "editorStickyScroll.background": panel,
      "editorGroupHeader.tabsBackground": page,
      "editorGroup.border": border,
      "tab.activeBackground": panel,
      "tab.activeForeground": text,
      "tab.inactiveBackground": page,
      "tab.inactiveForeground": muted,
      "tab.border": border,
      "tab.activeBorderTop": primary,
      "sideBar.background": page,
      "sideBar.foreground": text,
      "sideBar.border": border,
      "sideBarSectionHeader.background": page,
      "sideBarTitle.foreground": muted,
      "activityBar.background": page,
      "activityBar.foreground": text,
      "activityBar.inactiveForeground": muted,
      "activityBar.border": border,
      "activityBarBadge.background": primary,
      "activityBarBadge.foreground": onPrimary,
      "titleBar.activeBackground": page,
      "titleBar.activeForeground": text,
      "titleBar.inactiveBackground": page,
      "titleBar.inactiveForeground": muted,
      "titleBar.border": border,
      "statusBar.background": page,
      "statusBar.foreground": muted,
      "statusBar.border": border,
      "statusBarItem.remoteBackground": primary,
      "statusBarItem.remoteForeground": onPrimary,
      "panel.background": page,
      "panel.border": border,
      "panelTitle.activeForeground": text,
      "panelTitle.activeBorder": primary,
      "terminal.background": page,
      "terminal.foreground": text,
      "button.background": primary,
      "button.foreground": onPrimary,
      "badge.background": primary,
      "badge.foreground": onPrimary,
      "input.background": inset,
      "input.foreground": text,
      "input.border": border,
      "dropdown.background": inset,
      "dropdown.border": border,
      "list.activeSelectionBackground": this.color("--ui-code-selection"),
      "list.activeSelectionForeground": text,
      "list.inactiveSelectionBackground": this.color("--ui-code-current-line"),
      "list.hoverBackground": this.color("--ui-code-current-line"),
      "list.focusOutline": primary,
      "textLink.foreground": this.color("--ui-primary-text"),
      "textLink.activeForeground": this.color("--ui-primary-text"),
      "editorError.foreground": this.color("--ui-negative"),
      "editorWarning.foreground": this.color("--ui-warning"),
      "editorInfo.foreground": this.color("--ui-info")
    }
  }

  /** Token `token`'s colour;  throws a `TypeError` when the caller worked out none. */
  private color(token: string): string {
    const color = this.colors[token]
    if (!color) {
      throw new TypeError(
        `CodeThemeFile:  ${this.name} ${this.scheme} has no colour for \`${token}\`;  work out every one of ` +
          "`CodeThemeFile.TOKENS`"
      )
    }
    return color
  }

  /** Every token a theme's colours must hold:  what `colors` is handed. */
  static readonly TOKENS: readonly string[] = [
    "--ui-code-color",
    ...Object.keys(codeRoles).map((role) => `--ui-code-${role}`),
    "--ui-code-cursor",
    "--ui-code-selection",
    "--ui-code-current-line",
    "--ui-code-gutter-color",
    "--ui-code-gutter-active",
    "--ui-code-bracket",
    "--ui-code-find",
    "--ui-background",
    "--ui-surface",
    "--ui-surface-muted",
    "--ui-text-color",
    "--ui-text-muted",
    "--ui-border-color",
    "--ui-primary",
    "--ui-primary-on",
    "--ui-primary-text",
    "--ui-negative",
    "--ui-warning",
    "--ui-info"
  ]
}

/** What `new CodeThemeFile()` takes. */
export type CodeThemeFileProps = {
  /** the theme's name:  `matrix` */
  name: string
  /** the scheme:  `light` or `dark` */
  scheme: CodeThemeScheme
  /** every one of `CodeThemeFile.TOKENS`, as painted:  `#rrggbb`, `#rrggbbaa` when see-through */
  colors: CodeThemeColors
}

/** A scheme a VS Code theme is drawn in. */
export type CodeThemeScheme = "light" | "dark"

/** A theme's colours in one scheme, by token:  `--ui-code-keyword` => `#a3e1c0`. */
export type CodeThemeColors = Readonly<Record<string, string>>

/** One entry of the extension's `contributes.themes`. */
export type CodeThemeContribution = { label: string; uiTheme: "vs" | "vs-dark"; path: string }

/** A code role:  the text, or one of `codeRoles`. */
export type CodeThemeRole = "text" | keyof typeof codeRoles

/** The Spell theme's name:  its VS Code themes are "Spell Dark" and "Spell Light", not "Spell Spell". */
const SPELL = "spell"

/** `name` as a title:  `matrix` => `Matrix`. */
function titleOf(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Each role's TextMate scopes:  Spell's grammars' (`spell.tmLanguage.json`, `spellx.tmLanguage.json`), then the
 * common ones TypeScript's, CSS's, HTML's and JSON's grammars use.
 */
const SCOPES: Readonly<Record<CodeThemeRole, string[]>> = {
  text: ["source", "text"],
  heading: ["comment.line.number-sign.heading.spell", "markup.heading", "entity.name.section"],
  comment: ["comment", "punctuation.definition.comment"],
  keyword: ["keyword", "storage", "keyword.control.spell", "keyword.operator.word.spell", "entity.name.tag.spellx"],
  type: ["entity.name.type", "entity.name.class", "support.class", "support.type"],
  library: ["support.type.primitive", "support.type.builtin", "entity.name.type.primitive"],
  name: ["variable", "variable.other.readwrite"],
  member: [
    "variable.other.property",
    "variable.other.object.property",
    "support.type.property-name",
    "meta.object-literal.key"
  ],
  parameter: ["variable.parameter"],
  action: ["entity.name.function", "support.function", "meta.function-call"],
  constant: ["constant", "constant.numeric", "constant.language", "constant.character.escape", "support.constant"],
  string: ["string", "string.quoted", "markup.inline.raw"],
  tag: ["entity.name.tag", "entity.name.tag.spell", "support.class.component"],
  punctuation: ["punctuation", "keyword.operator", "punctuation.definition.tag", "meta.brace"],
  attr: ["entity.other.attribute-name", "entity.other.attribute-name.spellx"],
  meta: ["meta.preprocessor", "keyword.control.import", "keyword.control.directive"],
  addition: ["markup.inserted"],
  deletion: ["markup.deleted", "invalid"]
}

/** The language server's semantic token types (`LSP.SpellLanguageService.TOKEN_LEGEND`), and each one's role. */
const SEMANTIC: Readonly<Record<string, CodeThemeRole>> = {
  keyword: "keyword",
  type: "type",
  "type.defaultLibrary": "library",
  class: "type",
  variable: "name",
  property: "member",
  parameter: "parameter",
  function: "action",
  method: "action",
  enumMember: "constant",
  number: "constant",
  string: "string",
  comment: "comment",
  "comment.heading1": "heading",
  "comment.heading2": "heading",
  "comment.heading3": "heading",
  "comment.heading4": "heading"
}

/** The roles drawn in a style of their own:  headings bold and italic, comments italic (as the editor's). */
const FONT_STYLES: Partial<Record<CodeThemeRole, string>> = {
  heading: "bold italic",
  comment: "italic"
}
