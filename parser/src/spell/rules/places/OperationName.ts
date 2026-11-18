import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `operation_name` rule:  one operation a place may let be done, in an `enabled operations are ...` line (epic `data` P49).
 * - e.g. `add`, `change`, `delete`, `read`, `all`, or an action's name, `complete`
 * - Any one word:  the line asks the `operation_word` wording which of Spell's own it is, else it's an action's name.
 * - Compiles to nothing by itself.
 */
export class OperationName extends P.Pattern {
  @proto static pattern = P.LOWER_INITIAL_WORD_WITH_DASHES
}
