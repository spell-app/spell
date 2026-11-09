import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * One page of a site, as its line says it, and as the site's class lists it (`static pages`).
 * - e.g. `- it has a film page at "/films/:film", named "Film"` =>
 *   `{ name: "film page", page: "FilmPage", address: "/films/:film", title: "Film", params: ["film"] }`
 */
export type SitePageEntry = {
  /** the page's words, as the line names it:  `film page` */
  name: string
  /** the page's class:  `FilmPage` */
  page: string
  /** where it is, from the site's root:  `/films/:film`, its parameters `:name` */
  address: string
  /** what the site calls it, in its navigation, if the line names it:  `Film` */
  title?: string
  /** what its tab says in the site's `<ui-site-tabs>`, if the line names it, else its title:  `Usage` */
  tab?: string
  /** what the line files it under, to group and search a site's pages by:  `["Forms", "Inputs"]` */
  tags?: string[]
  /** how far along it is, if the line says:  `old`, `new`, `mocked` or `built` (epic `mockup` P13, T14) */
  state?: string
  /** a thumbnail of it, if the line names one:  a file of the project, `snapshots/films.png` */
  thumbnail?: string
  /** which row of its section on the site editor's board its card is in, from 1, if the line says */
  row?: number
  /** which column of its section, from 1 */
  column?: number
  /** its card's colour on the board, one of Spell UI's, if the line says;  the parts under it take it too */
  color?: string
  /** its address's parameters, each one of the page's own properties:  `["film"]` */
  params?: string[]
  /** the pages under it, as the lines under its line list them */
  pages?: SitePageEntry[]
}

/**
 * One dialog or sidebar of a site:  named once, opened from any of its pages, with no address of its own.
 * - e.g. `- it has a settings dialog` => `{ name: "settings dialog" }`, and `view: "SettingsDialog"` when a view of
 *   that name is declared
 */
export type SiteOverlayEntry = {
  /** its words, as the line names it:  `settings dialog` */
  name: string
  /** the view it draws, when one of its name is declared:  `SettingsDialog` */
  view?: string
  /** which row of its section on the site editor's board its card is in, from 1, if the line says */
  row?: number
  /** which column of its section, from 1 */
  column?: number
  /** its card's colour on the board, one of Spell UI's, if the line says */
  color?: string
}

/** Where a part's card sits in its section of the site editor's board, and its colour:  what the end of its line says. */
export type SiteCardDetails = Pick<SitePageEntry, "row" | "column" | "color">

/**
 * What the end of a part's line says about its card:  `, in row 2 column 3, colored blue` (epic `mockup` T31).
 * - Only what it says:  none of the keys when the line says nothing.
 * - `undefined` when its row or column isn't a whole number from 1:  the caller refuses the line, saying why.
 */
export function cardDetailsOf(groups: {
  row?: P.Match
  column?: P.Match
  color?: P.Match
}): SiteCardDetails | undefined {
  const { row, column, color } = groups
  const place = row && column ? { row: Number(row.raw), column: Number(column.raw) } : {}
  if (row && column && !(isCardPosition(place.row) && isCardPosition(place.column))) return undefined
  const named = Wording.meaningOf(color)
  return { ...place, ...(named && { color: named }) }
}

/** Is `number` a row or column:  whole, from 1? */
function isCardPosition(number: number | undefined): boolean {
  return Number.isInteger(number) && number! >= 1
}

/** The message refusing a line whose `row` and `column` aren't a place in a section. */
export function cardPlaceMessage(language: SP.Language, groups: { row?: P.Match; column?: P.Match }): string {
  return language.parserMessage("site-card-place-not-whole", {
    row: groups.row?.raw ?? "",
    column: groups.column?.raw ?? ""
  })
}

/** The site whose body `scope` is in:  its type, or `undefined` anywhere else. */
export function siteOf(scope: P.Scope): P.TypeScope | undefined {
  const type = P.SubjectScope.of(scope)?.subjectType
  return type?.isA("Site") ? type : undefined
}

/**
 * The declared type `words` name, if any:  `film page` => `FilmPage`.
 * - Read as a type is named everywhere:  a name of several words dashed, `film-page`, then class-cased.
 */
export function typeNamed(scope: P.Scope, words: string): P.TypeScope | undefined {
  const name = SP.typeName(words.trim().split(/\s+/).join("-"))
  const type = scope.getType(P.isValueType(name) ? name : P.classCase(name))
  return type instanceof P.TypeScope && !type.stub ? type : undefined
}

/**
 * The page `words` name:  the whole words first (`film page`), then without the word that says "page"
 * (`button usage page` => the notebook `button usage`).
 */
