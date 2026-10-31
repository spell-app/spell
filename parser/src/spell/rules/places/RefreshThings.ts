import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `refresh_things` rule:  ask a place again (epic `data` P11).
 * - e.g. `refresh the recipes`, Spanish's `recargar las recetas`
 * - `Priority.overridable`:  a program's own `to refresh the recipes:` wins.
 * - Compiles to `core.refreshSaved(Recipe)`.
 */
export class RefreshThings extends SpellStatement<"type"> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { scopeType } = match.groups.type.data as { scopeType?: unknown }
    return scopeType instanceof P.TypeScope ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "refreshSaved",
      args: [P.matchAST<P.ASTTypeExpression>(match.groups.type)]
    })
  }
}
