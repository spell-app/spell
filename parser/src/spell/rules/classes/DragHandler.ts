import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * `drag_handler` rule:  what a list does on the page as a thing is dragged over it, out of it, or dropped on it.
 * - Epic `outline-spell` P28.
 *
 * ```spell
 * a "pile" is a viewable list of cards where:
 * 	- it can be dropped on
 * 	- while a card is dragged over it:
 * 		set its hint to "drop here"
 * 	- when a card is dropped on it:
 * 		put the card on it
 * ```
 * - `while ... dragged over it`:  what it sets is put back as the thing leaves, or lands (`core.startWhile()`).
 *   - So the hint above clears itself.
 *   - The long way:  `when a card is dragged over it:` sets it, `when a card is dragged out of it:` clears it.
 * - Typed by its words:  it runs only when the thing dragged is that type, a sub-type's too (a joker is a card),
 *   so inside it `the card` is a card -- no checking it by hand.
 * - `something` for any thing:  `when something is dropped on it:`, the thing as `the thing`.
 *   - A typed handler runs instead, when the thing's type has one.
 * - `it` / `its` are the list, as in any of its type's methods.
 * - They react, they never decide:  whether the list takes a drop is its own rule, `can take a card if: ...`,
 *   which also lights its glow.
 *   - `dragged over` runs for a list that can be dropped on, whether it takes the thing or not.
 *   - `dropped on it` runs only for a drop the list takes.
 *   - The program's `<thing>-drop` event is sent only when the list has no `dropped on it`.
 * - Only in a type's outline body:  the list is the subject.
 * - Spanish:  `cuando una carta se arrastra sobre ella:`, `... se arrastra fuera de ella:`, `... se suelta sobre ella:`.
 * - Compiles to a method of the list's class, named for the item's type and the moment, which the page calls:
 *   `whenCardDraggedOver(card) {...}`, `whenCardDraggedOutOf(card)`, `whenCardDroppedOn(card)`,
 *   `whileCardDraggedOver(card)`;  `whenThingDroppedOn(thing)` for `something`.
 * - Its syntaxes have no `moment` for `while`:  it's only ever `dragged over`.
 */
export class DragHandler extends SpellStatement<"item?|moment?|body?"> {
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
      nameMatch: match.groups.moment ?? match.groups.item ?? match,
      of: list.name,
      detail: `${DragHandler.methodName(match)}()`
    }
  }

  /** Nested scope for the body:  the item as its own word, e.g. `the card`, and `it` / `its` as the list. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const list = P.SubjectScope.of(match.scope)!.subjectType!
    const itemType = DragHandler.itemTypeOf(match)
    const datatype = match.groups.item ? itemType : "thing"
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: list.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(list.name),
      args: [new P.ScopeVariable({ name: DragHandler.itemNameOf(match), datatype })],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const itemType = DragHandler.itemTypeOf(match)
    const datatype = match.groups.item ? itemType : "thing"
    const arg = new P.ASTVariableExpression(match, { name: DragHandler.itemNameOf(match), datatype })
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: DragHandler.methodName(match),
      method: new P.ASTMethodDefinition(match, { args: [arg], body: P.matchAST<MethodBody>(this.getBody(match)) })
    })
  }

  /** The item's type, e.g. `Card` for `when a card is ...`;  `Thing` for `something`. */
  private static itemTypeOf(match: P.MatchFor<DragHandler>): string {
    const { item } = match.groups
    return item ? SP.typeName(`${item.value}`) : "Thing"
  }

  /** What the body calls the item, e.g. `card` for `the card`;  for `something`, the language's word for a thing. */
  private static itemNameOf(match: P.MatchFor<DragHandler>): string {
    const { item } = match.groups
    return item ? P.instanceCase(DragHandler.itemTypeOf(match)) : SP.Language.of(match.scope).wordFor("thing")
  }

  /** The method the page calls, e.g. `whenCardDroppedOn`, `whileCardDraggedOver` -- see `DRAG_MOMENTS`. */
  static methodName(match: P.MatchFor<DragHandler>): string {
    const { moment } = match.groups
    const item = DragHandler.itemTypeOf(match)
    if (!moment) return `while${item}${DRAG_MOMENTS.dragged_over}`
    return `when${item}${DRAG_MOMENTS[Wording.meaningOf(moment) as DragMoment]}`
  }
}

/** Each moment a drag handler is for, by what its words mean, and the end of its method's name. */
const DRAG_MOMENTS = { dragged_over: "DraggedOver", dragged_out_of: "DraggedOutOf", dropped_on: "DroppedOn" } as const

/** One of `DRAG_MOMENTS`. */
type DragMoment = keyof typeof DRAG_MOMENTS
