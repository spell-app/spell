import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/** What a detail adds to what a place's lines say:  `core.place()`'s second argument, merged. */
export type PlaceDetailValue = {
  collections?: Record<
    string,
    {
      at?: string
      fields?: Record<string, string>
      searchedOnly?: boolean
      pictures?: Record<string, string>
      askedBy?: string[]
      /** How this one is searched, at its own address:  see `CollectionSearchedWith`. */
      searches?: { param: string; fields: string[]; at?: string }
    }
  >
  keyNamed?: string
  keyIfSet?: boolean
  /** Where its key goes on a request:  see `KeyGoesInHeader`, `KeyGoesInAddress`. */
  keyGoes?: { header: string } | { inAddress: string }
  checkedEvery?: number
  checkedAt?: { hour: number; minute: number; utc?: boolean }
  versionsIn?: string
  idColumn?: string
  accounts?: string[]
  rowsIn?: string
  nextPageIn?: string
  nextPageInLink?: boolean
  /** What a web server calls how many and where from:  see `NextPageByOffset`. */
  pagesByOffset?: { limit?: string; offset: string }
  /** What a web server calls how many and which page:  see `NextPageByNumber`. */
  pagesByNumber?: { limit?: string; page: string; first?: number }
  /** What a web server calls how many and the last row's id:  see `NextPageByLastId`. */
  pagesByLastId?: { limit?: string; param: string; moreIn?: string }
  /** What it calls the cursor it's sent back:  see `NextPageIn`. */
  nextPageSentAs?: string
  namesLike?: string
  numbersLike?: string
  listsGive?: string[]
  pageSize?: number
  /** Which fields it filters by itself:  see `FiltersBy`. */
  filters?: "every field" | string[]
  /** Which fields it sorts by itself:  see `SortsBy`. */
  sorts?: "every field" | string[]
  /** What it calls a sort, when that isn't `sort`. */
  sortedWith?: string
  /** What it calls the fields it's asked for:  see `GivesFieldsNamedIn`. */
  fieldsNamedIn?: string
  /** It takes no writes:  see `IsReadOnly`. */
  readOnly?: boolean
  searches?: { param: string; fields: string[]; at?: string }
  mostPerSecond?: number
  keptOnDevice?: boolean | number
  listsUnder?: Record<string, Record<string, string>>
  /** What a projection's lines say (epic `atmosphere` P17):  see `ProjectionOf`. */
  projection?: ProjectionLines
  /**
   * What a sign-up sheet's lines say (epic `atmosphere` P27):  `SignUpsFrom`, `RowsOnlyFrom`, `MostRowsEach`;
   * `RowsAllowedEach`, `ConfirmedJoin` (P31).
   */
  sheet?: SheetLines
}

/** What a sign-up sheet's lines say:  the kit's `SheetRules`, each line one part of it. */
export type SheetLines = {
  /** The space whose readers sign up here:  `picnic@rs`. */
  signUpsFrom?: string
  /** The collection listing who may add rows:  `attendees`. */
  onlyFrom?: string
  /** At most `most` rows with the same `field`;  several, each line its own (P31). */
  mostEach?: { field: string; most: number } | { field: string; most: number }[]
  /** Each person's allowance:  as many rows in `collection` as their row on the list says in `field` (P31). */
  allowance?: { collection: string; field: string }
  /** A confirmed row of `collection` joins the space at `address` (P31). */
  joins?: { collection: string; address: string }
}

/** What a projection's lines say:  where it's written, which fields it shows, which things. */
export type ProjectionLines = {
  /** The space it's written into, by its address:  `@rs/picnic`. */
  into?: string
  /** The fields shown, by the names compiled code gives them:  `["person", "shift"]`. */
  fields?: string[]
  /** Only things whose field has this text, by field:  `{ status: "confirmed" }`. */
  where?: Record<string, string>
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
const FIELD_GROUPS = ["name", "field", "inner", "outer", "more"]

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

/** The fields a line names, as compiled code names them;  no fields named:  every field. */
export function fieldsOrEvery(fields: P.Match | undefined): "every field" | string[] {
  if (!fields) return "every field"
  return (fields as P.Match & { items: P.Match[] }).items.map((item) => fieldNamed(textIn(item)))
}

/** A property's name as its row calls it, from its words:  what compiled code names it. */
export function fieldNamed(words: string): string {
  return P.JSWriter.instance.nameOf(snakeCase(words.trim()))
}
