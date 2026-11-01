import { proto, upperFirst } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, SuffixLeft, type OperatorOperands } from "./expressions.shared"

/**
 * `is_empty` rule:  `{lhs} is [not] empty` postfix, e.g. `thing is empty`.
 * - Compiles to `core.isEmpty(lhs)`, negated for `is not empty`.
 * - A thing that holds no items is never empty, so it warns, naming the words that work (epic `language`, Q14):
 *   in an action, `if it is empty` is about the thing the action runs on.
 *   - Only when `it` is KNOWN to be such a thing:  text, a list and a value of unknown type stay quiet.
 */
export class IsEmpty extends PostfixOperatorSuffix<"operator"> {
  @proto static precedence = Precedence.comparison

  /** SIDE EFFECT:  notes a thing that can never be empty. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const left = SuffixLeft.current
    const type = left?.datatype ? scope.getType(left.datatype) : undefined
    if (!match || !type || !IsEmpty.isThingType(type)) return match
    const message = SP.Language.of(scope).parserMessage("never-empty", {
      AType: upperFirst(SP.SpellWarnings.exampleNoun(scope, type))
    })
    SP.SpellWarnings.noteIf(match, message, () => IsEmpty.isThingType(type) && !type.getMember("empty"))
    return match
  }

  /**
   * Is `type` known to be a thing that holds no items?
   * - Only a type a program made on `thing`, and not a list:  text, a list or a value of unknown type can be empty.
   */
  private static isThingType(type: P.TypeScope): boolean {
    return !!type.declaredBy && !type.valueKind && type.isA("thing") && !type.isA("list")
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "isEmpty",
      args: [lhs!]
    })
  }
}
