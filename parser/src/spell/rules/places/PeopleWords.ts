import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { placeKindsIn, PLACE_KIND_ABILITIES } from "./places.shared"

/**
 * `current_person` rule:  who's at this page (epic `data` P13).
 * - e.g. `the current person`, Spanish's `la persona actual`
 * - Compiles to `core.currentPerson()`:  plain data, its `name` and `id`, the same object as long as the program runs.
 * - It has no type of its own, so its name is read by each language's word:  see `inProgramWords()`, in `core`.
 * - `Priority.overridable`:  a program's own `current person` wins.
 * - With no sign-in, who someone says they are:  `personOnThisPage()`.
 */
export class CurrentPerson extends SpellExpression<never> {
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "currentPerson", args: [] })
  }
}

/**
 * `people_here` rule:  everyone here now, this page included (epic `data` P13).
 * - e.g. `the people here`, Spanish's `las personas presentes`
 * - Compiles to `core.peopleHere()`:  one list for as long as the program runs, so what draws it follows people coming and going.
 * - One for each page:  two windows side by side see each other.
 * - On a place with no people there's only you:  it warns, unless the program has a place that can say (`PLACE_KIND_ABILITIES`).
 *   A kind a library adds isn't known here, so nothing's said of a program with one.
 * - NOT `Priority.overridable`:  it has to beat `the people`, every person, read as far as it goes.
 */
export class PeopleHere extends SpellExpression<never> {
  @proto static datatype: P.Datatype | undefined = "list"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    SP.SpellWarnings.noteIf(match, SP.Language.of(scope).parserMessage("people-here-only-you"), () =>
      placeKindsIn(scope).every(
        (kind) => !!kind && !PLACE_KIND_ABILITIES[kind]?.knowsWhoIsHere && !!PLACE_KIND_ABILITIES[kind]
      )
    )
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "peopleHere", args: [] })
  }
}
