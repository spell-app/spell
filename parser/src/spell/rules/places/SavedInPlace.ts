import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getKnownType } from "spell/parser/spell/rules/types"
import { collectionNameFor } from "./places.shared"

/**
 * `saved_in_place` rule:  a type lives in a place (epic `data` P11, Q1).
 * - e.g. `- it is saved in the family cookbook`, `a recipe is saved in the family cookbook`
 * - Only a place's name may follow:  `is saved in its own file` keeps its meaning, how a thing is split.
 * - After this, the words people know reach the place:  `every recipe`, `add`, `remove`, `set`.
 * - A read above this line means the place too:  each reads the type's record as the project compiles.
 * - Compiles to `Recipe.savedIn = { place: "family_cookbook", collection: "recipes" }`.
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
  }

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const saved = getKnownType(match.groups.type).saved
    const text = (value: string | undefined) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    const value = new P.ASTObjectLiteral(match, {
      properties: [
        new P.ASTObjectLiteralProperty(match, { property: "place" as never, value: text(saved?.place) }),
        new P.ASTObjectLiteralProperty(match, { property: "collection" as never, value: text(saved?.collection) })
      ]
    })
    return new P.ASTPatchedMember(match, {
      member: new P.ASTStaticDefinition(match, {
        type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
        name: "savedIn",
        value
      })
    })
  }
}
