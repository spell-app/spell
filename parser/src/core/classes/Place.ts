import { Thing } from "./Thing"

/**
 * Where a program's data lives, as a thing of the program:  `family cookbook is a web service at "..."` makes one
 * (epic `data` P11, Q2).
 * - What a kind IS, for a library:  `a supabase project is a place` is a class on this one,
 *   and its `makePlace()` says what's behind it.
 * - The kinds spell knows by themselves are `spell/parser/core/placeKinds`:  words, not classes, so a person's own
 *   `a file is a thing` keeps its meaning.
 * - Holds no data, and knows nothing of `spell/util/places`:  `core.place()` does the work (`saved.ts`).
 */
export class Place extends Thing {
  /**
   * What's behind it, for a kind a library adds:  a `Place`, in `spell/util/places`' sense.
   * - `details`:  everything its line and the lines under it say;  `places`:  that folder, loaded by now.
   * - throws `TypeError` here:  a kind says, or it can't be read.
   */
  makePlace(_details: unknown, _places: unknown): unknown {
    throw new TypeError(`${this.constructor.name}.makePlace():  this kind of place doesn't say what's behind it yet`)
  }
}
