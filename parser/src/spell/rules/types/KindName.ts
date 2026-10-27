import { P } from "spell/parser/parser"
import { SingularType } from "./SingularType"

/**
 * `kind_name` rule:  a value kind's name of several words, singular, naming one of its values (epic `spanish` P22).
 * - e.g. `card rank`, in `for each card rank in card ranks`, after a card's `its "rank" is one of ace, 2 ... king`
 * - e.g. Spanish's `palo de carta`
 * - What it names is a VARIABLE, its words its name:  `card_rank`, read as `card rank` -- see `variableName()`.
 * - Only a kind's name of two words or more:  one word is any identifier's, e.g. `for each rank in ...`.
 */
export class KindName extends SingularType {
  /** A value kind's name of several words -- see the class docstring. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match || match.tokens.length < 2) return undefined
    const { scopeType } = match.data as { scopeType?: unknown }
    return scopeType instanceof P.TypeScope && scopeType.valueKind ? match : undefined
  }

  /**
   * The variable `match` names, its words joined by `_`, e.g. `card_rank` for `card rank`:
   * as a variable of several words is named (`words_identifier`), so `card rank` reads it back.
   */
  static variableName(match: P.Match): string {
    return `${match.raw}`.trim().toLowerCase().split(/\s+/).join("_")
  }
}
