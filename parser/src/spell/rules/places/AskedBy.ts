import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `asked_by` rule:  the fields a web server's things are asked for by, each a query parameter (epic `data` P33).
 * - e.g. `- forecasts are asked for by their latitude and longitude`:
 *   Open-Meteo's, `/v1/forecast?latitude=52.52&longitude=13.41`
 * - So a read says each:
 *   `every forecast where its latitude is 52.52 and its longitude is 13.41` asks for that place's,
 *   and `every forecast` won't compile, saying what to give (`EveryThing.refusalWithoutQuery()`).
 * - Its answer is for those values, whatever it says it's for:  the server's nearest, `52.5126`.
 * - Each field by its words, as `it searches names with "search"` names them.
 * - Compiles to `collections: { forecasts: { askedBy: ["latitude", "longitude"] } }`, which `RestPlace` reads.
 */
export class AskedBy extends PlaceDetail<"collection|fields"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const askedBy = match.groups.fields.items.map((item: P.Match) => fieldNamed(textIn(item)))
    return { collections: { [name]: { askedBy } } }
  }
}
