import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `key_written` rule:  a key written into a program, which won't compile (epic `data` Q11).
 * - e.g. `- its key is "sk_live_123"`
 * - Anyone can read a browser program:  it says to name the key, `its key is the secret "..."`.
 */
export class KeyWritten extends SpellStatement<"type|key"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!P.SubjectScope.of(scope)?.subjectType?.isA("Place")) return undefined
    const match = super.parse(scope, tokens)
    return match && SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("key-written"))
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
