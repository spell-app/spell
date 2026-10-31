import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/** The fewest words it's ever said in:  `se guarda en la nube`. */
const SHORTEST = 5

/** What a program's own place called `cloud` is called, if it has one. */
const OWN_CLOUD = "cloud"

/**
 * `saved_in_the_cloud` rule:  a place Spell would host for you:  it isn't here yet, so each of these refuses, saying so
 * (epic `data` Q3, P15).
 * - e.g. `family cookbook is saved in the cloud`:  a PLACE's line, naming the place, with no article
 * - e.g. `- it is saved in the cloud`:  a TYPE's line, with no place line at all
 * - `is saved in` has two jobs, told apart by what's on each side:
 *   - `saved_in_place` takes `it` or `a recipe` on its left, and a place's NAME on its right
 *   - this takes a new name on its left, or `it`, and only ever the words `the cloud` on its right
 * - A program's own place called `cloud` wins:  `- it is saved in the cloud` means that one.
 */
export class SavedInTheCloud extends SpellStatement<"type|with_nested_statements?|body?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration + 1

  /** Quick test:  enough words for it, so an editor doesn't offer it after just any words, e.g. `set y`. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return tokens.length - start >= SHORTEST && super.test(scope, tokens, start)
  }

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || scope.getType(OWN_CLOUD)?.placeName) return undefined
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("place-cloud-later"))
  }

  /** Nothing:  it never compiles. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
