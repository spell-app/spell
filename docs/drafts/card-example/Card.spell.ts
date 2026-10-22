import { core, Thing, List, App, Drawable, DrawableList, prop } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

export type Suit = (typeof Card.Suits)[number]
export type Rank = (typeof Card.Ranks)[number]

export class Card extends Drawable {
  static elementTag = core.defineElement(this, "solitaire")

  // - its "suit" is one of clubs, diamonds, hearts or spades
  static Suits = ["clubs", "diamonds", "hearts", "spades"] as const
  @prop({ oneOf: () => Card.Suits })
  accessor suit!: Suit

  get color() {
    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"
    return "black"
  }

  // - its "rank" is one of ace, 2 ... 10, jack, queen, king
  static Ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"] as const
  @prop({ oneOf: () => Card.Ranks })
  accessor rank!: Rank

  get isAFaceCard() {
    return core.includes(["jack", "queen", "king"], this.rank)
  }

  isARank(rank: Rank) {
    return this.rank === rank
  }

  isTheRankOfSuit(rank: Rank, suit: Suit) {
    return this.rank === rank && this.suit === suit
  }
}

/**
 * `<solitaire-card>`:  a card, drawn in its own element, e.g. by `draw the card`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its card's properties;  its methods call its card's.
 * - What every drawable thing's element does, e.g. drawing its card, is `SpellElement`'s.
 */
export class CardElement extends SpellElement<Card> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("solitaire-card", "card", [
    { name: "suit", kind: "string", description: "Its suit." },
    { name: "rank", kind: "string", description: "Its rank." }
  ])

  isARank(rank: Rank) {
    return this.currentThing?.isARank(rank)
  }

  isTheRankOfSuit(rank: Rank, suit: Suit) {
    return this.currentThing?.isTheRankOfSuit(rank, suit)
  }
}
core.useElement(Card, CardElement)

// each drawable type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CardElement` */
      "solitaire-card": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
