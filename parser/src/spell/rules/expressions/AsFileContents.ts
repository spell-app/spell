import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_file_contents` rule:  a file read, waiting for it -- `the file as json`, `the file as binary`
 * (epic `language` P67, r32;  OK'd in epic `from-console` Q14);  Spanish `el archivo como json`, `como binario`.
 * - Compiles to `await core.readFile(file, "json")`:  read, never "pretend it is" (an `as` cast).
 * - `the file as text` is `as_a_type`'s words:  that rule reads a file as text when what it reads is a file
 *   (`AsFileContents.read()`), and casts anything else.
 * - `as binary` is its bytes, `as json` its text read as JSON:  `file_reading`'s meanings, `FILE_READINGS`.
 */
export class AsFileContents extends PostfixOperatorSuffix<"kind"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    return AsFileContents.read(match, lhs!, Wording.meaningOf(match.groups.kind) === "json" ? "json" : "binary")
  }

  /** `await core.readFile(file, as)`. */
  static read(match: P.Match, file: P.ASTExpression, as: "text" | "json" | "binary"): P.ASTAwaitExpression {
    return new P.ASTAwaitExpression(match, {
      expression: new P.ASTCoreMethodInvocation(match, {
        methodName: "readFile",
        args: [file, new P.ASTStringLiteral(match, { value: JSON.stringify(as) })]
      })
    })
  }

  /**
   * Is `value` a file:  a drag line's or an uploader line's `the file`, its datatype `File` (`DragHandler`,
   * `FileUploadHandler`)?
   */
  static isAFile(scope: P.Scope, value: P.ASTExpression | undefined): boolean {
    if (value?.datatype === "File") return true
    if (!(value instanceof P.ASTVariableExpression)) return false
    const variable = scope.variables?.get(`${value.name}`) as P.ScopeVariable | undefined
    return variable?.datatype === "File"
  }
}

/** How a file is read, `as json` or `as binary`:  `file_reading`'s meanings. */
export const FILE_READINGS = ["json", "binary"]
