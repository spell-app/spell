import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority, declaredPrefix } from "spell/parser/spell/rules/rules.types"
import { getKnownType } from "spell/parser/spell/rules/types"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `class_member` rule:  `{type} {member words}` -- a class variable of a known type, e.g.:
 * - `deck suits` / `Deck Suits` ~== `Deck.Suits`, a value kind's list
 * - Spanish's `palos de carta` ~== `Carta.Palos`
 * - A property's own list, English's `card suits`, is its kind's plural, ONE name:  `kind_values` reads it
 *   (epic `spanish` P22).
 * - ONE rule for every type:  the member resolves through `type`'s `classVariables`,
 *   e.g. `Suits` as `cards have a suit as one of ...` declares it -- see `define_property_has`.
 *   Was a rule per enumeration.
 * - The LONGEST run of words the type declares, e.g. `suits` in `deck suits includes x`.
 * - `Priority.userDeclared`, as the per-enumeration rule had:
 *   a type's own member beats a longer built-in reading.
 */
export class ClassMember extends SpellExpression<"type|member", ClassMemberData> {
  @proto static priority = Priority.userDeclared

  /** Resolve the longest run of our words `type` declares as a class variable -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type, member } = match.groups
    const typeScope = getKnownType(type)
    const count = declaredPrefix(member, (words) => !!typeScope.getClassVariable(words))
    if (!count) return undefined
    // fewer words than we took:  parse just those -- the type and them
    if (count < member.length) return this.parse(scope, tokens.slice(0, 1 + count))
    match.data.classVariable = typeScope.getClassVariable(`${member.raw}`)
    return match
  }

  /**
   * What the class variable holds, e.g. `list of card-suits` for a card's `Suits` (epic `spanish` P22) --
   * else a plain `list`.
   */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.data.classVariable?.datatype ?? "list"
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyExpression {
    const { type, member } = match.groups
    return new P.ASTPropertyExpression(match, {
      object: P.matchAST<P.ASTTypeExpression>(type),
      property: match.data.classVariable?.name ?? `${member.value}`
    })
  }
}

/** What `class_member` stashes on its match. */
type ClassMemberData = {
  /** Class variable it reads, found while parsing, e.g. `Suits` of `Card`. */
  classVariable?: P.ScopeVariable
}
