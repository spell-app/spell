import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellConstant } from "spell/parser/spell/rules/constants"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PropertyValueGetter } from "./PropertyValueGetter"

/**
 * `it_is_value` rule:  a line in a type's body giving a value to whichever property lists it (epic `language` P39, C4).
 * - e.g. `- it is locked` on a page, `- it is down` on a two sided view, `- it is a queen` on a card.
 * - Spanish:  `- está bloqueada`, `- es una reina`.
 * - The same getter as naming the property:  `- it is locked` ~== `- its lock is locked`.
 * - `a` or `an` means nothing:  nobody has to decide whether a value is a verb or a noun.
 * - Starts with its literal words, so it's filed under them and no other line ever tries it.
 *   A rule starting with Spanish's left-out subject would be tried on every line.
 * - Only in a type's body:  in a method, `it is locked` is a comparison.
 * - What it does with its word:
 *   - on one property's list:  that property's value
 *   - on no list:  a parse error, not a variable named `it`
 *   - on two properties' lists:  a parse error, saying to name the property
 *   - a variable or property with that name:  not ours, as for a comparison
 *   - a number:  not ours;  only words name values
 */
export class ItIsValue extends SpellStatement<
  "value",
  {
    subject?: P.Match
    typeScope?: P.TypeScope
    property?: P.ScopeVariable
    output?: string
    inheritedType?: string
  }
> {
  @proto static alias = "statement"
  // over a variable named `it`:  `- it is down` isn't `const it = "down"`
  @proto static priority = Priority.aboveDeclaration

  /** Only a whole line in a type's body -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const typeScope = P.SubjectScope.of(scope)?.subjectType
    if (!typeScope) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || match.length !== tokens.length) return undefined
    const word = `${match.groups.value.raw}`
    if (scope.variables?.get(word) || typeScope.getMember(word)) return undefined
    const language = SP.Language.of(scope)
    const found = typeScope.propertiesListing(word)
    if (found.length > 1) {
      const [first, second] = found.map(({ property }) => property.asWritten ?? property.name)
      return ItIsValue.refused(
        match,
        language.parserMessage("listed-on-two-properties", { value: word, first: first!, second: second! })
      )
    }
    if (!found.length) return ItIsValue.refused(match, ItIsValue.onNoListMessage(scope, typeScope, word))
    const { property, value } = found[0]!
    match.data.subject = scope.getRuleOrDie("subject_implied").parse(scope, [])
    match.data.typeScope = typeScope
    match.data.property = property
    match.data.output = property.valueOutputs?.[value] ?? value
    match.data.inheritedType = PropertyValueGetter.inheritedTypeOf(typeScope, property.name, scope)
    return match
  }

  /** A word on no list:  every value the type's properties can be, or that it has none. */
  private static onNoListMessage(scope: P.Scope, typeScope: P.TypeScope, word: string): string {
    const language = SP.Language.of(scope)
    const properties = typeScope
      .chain()
      .flatMap((owner) => owner.variables.get())
      .filter((variable) => variable.listedValues)
    if (properties.length === 1) return SpellConstant.notOneOfMessage(scope, properties[0]!, word)
    if (!properties.length) return language.parserMessage("no-listed-values", { value: word })
    const it = language.parserMessage("it-itself")
    const values = properties.flatMap((property) => SpellConstant.listedWordsOf(property)).join(", ")
    return language.parserMessage("not-one-of-its-values", { what: it, value: word, values })
  }

  /** A parse error on the line, over setting a variable named `it`, under any rule that really reads the words. */
  private static refused(match: P.Match, message: string): P.Match {
    const refused = SpellStatement.refuse(match, message)
    refused.priority = Priority.preferred
    return refused
  }

  /**
   * SIDE EFFECT:  records the property on its type, as naming it does -- see `property_value_getter`.
   */
  mutateScope(match: P.MatchFor<this>) {
    const { typeScope, property } = match.data
    if (!typeScope || !property) return
    typeScope.declareProperty(property.name, match, {
      asWritten: property.asWritten,
      output: property.output,
      valueOutputs: property.valueOutputs,
      listedValues: property.listedValues
    })
  }

  /** The same getter as `- its lock is locked`:  `get lock() { return "locked" }`. */
  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const { subject, property, output, inheritedType } = match.data
    const value = new P.ASTStringLiteral(match, { value: output!, quote: '"' })
    return new P.ASTPropertyDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(subject)!,
      property: new P.ASTPropertyLiteral(match, property!.output ?? property!.name),
      get: new P.ASTMethodDefinition(match, { body: value, datatype: inheritedType })
    })
  }
}
