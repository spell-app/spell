import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import:  the word rules' folder builds on the statements
import { Wording } from "spell/parser/spell/rules/expressions/Wording"
import { fieldNamed, textIn } from "./PlaceDetail"

/** What each of Spell's own operations is, as compiled code names it:  every other word is an action's name. */
export const OPERATION_MEANINGS = ["read", "add", "change", "delete", "all"] as const

/**
 * `enabled_operations` rule:  what a place lets be done to a type's things (epic `data` P49, Q47 / J264 D, Q57-Q63).
 *
 * ```spell
 * a "job" is a thing
 * 	it lives in netbox
 * 	enabled operations are add, change, complete
 *
 * a "job session" is a thing
 * 	it lives in netbox
 * 	enabled operations are read
 * ```
 *
 * - The words `operations`, `are` and the colon may be left out:  `enabled: add, change`.
 * - `read`, `add`, `change`, `delete`, `all`, and each action of the place by its name (`to complete a job is at ...`);
 *   reading is an operation too (Q61), so `enabled operations are read` is read only.
 * - `all operations are disabled`:  none at all, not even reading (Q58).
 * - No line:  every operation.  A line only narrows.
 * - On the THING, never on the web server's own lines (J264);
 *   or one step in under a collection's `live at` line, where it's the switch for all of them (Q60, Q63):
 *   a thing's line can only narrow that.
 * - An operation left out compiles, and refuses when it runs, saying which are enabled (`RestPlace.limitOperations()`).
 * - Compiles to nothing of its own:  a thing's goes in its `savedIn.operations`, a collection's in its place's details.
 */
export class EnabledOperations extends SpellStatement<"operations?", EnabledOperationsData> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration + 1

  /** Only under a thing, or a place (a collection's line), with each operation's name worked out. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const subject = P.SubjectScope.of(scope)?.subjectType
    if (!subject) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const items = (match.groups.operations as (P.Match & { items?: P.Match[] }) | undefined)?.items ?? []
    match.data.operations = items.map((item) => operationNamed(scope, textIn(item)))
    match.data.isPlace = subject.isA("Place")
    return match
  }

  /** SIDE EFFECT:  a thing's line says what its place lets be done to it -- see `P.TypeScope.declareEnabledOperations()`. */
  mutateScope(match: P.MatchFor<this>) {
    if (match.data.isPlace) return
    P.SubjectScope.of(match.scope)?.subjectType?.declareEnabledOperations(match.data.operations, match)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }

  /** The operations a line of this rule enables, as compiled code names them:  `[]` for none at all. */
  static operationsOf(match: P.Match): readonly string[] | undefined {
    return match.rule instanceof EnabledOperations ? (match.data as EnabledOperationsData).operations : undefined
  }
}

/** What `enabled_operations` notes while parsing. */
type EnabledOperationsData = {
  /** Each operation it enables, as compiled code names it:  `add`, `complete`.  None:  `all operations are disabled`. */
  operations: string[]
  /** It's under a place:  a collection's switch, not a thing's line. */
  isPlace?: boolean
}

/** One operation's name, as compiled code names it:  Spell's own by its wording, in any language;  else an action's. */
function operationNamed(scope: P.Scope, word: string): string {
  return OPERATION_MEANINGS.find((meaning) => Wording.reads(scope, "operation_word", word, meaning)) ?? fieldNamed(word)
}
