/**
 * Names for a view's own custom element:
 * `a card is a view` in a solitaire app is `<solitaire-card>`, and its `rank` is the attribute `rank`.
 * - Here, not in `core` or `app`, so every side names them alike:
 *   - core names the tag as the class is declared (`core.defineElement()`)
 *   - app's `SpellElement` makes the element, with an attribute per property
 *   - the TypeScript writer (`P.TSWriter`, in `parser`, which can't import either) writes each view's element class
 */

import { camelCase, kebabCase, withoutAccents } from "spell/util/string"

/**
 * Tag of the element for class `className` in project `project`:
 * the project's name, then the class's, kebab-cased.
 * - e.g. `Solitaire`, `Card` => `solitaire-card`;  `games`, `BankAccount` => `games-bank-account`
 * - The project's name as written, never made singular:  a compiled program runs this, and never loads a language's
 *   inflector (epic `spanish` P3).
 * - The word "drawable" in the project's name is left out, so its tags don't all say it (epic `drawable-thing` P18):
 *   `Drawable Solitaire`, `Tableau` => `solitaire-tableau`, never `drawable-solitaire-tableau`.
 *   - Spanish's word too (epic `spanish` P9):  `Solitario Dibujable`, `Carta` => `solitario-carta`.
 *   - Kept for projects named before "drawable thing" became "view" (epic `elemental-spell` P1);
 *     "view" is NOT left out:  it's a word a project's name may mean (`Map View`).
 * - Only letters, digits and dashes, starting with a letter:  always a valid custom element name, as it has a dash.
 *   - A letter's accent is dropped, as Spell UI's Spanish tags drop it (`<es-boton>`):
 *     `canciones`, `Canción` => `canciones-cancion`.
 */
export function elementTagFor(project: string, className: string): string {
  const projectWords = tagWords(project)
    .split("-")
    .filter((word) => !DRAWABLE_WORD.test(word))
    .join("-")
  const prefix = tagWords(projectWords) || "spell"
  return `${prefix}-${tagWords(className)}`
}

/**
 * The word left out of a project's name in its tags:  "drawable", or "drawables", in each of spell's languages.
 * - Here, not in a language pack:  a compiled program names its tags as it runs, and never loads one.
 * - English's, then Spanish's (`dibujable`).
 */
const DRAWABLE_WORD = /^(drawables?|dibujables?)$/

/** `name` as a tag's words:  kebab-case, lowercase, only letters, digits and single dashes, accents dropped. */
function tagWords(name: string): string {
  return withoutAccents(kebabCase(name.replace(/_/g, "-")).toLowerCase())
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[^a-z]+|-+$/g, "")
}

/**
 * The attribute a view's property `name` is on its element, e.g. `short-rank` for `shortRank` --
 * `undefined` for a name the page or Spell UI already means something by (`id`, `hidden` ...).
 * - `type`:  the property's declared type, as `core.elementApiOf()` gives it:
 *   e.g. `number`, `Pile`, `list`;  none is text.
 * - `owner`:  is it the list holding the thing, e.g. a card's `pile` for `a card belongs to one pile`?
 * - Its kind, as a Spell UI vocabulary says it:
 *   - text, a number or a choice:  `string`, `number`, `boolean` -- an attribute and a property
 *   - a thing, e.g. a pile, or the list holding it:  `string`, holding the thing's reference, `pile="Tableau#T1"`
 *   - anything else, e.g. a list:  `json`, a property only
 */
export function viewAttributeFor(name: string, type?: string, owner?: boolean): ViewAttribute | undefined {
  const attribute = kebabCase(name.replace(/_/g, "-"))
  if (TAKEN_ATTRIBUTES.has(attribute)) return undefined
  const reference = owner ? "owner" : type && THING_TYPE.test(type) ? "thing" : undefined
  const kind = reference ? "string" : (ATTRIBUTE_KINDS[type ?? "text"] ?? "json")
  return {
    name: attribute,
    property: camelCase(attribute),
    kind,
    description: `Its ${name.replace(/_/g, " ")}.`,
    ...(reference ? { reference } : {})
  }
}

/** A view's property, as its element's attribute -- see `viewAttributeFor()`. */
export type ViewAttribute = {
  /** The attribute, e.g. `short-rank`. */
  name: string
  /** The element's property, e.g. `shortRank`. */
  property: string
  /** Its kind, as a Spell UI vocabulary says it. */
  kind: "string" | "number" | "boolean" | "json"
  /** What it is, for the element's docs, e.g. `Its rank.` */
  description: string
  /**
   * Does it hold a thing, shown as the thing's reference (P18)?
   * - `thing`:  a property declared as a thing, e.g. `a card has a home as a pile`
   * - `owner`:  the list holding it, e.g. a card's `pile`, for `a card belongs to one pile`:  set by a move
   */
  reference?: "thing" | "owner"
}

/**
 * The kind of attribute for each type a property is declared as.
 * - A thing, e.g. a pile, is a reference instead (`THING_TYPE`).
 * - Any other type, e.g. a list:  `json`.
 */
const ATTRIBUTE_KINDS: Record<string, ViewAttribute["kind"]> = {
  text: "string",
  character: "string",
  date: "string",
  number: "number",
  integer: "number",
  choice: "boolean"
}

/** A declared type that's a thing's, e.g. `Pile`:  a class's name, where spell's own types are lowercase (`text`). */
const THING_TYPE = /^\p{Lu}/u

/** Attributes the page or Spell UI already means something by:  never a type's. */
const TAKEN_ATTRIBUTES = new Set([
  "thing",
  "id",
  "class",
  "style",
  "slot",
  "part",
  "is",
  "lang",
  "dir",
  "title",
  "hidden",
  "inert",
  "disabled",
  "loading",
  "visible",
  "animation"
])
