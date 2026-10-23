import { assert, proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

/**
 * `number_as_string` rule:  `number` spelled out as a string, `zero` to `ten`
 * -- the language's `VALUE_MAP` does the word-to-number lookup.
 * - e.g. `zero` => `0`
 * - A number word may be a NAME where it can't be a number (epic `spanish` J96):
 *   - what `set` / `poner` sets:  `set three to 3` declares `three` --
 *     the assignment's syntax tries `{variable}` before `{expression}`
 *   - after that, a variable of the name in scope wins:  `print three + 1` reads the variable
 */
export class NumberAsString extends P.Pattern {
  // Its words and what each means (`pattern`, `VALUE_MAP`) are the language's:  see its `.en.ts` registration
  @proto static alias = ["expression", "number"]
  @proto static datatype = "number"

  /** A word a variable in scope is named is that variable, not a number:  see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [token] = tokens
    if (token && scope.variables?.get(`${token.value}`)) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>): P.ASTNumericLiteral {
    const { value, raw } = match
    return new P.ASTNumericLiteral(match, { value: assert.number(value), raw })
  }
}
