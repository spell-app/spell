import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { phraseForThings, savedPlaceOfMatch } from "spell/parser/spell/rules/places/places.shared"
import { EveryThing } from "./EveryThing"

/**
 * `the_saved_things` rule:  `the saved todos` -- every thing of a saved type, in its place (epic `data` I61).
 * - Spanish's `las recetas guardadas`, `los mazos guardados`.
 * - The same as `every todo`:  `core.savedThings(Todo)`;  so `add it to the saved todos` saves it.
 * - ALWAYS the place's:  unlike `the todos`, a property, variable or method called `todos` never takes it.
 *   So a page can call its own read `todos`, and still save with this.
 * - Of a type saved in no place, it won't compile:  it'd mean nothing `the todos` doesn't.
 */
export class TheSavedThings extends EveryThing {
  /** SIDE EFFECT:  refused while its type is saved in no place, or found only by name (`refusedIfFoundByName()`). */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    if (!scope.getType(`${type.value}`)) return undefined
    // the line that saves it may be anywhere in the project:  asked when the errors are gathered
    const message = () => {
      const kind = EveryThing.kindOf(type)
      const words = `${type.raw}`.trim()
      const params = { things: P.pluralize(words), thing: P.singularize(words) }
      const theThings = kind ? phraseForThings(match.scope, "the-things", kind) : `${params.things}`
      return SP.Language.of(match.scope).parserMessage("not-saved", { ...params, theThings })
    }
    SP.SpellWarnings.refuseIf(match, message, () => !savedPlaceOfMatch(type))
    return EveryThing.refusedIfFoundByName(match, type)
  }
}
