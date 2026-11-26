import { proto, upperFirst } from "spell/util"
import { SP } from "spell/parser/spell"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"
import { namedSortsOf } from "spell/parser/spell/rules/places/places.shared"
import { isSortKeyScope } from "./lists.shared"

/** Each key that's a sort its place has a name for, by the name compiled code gives it:  see `sortNameOf()`. */
const SORT_NAMES = new WeakMap<P.ASTPropertyExpression, string>()

/**
 * `sort_key_field` rule:  a field of what's being sorted, by its name alone (epic `data` P15).
 * - e.g. `recipes, sorted by title`:  the same as `sorted by its title`
 * - Or a sort its place's list has a name of its own for (`NamedSorts`):  `measurements sorted by completion`.
 *   A name wins over a field of the same name.
 * - Only as a sort key, and only a field its items have, or a sort's name:  anything else reads as it always did.
 * - `Priority.preferred`:  right after `sorted by`, the item's field is what's meant, over a variable called `title`.
 * - Compiles to `item.title`, which a place can sort by;  a named sort to its field, `item.endTime`, its name kept
 *   for the place (`sortNameOf()`).
 */
export class SortKeyField extends SpellExpression<"property", { member?: unknown; item?: P.TypeScope }> {
  @proto static priority = Priority.preferred

  /** Quick test:  only in a sort key. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return isSortKeyScope(scope) && super.test(scope, tokens, start)
  }

  /**
   * A sort its place names, or a property of what's being sorted.
   * - The place's lines may be in a file not read yet:  words that are no property of a thing saved in a place (or
   *   declared further on) are taken as a sort's name, and refused when the errors are gathered if its place names
   *   no such sort.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { itDatatype } = scope as P.MethodScope
    const item = scope.getType(itDatatype)
    const words = `${match.groups.property.raw}`.trim()
    match.data.item = item
    if (namedSortOf(item, words)) return match
    if (item?.hasProperty(words)) {
      match.data.member = item.getMember(words)
      return match
    }
    // saved in a place, or declared in a file not read yet:  its place may name it
    if (!item?.savedPlace() && !item?.stub) return undefined
    // not words other rules read:  `its title newest first`, `title newest first`
    if (!mayNameASort(item, words)) return undefined
    const language = SP.Language.of(scope)
    const aType = SP.SpellWarnings.exampleNoun(scope, item)
    const message = language.parserMessage("undeclared-member", {
      AType: upperFirst(aType),
      aType,
      aName: language.withArticle("indefinite", words),
      type: SP.SpellWarnings.exampleType(scope, words)
    })
    SP.SpellWarnings.refuseIf(match, message, () => !namedSortOf(item, words) && !item.hasProperty(words))
    return match
  }

  /** Its field, or the field of the sort its place names:  a name wins over a field of the same name. */
  getAST(match: P.MatchFor<this>): P.ASTPropertyExpression {
    const { mapItTo } = match.scope as P.MethodScope
    const words = `${match.groups.property.raw}`.trim()
    const named = namedSortOf(match.data.item, words)
    const ast = new P.ASTPropertyExpression(match, {
      object: new P.ASTVariableExpression(match, { name: mapItTo ?? "item" }),
      property: named?.field ?? P.JSWriter.instance.nameOf(words.replace(/\s+/g, "_"))
    })
    if (named) SORT_NAMES.set(ast, named.name)
    return ast
  }
}

/** The sort `item`'s place has a name for that `words` names:  `undefined` for none, or none known yet. */
function namedSortOf(item: P.TypeScope | undefined, words: string): { name: string; field: string } | undefined {
  if (!item) return undefined
  const name = fieldNamed(words)
  return namedSortsOf(item.savedPlace()).find((each) => each.name === name)
}

/** The name of the sort `key` reads, when its place has one for it:  `completion`.  See `SortKeyField`. */
export function sortNameOf(key: P.ASTPropertyExpression): string | undefined {
  return SORT_NAMES.get(key)
}

/** Words that start with `its`, or with a field's name, are no sort's name:  others read them (`sort_key_order`). */
function mayNameASort(item: P.TypeScope, words: string): boolean {
  const each = words.split(/\s+/)
  if (/^(?:its|their|su|sus)$/i.test(each[0] ?? "")) return false
  return !each.some((_word, at) => at > 0 && item.hasProperty(each.slice(0, at).join(" ")))
}
