import { describe, expect, test } from "vite-plus/test"

import { CHANGES_KEPT, PlaceEvents } from "spell/server/places"

/** A place's events, hearing no disk. */
function events() {
  return new PlaceEvents({ onFirstWatcher: () => () => {} })
}

/** A change to recipe `id`, its title `title`. */
function change(id: string, title: string) {
  return { collection: "recipes", id, row: { id, title } }
}

describe("PlaceEvents", () => {
  test("a token names its run:  a page at change 2 of the last run is told nothing, so it reads whole (I144)", () => {
    const last = events()
    last.tell(change("r-1", "Soup"))
    last.tell(change("r-2", "Dal"))
    const token = last.version
    const now = events()
    for (const id of ["r-3", "r-4", "r-5"]) now.tell(change(id, "Stew"))
    expect(now.changesSince("recipes", token)).toBeUndefined()
    // its own run's token still says what changed
    expect(now.changesSince("recipes", now.version)).toEqual({ rows: [], removed: [], token: now.version })
  })

  test("a plain count, as tokens were, isn't one it knows", () => {
    const now = events()
    now.tell(change("r-1", "Soup"))
    expect(now.changesSince("recipes", "0")).toBeUndefined()
  })

  test(`it keeps the last ${CHANGES_KEPT} changes;  a token from before them reads whole (I146)`, () => {
    const place = events()
    const first = place.version
    place.tell(change("r-1", "Soup"))
    const second = place.version
    for (let at = 0; at < CHANGES_KEPT; at++) place.tell(change(`r-${at % 5}`, `Title ${at}`))
    expect(place.changesSince("recipes", first)).toBeUndefined()
    const since = place.changesSince("recipes", second)!
    expect(since.rows).toHaveLength(5)
    expect(since.token).toBe(place.version)
    expect(since.rows.find(({ id }) => id === "r-4")).toEqual({ id: "r-4", title: `Title ${CHANGES_KEPT - 1}` })
  })
})
