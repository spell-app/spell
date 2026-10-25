import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { SubjectRule } from "spell-parser/spell/rules/types"
import { MemberWords } from "./MemberWords"

/**
 * `body_member_words` rule:  a member's bare name starting a line of a type's outline body,
 * e.g. `suit` in `- suit is a suit of its deck` (epic page `outline-spell`, P9).
 * - As `member_words`, but NOT when its first word starts one of spell's statements, e.g. `return` or `print`:
 *   `- return x is 1` stays a `return`.
 *   A property named so keeps its quotes:  `- "return" is ...`.
 * - Nor `it` / `its` (`subject_it`, `subject_its`):  `- its rank is ...` names its subject, `rank` the property.
 * - Those words come from the statements themselves:  `SP.SpellParser.statementWordsFor()`.
 */
export class BodyMemberWords extends MemberWords {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [first] = tokens
    if (!first || SubjectRule.reads(scope, "subject_it", first) || SubjectRule.reads(scope, "subject_its", first)) {
      return undefined
    }
    if (SP.SpellParser.statementWordsFor(scope).has(`${first.value}`.toLowerCase())) return undefined
    return super.parse(scope, tokens)
  }
}
