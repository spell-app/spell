import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `saved_inline` rule:  `a dated-event is saved inline` --
 * a dated event is saved INSIDE what holds it (epic `people-and-orgs`, Q9 and J1).
 * - Since decision Q42 that's every thing's default:  written whole the first time, a reference after.
 *   - So this says the default, and changes nothing.
 *   - What changes it:  `a person is saved in its own file` (`saved_in_file`).
 * - Refused for a built-in type, e.g. `a thing is saved inline`:  every project shares it.
 * - Compiles to `DatedEvent.savedInline = true`, after the class.
 */
export class SavedInline extends SpellStatement<"type"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Refused for a built-in type -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    const { scopeType } = type.data as { scopeType?: unknown }
    if (scopeType instanceof P.TypeScope && SP.isBuiltInTypeScope(scopeType)) {
      const language = SP.Language.of(scope)
      const typeName = language.wordFor(SP.typeName(`${type.value}`))
      return SpellStatement.refuse(match, language.parserMessage("cant-save-built-in-inline", { type: typeName }))
    }
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const savedInline = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "savedInline",
      value: new P.ASTBooleanLiteral(match, true)
    })
    return new P.ASTPatchedMember(match, { member: savedInline })
  }
}
