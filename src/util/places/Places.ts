import { PlaceCache } from "./PlaceCache"
import { PlaceResult, type PlaceResultProps } from "./PlaceResult"
import { PlaceError, type Place } from "./places.types"

/****************
 * ### `Places`
 * Every place a program knows, by name, and the one cache of rows they share.
 * - Everything asks for a place by name each time, so swapping the place behind a name
 *   (a sample, while designing) leaves everything that names it alone.
 * - Instances, not one page-wide list:  each run of a program, and each test, gets its own.
 ****************/
export class Places {
  /** The ONE cache of rows, so a thing read from two lists is one row. */
  readonly cache = new PlaceCache()
  /** Each place, by its name. */
  private places = new Map<string, Place>()

  /**
   * Name `place`.
   * - throws `TypeError` if that name is taken:  a typo would quietly replace a place
   */
  add(name: string, place: Place): this {
    if (this.places.has(name)) {
      throw new TypeError(`Places.add():  there's already a place named "${name}";  swap() replaces one`)
    }
    this.places.set(name, place)
    return this
  }

  /**
   * Put `place` behind `name`, in place of the one there.
   * - Returns the one it replaced.
   * - What's already been read stays:  a read gets the new place when it next loads.
   * - throws `PlaceError` if nothing goes by that name
   */
  swap(name: string, place: Place): Place {
    const replaced = this.placeForOrDie(name)
    this.places.set(name, place)
    return replaced
  }

  /** The place named `name`, if there is one. */
  placeFor(name: string): Place | undefined {
    return this.places.get(name)
  }

  /**
   * The place named `name`.
   * - throws `PlaceError` if nothing goes by that name
   */
  placeForOrDie(name: string): Place {
    const place = this.places.get(name)
    if (!place) {
      throw new PlaceError(`Places:  no place is named "${name}";  add() one first`, {
        cause: { kind: "no such place" }
      })
    }
    return place
  }

  /** A result for one read, not yet started:  `load()` it. */
  read(props: PlaceResultProps): PlaceResult {
    return new PlaceResult(props, { places: this })
  }
}
