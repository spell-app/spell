import type { PlacePerson } from "./places.types"

/** Where a guest's number is kept, for this tab:  a reload is the same guest, and another window is someone else. */
const GUEST_KEY = "spell-place-guest"

/** The guest's number with no page at all. */
const ONLY_GUEST = "1"

/** Who signed in on this page, to a Spell account (`SpellSignIn`):  who's here, for every place on it. */
let signedInHere: PlacePerson | undefined

/**
 * SIDE EFFECT:  `person` signed in on this page (`undefined`:  signed out), so `personOnThisPage()` says them
 * (epic `atmosphere` P3).
 * - Only a Spell account's sign-in calls it:  it's who the page server knows them by, for every place it serves.
 */
export function noteSignedIn(person: PlacePerson | undefined): void {
  signedInHere = person && { id: person.id, name: person.name }
}

/**
 * Who's at this page:  whoever signed in here to a Spell account (`noteSignedIn()`), else, with no sign-in:  the name the server that served it knows them by, else a guest (epic `data` P13).
 * - `window.SPELL_SERVER.person`:  the page server's person, its id the name, so it's the same across visits.
 * - A guest is one per tab, kept in `sessionStorage`:  two windows side by side are two guests.
 * - `guestName`:  what a guest's called, in the program's language, handed the number.
 * - With no sign-in, a claim, not a proof:  a room trusts everyone in it.
 * - Imports nothing:  spell's core takes it by file, as it does `refs`.
 * - NEVER throws:  a browser that keeps nothing still gets a guest, a new one each load.
 */
export function personOnThisPage(guestName: (number: string) => string): PlacePerson {
  if (signedInHere) return { ...signedInHere }
  const named = (globalThis as { SPELL_SERVER?: { person?: string } }).SPELL_SERVER?.person
  if (named) return { id: named, name: named }
  const number = guestNumber()
  return { id: `guest-${number}`, name: guestName(number) }
}

/**
 * This tab's guest's number.
 * - No page at all, as under `spell run`:  the one guest, so a run comes out the same each time.
 */
function guestNumber(): string {
  const made = () => `${1000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9000)}`
  try {
    const { sessionStorage } = globalThis
    if (!sessionStorage) return ONLY_GUEST
    const kept = sessionStorage.getItem(GUEST_KEY)
    if (kept) return kept
    const number = made()
    sessionStorage.setItem(GUEST_KEY, number)
    return number
  } catch (ignored) {
    // a browser that keeps nothing
    return made()
  }
}
