import { describe, expect, test } from "vite-plus/test"

import { ThingMembers } from "spell/app/app/solid/ThingMembers"
import type { SP } from "spell/parser/spell"

/**
 * `ThingMembers`:  a thing's properties in bands, by its file's groups (epic `debut` P26).
 * - On stand-ins for a program's classes:  the Inspector draws what it answers.
 */

/** Stand-ins for spell's base, a built-in template, and a program's types, as Solitaire's are. */
class Thing {
  get id() {
    return "1"
  }
}
class TwoSidedView extends Thing {
  get direction() {
    return "down"
  }
  set direction(_value: string) {}
}
class Card extends TwoSidedView {
  get rank() {
    return "king"
  }
  set rank(_value: string) {}
  get value() {
    return 13
  }
  get isAFaceCard() {
    return true
  }
  get suit() {
    return "hearts"
  }
  set suit(_value: string) {}
  get color() {
    return "red"
  }
  get pile() {
    return undefined
  }
}
class Joker extends Card {
  override get color() {
    return "black"
  }
  get wild() {
    return true
  }
}

/** Solitaire's words, cut down:  the card's groups, in its file's order. */
const WORDS: SP.SpellWordsData = {
  lang: "en",
  types: {
    Card: { rank: "rank", value: "value", isAFaceCard: "is a face card", suit: "suit", color: "color", pile: "pile" },
    Joker: { wild: "wild", color: "color" }
  },
  groups: {
    Card: [
      { name: "rank", description: "Ace is low", members: ["rank", "value", "isAFaceCard"] },
      { name: "suit", members: ["suit", "color"] },
      { name: "A pile of cards", members: ["pile"] }
    ],
    Joker: [{ name: "jokers:  wild cards", members: ["wild", "color"] }]
  }
}

/** A card's members, as the registry and its schema say them:  stored first, then the computed. */
const STORED = ["id", "direction", "rank", "suit"]
const COMPUTED = ["value", "isAFaceCard", "color", "pile"].map((name) => ({ name, computed: true }))

describe("ThingMembers.bandsOf()", () => {
  test("a card:  its groups, in its file's order, then each type it inherits from;  `id` last, built in", () => {
    const bands = ThingMembers.bandsOf(new Card(), { stored: STORED, properties: COMPUTED, words: WORDS })
    expect(bands.map((band) => [band.title, band.members.map((member) => `${member.name}:${member.kind}`)])).toEqual([
      ["rank", ["rank:stored", "value:computed", "isAFaceCard:computed"]],
      ["suit", ["suit:stored", "color:computed"]],
      ["A pile of cards", ["pile:computed"]],
      ["two sided view", ["direction:stored"]],
      ["", ["id:stored"]]
    ])
    expect(bands[0]!.description).toBe("Ace is low")
    expect(bands.at(-1)!.isBuiltIn).toBe(true)
    expect(bands[0]!.members[2]!.words).toBe("is a face card")
  })

  test("a joker:  its own first, then a card's, each once;  its color in its own place", () => {
    const bands = ThingMembers.bandsOf(new Joker(), {
      stored: STORED,
      properties: [...COMPUTED, { name: "wild", computed: true }],
      words: WORDS
    })
    expect(bands.map((band) => [band.title, band.description, band.members.map((member) => member.name)])).toEqual([
      ["jokers", "wild cards", ["wild", "color"]],
      ["rank", "Ace is low", ["rank", "value", "isAFaceCard"]],
      ["suit", undefined, ["suit"]],
      ["A pile of cards", undefined, ["pile"]],
      ["two sided view", undefined, ["direction"]],
      ["", undefined, ["id"]]
    ])
    expect(bands[0]!.members[1]!.type).toBe("Joker")
  })

  test("no words file:  a band per type, its stored members, then its computed ones", () => {
    const bands = ThingMembers.bandsOf(new Card(), { stored: STORED, properties: COMPUTED })
    expect(bands.map((band) => [band.title, band.members.map((member) => member.name)])).toEqual([
      ["card", ["rank", "suit", "value", "isAFaceCard", "color", "pile"]],
      ["two sided view", ["direction"]],
      ["", ["id"]]
    ])
  })

  test("no running program:  only what its schema stores", () => {
    const bands = ThingMembers.bandsOf(new Card(), { stored: ["rank"], words: WORDS })
    expect(bands.map((band) => [band.title, band.members.map((member) => member.name)])).toEqual([["rank", ["rank"]]])
  })
})
