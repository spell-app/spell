import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `new_list` rule:  `a new list of <type>` -- constructs a `List`, optionally tagged with `instanceType`.
 * - Compiles to `new List(...)`, e.g. `a new list of Todos` => `new List({ instanceType: "Todo" })`.
 */
export class NewList extends SpellStatement<"instanceType?"> {
  @proto static alias = "expression"

  /** A `list`, or a `list of` what it says, e.g. `list of todos`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const { instanceType } = match.groups
    return instanceType ? P.listOf(SP.typeName(`${instanceType.value}`)) : "list"
  }

  getAST(match: P.MatchFor<this>): P.ASTNewInstanceExpression {
    const { instanceType } = match.groups
    return new P.ASTNewInstanceExpression(match, {
      type: new P.ASTTypeExpression(match, { name: "List" }),
      props:
        instanceType &&
        new P.ASTObjectLiteral(instanceType, {
          properties: [
            new P.ASTObjectLiteralProperty(instanceType, {
              property: "instanceType",
              value: new P.ASTTypeNameLiteral(instanceType, { value: String(instanceType.value), quote: '"' })
            })
          ]
        })
    })
  }
}
