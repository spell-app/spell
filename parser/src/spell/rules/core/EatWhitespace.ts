import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `eat_whitespace` rule:  eats all whitespace at start of tokens
 * -- used to skip leading indent/newlines before a real rule.
 * - e.g. `  `, eats leading whitespace tokens greedily
 * - Base class is `P.Repeat`, not `P.Subrule`:
 *   syntax `{whitespace}*` compiles to a `Repeat` (of a `whitespace` `Subrule`), matching zero-or-more times.
 * - NOTE: nothing else refers to this rule.
 *   That's why it once worked as `extends P.Subrule`, in the old props-bag form.
 */
export class EatWhitespace extends P.Repeat {
  @proto static datatype = "text"
}
