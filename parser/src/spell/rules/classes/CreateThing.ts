import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `create_thing` rule:  `create a thing` -- same as `new_thing` above, worded with `create` instead of `a new`.
 * - This works as an expression OR a statement.
 * - NOTE: we assume that all types take an object of properties????
 * - TODO: in `statement` form, put into `it`???
 * - FIXME: `list`, `text`, etc don't follow these semantics???
 */
export class CreateThing extends SpellStatement<"type|props?"> {
  @proto static alias = ["expression", "statement"]

  /** The type it makes, e.g. `Card`, `thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTNewInstanceExpression {
    const { type, props } = match.groups
    return new P.ASTNewInstanceExpression(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      props: P.matchAST<P.ASTObjectLiteral>(props)
    })
  }
}
