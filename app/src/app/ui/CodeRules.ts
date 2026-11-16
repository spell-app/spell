import { HighlightStyle } from "@codemirror/language"
import { type Tag, tags } from "@lezer/highlight"
import type { monaco } from "spell/app/app/ui/monaco/monaco"

// Above the class:  its static `ROLES` reads it while the class is defined
/** Heading levels with a semantic modifier of their own:  `heading1` ... `heading4` (`TOKEN_LEGEND`). */
const HEADING_LEVELS = [1, 2, 3, 4]

/****************
 * ### `CodeRules`
 * The ONE table of which code colour each kind of token takes, in Monaco and in CodeMirror alike (epic `debut` P22;
 * epic `codemirror` P3):  a ROLE, whose colour is the page theme's `--ui-code-<role>` token, light and dark
 * (Spell UI's `codeRoles`).
 * - Its roles were Shades of Purple's, the code's colours under every theme until P22 (`ShadesOfPurple`, ported
 *   from Ahmad Awais's VS Code theme):  those colours are now the Spell theme's own, in its theme file.
 * - Monaco's half, `rules()`:  rules for spell's OWN token names, as both its colourings name them:
 *   - the instant colouring's scopes (`SpellTokensProvider`):  `comment.header` (a `#` heading), `comment`, `string`,
 *     `number`, `operator`, `identifier`, and `tag` / `delimiter` round a `<css>` block
 *     - a `.spell` tag's too:  its word a `keyword`, its attributes' names `attribute.name`, its `<`, `>` and closers
 *       `delimiter`
 *   - the parse's semantic token types (`LSP.SpellLanguageService.TOKEN_LEGEND`):  `keyword`, `type`, `variable`,
 *     `parameter`, `property`, `function`, `enumMember` ...;
 *     Monaco matches a token with modifiers as `type.modifier`, so `comment.heading2` is a `##` heading
 *   - Monaco's own colouring of `<css>` and `<markdown>` blocks:  `attribute.name`, `attribute.value`, `keyword.md` ...
 *   - Data only:  `CodeThemes` reads the colours off the page and hands them here.
 * - CodeMirror's half:
 *   - `codeMirrorStyle`:  another language's code (the compiled javascript, TypeScript, Python), by CodeMirror's
 *     highlight tags (`TAG_ROLES`), each colour a `var(--ui-code-<role>)`, so light and dark follow the page
 *   - `roleForScope()`:  Spell's own tokens, as the parser's highlighter names them (highlight.js scopes,
 *     `SP.SpellHighlighter.SCOPES`), for `CodeMirrorTokens`
 *   - `styleFor()`:  a role's CSS, the same for both
 * - Bold and italic as Monaco's rules have them:  comments italic, headings bold and italic.
 * - Its position in the import graph:  CodeMirror's highlight styles, Monaco's TYPES only.
 *   Monaco's themes and CodeMirror's views both import it, so CodeMirror's `@codemirror/language` rides in Monaco's
 *   lazy chunk too.
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

  /**
   * The role of a Spell token the parser's highlighter found, by its highlight.js scope (`SP.SpellHighlightSpan.kind`):
   * the one Monaco's rule for the same token gives it.
   * - `undefined` for a scope it doesn't colour:  plain text.
   */
  static roleForScope(scope: string): CodeRole | undefined {
    return SCOPE_ROLES[scope]
  }

  /** The role CodeMirror's style gives `tag`, exactly as listed in `TAG_ROLES`;  `undefined` for none. */
  static roleForTag(tag: Tag): CodeRole | undefined {
    return TAG_ROLES.find(([tagsOfRole]) => tagsOfRole.includes(tag))?.[1]
  }

  /**
   * A role's look, as CSS:  its colour, `var(--ui-code-<role>)`, and its weight and slant.
   * - e.g. `{ color: "var(--ui-code-comment)", fontStyle: "italic" }`
   */
  static styleFor(role: CodeRole): CodeRoleStyle {
    return { color: `var(${CodeRules.tokenFor(role)})`, ...ROLE_FONTS[role] }
  }

  /** A role's page token:  `--ui-code-<role>`, `text`'s `--ui-code-color`. */
  static tokenFor(role: CodeRole): string {
    return role === "text" ? "--ui-code-color" : `--ui-code-${role}`
  }

  /**
   * CodeMirror's style for another language's code, by its highlight tags (`TAG_ROLES`), made on first use:
   * hand it to `syntaxHighlighting()`.
   */
  static get codeMirrorStyle(): HighlightStyle {
    CodeRules._codeMirrorStyle ??= HighlightStyle.define(
      TAG_ROLES.map(([tag, role]) => ({ tag, ...CodeRules.styleFor(role) }))
    )
    return CodeRules._codeMirrorStyle
  }
  private static _codeMirrorStyle: HighlightStyle | undefined
}

