import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `while_handler` rule:  in a template's outline, steps that hold WHILE something stays true about one of its things,
 * and are put back when it stops (epic `elemental-spell` P9, Q51, Q52 A):  every property they set returns to what it was.
 * - e.g. `- while the mouse is down:` `set its color to "gold"`:  gold while the mouse is pressed on it, as before after
 * - Compiles to a method of the template, `whileMouseDown()`;  the page runs it as the mouse goes down on the thing's
 *   element and puts it back as the mouse goes up anywhere (core's `startWhile()` / `endWhile()`, which a drag's
 *   `while a card is dragged over it` uses too).
 * - Each moment is its own registration, `specialize()`d with its method's name (`handler`).
 * - Only in a template's outline:  `it` is the thing.
 */
export class WhileHandler extends SpellStatement<"body?"> {
  @proto static alias = "statement"
  /** What `specialize()` takes:  the method's name. */
  declare static readonly SpecializeWith: { handler: string }
  /** The method's name, by spell's names, e.g. `while_mouse_down`. */
  @proto static handler = "while_mouse_down"

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!P.SubjectScope.of(scope)) return undefined
    return super.parse(scope, tokens)
  }

  /** The handler's scope:  `it` and `its` are the thing, as in its template's other methods. */
  getNestedScopeForMatch(match: P.MatchFor<this>) {
    const subject = P.SubjectScope.of(match.scope)!.subjectType
    return new P.MethodScope({
      parentScope: match.scope,
      name: this.handler,
      args: [],
      declaredBy: match,
      ...(subject && { thisVar: subject.instanceName, mapItTo: "this", itDatatype: SP.typeName(subject.name) })
    })
  }

  getAST(match: P.MatchFor<this>) {
    const body = this.getBody(match)
    const method = new P.ASTMethodDefinition(match, {
      body: body ? P.asAST<P.ASTStatementBlock | P.ASTStatement | P.ASTExpression>(body.AST) : undefined
    })
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: this.handler,
      method
    })
  }
}

/** Declared, so a `specialize()`d instance reads its own. */
export interface WhileHandler {
  handler: string
}
