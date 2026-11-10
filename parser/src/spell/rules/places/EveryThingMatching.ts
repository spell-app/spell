import { ANY_FIELD } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import { savedPlaceOfMatch, searchesOf } from "./places.shared"

/** How far in a type's name can start:  Spanish's `todas las obras que coinciden con`. */
const WORDS_TO_THE_TYPE = 3

/**
 * `every_thing_matching` rule:  every thing a web server finds for some text, by its own search (epic `data` P34).
 * - e.g. `every artwork matching the search`:  the Met Museum's, `/v1.1/search?q=sunflowers`
 * - e.g. `all artworks matching ...`, `artworks matching ...`, `the artworks which match ...`:  by its plural (epic `data` Q37, T128)
 * - Its place says it searches all of each thing:  `- it searches everything with "q"`.
 *   Else it won't compile, saying so:  a search of one field is `every book where its title includes ...`.
 * - What the server answers is taken as it is, in its order:  nothing says where it matched, so nothing here checks.
 * - A thing its list gives only the id of is read whole only when something reads the rest
 *   (`its lists give only ...`).
 * - Compiles to `core.savedThings(Artwork, { search: { "*": this.search } })`.
 */
export class EveryThingMatching extends SpellExpression<"type|words"> {
  /** A list of the type, e.g. `list of artworks`:  as `every_thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOf(SP.typeName(`${match.groups.type.value}`))
  }

  /** Quick test:  a known type, up to two words in:  it can start with a type's plural alone, and this runs on every expression. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    for (let index = start; index < start + WORDS_TO_THE_TYPE && tokens[index]; index++) {
      if (tokens[index] instanceof P.WordToken && scope.getType(`${tokens[index]!.value}`)) return true
    }
    return false
  }

  /** A known type;  refused, when the errors are gathered, unless its place searches all of each thing. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    if (!EveryThing.kindOf(type)) return undefined
    const words = `${type.raw}`.trim()
    const message = () =>
      SP.Language.of(match.scope).parserMessage("matching-needs-search", {
        things: P.pluralize(words),
        thing: P.singularize(words)
      })
    // the line that says so may be anywhere in the project:  asked when the errors are gathered
    SP.SpellWarnings.refuseIf(match, message, () => {
      const searches = searchesOf(savedPlaceOfMatch(type))
      return !searches || !!searches.fields.length
    })
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type, words } = match.groups
    const search = new P.ASTObjectLiteral(match, {
      properties: [new P.ASTObjectLiteralProperty(match, { property: ANY_FIELD as never, value: P.matchAST(words) })]
    })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThings",
      args: [
        P.matchAST<P.ASTTypeExpression>(type),
        new P.ASTObjectLiteral(match, {
          properties: [new P.ASTObjectLiteralProperty(match, { property: "search" as never, value: search })]
        })
      ]
    })
  }
}
