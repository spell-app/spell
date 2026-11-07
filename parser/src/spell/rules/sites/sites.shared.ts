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

/** Which kind of part `word` says, in the scope's language:  `dialog`, `sidebar`, or neither. */
export function overlayKindOf(scope: P.Scope, word: string | undefined): "dialog" | "sidebar" | undefined {
  if (!word) return undefined
  if (Wording.reads(scope, "site_dialog", word)) return "dialog"
  if (Wording.reads(scope, "site_sidebar", word)) return "sidebar"
  return undefined
}
