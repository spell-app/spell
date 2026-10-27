import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"

/**
 * `property_expression` rule:  `the {member words} of {thing}` ~== `thing.member`.
 * ONE rule for both kinds of read (epic page D5):
 * - RESOLVED:  the words name a PROPERTY the type of `thing` declares (or a super-type does),
 *   e.g. `the short rank of the card` -- several words, blacklisted ones too.
 *   - An enumerated property's values, e.g. `the suits of the card` as `cards have a suit as one of ...` declares,
 *     are its type's class variable, `Card.Suits`:  an instance has none.
 * - else LOOSE:  ONE word nothing need declare, not on the identifier blacklist,
 *   e.g. `the is-set-up of it` -- as spell read every property before types.
 *   - We still note a METHOD of that name, for our datatype.
 * - else NOT a property read:
 *   several undeclared words, e.g. `the first card of the deck` is the ordinal rule's.
 * - `Priority.preferred`:  a declared member beats a built-in rule reading the SAME words,
 *   e.g. a deck's `last card` beats the ordinal `the last card of`.
 *   - NOT `the position of`, `the number of` (`mostSpecific`), nor `the biggest of` (2), which say more:
 *     a type declaring `position` mustn't break `the position of x in the list`.
 * - ONE rule, not a resolved and a loose one, as `known_variable` / `variable` are:
 *   two would parse every `the X of Y`'s operand twice -- 6% of a project's parse (epic page judgement).
 * - `set` an undeclared one, on a type the project declares, and it's declared there --
 *   see `MemberReadExpression.memberRead()`.
 */
export class PropertyExpression extends MemberReadExpression<"property|expression"> {
  @proto static priority = Priority.preferred

  /**
   * Resolve our words through the type of what follows `of`, while we can look it up --
   * else take ONE word, loose.  See class docs.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { property, expression } = match.groups
    const ownerType = (match.data.ownerType = scope.getType(expression.datatype))
    if (this.resolveMember(match, ownerType, `${property.raw}`)) return match
    if (!PropertyExpression.isLooseProperty(scope, property)) return undefined
    match.data.member = ownerType?.getMember(`${property.value}`)
    if (!match.data.member) MemberReadExpression.warnIfUndeclared(match, ownerType, property)
    return match
  }
  getAST(match: P.MatchFor<this>) {
    const { property, expression } = match.groups
    return this.getMemberAST(match, P.asAST<P.ASTExpression>(expression.AST), property)
  }

  /** Is `property`, a `member_words` match, ONE word the `property` rule takes:  lower case, not blacklisted? */
  private static isLooseProperty(scope: P.Scope, property: P.Match): boolean {
    return property.length === 1 && scope.getRuleOrDie("property").test(scope, property.tokens, 0) !== false
  }
}
