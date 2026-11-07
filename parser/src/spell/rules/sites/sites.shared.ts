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
 * - Nor every page:  one declared further down the file counts by its word `page`;  the running site says so when
 *   it has no such page (`SiteBase.show()`).
 */
export function namesSitePart(scope: P.Scope, words: string): boolean {
  if (pageNamed(scope, words) || specialPageOf(scope, words)) return true
  const all = words.trim().split(/\s+/)
  // a page declared further down the file isn't known yet:  its last word (Spanish's first) says it's one
  const saysPage = all.length > 1 && (SP.typeName(all.at(-1)!) === "page" || SP.typeName(all[0]!) === "page")
  return saysPage || !!(overlayKindOf(scope, all.at(-1)) ?? overlayKindOf(scope, all[0]))
}

/** Which kind of part `word` says, in the scope's language:  `dialog`, `sidebar`, or neither. */
export function overlayKindOf(scope: P.Scope, word: string | undefined): "dialog" | "sidebar" | undefined {
  if (!word) return undefined
  if (Wording.reads(scope, "site_dialog", word)) return "dialog"
  if (Wording.reads(scope, "site_sidebar", word)) return "sidebar"
  return undefined
}
