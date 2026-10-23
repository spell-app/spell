import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `saved_in_file` rule:  `a person is saved in its own file` -- a person gets an entry, a file, of its own,
 * and what holds one saves a reference to it (epic `people-and-orgs`, decision Q42).
 * - Every other thing is saved INSIDE what holds it:  written whole the first time, a reference after.
 * - Say it of things worth a file each, that other files point at:  a person, an org.
 * - Refused for a built-in type, e.g. `a thing is saved in its own file`:  every project shares it.
 * - Compiles to `Person.savedInFile = true`, after the class:  the runtime `Thing` says `false`.
 */
export class SavedInFile extends SpellStatement<"type"> {
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
      return SpellStatement.refuse(match, language.parserMessage("cant-save-built-in-in-file", { type: typeName }))
    }
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const savedInFile = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "savedInFile",
      value: new P.ASTBooleanLiteral(match, true)
    })
    return new P.ASTPatchedMember(match, { member: savedInFile })
  }
}
