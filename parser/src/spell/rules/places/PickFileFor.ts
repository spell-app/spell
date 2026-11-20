import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { pickedPlaceNameOf } from "./places.shared"

/**
 * `pick_file_for` rule:  the file picker, for a place that's a file a person picks (epic `editor` P41, Q67's B).
 * - e.g. `pick a file for family cookbook`:  an app's own Open button or menu item, beside the place's own
 *   "Open a file" line.
 * - The file picked becomes the place's file, remembered for next time, replacing the one before (Q69).
 * - Only a place declared `a json file you pick` (or `on this device`, a csv or an excel file):  anything else refuses.
 * - Compiles to `await core.pickFileFor("family_cookbook")`:  the picker opens from the click that ran it.
 */
export class PickFileFor extends SpellStatement<"place", { pickedPlace?: string }> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const pickedPlace = pickedPlaceNameOf(scope, match.groups.place)
    if (pickedPlace) {
      match.data.pickedPlace = pickedPlace
      return match
    }
    const text = match.groups.place.inputText.trim()
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("pick-file-not-a-file", { text }))
  }

  getAST(match: P.MatchFor<this>): P.ASTAwaitExpression {
    return new P.ASTAwaitExpression(match, {
      expression: new P.ASTCoreMethodInvocation(match, {
        methodName: "pickFileFor",
        args: [new P.ASTStringLiteral(match, { value: JSON.stringify(match.data.pickedPlace) })]
      })
    })
  }
}
