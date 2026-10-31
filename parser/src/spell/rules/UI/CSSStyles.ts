import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `css` rule:  parse CSS from a `TextToken` WITHOUT quotes.
 * - Compiles to `core.installStyles(file, css)`; newlines in `css` are escaped to `¬` so the
 *   value survives being embedded in a backtick template literal.
 * - Only ever asked for by name (`SpellCSSFile`), never an `expression`:
 *   as one, any text whose fill-in didn't parse quietly became a stylesheet (epic `language`, I1).
 * - Class named `CSSStyles`, not `CSS`, which would hide the DOM's `CSS`.
 */
export class CSSStyles extends P.TokenType<never, CSSMatchData> {
  static ruleName = "css"
  @proto static tokenType = P.TextToken

  getAST(match: P.MatchFor<this>) {
    // HACK: `file` is meant to come from `SpellCSSFile` -- see `CSSMatchData`.
    const { value } = match
    const { file } = match.data
    // munge returns to `¬`
    const safeValue = value.replace(/\n/g, "¬")
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "installStyles",
      args: [
        file ? new P.ASTQuotedExpression(match, file) : new P.ASTNothingLiteral(match),
        new P.ASTBackTickExpression(match, safeValue)
      ]
    })
  }
}

/** What `css` rule expects on its matches. */
type CSSMatchData = {
  /**
   * Name of file the CSS came from, first argument to `core.installStyles()`.
   * - Meant to be set by whoever parsed the file, i.e. `SpellCSSFile.parse()`.
   * - TODO: nobody sets it, so we always output `undefined` -- see agents/SUSPECTED-BUGS.md.
   */
  file?: string
}
