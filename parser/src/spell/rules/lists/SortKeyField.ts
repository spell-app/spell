import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { isSortKeyScope } from "./lists.shared"

/**
 * `sort_key_field` rule:  a field of what's being sorted, by its name alone (epic `data` P15).
 * - e.g. `recipes, sorted by title`:  the same as `sorted by its title`
 * - Only as a sort key, and only a field its items have:  anything else reads as it always did.
 * - `Priority.preferred`:  right after `sorted by`, the item's field is what's meant, over a variable called `title`.
 * - Compiles to `item.title`, which a place can sort by.
 */
export class SortKeyField extends SpellExpression<"property"> {
  @proto static priority = Priority.preferred

  /** Quick test:  only in a sort key. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return isSortKeyScope(scope) && super.test(scope, tokens, start)
  }

  /** A property of what's being sorted. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { itDatatype } = scope as P.MethodScope
    const item = scope.getType(itDatatype)
    return item?.hasProperty(`${match.groups.property.raw}`.trim()) ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyExpression {
    const { mapItTo } = match.scope as P.MethodScope
    return new P.ASTPropertyExpression(match, {
      object: new P.ASTVariableExpression(match, { name: mapItTo ?? "item" }),
      property: P.JSWriter.instance.nameOf(`${match.groups.property.raw}`.trim().replace(/\s+/g, "_"))
    })
  }
}
