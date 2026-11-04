import type { monaco } from "spell/app/app/ui/monaco/monaco"

// Above the class:  its static `ROLES` reads it while the class is defined
/** Heading levels with a semantic modifier of their own:  `heading1` ... `heading4` (`TOKEN_LEGEND`). */
const HEADING_LEVELS = [1, 2, 3, 4]

/****************
 * ### `CodeRules`
 * Which of spell's tokens the editor colours with which of the theme's code colours (epic `debut` P22):
 * `--ui-code-<role>`, every theme's, light and dark (Spell UI's `codeRoles`).
 * - Its roles were Shades of Purple's, the code's colours under every theme until P22 (`ShadesOfPurple`, ported
 *   from Ahmad Awais's VS Code theme):  those colours are now the Spell theme's own, in its theme file.
 * - Rules for spell's OWN token names, as both colourings name them:
 *   - the instant colouring's scopes (`SpellTokensProvider`):  `comment.header` (a `#` heading), `comment`, `string`,
 *     `number`, `operator`, `identifier`, and `tag` / `delimiter` round a `<css>` block
 *     - a `.spellml` tag's too:  its word a `keyword`, its attributes' names `attribute.name`, its `<`, `>` and closers
 *       `delimiter`
 *   - the parse's semantic token types (`LSP.SpellLanguageService.TOKEN_LEGEND`):  `keyword`, `type`, `variable`,
 *     `parameter`, `property`, `function`, `enumMember` ...;
 *     Monaco matches a token with modifiers as `type.modifier`, so `comment.heading2` is a `##` heading
 *   - Monaco's own colouring of `<css>` and `<markdown>` blocks:  `attribute.name`, `attribute.value`, `keyword.md` ...
 * - Data only:  `CodeThemes` reads the colours off the page and hands them here.
 ****************/
export class CodeRules {
  /** The roles the rules colour by:  each one's token is `--ui-code-<role>` (`text`:  `--ui-code-color`). */
  static readonly ROLES = [
    "text",
    "heading",
    "comment",
    "keyword",
    "type",
    "library",
    "name",
    "member",
    "parameter",
    "action",
    "constant",
    "string",
    "tag",
    "punctuation"
  ] as const

  /**
   * Monaco's token rules for one scheme's `ink`:  spell's names, and the embedded blocks'.
   * - Headings bold and italic (the `#` comments that title a part of a file), comments italic.
   */
  static rules(ink: CodeInk): monaco.editor.ITokenThemeRule[] {
    const rule = (token: string, foreground: string, fontStyle?: string): monaco.editor.ITokenThemeRule =>
      fontStyle ? { token, foreground, fontStyle } : { token, foreground }
    return [
      rule("", ink.text),
      rule("identifier", ink.name),
      rule("comment", ink.comment, "italic"),
      rule("comment.header", ink.heading, "bold italic"),
      ...HEADING_LEVELS.map((level) => rule(`comment.heading${level}`, ink.heading, "bold italic")),
      rule("keyword", ink.keyword),
      rule("operator", ink.punctuation),
      rule("delimiter", ink.punctuation),
      rule("type", ink.type),
      rule("type.defaultLibrary", ink.library),
      rule("class", ink.type),
      rule("variable", ink.name),
      rule("property", ink.member),
      rule("parameter", ink.parameter),
      rule("function", ink.action),
      rule("enumMember", ink.constant),
      rule("number", ink.constant),
      rule("string", ink.string),
      rule("tag", ink.tag),
      rule("attribute.name", ink.member),
      rule("attribute.value", ink.string),
      rule("keyword.md", ink.heading, "bold"),
      rule("string.link.md", ink.member),
      rule("variable.md", ink.member),
      rule("emphasis", ink.text, "italic"),
      rule("strong", ink.text, "bold")
    ]
  }
}

/** One of `CodeRules.ROLES`. */
export type CodeRole = (typeof CodeRules.ROLES)[number]

/** One scheme's code colours, by role:  hex, no `#` (Monaco's rule format). */
export type CodeInk = Record<CodeRole, string>
