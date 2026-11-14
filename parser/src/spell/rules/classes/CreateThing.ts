import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { NewThing } from "./NewThing"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `create_thing` rule:  `create a thing` -- same as `new_thing`, worded with `create` instead of `a new`.
 * - This works as an expression OR a statement.
 * - Its props read as `new_thing`'s do (epic `language` J159):  `NewThing.readProps()`, e.g.
 *   `create a card with rank and suit` ~== `create a card with rank = the rank, suit = the suit`
 *   when a local, loop item or argument goes by that name.
 * - NOTE: we assume that all types take an object of properties????
 * - TODO: in `statement` form, put into `it`???
 * - FIXME: `list`, `text`, etc don't follow these semantics???
 */
export class CreateThing extends SpellStatement<"type|props?", NewThing["MatchData"]> {
  @proto static alias = ["expression", "statement"]
  // a new thing is a value:  as an action's last line, what it gives back (epic `language` I47)
  @proto static givesValue = true

  /** Notes how its props read, as `a new ...` does:  see `NewThing.readProps()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) NewThing.readProps(match)
    return match
  }

  /** The type it makes, e.g. `Card`, `thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTNewInstanceExpression {
    return new P.ASTNewInstanceExpression(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      props: NewThing.propsAST(match)
    })
  }
}
