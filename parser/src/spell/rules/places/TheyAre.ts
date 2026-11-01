import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SuffixLeft } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { IsEqual } from "spell/parser/spell/rules/expressions/IsEqual"
import { CurrentPerson } from "./PeopleWords"
import { WhereField } from "./WhereField"

/**
 * `they_are` rule:  `they are`, as `is` after the person using the program (epic `data` P15, T66).
 * - e.g. `if they are the cook of it`
 * - e.g. `recipes where they are the cook`:  in a `where`, `the cook` is the thing's own (`where_field`).
 *   - `recipes where the person is the cook` too, in both languages (epic `language`, Q15).
 *   - So it means, and compiles to, exactly what `recipes where its cook is them` does.
 *   - It beats `is_equal`, Spanish's reading of the same words, and through it a program's own `cook`.
 *   - A program's own `they` wins, as it does everywhere:  then it's a plain comparison, whatever `the cook` is.
 * - Only after `they`:  `are` means nothing else as a comparison.
 * - Compiles as `is_equal` does:  to `core.isCurrentPerson()`.
 */
export class TheyAre extends IsEqual {
  @proto static alias = "expression_suffix"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const left = SuffixLeft.current
    if (!left?.is(CurrentPerson)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match?.groups.expression.is(WhereField)) return match
    if ((left.data as { own?: string }).own) return undefined
    match.priority = Priority.preferred
    return match
  }
}