/** One of `CodeRules.ROLES`. */
export type CodeRole = (typeof CodeRules.ROLES)[number]

/** One scheme's code colours, by role:  hex, no `#` (Monaco's rule format). */
export type CodeInk = Record<CodeRole, string>

/** A role's look in CSS (`CodeRules.styleFor()`):  CodeMirror's style spec's names. */
export type CodeRoleStyle = {
  /** `var(--ui-code-<role>)` */
  color: string
  /** `"italic"`, for comments and headings */
  fontStyle?: string
  /** `"bold"`, for headings */
  fontWeight?: string
}

/** Each role's weight and slant, where it has one:  as Monaco's rules' `fontStyle`. */
const ROLE_FONTS: Partial<Record<CodeRole, Omit<CodeRoleStyle, "color">>> = {
  comment: { fontStyle: "italic" },
  heading: { fontStyle: "italic", fontWeight: "bold" }
}

/**
 * Each highlight.js scope the parser's highlighter gives a Spell token (`SP.SpellHighlighter.SCOPES`, `HEADING`), and
 * the role Monaco's rule for the same token takes:
 * - `params`:  Monaco's `parameter`;  `literal`:  its `enumMember`;  `title.function`:  its `function`
 * - `operator`:  `punctuation`, as Monaco's `operator` is
 * - `section`, a `#` heading:  Monaco's `comment.header`
 */
const SCOPE_ROLES: Readonly<Record<string, CodeRole>> = {
  keyword: "keyword",
  operator: "punctuation",
  variable: "name",
  params: "parameter",
  type: "type",
  literal: "constant",
  "title.function": "action",
  property: "member",
  number: "constant",
  string: "string",
  comment: "comment",
  section: "heading"
}

/**
 * CodeMirror's highlight tags, and the role each takes:  as Monaco's rule for the like token.
 * - An attribute's name is a `member`, as Monaco's `attribute.name` is.
 * - A tag listed more specifically (`function(variableName)`) wins over its plain one (`variableName`).
 */
const TAG_ROLES: ReadonlyArray<readonly [Tag[], CodeRole]> = [
  [[tags.heading], "heading"],
  [[tags.comment, tags.lineComment, tags.blockComment, tags.docComment], "comment"],
  [
    [
      tags.keyword,
      tags.controlKeyword,
      tags.moduleKeyword,
      tags.definitionKeyword,
      tags.operatorKeyword,
      tags.modifier,
      tags.self
    ],
    "keyword"
  ],
  [[tags.typeName, tags.className, tags.namespace], "type"],
  [[tags.standard(tags.typeName), tags.standard(tags.variableName)], "library"],
  [[tags.variableName, tags.definition(tags.variableName)], "name"],
  [[tags.propertyName, tags.definition(tags.propertyName), tags.attributeName], "member"],
  [
    [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.function(tags.definition(tags.variableName))
    ],
    "action"
  ],
  [[tags.number, tags.bool, tags.null, tags.atom], "constant"],
  [[tags.string, tags.special(tags.string), tags.regexp, tags.attributeValue], "string"],
  [[tags.tagName], "tag"],
  [
    [tags.operator, tags.punctuation, tags.bracket, tags.separator, tags.derefOperator, tags.angleBracket],
    "punctuation"
  ]
]
