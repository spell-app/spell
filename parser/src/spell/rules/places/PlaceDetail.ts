import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/** What a detail adds to what a place's lines say:  `core.place()`'s second argument, merged. */
export type PlaceDetailValue = {
  collections?: Record<string, { at?: string; fields?: Record<string, string> }>
  keyNamed?: string
  checkedEvery?: number
  checkedAt?: { hour: number; minute: number; utc?: boolean }
  versionsIn?: string
  idColumn?: string
  accounts?: string[]
  rowsIn?: string
  nextPageIn?: string
  namesLike?: string
  numbersLike?: string
}

/**
 * A line under a place, saying something about it:  the base of each one (epic `data` P11).
 * - They compile to nothing by themselves:  `create_place` gathers what they say into its own `core.place()`.
 * - Only under a place:  each is plain words anywhere else.
 */
export abstract class PlaceDetail<Groups extends string> extends SpellStatement<Groups> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration

  /**
   * Only under a place.
   * - Refuses a dot in a field's name:  what's inside a field is its own thing, read in words, so nobody ever reaches for a path.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!P.SubjectScope.of(scope)?.subjectType?.isA("Place")) return undefined
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const groups = match.groups as Record<string, P.Match | P.Match[] | undefined>
    for (const group of FIELD_GROUPS) {
      const field = textIn(groups[group] as P.Match | undefined)
      if (field.includes(".")) {
        const [first, ...rest] = field.split(".").reverse()
        const words = `${first} of its ${rest.reverse().join(" of its ")}`
        const message = SP.Language.of(scope).parserMessage("no-dotted-field", { field, words })
        return SpellStatement.refuse(match, message)
      }
    }
    return match
  }

  /** What this line says. */
  abstract detailOf(match: P.MatchFor<this>): PlaceDetailValue

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}

/** The groups that name a field of the place's answer. */
const FIELD_GROUPS = ["name", "field", "inner", "outer"]

/** A text's words, without its quotes. */
export function textIn(text: P.Match | undefined): string {
  return `${text?.raw ?? ""}`.trim().replace(/^["'`]|["'`]$/g, "")
}

/**
 * Where a field is that's inside others, as the engine reads it:  `the "items" of its "data"` => `data.items`.
 * - The dots stop here:  a program never writes one (`PlaceDetail.parse()`).
 */
export function fieldPathOf(groups: { field: P.Match; inner?: P.Match; outer?: P.Match }): string {
  const { field, inner, outer } = groups
  return [field, outer, inner].flatMap((each) => (each ? [textIn(each)] : [])).join(".")
}

/** A property's name as its row calls it, from its words:  what compiled code names it. */
export function fieldNamed(words: string): string {
  return P.JSWriter.instance.nameOf(snakeCase(words.trim()))
}
