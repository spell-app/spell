import { describe, expect, test } from "vite-plus/test"

import { core, View, ViewableList } from "spell/parser/core"

/**
 * What people may do to a thing on the page (`abilities.ts`, epic `debut` P27):  `core.isAble()`, the one answer.
 * - The classes are what spell compiles to:  `- it is draggable` is `static draggable = true`,
 *   `- clickable when it is face down` a `clickableWhen` getter beside `static clickable = true`.
 */

/** `a card is a view`, face up or down. */
class Card extends View {
  faceUp = false
}

/** `- draggable when it is face up`, `- clickable when it is face down`. */
class FaceCard extends Card {
  static draggable = true
  static clickable = true
  get draggableWhen() {
    return this.faceUp
  }
  get clickableWhen() {
    return !this.faceUp
  }
}

/** `- on click:`, `- on drag:`:  each event implies its ability. */
class HandledCard extends Card {
  onClick() {}
  onDrag() {}
}

/** `a joker is a handled card where:  - it is not draggable`:  a type's own "no" beats what its events imply. */
class Joker extends HandledCard {
  static draggable = false
}

/** `- its cards are draggable when the card is face up`. */
class Tableau extends ViewableList<Card> {
  static itemsDraggable = true
  canGiveUp(card: unknown) {
    return (card as Card).faceUp
  }
}

/** `- on card dropped:`:  a list that hears drops is droppable. */
class Foundation extends ViewableList<Card> {
  whenCardDroppedOn() {}
}

describe("core.isAble()", () => {
  test("a plain view says no to everything", () => {
    const card = new Card()
    for (const ability of ["draggable", "clickable", "selectable", "droppable"] as const) {
      expect(core.isAble(card, ability)).toBe(false)
    }
    expect(core.isAble(undefined, "draggable")).toBe(false)
  })

  test("a condition says when:  `draggableWhen`, `clickableWhen`, live", () => {
    const card = new FaceCard()
    expect(core.isAble(card, "draggable")).toBe(false)
    expect(core.isAble(card, "clickable")).toBe(true)
    card.faceUp = true
    expect(core.isAble(card, "draggable")).toBe(true)
    expect(core.isAble(card, "clickable")).toBe(false)
  })

  test("an event implies its ability (Q44);  a sub-type's `is not` turns it off", () => {
    expect(core.isAble(new HandledCard(), "clickable")).toBe(true)
    expect(core.isAble(new HandledCard(), "draggable")).toBe(true)
    expect(core.isAble(new Joker(), "draggable")).toBe(false)
    expect(core.isAble(new Joker(), "clickable")).toBe(true)
    expect(core.isAble(new Foundation(), "droppable")).toBe(true)
  })

  test("a drag asks the list holding it:  its `can give up`, and `its cards are draggable when`", () => {
    const tableau = new Tableau()
    const card = new Card()
    tableau.add(card)
    expect(core.isAble(card, "draggable", tableau)).toBe(false)
    card.faceUp = true
    expect(core.isAble(card, "draggable", tableau)).toBe(true)
    // its own "no" wins, whatever its list says
    const joker = new Joker()
    joker.faceUp = true
    tableau.add(joker)
    expect(core.isAble(joker, "draggable", tableau)).toBe(false)
  })
})
