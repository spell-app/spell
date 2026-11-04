import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `field_called` rule:  what a place calls a property of a type, when its name differs.
 * - e.g. `- a recipe's title is its "dish_name"`, with `its` or without
 * - e.g. `- a vehicle's "cost in credits" is its "cost_in_credits"`:  in quotes, for words the plain form stops at, like `in`
 */
export class FieldCalled extends PlaceDetail<"owner|property|name"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { owner, property, name } = match.groups
    const collection = collectionNameFor(`${owner.raw}`)
    return { collections: { [collection]: { fields: { [fieldNamed(textIn(property))]: textIn(name) } } } }
  }
}
