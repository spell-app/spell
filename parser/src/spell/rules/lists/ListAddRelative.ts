import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Wording } from "spell/parser/spell/rules/expressions"

// TODO: Add to middle of list, pushing existing items out of the way.
//       "add {thing:expression} to position {position:expression} of {list:expression}",

/**
 * `list_add_relative` rule:  add to list before/after some other item, e.g. `add thing to my-list before other-thing`.
 * - Compiles to `core.addBefore(list, item, thing)` / `core.addAfter(list, item, thing)`,
 *   by what `operator` means (`before_or_after`).
 * - `item` not in the list:  `before` adds at the START, `after` at the END (epic `output-targets`, P14) --
 *   the same rule as `List`'s own `addBefore()` / `addAfter()`.
 * TODO: `relative_position_expression` rule?
 */
export class ListAddRelative extends SpellStatement<"thing|list|operator|item"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list, operator, item } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: Wording.meaningOf(operator) === "after" ? "addAfter" : "addBefore",
      args: [P.matchAST(list), P.matchAST(item), P.matchAST(thing)]
    })
  }
}
