import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import type { MethodSignature } from "./MethodSignature"

/**
 * `quoted_method_signature` rule:  method signature surrounded by quotes.  A "good idea"???
 * - Re-parses the token's raw JSON string VALUE as its words, e.g. the `"nerds out with (another as a thing)"`
 *   in `a thing "nerds out with (another as a thing)" if`.
 *   - It reads them as `quoted_signature_words`:
 *     only `(...)` is a parameter, so `"is a number card"` is four words.
 * - `parse()` swizzles `tokens`/`matched` back onto the outer text-token match,
 *   so callers (e.g. `quoted_type_expression`) can't tell it from a normal `method_signature` match.
 * - SIDE EFFECT: bails (`undefined`) if the recovered signature has no keyword,
 *   the same rule as plain `method_signature`.
 * - Its parameters' warnings are noted again on it, about the quoted text -- see `SP.SpellWarnings.in()`.
 */
export class QuotedMethodSignature extends P.TokenType {
  @proto static tokenType = P.TextToken
  @proto static highlightAs: P.HighlightKind = "function"

  /**
   * Parse the token's text as JSON to get the raw signature string,
   * then reparse THAT as `method_signature`.
   * - SIDE EFFECT: swizzles the recovered match's `tokens`/`matched` to point at the outer quoted-text
   *   token, so it reads like a normal top-level match rather than a nested one.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    const signature =
      match &&
      (scope.parse(JSON.parse(match.value), "quoted_signature_words") as P.MatchFor<MethodSignature> | undefined)
    if (!signature || !signature.data.foundKeyword) return undefined
    // its warnings are about words in the quotes, whose positions are the string's:  shown under the quotes
    for (const { message } of SP.SpellWarnings.in(signature)) SP.SpellWarnings.note(signature, message, match)
    // Swizzle tokens & matched to reflect the original match
    signature.tokens = match.tokens
    signature.matched = [match]
    return signature
  }
}
