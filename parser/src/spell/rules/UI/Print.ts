import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Wording } from "spell/parser/spell/rules/expressions/Wording"

/**
 * `print` rule:  print an expression (to the console currently).
 * - e.g. `print "Yo!"`
 * - What `operator` means (`print_kind`:  `info` / `warning` / `error` / `group` / `collapsed_group`)
 *   picks the `console` method, by `CONSOLE_METHOD_FOR_KIND`;  no `operator` prints with `log`.
 */
export class Print extends SpellStatement<"operator?|expressions"> {
  @proto static alias = "statement"
  getAST(match: P.MatchFor<this>) {
    const { operator, expressions } = match.groups
    const kind = Wording.meaningOf(operator) as PrintKind | undefined
    const methodName = kind ? CONSOLE_METHOD_FOR_KIND[kind] : "log"
    return new P.ASTConsoleMethodInvocation(match, {
      methodName,
      args: expressions.items.map((item) => P.asAST<P.ASTExpression>(item.AST))
    })
  }
}

/** What a `print_kind` form means:  the kind of message printed. */
type PrintKind = "info" | "warning" | "error" | "group" | "collapsed_group"

/** The `console` method each kind of `print` calls. */
const CONSOLE_METHOD_FOR_KIND: Record<PrintKind, string> = {
  info: "info",
  warning: "warn",
  error: "error",
  group: "group",
  collapsed_group: "groupCollapsed"
}
