import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement, type SpellStatementProps } from "spell/parser/spell/rules/Statement"

/**
 * Base class for all Spell expressions.
 * - Aliased `expression`, so registered as an `operand` -- see `SpellParser.getNamesForRule()`.
 */
export class SpellExpression<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> extends SpellStatement<Groups, MatchData> {
  /** Whether `compileAST()` should wrap the output expression in parenthesis. */
  declare parenthesize: boolean
  @proto static parenthesize = false

  /** Every spell expression is registered as an `"expression"` unless a subclass says otherwise. */
  @proto static alias: string | string[] = "expression"

  /**
   * The rule another language writes this one as, when it has none of its own, its groups the same --
   * e.g. `property_expression` for English's possessive, `the character's name` (epic `language` P16).
   * - Read by the translator (`Translator`).
   */
  declare writtenAs: string | undefined
  @proto static writtenAs: string | undefined = undefined

  /**
   * Do its words say ITEMS, not one named thing (epic `language` T152)?
   * - `cards in the discard pile`, `the last card of each column`:  yes;  `the stock`, `the last card of the stock`:  no.
   * - So `and` joins them into one flat list:  `cards in the stock and cards in the discard pile` is both piles'
   *   cards, where `the stock and the discard pile` is two piles -- see `JoinedValues`.
   * - Per match, when it hangs on what was read:  `saysItemsOf()`.
   */
  declare saysItems: boolean
  @proto static saysItems = false

  /** TYPE-ONLY: props `parser.addRule()` accepts for this rule -- see `P.Rule`'s `Props`. */
  declare readonly Props: SpellExpressionProps

  /**
   * What `match`, an `of` phrase, reads from, e.g. `the character` in `the name of the character`;
   * `undefined` for any other expression.
   * - Why:  a possessive right after it may belong to either (epic `language` Q16),
   *   e.g. `the name of the character's friend` -- see `possessive_property`.
   */
  ofObject(match: P.Match): P.Match | undefined {
    return undefined
  }

  /** Do `match`'s words say items, not one named thing?  Our `saysItems`, unless a rule says per match. */
  saysItemsOf(match: P.Match): boolean {
    return this.saysItems
  }
}

/** Props bag accepted by `SpellExpression` -- `parenthesize` wraps compiled output in `(...)`. */
export type SpellExpressionProps = Prettify<SpellStatementProps & { parenthesize?: boolean }>
