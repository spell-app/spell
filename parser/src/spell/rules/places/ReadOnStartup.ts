import { P } from "spell/parser/parser"
import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `read_on_startup` rule:  a collection read as the program starts, before any page draws it.
 * - e.g. `- tags are read on startup`, Spanish's `- las etiquetas se leen al arrancar`
 * - Spell NEVER reads ahead by itself:  a page reads what it draws, as it draws it.  This line is the one way in, for a
 *   collection every page needs at once, one line each.
 * - Its first page, then held for as long as the program runs:  a page drawing it finds it there.
 * - Compiles to `readOnStartup: ["Tag"]` on the place's line, its class by name:  the class may be declared
 *   below the place, so the running page finds it by name as it starts (`ProgramPlaces.readOnStartup()`).
 */
export class ReadOnStartup extends PlaceDetail<"collection"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { readOnStartup: [P.matchAST<P.ASTTypeExpression>(match.groups.collection).name] }
  }
}
