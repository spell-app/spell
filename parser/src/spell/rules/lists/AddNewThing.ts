import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { NewThing } from "spell/parser/spell/rules/classes"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { refuseWriteIfReadOnly } from "spell/parser/spell/rules/places/places.shared"

/**
 * `add_new_thing` rule:  a new thing, with no list named:  it joins every other of its type (epic `data` P15).
 * - e.g. `add a new recipe with cook = them`:  no parentheses, and no `to the recipes`
 * - For a saved type it's kept in its place, as `add ... to the recipes` does.
 * - For one in memory it's only made:  it's in `every recipe` once it is.
 * - Only of `a new ...`:  `add x` of anything else names no list, so it means nothing.
 * - `Priority.overridable`:  a program's own `to add ...` wins.
 * - Compiles to `core.saveThing(new Recipe({ cook: core.currentPerson() }))`.
 */
export class AddNewThing extends SpellStatement<"thing", { type?: P.TypeScope }> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !match.groups.thing.is(NewThing)) return undefined
    match.data.type = scope.getType(match.groups.thing.datatype)
    if (match.data.type && !SP.isBuiltInTypeScope(match.data.type)) refuseWriteIfReadOnly(match, match.data.type)
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const thing = P.matchAST<P.ASTExpression>(match.groups.thing)
    if (!match.data.type?.savedPlace()) return thing
    return new P.ASTCoreMethodInvocation(match, { methodName: "saveThing", args: [thing] })
  }
}
