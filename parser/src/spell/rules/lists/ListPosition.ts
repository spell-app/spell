import { proto, upperFirst } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell-parser/spell/rules/expressions"

/**
 * `list_position` rule:  return position of an item in a list,
 * e.g. `position of thing in my-list` => `spellPosition(positionOf(myList, thing))`, imported from `@spell/core`.
 * - NOTE: position returned is **1-based**:  `positionOf()` gives an index, from 0, which `spellPosition()` turns back.
 * - Returns `undefined` if item is not found.
 * - `Priority.mostSpecific` -- preferred over lower-priority expression rules when tokens are ambiguous.
 * - With no list, a value of a KIND is found in the kind's own list (epic page `outline-spell`, P12):
 *   `the position of its rank` => `spellPosition(positionOf(Deck.Ranks, this.rank))`, 12 for a queen.
 *   - Or a property's own list:  `its "rank" is one of ace, 2 ... king` => `Card.Ranks` (epic `spanish`).
 *   - Only for a kind's value, or such a property:  anything else needs its `in ...`.
 *   - A kind declared further down is still a stub here (issue I3):  its list is read from its record when compiling.
 * TODO: `positions`, `last position`, `after...`
 */
export class ListPosition extends SpellExpression<"thing|list?", ListPositionMatchData> {
  @proto static priority = Priority.mostSpecific
  @proto static datatype = "number"

  /** With no list:  only a value of a kind, whose record we keep for its list -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || match.groups.list) return match
    // a property with its own list of values, e.g. `its "rank" is one of ace, 2 ... king`:  `Card.Ranks`
    const listed = ListPosition.ownList(match.groups.thing)
    if (listed) {
      match.data.ownList = listed
      return match
    }
    const kindType = scope.getType(match.groups.thing.datatype)
    if (!kindType || (!kindType.valueKind && !kindType.stub)) return undefined
    match.data.kindType = kindType
    // a stub may turn out not to be a kind, once the project has parsed:  then it's no position at all
    const message = SP.Language.of(scope).parserMessage("position-not-a-kind", {
      text: match.inputText.trim(),
      kind: kindType.instanceName,
      aKind: SP.Language.of(scope).withArticle("indefinite", kindType.instanceName, kindType)
    })
    SP.SpellWarnings.noteIf(match, message, () => !kindType.valueKind)
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "positionOf",
      args: [list ? P.matchAST(list) : ListPosition.kindList(match), P.matchAST(thing)]
    })
  }

  /**
   * The list of `match`'s kind, e.g. `Deck.Ranks`, from its record -- see class docs.
   * - A property's own list:  `Card.Ranks` -- see `ownList()`.
   * - A stub which never became a kind:  an empty list, so no position (and a warning, from `parse()`).
   */
  private static kindList(match: P.MatchFor<ListPosition>): P.ASTExpression {
    const { ownList } = match.data
    if (ownList) {
      const object = new P.ASTTypeExpression(match, { name: ownList.on })
      return new P.ASTPropertyExpression(match, { object, property: ownList.name })
    }
    const valueKind = match.data.kindType?.valueKind
    if (!valueKind) return new P.ASTArrayLiteral(match, { items: [] })
    return new P.ASTPropertyExpression(match, {
      object: new P.ASTTypeExpression(match, { name: valueKind.listOn }),
      property: valueKind.listName
    })
  }

  /**
   * Where the values of the property `thing` reads are listed, if it lists its own:
   * e.g. `{ on: "Card", name: "Ranks" }` for `its rank`, where a card says `its "rank" is one of ace, 2 ... king`.
   * - `undefined` for anything else, e.g. a kind's value (`its "rank" is a rank`), which `kindList()` finds.
   * - A lookup:  call it WHILE PARSING.
   */
  private static ownList(thing: P.Match): ListPositionMatchData["ownList"] {
    const { member } = thing.data as { member?: P.ScopeVariable | P.ScopeMethod }
    if (!(member instanceof P.ScopeVariable)) return undefined
    const type = member.scope
    if (!(type instanceof P.TypeScope)) return undefined
    // kept on the property, or on its plural class variable, e.g. `Ranks` -- as `define_property_has` keeps it
    const name = P.pluralize(upperFirst(member.name))
    if (!member.enumeration && !type.variables.get(name)?.enumeration) return undefined
    return { on: type.name, name }
  }
}

/** What `list_position` stashes on its match, with no `in ...`:  where its list of values is. */
type ListPositionMatchData = {
  /** The value kind whose list it reads, e.g. `Rank` -- see `kindList()`. */
  kindType?: P.TypeScope
  /** A property's own list of values, e.g. `Card.Ranks` -- see `ownList()`. */
  ownList?: { on: string; name: string }
}
