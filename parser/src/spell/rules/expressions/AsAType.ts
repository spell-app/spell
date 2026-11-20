import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { AsFileContents } from "./AsFileContents"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_a_type` rule:  `as a`/`an {type}` -- casts value to `string`/`number`/`fraction`/`integer`/`text`.
 * - e.g. `1 as a string`, `1.4 as an integer`
 * - The type is read through the language's own type words (`SP.Language.typeWords`), so no English word is read here:
 *   `string` and Spanish's `cadena` both mean `text`.
 * - `text` wraps output in a template-literal `${...}` via `BackTickExpression`.
 * - `integer` compiles to `parseInt()`, any other number type (`number`, `fraction`) to `parseFloat()`.
 * - `date` reads text as a date, `"2026-12-25" as a date` => `core.dateFrom("2026-12-25")`:  that day's midnight where
 *   it's read;  text that isn't a date is nothing (epic `language` P63).
 * - `the weekday of now as a number` is its weekday number, 1 to 7 (`weekdayRead()`).
 * - A file dropped or uploaded, `the file as text`, is read instead:  see `AsFileContents`.
 */
export class AsAType extends PostfixOperatorSuffix<"type"> {
  @proto static precedence = Precedence.comparison
  @proto static description = "Convert a value to a specific type, e.g. an integer."

  /** The type it converts to, in spell's words, e.g. `text` for `as a string`. */
  getResultDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return this.castType(match)
  }

  /** What our `type` means, in spell's own type names, e.g. `text` for `string` or `cadena`. */
  castType(match: P.MatchFor<this>): P.Datatype {
    const { typeWords, words } = SP.Language.of(match.scope)
    return P.typeName(`${match.groups.type.value}`, typeWords, words.listOfWord)
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    const type = this.castType(match)
    // a file, `the file as text`:  read, waiting for it (epic `language` P67)
    if (type === "text" && AsFileContents.isAFile(match.scope, lhs)) return AsFileContents.read(match, lhs!, "text")
    if (type === "date") {
      return new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "dateFrom", args: [lhs!] })
    }
    const weekday = type === "text" ? undefined : AsAType.weekdayRead(lhs!)
    if (weekday) return weekday
    if (type === "text") {
      // Wrap the expression in backticks to convert it to a string.
      // Output is something like: "`${EXPRESSION_VALUE}`"
      return new P.ASTBackTickExpression(match, {
        expression: new P.ASTBacktickSubstitution(match, { expression: lhs! })
      })
    } else {
      // Output will be e.g. `parseFloat(EXPRESSION_VALUE)`
      const methodName = type === "integer" ? "parseInt" : "parseFloat"
      return new P.ASTMethodInvocation(match, {
        methodName,
        args: [lhs!]
      })
    }
  }

  /**
   * `the weekday of now as a number`:  the date's weekday number, `core.weekdayNumberOf(...)`, counted from the person's
   * first day of the week (epic `language` P63) -- else `undefined`.
   * - The name, `Tuesday`, as a number would be nothing.
   */
  private static weekdayRead(lhs: P.ASTExpression): P.ASTExpression | undefined {
    if (!(lhs instanceof P.ASTCoreMethodInvocation) || lhs.methodName !== "weekdayOf") return undefined
    return new P.ASTCoreMethodInvocation(lhs.match, {
      datatype: "number",
      methodName: "weekdayNumberOf",
      args: lhs.args.args
    })
  }
}
