import { proto, upperFirst } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { abilitiesOf, isCheckedOften } from "spell/parser/spell/rules/places/places.shared"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getKnownType } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { On } from "./On"

/** SIDE EFFECT:  `match`, about `type` changing, won't compile unless `type` is saved in a place:  or it would never run. */
function refuseUnlessSaved(match: P.Match, type: P.TypeScope): void {
  const message = () => {
    const what = upperFirst(SP.SpellWarnings.exampleNoun(match.scope, type))
    return SP.Language.of(match.scope).parserMessage("change-not-saved", { what })
  }
  SP.SpellWarnings.refuseIf(match, message, () => !type.savedPlace())
}

/**
 * `when_thing_changes` rule:  run this when any thing of a saved type changes, whoever changed it, this page included (epic `data` P13).
 * - e.g. `when a recipe changes:`, Spanish's `cuando cambia una receta:`
 * - Its body has the thing, by its type's name (`the recipe`), and as `it`, at a file's top.
 * - An event like any other:  `a-recipe-change`, sent to the thing and up its chain to the app, then the file's own listeners.
 *   - NOT `recipe-change`, what a property called `recipe` sends.
 *   - In an outline it's that type's handler, `onARecipeChange()`.
 * - The core tells it, a moment after the change:  `PlaceThings.noteChanged()`.
 * - A type kept in no place won't compile:  it would never run, which is what this rule stops.
 * - Above `On`, which reads the same words as an event of that name that nobody sends.
 */
export class WhenThingChanges extends On {
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    refuseUnlessSaved(match, WhenThingChanges.typeOf(match))
    return match
  }

  /** What the event names:  see the class. */
  ownEventName(match: P.MatchFor<On>): string {
    return savedChangeEvent(WhenThingChanges.typeOf(match).name)
  }

  /** The thing, by its type's name. */
  eventProps(match: P.MatchFor<On>): P.ScopeVariableProps[] {
    const { name } = WhenThingChanges.typeOf(match)
    return [{ name: thingVariableOf(name), datatype: name }]
  }

  /** At a file's top, `it` is the thing too. */
  itWithNoSubject(match: P.MatchFor<On>): Pick<P.MethodScopeProps, "mapItTo" | "itDatatype"> {
    const { name } = WhenThingChanges.typeOf(match)
    return { mapItTo: thingVariableOf(name), itDatatype: name }
  }

  /** The type it's about. */
  private static typeOf(match: P.Match): P.TypeScope {
    return getKnownType((match.groups as unknown as { type: P.Match }).type)
  }
}

/**
 * `when_someone_else_changes` rule:  run this when someone other than this page changes this thing (epic `data` P13).
 * - e.g. `- when someone else changes it:`, Spanish's `- cuando otra persona lo cambia:` (`la`, for a feminine type)
 * - Goes under a saved type:  `it` is the thing.
 * - Compiles to its handler, `onSomeoneElseChange()`, for the event `someone-else-change`:  the core sends it when a place says so,
 *   or when reading again finds something different (`PlaceThings.noteChanged()`).
 * - "Someone else" is another page:  a place can't tell two windows of one person apart until there's a sign-in.
 * - Won't compile under a type kept in no place, or at a file's top.  Warns on a kind of place where it can't happen, or where
 *   nothing would ever say so:  `PLACE_KIND_ABILITIES`.
 * - Above `On`, which reads the same words as an event of that name that nobody sends.
 */
export class WhenSomeoneElseChanges extends On {
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const subject = P.SubjectScope.of(scope)?.subjectType
    if (!subject) return SpellStatement.refuse(match, language.parserMessage("someone-else-needs-a-type"))
    refuseUnlessSaved(match, subject)
    const it = tokens.find((token) => /^(?:lo|la)$/.test(`${token.value}`))
    const wanted = it && language.agreedForm(`${it.value}`, subject, false)
    if (wanted) SP.SpellWarnings.note(match, language.parserMessage("did-you-mean", { phrase: wanted }))
    SP.SpellWarnings.noteIf(
      match,
      language.parserMessage("someone-else-alone"),
      () => abilitiesOf(subject.savedPlace())?.hasOtherPeople === false
    )
    SP.SpellWarnings.noteIf(
      match,
      language.parserMessage("someone-else-not-told", { kind: `${subject.savedPlace()?.placeType.placeKind ?? ""}` }),
      () => {
        const saved = subject.savedPlace()
        const abilities = abilitiesOf(saved)
        return (
          !!abilities && abilities.hasOtherPeople !== false && !abilities.saysWhatChanged && !isCheckedOften(saved!)
        )
      }
    )
    return match
  }

  /** What the event names:  see the class. */
  ownEventName(): string {
    return SOMEONE_ELSE_EVENT
  }
}

/** The event `when someone else changes it` is the handler of:  the core's `SOMEONE_ELSE_EVENT` too. */
const SOMEONE_ELSE_EVENT = "someone-else-change"

/**
 * The event `when a recipe changes:` listens for, by a type's name:  `a-recipe-change`.
 * - The core's `savedChangeEvent()` writes the same.
 */
export function savedChangeEvent(typeName: string): string {
  return `a-${typeName.replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1-$2").toLowerCase()}-change`
}

/** What a thing of a type goes by in its handler:  `recipe`, `recipe_note`, by spell's names. */
function thingVariableOf(typeName: string): string {
  return typeName.replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1_$2").toLowerCase()
}
