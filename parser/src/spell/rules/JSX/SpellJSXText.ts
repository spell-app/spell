import { decodeHTMLStrict } from "entities"

import { dedent, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { type FillInParts, fillInsAST, parseFillIns } from "spell-parser/spell/rules/core"

/**
 * `jsxText` rule:  match literal text between JSX tags (`jsxChild`).  Blank text yields no AST node -- see below.
 * - e.g. `hello` (literal text between JSX tags)
 * - Its entities are characters, as JSX reads them:  `&lt;` is `<`, `&#123;` is `{` (epic `elemental-spell` P24).
 * - A raw-text element's (`<script>`, `<style>`:  `P.JSXRawTextToken`) is taken as written:  no fill-ins, its lines
 *   kept, its entities left as they are.
 * - NOTE: rule name is `jsxText`, kept distinct from class name `SpellJSXText` (pre-existing convention).
 */
export class SpellJSXText extends P.TokenType<never, { fillIns?: FillInParts }> {
  static ruleName = "jsxText"
  @proto static alias = "jsxChild"
  @proto static tokenType = P.JSXTextToken

  /**
   * Match -- and parse any `[name]` fill-ins, e.g. `<span>[rank] of [suit]</span>`, as text's (`parseFillIns()`).
   * - A fill-in which doesn't parse:  no match.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const [token] = tokens
    if (!match || !(token instanceof P.JSXTextToken)) return match
    // a `<script>`'s or `<style>`'s text:  as written, its `[` its own
    if (token instanceof P.JSXRawTextToken) return match
    const fillIns = parseFillIns(scope, token.value.trim())
    if (fillIns === null) return undefined
    if (fillIns) match.data.fillIns = fillIns.map((part) => (typeof part === "string" ? decodeHTMLStrict(part) : part))
    return match
  }

  /** Build `P.ASTJSXText` of the trimmed text;  returns `undefined` for blank text since there's nothing to render. */
  getAST(match: P.MatchFor<this>) {
    // with fill-ins:  one `{...}` child, a template string
    if (match.data.fillIns) return new P.ASTJSXExpression(match, { expression: fillInsAST(match, match.data.fillIns) })
    const token = match.matched[0] as P.JSXTextToken
    const { raw, value } = token
    // a `<script>`'s or `<style>`'s text:  its lines kept, their shared indent and the blank ones at either end dropped
    if (token instanceof P.JSXRawTextToken)
      return dedent(value) ? new P.ASTJSXText(match, { value: dedent(value) }) : undefined
    const text = decodeHTMLStrict(jsxText(value))
    // Blank text has nothing to render -- return `undefined` for "no AST" (`Rule.getAST()`'s return
    // type already permits this; `Match.AST` treats a falsy return as "no AST").
    if (!text) return undefined
    return new P.ASTJSXText(match, { raw, value: text })
  }
}

/**
 * `value`, a run of JSX text, as JSX reads it:  each line trimmed where it meets a line break, blank lines dropped,
 * the lines joined by a space;  text on one line keeps its spaces, `Clicked ` before a hole.
 */
function jsxText(value: string): string {
  if (!value.includes("\n")) return value
  const lines = value.split(/\r?\n/)
  return lines
    .map((line, index) => {
      let each = line
      if (index > 0) each = each.trimStart()
      if (index < lines.length - 1) each = each.trimEnd()
      return each
    })
    .filter((line) => line.trim())
    .join(" ")
}
