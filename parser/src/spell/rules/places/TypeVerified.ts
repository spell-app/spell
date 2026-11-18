import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `type_verified` rule:  whether a type read from an API's description was tried against a running server
 * (epic `data` P49, Q56 C, Q62 B).
 * - e.g. `this type is verified`, `this type is failed`, `this type is unverified`;  `this` and `is` may be left out
 * - The ingest writes `unverified` on each type it makes;  `spell place verify` turns it to `verified` or `failed`,
 *   or takes it out.  No line means it's fine.
 * - When, where, its status and why stay in the place's description, `<Name>.api.json5`:  the line only says how it went.
 * - Only under a type.  Compiles to nothing:  it's for people, and the tools.
 */
export class TypeVerified extends SpellStatement<"state"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration + 1

  /** Only under a type. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const subject = P.SubjectScope.of(scope)?.subjectType
    if (!subject || subject.isA("Place")) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
