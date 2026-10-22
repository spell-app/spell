import { assert, proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

/**
 * `number_as_string` rule:  `number` spelled out as a string, `zero` to `ten`
 * -- the language's `VALUE_MAP` does the word-to-number lookup.
 * - e.g. `zero` => `0`
 */
export class NumberAsString extends P.Pattern {
  // Its words and what each means (`pattern`, `VALUE_MAP`) are the language's:  see its `.en.ts` registration
  @proto static alias = ["expression", "number"]
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>): P.ASTNumericLiteral {
    const { value, raw } = match
    return new P.ASTNumericLiteral(match, { value: assert.number(value), raw })
  }
}
