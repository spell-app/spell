import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * `outline_specifier_percent` rule:  a property that's a PERCENT (epic `language` P34, Owen's C1 on I47):
 * `its "tip" is a percent`, `its "tip" is a percent starting at 18%`;  Spanish `su "propina" es un porcentaje`.
 * - `<property "tip" type="percent">18%</>` reads as the second.
 * - A measure of the built-in proportion dimension (`SP.PROPORTION`), kept as its fraction:  the property holds a plain
 *   number, `0.18` for `18%`, so `the bill * the tip` works -- see `SP.measureKeptIn()`.
 * - Shown with its % sign, the reader's way (`core.measureShown()`):  `18%`, Spanish `18 %`.
 * - Before the plain `a {type}` rules:  else `a percent` would read as a type of its own, `Percent`.
 */
export class OutlineSpecifierPercent extends P.Sequence<"start?", { measure?: P.Measure }> {
  @proto static alias = "outline_specifier"

  /** Only where the scope knows the proportion dimension:  always, as it's built in. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const proportion = SP.dimensionsIn(scope).find((type) => type.name === SP.PROPORTION)
    if (!proportion) return undefined
    match.data.measure = SP.measureKeptIn(proportion, proportion.units![0]!)
    return match
  }

  /** A plain number. */
  getDatatype(_match: P.MatchFor<this>): P.Datatype | undefined {
    return "number"
  }

  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    return new P.ASTTypeExpression(match, { name: "number" })
  }
}
