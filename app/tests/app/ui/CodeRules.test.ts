import { describe, expect, test } from "vite-plus/test"
import { tags, type Tag } from "@lezer/highlight"

import { SP } from "spell/parser/spell"
import { CodeRules, type CodeInk, type CodeRole } from "spell/app/app/ui/CodeRules"

/**
 * `CodeRules`, the ONE table of code colours:  CodeMirror's half gives each token the role Monaco's rule for the like
 * token does, so a token is the same colour in either editor.
 * - Monaco's rules are read with an ink whose every colour names its role, so a rule's colour IS its role.
 */
describe("CodeRules", () => {
  const ink = Object.fromEntries(CodeRules.ROLES.map((role) => [role, role])) as CodeInk

  /** The role Monaco's rule for `token` gives it. */
  function monacoRole(token: string): CodeRole | undefined {
    return CodeRules.rules(ink).find((rule) => rule.token === token)?.foreground as CodeRole | undefined
  }

  /** Monaco's token, and CodeMirror's highlight tag for the like token. */
  const MONACO_TO_CODEMIRROR: Array<[string, Tag]> = [
    ["keyword", tags.keyword],
    ["string", tags.string],
    ["number", tags.number],
    ["comment", tags.comment],
    ["type", tags.typeName],
    ["class", tags.className],
    ["type.defaultLibrary", tags.standard(tags.typeName)],
    ["variable", tags.variableName],
    ["function", tags.function(tags.variableName)],
    ["property", tags.propertyName],
    ["attribute.name", tags.attributeName],
    ["attribute.value", tags.attributeValue],
    ["tag", tags.tagName],
    ["delimiter", tags.punctuation],
    ["operator", tags.operator]
  ]

  test.each(MONACO_TO_CODEMIRROR)("Monaco's `%s` and CodeMirror's like tag take the same role", (token, tag) => {
    expect(monacoRole(token)).toBeDefined()
    expect(CodeRules.roleForTag(tag)).toBe(monacoRole(token))
  })

  test("an attribute's name is a `member`, as Monaco's `attribute.name` is", () => {
    expect(CodeRules.roleForTag(tags.attributeName)).toBe("member")
  })

  /** Each highlight.js scope the parser's highlighter gives a Spell token, and Monaco's token for the same. */
  const SCOPE_TO_MONACO: Array<[string, string]> = [
    [SP.SpellHighlighter.SCOPES.keyword, "keyword"],
    [SP.SpellHighlighter.SCOPES.operator, "operator"],
    [SP.SpellHighlighter.SCOPES.variable, "variable"],
    [SP.SpellHighlighter.SCOPES.parameter, "parameter"],
    [SP.SpellHighlighter.SCOPES.type, "type"],
    [SP.SpellHighlighter.SCOPES.enumMember, "enumMember"],
    [SP.SpellHighlighter.SCOPES.function, "function"],
    [SP.SpellHighlighter.SCOPES.property, "property"],
    [SP.SpellHighlighter.SCOPES.number, "number"],
    [SP.SpellHighlighter.SCOPES.string, "string"],
    [SP.SpellHighlighter.SCOPES.comment, "comment"],
    [SP.SpellHighlighter.HEADING, "comment.header"]
  ]

  test("every scope the parser's highlighter gives is mapped", () => {
    const scopes = [...Object.values(SP.SpellHighlighter.SCOPES), SP.SpellHighlighter.HEADING]
    expect(SCOPE_TO_MONACO.map(([scope]) => scope).sort()).toEqual(scopes.sort())
  })

  test.each(SCOPE_TO_MONACO)("a Spell token of scope `%s` takes the role of Monaco's `%s`", (scope, token) => {
    expect(CodeRules.roleForScope(scope)).toBe(monacoRole(token))
  })

  test("a role's look:  its page token, and comments italic, headings bold italic, as Monaco's rules", () => {
    expect(CodeRules.styleFor("keyword")).toEqual({ color: "var(--ui-code-keyword)" })
    expect(CodeRules.styleFor("text")).toEqual({ color: "var(--ui-code-color)" })
    expect(CodeRules.styleFor("comment")).toEqual({ color: "var(--ui-code-comment)", fontStyle: "italic" })
    expect(CodeRules.styleFor("heading")).toEqual({
      color: "var(--ui-code-heading)",
      fontStyle: "italic",
      fontWeight: "bold"
    })
    expect(CodeRules.rules(ink)).toContainEqual({ token: "comment", foreground: "comment", fontStyle: "italic" })
  })

  test("CodeMirror's style has a class for every tag in the table", () => {
    for (const [, tag] of MONACO_TO_CODEMIRROR) expect(CodeRules.codeMirrorStyle.style([tag])).toBeTruthy()
  })
})
