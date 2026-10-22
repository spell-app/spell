import { NONE, proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority, declaredPrefix } from "spell-lang/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"
import { itsObject, type ItsMatchData } from "./properties.shared"

/**
 * `its_known_property` rule:  `its {member words}`, where the words name a PROPERTY `it`'s type declares:
 *   the LONGEST run of them that does, e.g. `short rank` in `its short rank + its short suit`.
 * - As `property_expression` does for `the X of Y`.
 * - Rejects the match unless `it`'s type is known and declares some -- then `its_property` may take one word.
 * - `Priority.preferred`, as `property_expression`:  a declared `last card` beats `its_ordinal`.
 * - A rule of its own, unlike `property_expression`:  the loose read takes ONE of several words,
 *   so at `Priority.preferred` it would beat `its last card`, the ordinal.
 * - Tracks `it`, as `its_property` does.
 */
export class ItsKnownProperty extends MemberReadExpression<"property", ItsMatchData> {
  @proto static priority = Priority.preferred

  /** Note `it`, and resolve the longest run of our words its type declares -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const itVar = scope.variables?.get("it")
    const ownerType = scope.getType(itVar?.datatype)
    const { property } = match.groups
    const count = declaredPrefix(property, (words) => !!MemberReadExpression.propertyOf(ownerType, words))
    if (!count) return undefined
    // fewer words than we took:  parse just those -- `its` and them
    if (count < property.length) return this.parse(scope, tokens.slice(0, 1 + count))
    match.data.itVar = itVar ?? NONE
    this.resolveMember(match, ownerType, `${property.raw}`)
    return match
  }
  getAST(match: P.MatchFor<this>) {
    return this.getMemberAST(match, itsObject(match), match.groups.property)
  }
}
