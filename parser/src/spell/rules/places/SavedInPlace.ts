import { proto, snakeCase } from "spell/util"
import { SAVED_TIME_FIELDS, type SavedTimeField } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getKnownType } from "spell/parser/spell/rules/types"
import { collectionNameFor } from "./places.shared"

/**
 * `saved_in_place` rule:  a type lives in a place (epic `data` P11, Q1).
 * - e.g. `- it is saved in the family cookbook`, `- it lives in the family cookbook`, `a recipe is saved in the family cookbook`
 * - The cloud's `is saved in` is `saved_in_the_cloud`'s, which says how they're told apart.
 * - Only a place's name may follow:  `is saved in its own file` keeps its meaning, how a thing is split.
 * - After this, the words people know reach the place:  `every recipe`, `add`, `remove`, `set`.
 * - A read above this line means the place too:  each reads the type's record as the project compiles.
 * - Compiles to `Recipe.savedIn = { place: "family_cookbook", collection: "recipes", times: ["created", "modified"] }`.
 * - Every saved type has `its created` and `its modified`, two dates, without a line saying so (epic `data` T57):
 *   - in the program's language (`su creado`), the rows' fields named `created` and `modified` in every language
 *   - a line of its own declaring either keeps that one its own:  `times` leaves it out, and Spell never stamps it
 *   - `- it keeps no times` (`keeps_no_times`):  neither
 *   - `times` says which Spell stamps:  `core`'s write path, for a place that says it can hold them
 */
export class SavedInPlace extends SpellStatement<"type|place"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration + 1

  /** Only a place's name:  anything else is another rule's. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const placeType = scope.getType(match.groups.place.datatype)
    return placeType?.placeName ? match : undefined
  }

  /** SIDE EFFECT:  our type is saved here -- see `P.TypeScope.declareSaved()`. */
  mutateScope(match: P.MatchFor<this>) {
    const { type, place } = match.groups
    const placeType = match.scope.getType(place.datatype)!
    const known = getKnownType(type)
    const collection = collectionNameFor(snakeCase(known.name).replace(/_/g, " "))
    known.declareSaved({ place: placeType.placeName!, placeType, collection }, match)
    for (const word of Object.values(SP.Language.of(match.scope).words.savedTimeWords)) {
      known.declareProperty(word, match, { datatype: "date", isSavedTime: true })
    }
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const known = getKnownType(match.groups.type)
    const { saved } = known
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    const text = (value: string | undefined) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    const property = (name: string, value: P.ASTExpression) =>
      new P.ASTObjectLiteralProperty(match, { property: name as never, value })
    const times = this.timesOf(match, known)
    const value = new P.ASTObjectLiteral(match, {
      properties: [
        property("place", text(saved?.place)),
        property("collection", text(saved?.collection)),
        ...(times.length
          ? [
              property(
                "times",
                new P.ASTArrayLiteral(match, { items: times.map(({ field }) => text(field)) })
              )
            ]
          : [])
      ]
    })
    const savedIn = new P.ASTStaticDefinition(match, { type, name: "savedIn", value })
    const timeProperties = times.map(({ field, word }) => {
      const check = new P.ASTObjectLiteral(match)
      check.addProp("type", text("date"))
      if (word !== field) check.addProp("storedAs", text(field))
      return new P.ASTPatchedMember(match, {
        member: new P.ASTReactiveProperty(match, { type, property: word, check })
      })
    })
    return new P.ASTStatementGroup(match, {
      statements: [new P.ASTPatchedMember(match, { member: savedIn }), ...timeProperties]
    })
  }

  /** The times Spell keeps for `known`:  those this line gave it, unless it keeps none. */
  private timesOf(match: P.MatchFor<this>, known: P.TypeScope): { field: SavedTimeField; word: string }[] {
    if (known.keepsNoTimes) return []
    const words = SP.Language.of(match.scope).words.savedTimeWords
    return SAVED_TIME_FIELDS.map((field) => ({ field, word: words[field] })).filter(
      ({ word }) => known.variables.get(word, "LOCAL_ONLY")?.isSavedTime
    )
  }
}
