import { proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * `jsxComment` rule:  a comment among markup's children, never drawn (epic `elemental-spell`, Owen 2026-10-26).
 * - e.g. `<section><!-- GAP I23:  ... --><button>Next</button></section>`, or a line of its own starting `//`
 * - The tokenizer reads it (`P.Tokenizer.markupComments`):  ONE `P.JSXCommentToken`, over as many lines as it takes.
 * - Writes nothing:  its element's children leave it out (`SpellJSX.childASTs()` keeps only what has an AST).
 */
export class SpellJSXComment extends P.TokenType {
  static ruleName = "jsxComment"
  @proto static alias = "jsxChild"
  @proto static tokenType = P.JSXCommentToken
  @proto static highlightAs: P.HighlightKind = "comment"

  getAST(): undefined {
    return undefined
  }
}
