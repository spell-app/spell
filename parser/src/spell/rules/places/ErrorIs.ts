import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `error_is` rule:  does what went wrong have this name, in Spell's words (epic `data` P50, Q95)?
 * - e.g. `the error is "not found"`:  `core.errorIs(error, "not found")`
 * - Spanish:  `el error es "no encontrado"`, the same test.
 * - The names:  "not found", "not authorized" (not signed in), "not permitted" (signed in, not allowed),
 *   "out of date", "server not found", "limit", "offline", and "anything";  each language's words for them are its
 *   `SP.LanguageWords.errorNames`.
 * - Never a status code:  the core reads what places and the network throw (`core.errorIs()`).
 * - A name it doesn't know is refused once the errors are gathered, listing the ones it does.
 * - In a failure step's steps (`if completing a job fails`), or `if that fails:`'s, where `the error` is.
 */
export class ErrorIs extends SpellExpression<"name"> {
  @proto static priority = Priority.specific
  @proto static datatype = "choice"

  /** Refused for a name that isn't an error's:  see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const names = language.words.errorNames ?? SP.Language.default.words.errorNames ?? {}
    const written = ErrorIs.textOf(match.groups.name)
    const name = names[written.toLowerCase()]
    // refused once the errors are gathered:  an expression refused here would leave its `if` reading it some other way
    const listed = Object.keys(names)
      .map((each) => `"${each}"`)
      .join(", ")
    const refusal = language.parserMessage("error-name-unknown", { name: written, names: listed })
    SP.SpellWarnings.refuseIf(match, refusal, () => !name)
    ;(match.data as ErrorIsData).errorName = name ?? written
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { errorName } = match.data as ErrorIsData
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "errorIs",
      args: [
        new P.ASTVariableExpression(match, { name: "error" }),
        new P.ASTStringLiteral(match, { value: JSON.stringify(errorName) })
      ]
    })
  }

  /** The text `match` writes:  `not found` for `"not found"`. */
  private static textOf(match: P.Match): string {
    return `${match.inputText ?? match.value}`.trim().replace(/^["“](.*)["”]$/, "$1")
  }
}

/** What `error_is` notes while parsing. */
type ErrorIsData = {
  /** The core's name for the error it tests:  `not found`. */
  errorName?: string
}
