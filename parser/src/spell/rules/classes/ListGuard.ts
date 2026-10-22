import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { getKnownType } from "spell-lang/spell/rules/types"
import { Wording } from "spell-lang/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * What a list takes or gives up, after its subject:  `can take a card if: ...`, `can give up a card if: ...`.
 * - `take_or_give_up` says which:  see `ListGuard.methodName()`.
 */
export const CAN_MOVE = "can {verb:take_or_give_up} (a|an) {item:type} if :? {expression_body}?"
/**
 * What a list never takes or gives up, after its subject (epic page `outline-spell`, P26):
 * `can never take a card`, `can never let go of a card`.
 */
export const CAN_NEVER_MOVE = "can (never:never) {verb:take_or_give_up} (a|an) {item:type}"

/**
 * `list_guard` rule:  what a list type takes, or gives up, when something MOVES (epic page Q23 - Q25):
 * - `a tableau can (add|take) a card if: ...`
 * - `a stock-pile can (release|remove|give up|let go of) a card if: ...`
 * - `a foundation can never (release|remove|give up|let go of) a card` -- always no
 * - `a pile can never (add|take) a card` -- always no:  a sub-type says what it does take, e.g. a tableau
 * - Its body answers yes or no:  an inline expression, or an indented block which `return`s.
 *   `the card` is the card moving;  `it`, `its` and `the tableau` are the list.
 * - Compiles to a method of the list type's class, overriding `List`'s yes:
 *   `canTake(card) {...}` or `canGiveUp(card) {...}`.
 *   A sub-type inherits it, unless it says its own.
 * - Only a move asks, e.g. `move the card to the tableau` -- see `list_move`.
 *   `add`, `remove` and `clear` never do:  dealing, gathering cards back.
 * - In a list type's outline body, `it` or no subject at all (epic page `outline-spell`, P8):
 *   `- can take a card if: ...`
 */
export class ListGuard extends SpellStatement<"type|verb|item|body?|never?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /**
   * The method we define, e.g. `can take a card` of `tableau` -- for editors' symbol lists.
   * - Named by the line's own words, from after its subject to the item:  whatever the language.
   */
  getDeclaration(match: P.MatchFor<this>): P.Declaration {
    const { type, verb, item } = match.groups
    const text = match.inputText
    // a subject left out (`- can take a card if: ...`) takes no words
    const from = type.length ? type.next! - match.start! : 0
    return {
      kind: "method",
      name: text.slice(from, item.end! - match.start!).trim(),
      nameMatch: verb,
      of: `${type.value}`,
      detail: `${ListGuard.methodName(match)}()`
    }
  }

  /** Nested scope for the body:  the item as its own word, e.g. `the card`, and `it` / `its` as the list. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const listType = getKnownType(match.groups.type)
    const itemType = SP.typeName(`${match.groups.item.value}`)
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: listType.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(listType.name),
      args: [new P.ScopeVariable({ name: P.instanceCase(itemType), datatype: itemType })],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const { type, never, item } = match.groups
    const itemType = SP.typeName(`${item.value}`)
    // its type, e.g. `Card` for `a card`:  a typed target writes it
    const arg = new P.ASTVariableExpression(match, { name: P.instanceCase(itemType), datatype: itemType })
    const body = never
      ? new P.ASTReturnStatement(match, { value: new P.ASTBooleanLiteral(match, false) })
      : P.matchAST<MethodBody>(this.getBody(match))
    return new P.ASTPropertyDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      property: ListGuard.methodName(match),
      method: new P.ASTMethodDefinition(match, { args: [arg], body, datatype: "choice" })
    })
  }

  /** `canTake` for a verb meaning `take`, e.g. `add`;  else `canGiveUp` -- the `List` method we override. */
  static methodName(match: P.MatchFor<ListGuard>): "canTake" | "canGiveUp" {
    return Wording.meaningOf(match.groups.verb) === "take" ? "canTake" : "canGiveUp"
  }
}
