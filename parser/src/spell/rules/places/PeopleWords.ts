import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { fieldNamed } from "./PlaceDetail"
import { placeKindsIn, PLACE_KIND_ABILITIES } from "./places.shared"

/**
 * `current_person` rule:  who's at this page (epic `data` P13, Owen's `me`, T48).
 * - e.g. `me`, `its cook is me`, `every recipe where its cook is me`, Spanish's `yo`
 * - Compiles to `core.currentPerson()`:  plain data, its `name` and `id`, the same object as long as the program runs.
 * - It has no type of its own, so its name is read by each language's word:  see `inProgramWords()`, in `core`.
 * - `Priority.overridable`:  a program's own variable or action called `me` wins.
 *   So does a property of the thing an action runs on:  `its "me" is text`, then `me` is that (`ownProperty()`).
 * - With no sign-in, who someone says they are:  `personOnThisPage()`.
 */
export class CurrentPerson extends SpellExpression<never, PersonWordData> {
  @proto static priority = Priority.overridable

  /** Note the program's own property of these words. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) match.data.own = ownProperty(scope, `${match.inputText}`.trim())
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { own } = match.data
    if (own) return new P.ASTPropertyExpression(match, { object: new P.ASTSelfLiteral(match), property: own })
    return new P.ASTCoreMethodInvocation(match, { methodName: "currentPerson", args: [] })
  }
}

/** What a person is, in every language:  the fields of `PlacePerson`. */
const PERSON_FIELDS = ["name", "id"]

/**
 * `my_field` rule:  something about who's at this page (T48).
 * - e.g. `my name`, Spanish's `mi nombre`
 * - Compiles to `core.currentPerson().name`:  the same as `the name of me`.
 * - Only what a person has, their `name` and `id`, in the language's own words (`builtInMembers`):
 *   a person has no type, so `my recipes` would be nothing at all.  It's left as words nobody understands, an error.
 *   - So Spanish has no `mis` yet:  a person has nothing plural to read.
 * - `Priority.overridable`:  a program's own `my name` wins, as `me` does.
 */
export class MyField extends SpellExpression<"field", PersonWordData> {
  @proto static priority = Priority.overridable

  /** Only what a person has, unless it's the program's own. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    match.data.own = ownProperty(scope, `${match.inputText}`.trim())
    return match.data.own || fieldOfPerson(scope, `${match.groups.field.raw}`) ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyExpression {
    const { own } = match.data
    if (own) return new P.ASTPropertyExpression(match, { object: new P.ASTSelfLiteral(match), property: own })
    return new P.ASTPropertyExpression(match, {
      object: new P.ASTCoreMethodInvocation(match, { methodName: "currentPerson", args: [] }),
      property: fieldOfPerson(match.scope, `${match.groups.field.raw}`)!
    })
  }
}

/** What `current_person` and `my_field` note while parsing. */
type PersonWordData = {
  /** The property of the program's that goes by these words, as compiled code names it. */
  own?: string
}

/** The property `words` name of the thing the action at `scope` runs on:  `undefined` if it has none. */
function ownProperty(scope: P.Scope, words: string): string | undefined {
  return P.MethodScope.thingTypeOf(scope)?.hasProperty(words) ? fieldNamed(words) : undefined
}

/** The field of a person `words` name, in the language `scope` is in:  `nombre` is `name`. */
function fieldOfPerson(scope: P.Scope, words: string): string | undefined {
  const { builtInMembers } = SP.Language.of(scope).words
  return PERSON_FIELDS.find((field) => field === words || builtInMembers?.[field]?.includes(words))
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
