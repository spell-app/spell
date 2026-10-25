import { describe, expect, test } from "vite-plus/test"

import { Observable, getProps, peekProp, prop, readsAsImpliedDefault } from "spell/util"

/**
 * Typed defaults (epic `prefs-and-undo` P7):
 * an unset prop reads as its declared default, else its first choice, else its type's, and none is ever stored.
 * - On an `Observable`, whose class has a schema:  what every compiled `Thing` and `List` is.
 */

/** A card, as compiled spell declares one:  types and choices, no defaults written. */
class TypedCard extends Observable {
  @prop({ type: "number" }) accessor rank!: number
  @prop({ type: "text" }) accessor name!: string
  @prop({ type: "choice" }) accessor marked!: boolean
  @prop({ oneOf: ["up", "down"] }) accessor direction!: string
  @prop({ oneOf: ["light", "dark"], default: "dark" }) accessor scheme!: string
  @prop({ type: "Pile" }) accessor pile!: object | undefined
  @prop({ oneOf: ["horizontal", "vertical"] }) accessor stance!: string
}

describe("typed defaults", () => {
  test("an unset prop reads as its first choice, else its type's:  0, \"\", false;  a class's type has none", () => {
    const card = new TypedCard()
    expect([card.rank, card.name, card.marked, card.direction, card.pile]).toEqual([0, "", false, "up", undefined])
  })

  test("a declared default wins over the first choice", () => {
    expect(new TypedCard().scheme).toBe("dark")
  })

  test("NEVER stored:  nothing in its record or its JSON until it's set", () => {
    const card = new TypedCard()
    void [card.rank, card.name, card.direction]
    expect(peekProp(card, "rank")).toBeUndefined()
    expect(getProps(card)).toEqual({})
    card.rank = 3
    expect(getProps(card)).toEqual({ rank: 3 })
  })
})

describe("readsAsImpliedDefault()", () => {
  test("true for an unset prop read as its implied default;  false once set, even to that value", () => {
    const card = new TypedCard()
    expect(readsAsImpliedDefault(card, "direction", card.direction)).toBe(true)
    card.direction = "up"
    expect(readsAsImpliedDefault(card, "direction", card.direction)).toBe(false)
  })

  test("false for a default of its own, a prop nobody declared, or a value that isn't the default", () => {
    const card = new TypedCard()
    expect(readsAsImpliedDefault(card, "scheme", card.scheme)).toBe(false)
    expect(readsAsImpliedDefault(card, "undeclared", undefined)).toBe(false)
    // a getter that always gives "vertical" (`- its stance is vertical`):  not the default, so it shows
    expect(readsAsImpliedDefault(card, "stance", "vertical")).toBe(false)
  })
})
