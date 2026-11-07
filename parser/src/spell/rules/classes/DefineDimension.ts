import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { TypeDeclaration } from "./TypeDeclaration"

/**
 * `define_dimension` rule:  a kind of measure and its units, written in spell (epic `language` P23, Owen's C5):
 *
 * ```spell
 * data size is a dimension:
 *   - its base is "byte", aka "B"
 *   - one "kilobyte", aka "KB", is 1000 B
 * ```
 *
 * - Declares a TYPE, `DataSize`, whose record holds its units (`P.TypeScope.units`):  each line under it adds one
 *   (`dimension_base`, `dimension_unit`).
 * - So `its "size" is a data size in KB` says what a property measures, and `its size in B` converts it.
 * - Compiles to `core.defineDimension("DataSize")`;  each unit line to its own `core.defineUnit()` after it
 *   (a type's body compiles beside it, `flatBody`).
 * - Spell's built-in six are written the same way, in the core's `dimensions/dimensions.spell`.
 */
export class DefineDimension extends TypeDeclaration<"type|with_nested_statements?|body?"> {
  @proto static declares: P.DeclaresSpec = { kind: "type", name: "type" }

  /**
   * Quick test:  the line names a dimension, in the language's word (`dimension`, `dimensión`) --
   * so an editor doesn't offer `is a dimension` after just any words, e.g. `set y`.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    return tokens.some(
      (token, index) => index > start && token instanceof P.WordToken && SP.typeName(`${token.value}`) === "dimension"
    )
  }

  /** Refuses a name some other type already goes by -- see `TypeDeclaration.refuseTakenNames()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && this.refuseTakenNames(match)
  }

  /** SIDE EFFECT:  declares our type, a dimension -- see `TypeDeclaration.declareType()`. */
  mutateScope(match: P.MatchFor<this>) {
    this.declareType(match, "dimension")
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const name = P.classCase(`${match.groups.type.value}`)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "defineDimension",
      args: [new P.ASTStringLiteral(match, { value: name, quote: '"' })]
    })
  }
}
