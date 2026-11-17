import { HighlightStyle } from "@codemirror/language"
import { type Tag, tags } from "@lezer/highlight"

/****************
 * ### `CodeRules`
 * The ONE table of which code colour each kind of token takes, in every code editor
 * (epic `debut` P22;  epic `codemirror` P3):
 * a ROLE, whose colour is the page theme's `--ui-code-<role>` token, light and dark (Spell UI's `codeRoles`).
 * - Its roles were Shades of Purple's, the code's colours under every theme until P22 (`ShadesOfPurple`, ported
 *   from Ahmad Awais's VS Code theme):  those colours are now the Spell theme's own, in its theme file.
 * - `codeMirrorStyle`:  another language's code (the compiled javascript, TypeScript, Python, a CSS file), by CodeMirror's
 *   highlight tags (`TAG_ROLES`), each colour a `var(--ui-code-<role>)`, so light and dark follow the page
 * - `roleForScope()`:  Spell's own tokens, as the parser's highlighter names them (highlight.js scopes,
 *   `SP.SpellHighlighter.SCOPES`), for `CodeMirrorTokens`
 * - `styleFor()`:  a role's CSS, the same for both
 * - Comments italic, headings bold and italic, as the code's colours always had them.
 * - Its position in the import graph:  CodeMirror's highlight styles, nothing of the app.
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
   * The role of a Spell token the parser's highlighter found, by its highlight.js scope (`SP.SpellHighlightSpan.kind`):
   * the one the compiled code's like token takes.
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

/** A role's look in CSS (`CodeRules.styleFor()`):  CodeMirror's style spec's names. */
export type CodeRoleStyle = {
  /** `var(--ui-code-<role>)` */
  color: string
  /** `"italic"`, for comments and headings */
  fontStyle?: string
  /** `"bold"`, for headings */
  fontWeight?: string
}

/** Each role's weight and slant, where it has one. */
const ROLE_FONTS: Partial<Record<CodeRole, Omit<CodeRoleStyle, "color">>> = {
  comment: { fontStyle: "italic" },
  heading: { fontStyle: "italic", fontWeight: "bold" }
}

/**
 * Each highlight.js scope the parser's highlighter gives a Spell token (`SP.SpellHighlighter.SCOPES`, `HEADING`), and
 * the role it takes:
 * - `params`:  a parameter;  `literal`:  a constant (one of a type's words);  `title.function`:  an action
 * - `operator`:  `punctuation`
 * - `section`, a `#` heading:  a heading
 * - `name` and `attr`, a page file's markup and tags (`CodeMirrorTokens.pageSpans()`):
 *   a tag's name a `tag`, an attribute's name a `member`, as `TAG_ROLES` colours another language's
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
  section: "heading",
  name: "tag",
  attr: "member"
}

/**
 * CodeMirror's highlight tags, and the role each takes:  as Spell's own like token takes (`SCOPE_ROLES`).
 * - An attribute's name is a `member`.
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
  // `labelName`:  a CSS `#id`, coloured as a `.class` is
  [[tags.typeName, tags.className, tags.namespace, tags.labelName], "type"],
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
  // `unit` and `color`:  CSS's `px` of `12px`, and `#fff`
  [[tags.number, tags.unit, tags.color, tags.bool, tags.null, tags.atom], "constant"],
  [[tags.string, tags.special(tags.string), tags.regexp, tags.attributeValue], "string"],
  [[tags.tagName], "tag"],
  [
    [tags.operator, tags.punctuation, tags.bracket, tags.separator, tags.derefOperator, tags.angleBracket],
    "punctuation"
  ]
]
