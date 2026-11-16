import { describe, expect, test } from "vite-plus/test"
import { tags, type Tag } from "@lezer/highlight"

import { SP } from "spell/parser/spell"
import { CodeRules, type CodeRole } from "spell/app/app/ui/CodeRules"

/**
 * `CodeRules`, the ONE table of code colours:  each kind of token takes the role it always has, so a token is the same
 * colour in the code, the compiled code and a snippet.
 * - The roles are the ones the code always had (epic `debut` P22).
 */
describe("CodeRules", () => {
  /** CodeMirror's highlight tag for a kind of token, and the role it takes. */
  const TAG_ROLES: Array<[string, Tag, CodeRole]> = [
    ["keyword", tags.keyword, "keyword"],
    ["string", tags.string, "string"],
    ["number", tags.number, "constant"],
    ["comment", tags.comment, "comment"],
    ["typeName", tags.typeName, "type"],
    ["className", tags.className, "type"],
    ["standard typeName", tags.standard(tags.typeName), "library"],
    ["variableName", tags.variableName, "name"],
    ["function variableName", tags.function(tags.variableName), "action"],
    ["propertyName", tags.propertyName, "member"],
    ["attributeName", tags.attributeName, "member"],
    ["attributeValue", tags.attributeValue, "string"],
    ["tagName", tags.tagName, "tag"],
    ["punctuation", tags.punctuation, "punctuation"],
    ["operator", tags.operator, "punctuation"]
  ]

  test.each(TAG_ROLES)("CodeMirror's `%s` takes its role", (_name, tag, role) => {
    expect(CodeRules.roleForTag(tag)).toBe(role)
  })

  /** Each highlight.js scope the parser's highlighter gives a Spell token, and the role it takes. */
  const SCOPE_ROLES: Array<[string, CodeRole]> = [
    [SP.SpellHighlighter.SCOPES.keyword, "keyword"],
    [SP.SpellHighlighter.SCOPES.operator, "punctuation"],
    [SP.SpellHighlighter.SCOPES.variable, "name"],
    [SP.SpellHighlighter.SCOPES.parameter, "parameter"],
    [SP.SpellHighlighter.SCOPES.type, "type"],
    [SP.SpellHighlighter.SCOPES.enumMember, "constant"],
    [SP.SpellHighlighter.SCOPES.function, "action"],
    [SP.SpellHighlighter.SCOPES.property, "member"],
    [SP.SpellHighlighter.SCOPES.number, "constant"],
    [SP.SpellHighlighter.SCOPES.string, "string"],
    [SP.SpellHighlighter.SCOPES.comment, "comment"],
    [SP.SpellHighlighter.HEADING, "heading"]
  ]

  test("every scope the parser's highlighter gives is mapped", () => {
    const scopes = [...Object.values(SP.SpellHighlighter.SCOPES), SP.SpellHighlighter.HEADING]
    expect(SCOPE_ROLES.map(([scope]) => scope).sort()).toEqual(scopes.sort())
  })

  test.each(SCOPE_ROLES)("a Spell token of scope `%s` takes the role `%s`", (scope, role) => {
    expect(CodeRules.roleForScope(scope)).toBe(role)
  })

  test("a role's look:  its page token, and comments italic, headings bold italic", () => {
    expect(CodeRules.styleFor("keyword")).toEqual({ color: "var(--ui-code-keyword)" })
    expect(CodeRules.styleFor("text")).toEqual({ color: "var(--ui-code-color)" })
    expect(CodeRules.styleFor("comment")).toEqual({ color: "var(--ui-code-comment)", fontStyle: "italic" })
    expect(CodeRules.styleFor("heading")).toEqual({
      color: "var(--ui-code-heading)",
      fontStyle: "italic",
      fontWeight: "bold"
    })
  })

  test("CodeMirror's style has a class for every tag in the table", () => {
    for (const [, tag] of TAG_ROLES) expect(CodeRules.codeMirrorStyle.style([tag])).toBeTruthy()
  })
})
