import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ReturnStatement } from "spell/parser/spell/rules/assignment/ReturnStatement"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `without_closing` rule:  runs a statement, and leaves the modal open after the action it's in:
 * `deal the cards without closing`, `deal the cards without closing the modal` (epic `language` T155).
 * - A button in a modal's `<actions>` closes the modal once its action has run;  a line of that action, or of a
 *   button's `onClick={...}`, saying this keeps it open.  Spanish's `sin cerrar`, `sin cerrar el modal`.
 * - Compiles to `core.keepOpen()`, then the statement:  anywhere else it changes nothing.
 * - Only a call, as `without_waiting` takes:  not a line that sets, declares or returns something,
 *   nor one with a body.
 * - Reads its statement by hand, as `without_waiting` does:  a slot given the whole line would read this rule again,
 *   for ever.
 */
export class WithoutClosing extends SpellStatement<"call"> {
  @proto static alias = "statement"
  @proto static priority = Priority.specific

  /** The most words its own end has:  `without closing the modal`, `sin cerrar el modal`. */
  private static readonly MOST_WORDS = 4

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (this.test(scope, tokens) === false) return undefined
    const cut = this.cutOf(scope, tokens)
    if (cut === undefined) return undefined
    const call = scope.parser?.parse(tokens.slice(0, cut), "statement", scope)
    if (call?.length !== cut || (call.rule as SpellStatement).bodySpec || !WithoutClosing.isCall(call)) return undefined
    const match = new P.Match({ rule: this, matched: [...tokens], tokens: [...tokens], scope })
    match.addMatch(call, "call")
    return match
  }

  /** `core.keepOpen()`, then its statement. */
  getAST(match: P.MatchFor<this>) {
    const keepOpen = new P.ASTCoreMethodInvocation(match, { methodName: "keepOpen", args: [] })
    return new P.ASTStatementGroup(match, { statements: [keepOpen, P.asAST<P.ASTStatement>(match.groups.call.AST)] })
  }

  /** Where its statement ends:  the start of the words its syntax ends in, `undefined` if the line doesn't end so. */
  private cutOf(scope: P.Scope, tokens: P.Token[]): number | undefined {
    for (let words = 1; words <= WithoutClosing.MOST_WORDS && words < tokens.length; words++) {
      if (this.endsWithOurWords(scope, tokens.slice(-words))) return tokens.length - words
    }
    return undefined
  }

  /** Are `tail`'s words exactly the ones our syntax ends in? */
  private endsWithOurWords(scope: P.Scope, tail: P.Token[]): boolean {
    let at = 0
    for (const word of this.rules.slice(1)) {
      const said = word.parse(scope, tail.slice(at))
      if (!said) return false
      at += said.length
    }
    return at === tail.length
  }

  /** Can `statement` take this end?  Not one that changes its scope, or returns from what holds it. */
  private static isCall({ rule }: P.Match): boolean {
    return rule.mutateScope === P.Rule.prototype.mutateScope && !(rule instanceof ReturnStatement)
  }
}
