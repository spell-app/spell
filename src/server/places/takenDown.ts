import { PlaceError } from "spell/places/places.types"

/**
 * What a taken-down request is answered with, over HTTP:  451, "unavailable for legal reasons".
 * - `PlaceServer` answers a `PlaceError` refused as `"taken down"` with it;  `DirectReads` too.
 */
export const TAKEN_DOWN_STATUS = 451

/**
 * What's taken down in one space's folder, as its host has it now (epic `atmosphere` P6, Q7 A):
 * the whole folder, or some of its things.
 * - Handed in by whoever knows the host's takedowns (the app's `Takedowns`):  the kit keeps no log of them.
 * - Read afresh for each request, so a takedown, or its undoing, counts at once.
 */
export type TakenDown = {
  /** Is the whole folder down:  the space, or the account it's in?  Every read and write of it is refused. */
  isWhole: boolean
  /** The things that are, by collection:  each left out of every read, and a change to it refused. */
  things: ReadonlyMap<string, ReadonlySet<string>>
  /** Where people ask about it:  the host's abuse contact, which every refusal names. */
  contact: string
}

/** Nothing taken down:  what a folder whose host keeps no takedowns reads as. */
export const NOTHING_TAKEN_DOWN: TakenDown = { isWhole: false, things: new Map(), contact: "" }

/** Is thing `id` of `collection` taken down? */
export function isThingTakenDown(down: TakenDown, collection: string, id: string): boolean {
  return down.things.get(collection)?.has(id) ?? false
}

/**
 * What a request for something taken down is refused with:  a `PlaceError` `"refused"`, `"taken down"`.
 * - `what`:  what it was, as people read it:  `this space`, `"recipes" r-1`.
 * - Says it was taken down, never that it's lost;  and where to ask.  Never why:  the reason stays in the host's log
 *   (reasons and appeals are a todo, before Spell opens to everyone).
 */
export function takenDownError(what: string, { contact }: Pick<TakenDown, "contact">): PlaceError {
  return new PlaceError(takenDownMessage(what, contact), { cause: { kind: "refused", whyNot: "taken down" } })
}

/** The words of a takedown's refusal:  `This space was taken down by Spell.  To ask about it:  abuse@...`. */
export function takenDownMessage(what: string, contact: string): string {
  const asking = contact ? `  To ask about it:  ${contact}` : ""
  return `${what[0]!.toUpperCase()}${what.slice(1)} was taken down by Spell.${asking}`
}
