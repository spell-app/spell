import { P } from "spell-parser/parser"

/**
 * `object_literal_properties` rule:  object literal --
 * creates an object with one or more property values, e.g. `foo = 1 and bar is 2`.
 */
export class ObjectLiteralProperties extends P.Repeat {
  getAST(match: P.MatchFor<this>) {
    return new P.ASTObjectLiteral(match, {
      properties: match.items.map((propMatch) => P.asAST<P.ASTObjectLiteralProperty>(propMatch.AST))
    })
  }
}
