import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import:  read as the class is defined, while the `SP` barrel loads its rules
import { SpellxCloserToken } from "spell/parser/spell/SpellxTokens"

/**
 * `spellx_closer` rule:  a spellx closer on its own line, `</>` or `</property>` (epic `elemental-spell` P6).
 * - It compiles to nothing:  spellx's tags nest by indent, as spell's lines do, so a closer only says where its
 *   tag ends, which the indent says already.
 * - The tokenizer checks it closes the tag open there, and notes any mistake on it (`SP.SpellxTokenizer`):
 *   `BlockLine` reports that on its line.
 * - Every language's:  a closer has no words of its own.
 */
export class SpellxCloser extends P.TokenType {
  static ruleName = "spellx_closer"
  @proto static alias = "statement"
  @proto static tokenType = SpellxCloserToken
  @proto static highlightAs: P.HighlightKind = "keyword"

  /** Nothing:  a blank line, as its tag's end has no code of its own. */
  getAST(match: P.MatchFor<this>): P.ASTBlankLine {
    return new P.ASTBlankLine(match)
  }
}