export function pageNamed(scope: P.Scope, words: string): P.TypeScope | undefined {
  const whole = typeNamed(scope, words)
  if (whole?.isA("Page")) return whole
  const all = words.trim().split(/\s+/)
  if (all.length < 2) return undefined
  // the word "page" last, in English (`button usage page`), or first in Spanish, with its "of" (`página de uso`)
  let shorter: string[] | undefined
  if (SP.typeName(all.at(-1)!) === "page") shorter = all.slice(0, -1)
  else if (SP.typeName(all[0]!) === "page") shorter = all.slice(Wording.reads(scope, "receiver_of", all[1]!) ? 2 : 1)
  const page = shorter?.length ? typeNamed(scope, shorter.join(" ")) : undefined
  return page?.isA("Page") ? page : undefined
}

/** The tags a line wrote, split at their commas:  `"Forms, Inputs"` => `["Forms", "Inputs"]`;  blanks and repeats left out. */
export function tagsIn(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
}

/** Each parameter in `address`, by the property it fills:  `/films/:film/people/:person_id` => `film`, `person id`. */
export function paramsIn(address: string): string[] {
  return [...address.matchAll(PARAM)].map(([, name]) => name!.replace(/[_-]+/g, " "))
}

/** A parameter in an address, as the router writes one:  `:film`, `:rest*`. */
const PARAM = /:([\p{L}\p{N}_-]+)\*?/gu

/**
 * Which of a site's pages-without-an-address `name` is, in the scope's language:  its not found page, its error page,
 * or neither (epic `mockup` P2).
 * - e.g. `not found page`, `missing page`, `error page`;  Spanish's `página no encontrada`, `página de error`
 */
export function specialPageOf(scope: P.Scope, name: string): "notFound" | "error" | undefined {
  if (Wording.reads(scope, "site_not_found_page", name)) return "notFound"
  if (Wording.reads(scope, "site_error_page", name)) return "error"
  return undefined
}

/**
 * Does `words` name one of a site's parts, for `go to the ...` and `show the ...` (epic `mockup` P2):
 * a page the program declares, a dialog or sidebar by its kind's word, or its not found or error page?
 * - Read without the site:  a page's lines usually come before the site's, so its parts aren't known yet.
 * - Nor every page:  one declared further down the file counts by its word `page`.
 * - What the site really lists is checked once the project has parsed:  `refuseUnlistedPart()`.
 */
export function namesSitePart(scope: P.Scope, words: string): boolean {
  if (namesSitePage(scope, words)) return true
  const all = words.trim().split(/\s+/)
  return !!(overlayKindOf(scope, all.at(-1)) ?? overlayKindOf(scope, all[0]))
}

/**
 * Do `words` name one of a site's PAGES:  one the program declares, its not found or error page, or (a page declared
 * further down the file, not known yet) words whose last word (Spanish's first) says it's a page.
 * - What `the address of the ...` takes (epic `mockup` P8):  a dialog or a sidebar has no address.
 */
export function namesSitePage(scope: P.Scope, words: string): boolean {
  if (pageNamed(scope, words) || specialPageOf(scope, words)) return true
  const all = words.trim().split(/\s+/)
  return all.length > 1 && (SP.typeName(all.at(-1)!) === "page" || SP.typeName(all[0]!) === "page")
}

/** Which kind of part `word` says, in the scope's language:  `dialog`, `sidebar`, or neither. */
export function overlayKindOf(scope: P.Scope, word: string | undefined): "dialog" | "sidebar" | undefined {
  if (!word) return undefined
  if (Wording.reads(scope, "site_dialog", word)) return "dialog"
  if (Wording.reads(scope, "site_sidebar", word)) return "sidebar"
  return undefined
}

/**
 * SIDE EFFECT:  `match`, naming site part `words`, won't compile if no site of the program lists it (epic `mockup` P3,
 * T6):  checked against the site's own lines once the whole project has parsed, so a page declared further down the
 * file is fine, and a misspelled one is an error at this line, naming the parts the site has.
 * - Its not found and error pages always count:  a site that deleted one shows a built-in one.
 * - A program with no site isn't refused:  a library's `go to ...` may be for a site in the program that imports it.
 */
export function refuseUnlistedPart(match: P.Match, words: string): void {
  const { scope } = match
  if (specialPageOf(scope, words)) return
  const wanted = sameWords(words)
  const sites = () =>
    (scope.types?.get() ?? []).filter((type) => !type.stub && type.isA("Site") && type !== siteType(scope))
  const partsOf = (site: P.TypeScope) => [...Object.values(site.sitePages ?? {}), ...(site.siteOverlays ?? [])]
  SP.SpellWarnings.refuseIf(
    match,
    () =>
      SP.Language.of(scope).parserMessage("site-part-not-listed", {
        part: words.trim(),
        parts: sites().flatMap(partsOf).join(", ")
      }),
    () => {
      const all = sites()
      return all.length > 0 && !all.some((site) => partsOf(site).some((part) => sameWords(part) === wanted))
    }
  )
}

/** `words`, compared as a site's lines name them:  spaces collapsed, case ignored. */
function sameWords(words: string): string {
  return words.trim().split(/\s+/).join(" ").toLowerCase()
}

/** The built-in `Site` type itself, which lists nothing. */
function siteType(scope: P.Scope): P.TypeScope | undefined {
  return scope.getType("Site")
}
