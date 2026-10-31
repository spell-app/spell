import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/** What a detail adds to what a place's lines say:  `core.place()`'s second argument, merged. */
export type PlaceDetailValue = {
  collections?: Record<string, { at?: string; fields?: Record<string, string> }>
  keyNamed?: string
  checkedEvery?: number
  versionsIn?: string
  idColumn?: string
}

/**
 * A line under a place, saying something about it:  the base of each one (epic `data` P11).
 * - They compile to nothing by themselves:  `create_place` gathers what they say into its own `core.place()`.
 * - Only under a place:  each is plain words anywhere else.
 */
export abstract class PlaceDetail<Groups extends string> extends SpellStatement<Groups> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration

  /** Only under a place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!P.SubjectScope.of(scope)?.subjectType?.isA("Place")) return undefined
    return super.parse(scope, tokens)
  }

  /** What this line says. */
  abstract detailOf(match: P.MatchFor<this>): PlaceDetailValue

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}

/** A text's words, without its quotes. */
export function textIn(text: P.Match | undefined): string {
  return `${text?.raw ?? ""}`.trim().replace(/^["'`]|["'`]$/g, "")
}

/** A property's name as its row calls it, from its words:  what compiled code names it. */
export function fieldNamed(words: string): string {
  return P.JSWriter.instance.nameOf(snakeCase(words.trim()))
}
