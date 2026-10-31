import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `field_called` rule:  what a place calls a property of a type, when its name differs.
 * - e.g. `- a recipe's title is called "dish_name"`
 */
export class FieldCalled extends PlaceDetail<"owner|property|name"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { owner, property, name } = match.groups
    const collection = collectionNameFor(`${owner.raw}`)
    return { collections: { [collection]: { fields: { [fieldNamed(`${property.raw}`)]: textIn(name) } } } }
  }
}
