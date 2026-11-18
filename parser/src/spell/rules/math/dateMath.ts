import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * A date moved by a duration, or the duration between two dates:  what `+` and `-` do with dates (epic `language` P63).
 * - `now + 2 days` => `core.addToDate(core.now(), 2, "day")`:  the duration's own unit, as its measure says
 * - `its due - 1 hour` => `core.subtractFromDate(this.due, 1, "hour")`
 * - `the next weekend - now` => `core.secondsBetween(core.nextWeekend(), core.now())`:  a duration in seconds
 *   (`Minus.resultMeasure()`)
 * - Only a MEASURED duration moves a date:  `now + 5` reads as it always has.
 * - Shared by `Plus` and `Minus`;  `undefined` when neither side is a date.
 */
export function dateMathAST(
  match: P.AnyMatch,
  operator: "plus" | "minus",
  lhs: P.ASTExpression | undefined,
  rhs: P.ASTExpression | undefined
): P.ASTExpression | undefined {
  if (!lhs || !rhs) return undefined
  const isDate = SP.isDateAST
  const durationOf = (side: P.ASTExpression) => {
    const measure = SP.measureOf(side.match)
    return measure?.dimension === SP.DURATION ? measure : undefined
  }
  const call = (methodName: string, args: P.ASTExpression[], datatype: P.Datatype) =>
    new P.ASTCoreMethodInvocation(match, { datatype, methodName, args })
  const unit = (measure: P.Measure) => new P.ASTStringLiteral(match, { value: measure.unit, quote: '"' })
  if (operator === "minus" && isDate(lhs) && isDate(rhs)) return call("secondsBetween", [lhs, rhs], "number")
  const [date, duration] = isDate(lhs) ? [lhs, rhs] : operator === "plus" ? [rhs, lhs] : [undefined, undefined]
  const measure = duration && durationOf(duration)
  if (!date || !isDate(date) || !measure) return undefined
  const methodName = operator === "plus" ? "addToDate" : "subtractFromDate"
  return call(methodName, [date, duration, unit(measure)], "date")
}

/** What `+` or `-` makes of a date and something else:  a date, a number (the seconds between two), or `undefined`. */
export function dateMathDatatype(
  operator: "plus" | "minus",
  lhs: P.Datatype | undefined,
  rhs: P.Datatype | undefined
): P.Datatype | undefined {
  if (operator === "minus" && lhs === "date" && rhs === "date") return "number"
  if (lhs === "date" && (rhs === "number" || rhs === "integer")) return "date"
  if (operator === "plus" && rhs === "date" && (lhs === "number" || lhs === "integer")) return "date"
  return undefined
}
