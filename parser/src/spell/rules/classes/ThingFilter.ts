import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `same_field_filter` rule:  `the same address` -- a field of the things looked through, matching the value
 * of that name where the line is (epic `data` P32, Q29).
 * - e.g. `every favourite with the same address`, after `set address to its id`
 * - Spanish's `la misma dirección`.
 * - The field's words are read as an expression, in the line's own scope:  `data.value`.
 *   Read as nothing, `every_thing_with` won't compile, saying so.
 * - NOT `with the address`:  Owen's call (Q29).
 */
export class SameFieldFilter extends P.Sequence<"field", { value?: P.Match }> {
  @proto static alias = "thing_filter"

  /** SIDE EFFECT:  what the field's words mean where the line is, in `data.value`, when they're all of an expression. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { field } = match.groups
    const value = scope.getRuleOrDie("expression").parse(scope, field.tokens)
    if (value?.length === field.length) match.data.value = value
    return match
  }
}

/**
 * `field_value_filter` rule:  `name "blah"` -- a field of the things looked through, and the value it holds
 * (epic `data` P32, Q29).
 * - e.g. `every favourite with name "blah"`, `every card with suit hearts`, `every card with short name "x"`
 * - The field is the longest run of words a type declares (`declared_member_words`), the value any expression.
 */
export class FieldValueFilter extends P.Sequence<"field|value"> {
  @proto static alias = "thing_filter"
}

/**
 * `thing_filters` rule:  one or more `thing_filter`s, joined by `,` or `and` (epic `data` P32):
 * `the same address and name "blah"`.
 * - Read by `every_thing_with`, which checks each field is one of its type's, and compiles them as a `where` would:
 *   `its address is address and its name is "blah"`.
 */
export class ThingFilters extends P.Repeat {
  /** Each filter's test of `item`:  `item.field === value`, as `its field is value` compiles. */
  static testsOf(filters: P.Match, item: () => P.ASTExpression): P.ASTExpression[] {
    return filters.items.map((filter) => {
      const { field, value } = filter.groups as { field: P.Match; value?: P.Match }
      const said = (filter.data as { value?: P.Match }).value ?? value
      const name = ThingFilters.fieldName(field)
      return new P.ASTInfixExpression(filter, {
        lhs: new P.ASTPropertyExpression(filter, { object: item(), property: name }),
        operator: "equals",
        // nothing called that here:  it won't compile, and says so (`every_thing_with`)
        rhs: said ? P.asAST<P.ASTExpression>(said.AST) : new P.ASTVariableExpression(field, { name })
      })
    })
  }

  /** The words each filter names a field by, as written:  `short name`. */
  static fieldsOf(filters: P.Match): P.Match[] {
    return filters.items.map((filter) => (filter.groups as { field: P.Match }).field)
  }

  /** The filters whose value can't be read:  `the same address`, with nothing called `address` here. */
  static unreadOf(filters: P.Match): P.Match[] {
    return filters.items.filter((filter) => filter.is(SameFieldFilter) && !filter.data.value)
  }

  /** `field`'s name as it compiles:  `shortName` for `short name`. */
  static fieldName(field: P.Match): string {
    return P.JSWriter.instance.nameOf(`${field.raw}`.trim().replace(/\s+/g, "_"))
  }
}
