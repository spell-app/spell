import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SuffixLeft } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { IsEqual } from "spell/parser/spell/rules/expressions/IsEqual"
import { CurrentPerson } from "./PeopleWords"

/**
 * `they_are` rule:  `they are`, as `is` after the person using the program (epic `data` P15).
 * - e.g. `if they are the cook of it`
 * - Only after `they`:  `are` means nothing else as a comparison.
 * - Compiles as `is_equal` does:  to `core.isCurrentPerson()`.
 */
export class TheyAre extends IsEqual {
  @proto static alias = "expression_suffix"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return SuffixLeft.current?.is(CurrentPerson) ? super.parse(scope, tokens) : undefined
  }
}
