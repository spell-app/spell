import { proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * `shortcut_keys` rule:  ONE keyboard shortcut, written as its keys joined by `+`, no spaces:
 * `meta+T`, `meta+shift+Z`, `F2`, `meta+,` (epic `elemental-spell` P5).
 * - `meta` is command on a Mac and control elsewhere (Q31):  the runtime reads it so, not this rule.
 * - Every token up to the first space after one, taken as typed:  its `value` is that text, e.g. `meta+T`.
 * - What `action_shortcut` reads after `shortcut`:  `- shortcut meta+T`.
 */
export class ShortcutKeys extends P.Rule {
  @proto static highlightAs: P.HighlightKind = "string"

  /** Quick test:  a word or symbol to start with. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const token = tokens[start]
    return !!token && !(token instanceof P.WhitespaceToken) && !(token instanceof P.TextToken)
  }

  /** The tokens joined with nothing between them, up to the first one with a space after it. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const taken: P.Token[] = []
    for (const token of tokens) {
      if (token instanceof P.WhitespaceToken || token instanceof P.TextToken) break
      taken.push(token)
      if (token.whitespace) break
    }
    if (!taken.length) return undefined
    const keys = taken.map((token) => `${token.raw ?? token.value}`).join("")
    return new P.Match({ rule: this, matched: taken, raw: keys, value: keys, tokens: taken, scope })
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }

  /** Its keys, as text:  `"meta+T"`. */
  getAST(match: P.MatchFor<this>): P.ASTStringLiteral {
    return new P.ASTStringLiteral(match, { value: `${match.value}`, quote: '"' })
  }
}
