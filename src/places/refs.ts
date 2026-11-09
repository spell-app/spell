/**
 * The ONE way anything saved is named in text:  its type and its id, `Recipe#r-12` (epic `data` T2).
 * - With where it's kept, when that's not here:  `Person#matt@three-degrees`.
 * - What saved things write (`Saver`, `Loader`), and what a place's rows are named by.
 * - An id never holds an `@`, so a reader can tell where the id ends and the place begins.
 *   - So ids a browser makes for new things must leave `@` out.
 * - NOT a program's mirrored state:  its counted `"$id"` (`StateMirror`) is what the Python page speaks, and stays.
 * - Imports nothing, so spell's core (`spell/parser/core/saving`) takes it by file, without the rest of this folder.
 */

/**
 * A saved reference's parts -- see `parseRef()` and `refText()`.
 * - `Person#matt@three-degrees` is `{ type: "Person", id: "matt", place: "three-degrees" }`.
 */
export type SavedRef = {
  /** The thing's kind, e.g. `Person`. */
  type: string
  /** Its id, e.g. `matt`:  never holds an `@`. */
  id: string
  /** Where it's kept, when that's not here:  an address, which may hold an `@` of its own (`matt@three-degrees:game`). */
  place?: string
}

/**
 * A saved reference read:  `Person#matt@three-degrees` => `{ type: "Person", id: "matt", place: "three-degrees" }`.
 * - The type runs up to the `#`;  the id from there to the FIRST `@`.
 * - Everything after that `@` is the place, which may hold an `@` of its own (epic `people-and-orgs` Q18):
 *   `Card#26@matt@three-degrees:bubble-trouble`'s place is `matt@three-degrees:bubble-trouble`.
 * - No `@`:  no place, the thing is kept here, `Person#matt`.
 * - throws `TypeError` with no `#`, or nothing before or after it
 */
export function parseRef(text: string): SavedRef {
  const hash = text.indexOf("#")
  const at = text.indexOf("@", hash + 1)
  const type = text.slice(0, hash)
  const id = at < 0 ? text.slice(hash + 1) : text.slice(hash + 1, at)
  if (hash < 0 || !type || !id) {
    throw new TypeError(`parseRef():  "${text}" isn't a reference;  write it as Type#id, or Type#id@place`)
  }
  return at < 0 ? { type, id } : { type, id, place: text.slice(at + 1) }
}

/**
 * `ref` written as a saved reference:  `Person#matt`, or with its place, `Person#matt@three-degrees`.
 * - throws `TypeError` if the id holds an `@`:  a reader couldn't tell where the id ends and the place begins
 */
export function refText({ type, id, place }: SavedRef): string {
  if (id.includes("@")) {
    throw new TypeError(
      `refText():  ${type}'s id "${id}" holds an @, which a saved reference can't;  give it another id`
    )
  }
  return place ? `${type}#${id}@${place}` : `${type}#${id}`
}
