import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { Wording } from "spell-lang/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * `drag_handler` rule:  what a list does as a thing is dragged over it, out of it, or dropped on it, on the page
 * (epic `outline-spell` P28).
 *
 * ```spell
 * a "pile" is a drawable list of cards where:
 * 	- it can be dropped on
 * 	- when a card is dragged over it:
 * 		set its hint to "drop here"
 * 	- when a card is dragged out of it:
 * 		set its hint to ""
 * 	- when a card is dropped on it:
 * 		put the card on it
 * ```
 * - Typed by its words:  it runs only when the thing dragged is that type, a sub-type's too (a joker is a card),
 *   so inside it `the card` is a card -- no checking it by hand.
 * - `it` / `its` are the list, as in any of its type's methods.
 * - They react, they never decide:  whether the list takes a drop is its own rule, `can take a card if: ...`,
 *   which also lights its glow.  `dragged over` runs for a list that can be dropped on, whether it takes the thing
 *   or not.
 * - `dropped on it` runs only for a drop the list takes;  the program's `<thing>-drop` event is sent only when no
 *   such handler is.
 * - Only in a type's outline body:  the list is the subject.
 * - Spanish:  `cuando una carta se arrastra sobre ella:`, `... se arrastra fuera de ella:`, `... se suelta sobre ella:`.
 * - Compiles to a method of the list's class, named for the item's type and the moment, which the page calls:
 *   `whenCardDraggedOver(card) {...}`, `whenCardDraggedOutOf(card)`, `whenCardDroppedOn(card)`.
 */
export class DragHandler extends SpellStatement<"item|moment|body?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Only in a type's outline body:  the type it's in is the list. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !P.SubjectScope.of(scope)?.subjectType) return undefined
    return match
  }

  /** The method we define, e.g. `when a card is dropped on it` of `pile` -- for editors' symbol lists. */
  getDeclaration(match: P.MatchFor<this>): P.Declaration {
    const list = P.SubjectScope.of(match.scope)!.subjectType!
    return {
      kind: "method",
      name: match.inputText.replace(/:.*$/s, "").trim(),
      nameMatch: match.groups.moment,
      of: list.name,
      detail: `${DragHandler.methodName(match)}()`
    }
  }

  /** Nested scope for the body:  the item as its own word, e.g. `the card`, and `it` / `its` as the list. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const list = P.SubjectScope.of(match.scope)!.subjectType!
    const itemType = DragHandler.itemTypeOf(match)
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: list.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(list.name),
      args: [new P.ScopeVariable({ name: P.instanceCase(itemType), datatype: itemType })],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const itemType = DragHandler.itemTypeOf(match)
    const arg = new P.ASTVariableExpression(match, { name: P.instanceCase(itemType), datatype: itemType })
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: DragHandler.methodName(match),
      method: new P.ASTMethodDefinition(match, { args: [arg], body: P.matchAST<MethodBody>(this.getBody(match)) })
    })
  }

  /** The item's type, e.g. `Card` for `when a card is ...`. */
  private static itemTypeOf(match: P.MatchFor<DragHandler>): string {
    return SP.typeName(`${match.groups.item.value}`)
  }

  /** The method the page calls, e.g. `whenCardDroppedOn` -- see `DRAG_MOMENTS`. */
  static methodName(match: P.MatchFor<DragHandler>): string {
    const moment = Wording.meaningOf(match.groups.moment) as DragMoment
    return `when${DragHandler.itemTypeOf(match)}${DRAG_MOMENTS[moment]}`
  }
}

/** Each moment a drag handler is for, by what its words mean, and the end of its method's name. */
const DRAG_MOMENTS = { dragged_over: "DraggedOver", dragged_out_of: "DraggedOutOf", dropped_on: "DroppedOn" } as const

/** One of `DRAG_MOMENTS`. */
type DragMoment = keyof typeof DRAG_MOMENTS
