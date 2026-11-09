import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { Get } from "spell/parser/spell/rules/assignment/Get"

/** The rules that read things of a type:  all `load` and `fetch` take. */
const READS = /^(?:every_thing|every_thing_where|the_things|the_saved_things|first_few_where|list_sorted_by)$/

/**
 * `load_things` rule:  the same as `get`, in the words people bring to a read (epic `data` P15).
 * - e.g. `load the recipes`, `fetch every recipe where its cook is "Ana"`:  a new `it` holds them
 * - Only of a read of things:  `load the scores`, with no type of that name, is a program's own to say.
 * - `Priority.overridable`:  a program's own `to load the recipes:` wins, as people name their own actions that.
 */
export class LoadThings extends Get {
  @proto static priority = Priority.overridable

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    return match && READS.test(match.groups.value.rule.name ?? "") ? match : undefined
  }
}
