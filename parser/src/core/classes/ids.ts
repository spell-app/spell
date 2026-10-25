/**
 * Every spell thing's `id`, built in:  what a thing is saved and referred to by (epic `people-and-orgs`, Q9).
 * - `Thing` and `List` each declare it, the same way:  `static { this.declareProp("id", ID_PROP) }`.
 * - A program never declares it:  it's there on every thing, and on every list.
 * - Imports only `spell/util` and lodash:  `Thing.ts` and `List.ts` both import it.
 */
import _ from "lodash"

import { peekProp, type PropInfo } from "spell/util"

/** Characters a made-up id's random part is written in:  base 36, lower case. */
const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

/** How many random characters a made-up id ends with:  36^8, about 2.8 million million. */
const ID_LENGTH = 8

/**
 * A new id for `thing`:  its kind, then 8 random base-36 characters, e.g. `dated-event-k3x9q2mf`.
 * - Its kind is its class's name in lower kebab case:  `DatedEvent` => `dated-event`.
 * - Random from `crypto.getRandomValues()`, NEVER the core's seeded random (`ParkMiller`) or `Math.random()`:
 *   ids get saved, so they must differ from run to run, even when a seeded run repeats everything else.
 */
export function newThingId(thing: object): string {
  const kind = _.kebabCase(thing.constructor.name) || "thing"
  return `${kind}-${randomBase36(ID_LENGTH)}`
}

/** The id `ID_PROP` made up for each thing:  a different one there now was chosen (`hasChosenId()`). */
const madeIds = new WeakMap<object, string>()

/**
 * How `Thing` and `List` declare their `id`:  text, made on first read (`newThingId()`), then kept.
 * - Made only when read:  a thing whose id nobody reads has none, so its JSON has none either.
 * - Settable, e.g. `new Person({ id: "owen" })` or `person.id = "owen"`:  a set id wins.
 */
export const ID_PROP: PropInfo = {
  type: "text",
  init(this: object) {
    const id = newThingId(this)
    madeIds.set(this, id)
    return id
  }
}

/**
 * Did the program choose `thing`'s id, or load it, rather than one being made up for it (`newThingId()`)?
 * - e.g. `new Settings({ id: "main" })`, or a thing read back from a saved file:  the same id every run.
 * - A made-up id is new each run, so nothing kept under it would be found again:
 *   what's remembered for a thing is kept under its chosen id (`Thing.rememberedKeyFor()`).
 * - Reads no id:  a thing whose id is never read still has none.
 */
export function hasChosenId(thing: object): boolean {
  const id = peekProp<string>(thing, "id")
  return id !== undefined && madeIds.get(thing) !== id
}

/**
 * `length` random base-36 characters, from `crypto.getRandomValues()`.
 * - Each byte of 252 or more is skipped, so every character is equally likely:  252 is 36 * 7.
 */
function randomBase36(length: number): string {
  let text = ""
  while (text.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < 252 && text.length < length) text += ID_ALPHABET[byte % 36]
    }
  }
  return text
}
