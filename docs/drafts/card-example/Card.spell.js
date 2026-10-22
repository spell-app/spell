import { core, Thing, List, App, Drawable, DrawableList } from "@spell/core"

export class Card extends Drawable {
  static elementTag = core.defineElement(this, "solitaire")

  // - its "suit" is one of clubs, diamonds, hearts or spades
  static Suits = ["clubs", "diamonds", "hearts", "spades"]
  static { this.declareProp("suit", { oneOf: Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

  get color() {
    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"
    return "black"
  }

  // - its "rank" is one of ace, 2 ... 10, jack, queen, king
  static Ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"]
  static { this.declareProp("rank", { oneOf: Card.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }

  get isAFaceCard() {
    return core.includes(["jack", "queen", "king"], this.rank)
  }

  isARank(rank) {
    return this.rank === rank
  }

  isTheRankOfSuit(rank, suit) {
    return this.rank === rank && this.suit === suit
  }
}
