import { P } from "spell/parser/parser"
import { declaredPrefix } from "spell/parser/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"

/**
 * `the_own_property` rule:  `the {member words}` inside an action, reading a property of the thing the action runs on,
 * e.g. `shuffle the stock` => `this.stock.shuffle()` (epic `language`, P2).
 * - The LONGEST run of our words the thing's type declares, inherited ones too, e.g. `short rank` in `the short rank + 1`.
 * - Declared further down counts:  `P.Parser.stubDeclaredProperties()` knows the names ahead.
 * - A local, argument, loop variable or alias called that comes first, so we reject the match:
 *   those win, and `its X` still reads the property.
 * - A constant called that doesn't:  no `the` reads one, e.g. `the clubs` beside a suit's value `clubs`.
 * - The article is REQUIRED:  a bare `stock` reads only variables (Q3).
 *   Named values and bare words beside a property went silently wrong when it could:  `this.side === this.front`.
 * - NEVER follows `it`:  in a loop, `the X` is still the action's thing, and `its X` the item's (Q4).
 * - `set the X to` writes it, for the same reason `Variable` steps aside for it (Q1).
 * - Not a `KnownVariable`:  it's a member read, so enums, built-in members and other languages' words come with it,
 *   and `set the X to` can ask `MemberReadExpression.memberRead()`.
 */
export class TheOwnProperty extends MemberReadExpression<"definite_article" | "property"> {
  /** Quick test:  our article, inside a method with a thing to run on -- `the X` starts most lines' expressions. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    return !!P.MethodScope.withThing(scope)
  }

  /** Our thing's type must declare the longest run of our words, and nothing nearer goes by them -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const ownerType = P.MethodScope.thingTypeOf(scope)
    const { property } = match.groups
    const count = declaredPrefix(property, (words) => !!ownerType?.hasProperty(words))
    if (!count) return undefined
    // fewer words than we took:  parse just those -- our article and them
    if (count < property.length) return this.parse(scope, tokens.slice(0, 1 + count))
    const words = `${property.raw}`
    if (scope.variables?.get(words)) return undefined
    match.data.ownerType = ownerType
    this.resolveMember(match, ownerType, words)
    return match
  }

  /** `this.property`, or what `getMemberAST()` makes of it;  declared further down:  its type's record knows by now. */
  getAST(match: P.MatchFor<this>) {
    const { property } = match.groups
    if (!match.data.member) this.resolveMember(match, match.data.ownerType, `${property.raw}`)
    return this.getMemberAST(match, new P.ASTSelfLiteral(match), property)
  }
}
