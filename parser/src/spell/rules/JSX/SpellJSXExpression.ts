import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { loopItemsInDrawing, readableInDrawing } from "spell/parser/spell/rules/places/places.shared"
import { SpellJSXContent } from "./SpellJSXContent"

/**
 * `jsxExpression` rule:  match a `{...}` JSX expression container (a `jsxChild`, e.g. `<div>{1 + 2}</div>`).
 * - e.g. `{1}`
 * - Trims and collapses newlines in the raw contents before parsing as an `expression`.
 * - Falls back to `parse_error` if the expression doesn't consume the entire contents.
 * - NOTE: rule name is `jsxExpression`, kept distinct from class name `SpellJSXExpression` (pre-existing convention).
 */
export class SpellJSXExpression extends SpellJSXContent {
  static ruleName = "jsxExpression"
  @proto static alias = "jsxChild"
  @proto static tokenType = P.JSXExpressionToken

  /** Parse `contents` as an `expression`; falls back to `parse_error` if it doesn't consume it all. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // trim and remove newlines from expression (???)
    // `JSXExpression.contents` is typed `string | Token`:  see the note in `SpellJSXAttribute.parse()`.
    const jsxToken = match.matched[0] as P.JSXExpressionToken
    const input = (jsxToken.contents as string).trim().replace(/\n/g, " ")
    // only match expression if we used all of the input
    const expression = scope.parse(input, "expression")
    if (expression && expression.inputText.length === input.length) {
      match.data.expression = expression
      match.data.loopItems = loopItemsInDrawing(scope)
    } else {
      match.data.error = scope.parse(input, "parse_error")
    }
    this.placeInFile(match.data.expression ?? match.data.error, jsxToken)
    return match
  }
  /** A read of a place, in a drawing, is a value it can read:  `{every review}` (`readableInDrawing()`). */
  getAST(match: P.MatchFor<this>) {
    const { expression, error, loopItems } = match.data
    const value = expression && readableInDrawing(expression, expression.AST as P.ASTExpression, loopItems)
    return new P.ASTJSXExpression(match, {
      expression: value && SpellJSXExpression.shownAST(match, expression, value),
      error: error?.AST as P.ASTParseError | undefined
    })
  }

  /**
   * `value`, as a page shows it:
   * - a date says itself in words, `core.dateShown()`:  a `Date` is nothing a page can hold
   * - a measure in the reader's units, `{its height}` => `5 ft 8 in` (epic `language` P24)
   * - each side of an inline if, `{its time if it is done otherwise ""}`, as it would be alone (epic `data` I96):
   *   the whole has no one datatype, so the date went through raw, and a table reading it broke
   */
  private static shownAST(match: P.AnyMatch, expression: P.Match | undefined, value: P.ASTExpression): P.ASTExpression {
    if (value instanceof P.ASTTernaryExpression) {
      const { condition, trueValue, falseValue } = value
      return new P.ASTTernaryExpression(value.match, {
        condition,
        trueValue: SpellJSXExpression.shownAST(match, trueValue.match as P.Match, trueValue),
        falseValue: SpellJSXExpression.shownAST(match, falseValue.match as P.Match, falseValue)
      })
    }
    if (expression?.datatype === "date") {
      return new P.ASTCoreMethodInvocation(match, { methodName: "dateShown", args: [value] })
    }
    return SP.shownMeasureAST(expression, value)
  }
}
