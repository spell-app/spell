import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellConstant } from "spell/parser/spell/rules/constants"
import { getKnownType } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * `property_value_either` rule:  defines a property getter whose value depends on a condition,
 * e.g. `the color of a card is red if its suit is either diamonds or hearts (otherwise it is X)?`
 * - Its body is ONE line of a getter's body, `red if ... otherwise it is black`:
 *   a `value_if` (epic page `outline-spell`, T6).
 *   So the getter's code is written once, there.
 * - SIDE EFFECT: stubs `type` into scope (`P.TypeScope.getOrStub()`), and adds any bare constant value
 *   to `scope.constants` if not already known.
 * - Compiles to a getter in its class that `if`s on the condition, returning the other value
 *   (or falling through) when absent.
 */
export class PropertyValueEither extends SpellStatement<PropertyValueEitherGroups, { inheritedOutput?: string }> {
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = {
    kind: "property",
    name: "type_property.property",
    of: "type_property.type"
  }

  /**
   * Quick test:  our words fit, AND an `if` comes after them.
   * - Our body is parsed apart (`{inline_value_if}`), so `Sequence.test()` sees only `{type_property} is`:
   *   without this, every line with `is` in it would be parsed in full, to find its `value_if`.
   * - So we ask `value_if`'s own quick test, from our third word on:  it finds its `if`, whatever the language.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    return scope.parser?.rules.value_if?.test(scope, tokens, start + 2) !== false
  }

  /** Refused on a built-in type -- see `SpellStatement.refuseBuiltInType()`;  no `value_if` after `is`, not ours. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !this.getBody(match)) return undefined
    const { type, property } = match.groups.type_property.groups
    const refused = SpellStatement.refuseUnknownType(match, type)
    if (refused === match) PropertyValueEither.noteInheritedMember(match, this.getBody(match))
    const wrongValue = refused === match ? PropertyValueEither.wrongValueMessage(match, this.getBody(match)) : undefined
    if (wrongValue) return SpellStatement.refuse(match, wrongValue)
    return refused === match ? SpellStatement.refuseBuiltInType(match, type, property) : refused
  }

  mutateScope(match: P.MatchFor<this>) {
    const { scope } = match
    const { type, property } = match.groups.type_property.groups
    // make sure type is defined
    const typeScope = P.TypeScope.getOrStub(scope, type.value, match)
    const member = typeScope.inheritedMember(`${property.value}`)
    typeScope.declareProperty(`${property.value}`, match, {
      asWritten: property.raw,
      output: member?.output,
      valueOutputs: member?.valueOutputs,
      listedValues: member?.listedValues
    })
    // its values, e.g. `red` and `black`, are the property's to declare:  its declaration lists them
    const { value, otherValue } = (this.getBody(match)?.groups ?? {}) as { value?: P.Match; otherValue?: P.Match }
    for (const constant of [value, otherValue]) SpellConstant.declareValue(match, constant)
  }

  /**
   * SIDE EFFECT:  an inherited member given a value in the language's own words compiles by the member's name,
   * in the member's values (epic `notebook` I1), e.g. `- su dirección es arriba si ...` => `get direction()`, `up`.
   */
  private static noteInheritedMember(match: P.MatchFor<PropertyValueEither>, body: P.Match | undefined): void {
    const { type, property } = match.groups.type_property.groups
    const member = getKnownType(type).inheritedMember(`${property.value}`)
    if (member?.output) match.data.inheritedOutput = member.output
    const { value, otherValue } = (body?.groups ?? {}) as { value?: P.Match; otherValue?: P.Match }
    for (const each of [value, otherValue]) SpellConstant.sayForMember(member, each)
  }

  /** What's wrong with a quoted value it gives, `- its lock is "banana" if ...` (epic `language` P39), if anything. */
  private static wrongValueMessage(
    match: P.MatchFor<PropertyValueEither>,
    body: P.Match | undefined
  ): string | undefined {
    const { type, property } = match.groups.type_property.groups
    const member = getKnownType(type).inheritedMember(`${property.value}`)
    const { value, otherValue } = (body?.groups ?? {}) as { value?: P.Match; otherValue?: P.Match }
    return (
      SpellConstant.wrongValueMessage(match.scope, member, value) ??
      SpellConstant.wrongValueMessage(match.scope, member, otherValue)
    )
  }

  /** Nested scope for the `value_if` body:  `it` / `its` are the thing, as in any getter's. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const typeName = SP.typeName(`${match.groups.type_property.groups.type.value}`)
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: P.instanceCase(typeName),
      mapItTo: "this",
      itDatatype: typeName,
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const { type, property } = match.groups.type_property.groups
    return new P.ASTPropertyDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      property: match.data.inheritedOutput
        ? new P.ASTPropertyLiteral(property, match.data.inheritedOutput)
        : P.matchAST<P.ASTPropertyLiteral>(property),
      get: new P.ASTMethodDefinition(match, { body: P.matchAST<MethodBody>(this.getBody(match)) })
    })
  }
}

/**
 * Match groups for `property_value_either`'s `syntax` -- `type_property` nests its own `type`/`property`
 * groups, whichever `type_property` alternative matched (`the_property_of_a_thing`/`a_things_property`).
 */
type PropertyValueEitherGroups = P.GroupsFor<"type_property", P.Match<P.GroupsFor<"property|type">>> &
  P.GroupsFor<"body?">
