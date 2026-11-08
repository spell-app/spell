import { beforeEach, describe, expect, test } from "vite-plus/test"

import { core, List, Thing } from "spell/parser/core"
import { listenForTableEdits } from "spell/parser/core/ui"

/**
 * A program's things edited in a `<ui-table editable>` (`listenForTableEdits()`, epic `mockup` P9):
 * the table's `ui-editing`, as Spell UI sends it, written into the things as one undo step.
 */

/** `a review is a thing`:  its film and its stars. */
class Review extends Thing {
  static {
    this.declareProp("film", { type: "text" })
    this.declareProp("stars", { type: "number" })
  }
  get film(): string {
    return this.getProp("film")
  }
  set film(film: string) {
    this.setProp("film", film)
  }
  get stars(): number {
    return this.getProp("stars")
  }
  set stars(stars: number) {
    this.setProp("stars", stars)
  }
}

/** A review, made with its fields. */
function review(film: string, stars: number): Review {
  const made = new Review()
  made.film = film
  made.stars = stars
  return made
}

/** A stand-in app element, and a table inside it holding `rows`:  what `ui-editing` bubbles through. */
function tableOf(rows: unknown, eventName = "ui-editing") {
  const app = new EventTarget() as EventTarget & HTMLElement
  const table = Object.assign(new EventTarget(), { rows })
  const stop = listenForTableEdits(app)
  const edit = (edits: unknown[]) => {
    const event = new CustomEvent(eventName, { detail: { edits }, cancelable: true })
    // what bubbling would do:  the table's event, heard on the app, the table first on its path
    Object.defineProperty(event, "composedPath", { value: () => [table, app] })
    app.dispatchEvent(event)
    return event
  }
  return { app, table, edit, stop }
}

beforeEach(() => core.resetRuntime())

describe("listenForTableEdits()", () => {
  test("writes a table of things into them, and cancels the table's own change", () => {
    const reviews = new List<Review>()
    const hope = review("A New Hope", 5)
    reviews.add(hope)
    const { edit } = tableOf(reviews)
    const event = edit([{ kind: "set", row: hope, key: "stars", value: 3, was: 5 }])
    expect(event.defaultPrevented).toBe(true)
    expect(hope.stars).toBe(3)
  })

  test("hears a Spanish table too:  `es-editando` (T23)", () => {
    const reviews = new List<Review>()
    const hope = review("A New Hope", 5)
    reviews.add(hope)
    const { edit } = tableOf(reviews, "es-editando")
    expect(edit([{ kind: "set", row: hope, key: "stars", value: 2, was: 5 }]).defaultPrevented).toBe(true)
    expect(hope.stars).toBe(2)
  })

  test("adds a thing of the rows' kind, and removes one, from the list it was handed", () => {
    const reviews = new List<Review>()
    const hope = review("A New Hope", 5)
    reviews.add(hope)
    const { edit } = tableOf(reviews)
    edit([{ kind: "add", values: { film: "Jedi", stars: 4 } }])
    expect(reviews.items.map((one) => one.film)).toEqual(["A New Hope", "Jedi"])
    expect(reviews.items[1]).toBeInstanceOf(Review)
    edit([{ kind: "remove", row: hope }])
    expect(reviews.items.map((one) => one.film)).toEqual(["Jedi"])
  })

  test("is one undo step, however many cells it changed", () => {
    const hope = review("A New Hope", 5)
    const empire = review("Empire", 4)
    const { edit } = tableOf([hope, empire])
    edit([
      { kind: "set", row: hope, key: "stars", value: 1, was: 5 },
      { kind: "set", row: empire, key: "stars", value: 2, was: 4 }
    ])
    const history = core.RUNTIME!.history
    expect(history.undoTitle).toBe("Undo Edit Table")
    history.undo()
    expect([hope.stars, empire.stars]).toEqual([5, 4])
  })

  test("leaves a table of plain rows to itself", () => {
    const row = { film: "A New Hope", stars: 5 }
    const { edit } = tableOf([row])
    const event = edit([{ kind: "set", row, key: "stars", value: 3, was: 5 }])
    expect(event.defaultPrevented).toBe(false)
    expect(row.stars).toBe(5)
  })

  test("stops listening once stopped", () => {
    const hope = review("A New Hope", 5)
    const { edit, stop } = tableOf([hope])
    stop()
    edit([{ kind: "set", row: hope, key: "stars", value: 3, was: 5 }])
    expect(hope.stars).toBe(5)
  })
})
