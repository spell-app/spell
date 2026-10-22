import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `start_app` rule:  start a scoped `App`/`Drawable`, e.g. `start the game` => `game.start()`
 * (a method call, not a global).
 */
export class StartApp extends SpellStatement<"app"> {
  @proto static alias = "statement"

  /** Starting the app is part of the program's start, skipped when an edit keeps its things. */
  startsTheProgram(): boolean {
    return true
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTScopedMethodInvocation(match, {
      thing: P.asAST<P.ASTExpression>(match.groups.app.AST),
      methodName: "start"
    })
  }
}
