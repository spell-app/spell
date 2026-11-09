import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `load_sound` rule:  start loading a sound now, so a later `play` starts it at once (epic `data` J215).
 * - e.g. `load its sound`, `preload its sound` => `core.loadSound(sound)`
 * - A page that opens with it has the sound ready for the click that plays it.
 * - Only of text, or what may be text:  `load every recipe` is a read of things (`load_things`).
 * - A project's own method of the same words wins (`Priority.overridable`).
 */
export class LoadSound extends SpellStatement<"sound"> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const datatype = match?.groups.sound.datatype
    return match && (datatype === undefined || datatype === "text") ? match : undefined
  }

  getAST(match: P.MatchFor<this>) {
    const { sound } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "loadSound",
      args: [P.asAST<P.ASTExpression>(sound.AST)]
    })
  }
}
