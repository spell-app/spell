import { core, List, App, View, TwoSidedView, ViewableList, prop, derived, thing, drawn, positionOf, spellPosition, position, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

/** A card says what its rank, suit and color are:  a deck, a pile or the game only reads them. */
// A playing card
export type Rank = (typeof Card.Ranks)[number]
export type Suit = (typeof Card.Suits)[number]

export class Card extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  // - its "rank" is one of ace, 2 ... 10, jack, queen, king
  static Ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"] as const
  @prop({ oneOf: () => Card.Ranks })
  accessor rank!: Rank

  // - its "suit" is one of clubs, diamonds, hearts or spades
  static Suits = ["clubs", "diamonds", "hearts", "spades"] as const
  @prop({ oneOf: () => Card.Suits })
  accessor suit!: Suit

  // - its "color" is one of red, black
  //   red if it is a diamond or it is a heart
  //   black otherwise
  static Colors = ["red", "black"]
  get color() {
    if (this.suit === "diamonds" || this.suit === "hearts") return "red"
    return "black"
  }

  get isAFaceCard() {
    return core.includes(["jack", "queen", "king"], this.rank)
  }

  get isANumberCard() {
    return !this.isAFaceCard
  }

  /** e.g. the card is the two of spades */
  isTheRankOfSuit(rank: Rank, suit: Suit) {
    return this.rank === rank && this.suit === suit
  }

  get name() {
    return core.joined(core.joined(this.rank, "of", " "), this.suit, " ")
  }

  get value() {
    return spellPosition(positionOf(Card.Ranks, this.rank))
  }

  get symbol() {
    if (this.suit === "clubs") return "♣"
    if (this.suit === "diamonds") return "♦"
    if (this.suit === "hearts") return "♥"
    return "♠"
  }

  /** Its short name:  Q♠↓ is the queen of spades, face down */
  get shortName() {
    const letter = this.value === 10 ? 10 : `${core.getItemAt(this.rank, 0) ?? ""}`.toLocaleUpperCase()
    const arrow = this.isFaceDirection("up") ? "↑" : "↓"
    return letter + this.symbol + arrow
  }

  drawFront() {
    return <test-project-card-image prop:card={this} part="front" />
  }

  drawBack() {
    return <test-project-card-image direction={"down"} part="back" />
  }

  /** The card, and every card on it, onto the pile, if the piles' rules let it go and take it */
  moveToPile(pile: Pile) {
    // - refused, nothing moves, and there's nothing to undo
    // - a game adds its own steps after it:  `after moving a card to a pile`
    if (!core.canGiveUp(this.pile, this) || !core.canTake(pile, this)) core.cancel()
    this.pile.startingWith(this).forEach((card) => pile.append(card))
  }

  /** the card the next one goes on */
  get isOnTopOfItsPile() {
    return this === this.pile.lastItem
  }

  async play() {
    if (this.pile === solitaire.stock) await solitaire.turnOverTheNextCard()
    else {
      const endPile = core.filter(core.everyThing(Pile), (pile: Pile) => core.canTake(pile, this)).firstItem
      if (endPile === undefined) return false
      return this.moveToPile(endPile)
    }
  }

  /** The move scores;  the column it left turns its new last card face up */
  afterMoveToPile(pile: Pile) {
    solitaire.score = solitaire.score + this.thePointsForCardOnPile(pile)
    const it2 = this.lastPile
    if (it2 instanceof Column && !it2.isEmpty) it2.lastItem?.turnFaceUp()
  }

  /** What a move scores:  10 onto a foundation, 5 from the discard pile, else nothing */
  thePointsForCardOnPile(pile: Pile) {
    if (pile instanceof Foundation) return 10
    if (this.lastPile === solitaire.discardPile) return 5
    return 0
  }

  async onClick(event: ClickEvent) {
    if (this.isFaceDirection("up") || this.pile === solitaire.stock) await this.play()
  }

  static draggable = true

  /** a card is in one pile at a time:  moving it to another pile takes it off this one */
  get pile() {
    return Pile.ownerOf(this)!
  }

  get lastPile() {
    return Pile.lastOwnerOf(this)
  }
}

/**
 * `<test-project-card>`:  a card, drawn in its own element, e.g. by `draw the card`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its card's properties;  its methods call its card's.
 * - What every view's element does, e.g. drawing its card, is `SpellElement`'s.
 */
export class CardElement extends SpellElement<Card> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-card", "card", [
    { name: "rank", kind: "string", description: "Its rank." },
    { name: "suit", kind: "string", description: "Its suit." }
  ])

  isTheRankOfSuit(rank: Rank, suit: Suit) {
    return this.currentThing?.isTheRankOfSuit(rank, suit)
  }

  drawFront() {
    return this.currentThing?.drawFront()
  }

  drawBack() {
    return this.currentThing?.drawBack()
  }

  moveToPile(pile: Pile) {
    return this.currentThing?.moveToPile(pile)
  }

  play() {
    return this.currentThing?.play()
  }

  afterMoveToPile(pile: Pile) {
    return this.currentThing?.afterMoveToPile(pile)
  }

  thePointsForCardOnPile(pile: Pile) {
    return this.currentThing?.thePointsForCardOnPile(pile)
  }

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }
}
core.useElement(Card, CardElement)
core.describeAction(Card, "moveToPile", { title: "Move Card to Pile", cancels: true, undoneAs: "Move Card to Pile" })
core.addAfterHook(Card, "moveToPile", { hook: "afterMoveToPile" })
core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })
// It's a two sided view:  each side is a card image (below):  face up its own, face down the back every card shares.
// On the page each card is its own element, `<solitaire-card>`:  people may drag it (`draggable`), when its pile lets it go.
// Ace is low:  ace = 1 ... king = 13

// Spell for identifying cards

// identifying a card

/** Give it a card to draw, or a rank and a suit:  `<card-image card={the card} />`, `<card-image rank=ace suit={its suit} />`. */
// A card's picture:  the one place a card's look lives
export type Direction = (typeof CardImage.Directions)[number]

@thing
export class CardImage extends View {
  static elementTag = core.defineElement(this, "test-project")

  /**
   * It's face up, unless it's `direction=down`:  then it's the back every card shares.
   * Today it's one letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css
   * Real pictures of the cards can take its place:  only its picture and `to draw it` change.
   */
  // the card it draws
  // - its "card" is a card
  @prop({ type: "Card" })
  accessor card!: Card

  // - its "rank" is a card rank
  @prop({ oneOf: () => Card.Ranks })
  accessor rank!: Rank

  // - its "suit" is a card suit
  @prop({ oneOf: () => Card.Suits })
  accessor suit!: Suit

  // - its "direction" is up or down
  static Directions = ["up", "down"] as const
  @prop({ oneOf: () => CardImage.Directions })
  accessor direction!: Direction

  isFaceDirection(direction: Direction) {
    return this.direction === direction
  }

  /** given a card:  its rank and suit are the card's;  given a rank and a suit:  its card is a new one of them (its back needs none) */
  create() {
    if (this.card !== undefined) {
      this.rank = this.card.rank
      this.suit = this.card.suit
    } else if (!this.isFaceDirection("down")) this.card = new Card({ rank: this.rank, suit: this.suit })
  }

  get color() {
    if (this.isFaceDirection("down")) return "blue"
    return this.card?.color
  }

  /** draw the unicode character for card images */
  get picture() {
    // see https://www.compart.com/en/unicode/block/U+1F0A0
    if (this.isFaceDirection("down")) return "🂠"
    let column = this.card?.value
    if (this.card?.suit === "clubs") return core.getItemAt(["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], position(column))
    if (this.card?.suit === "diamonds") return core.getItemAt(["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], position(column))
    if (this.card?.suit === "hearts") return core.getItemAt(["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"], position(column))
    return core.getItemAt(["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], position(column))
  }

  @drawn draw() {
    return <ui-text color={this.color}>{this.picture}</ui-text>
  }
}

/**
 * `<test-project-card-image>`:  a card image, drawn in its own element, e.g. by `draw the card image`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its card image's properties;  its methods call its card image's.
 * - What every view's element does, e.g. drawing its card image, is `SpellElement`'s.
 */
export class CardImageElement extends SpellElement<CardImage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-card-image", "card image", [
    { name: "card", kind: "string", description: "Its card." },
    { name: "rank", kind: "string", description: "Its rank." },
    { name: "suit", kind: "string", description: "Its suit." },
    { name: "direction", kind: "string", description: "Its direction." }
  ])

  isFaceDirection(direction: Direction) {
    return this.currentThing?.isFaceDirection(direction)
  }

  create() {
    return this.currentThing?.create()
  }
}
core.useElement(CardImage, CardImageElement)

export function testCardSetup() {
  return core.test("test card setup", function testCardSetup() {
    const it = new Card()
    core.echoTestAction(`get a new card whose rank is queen, suit is spades and direction is down`)
    const it2 = new Card({
      rank: "queen",
      suit: "spades",
      direction: "down"
    })
    core.expect(it2.name, `its name`, "queen of spades", `"queen of spades"`)
    core.expect(it2.color, `its color`, "black", `black`)
    core.expect(it2.value, `its value`, 12, `12`)
    core.expect(it2.shortName, `its short name`, "Q♠↓", `"Q♠↓"`)
    core.expect(it2.isAFaceCard, `it is a face card`, true, `yes`)
    core.expect(it2.suit === "spades", `it is a spade`, true, `yes`)
    core.expect(it2.suit === "clubs", `it is a club`, false, `no`)
    core.expect(it2.rank === "queen", `it is a queen`, true, `yes`)
    core.expect(it2.rank === 2, `it is a 2`, false, `no`)
    core.expect(it2.isTheRankOfSuit("queen", "spades"), `it is the queen of spades`, true, `yes`)
    core.expect(it2.isTheRankOfSuit("queen", "clubs"), `it is the queen of clubs`, false, `no`)

    core.echoTestAction(`turn it over`)
    it2.turnOver()
    core.expect(it2.isFaceDirection("up"), `it is face up`, true, `yes`)
    core.expect(it2.shortName, `its short name`, "Q♠↑", `"Q♠↑"`)

    core.echoTestAction(`set seven to a new card whose rank is 7 and suit is hearts`)
    const seven = new Card({ rank: 7, suit: "hearts" })
    core.expect(seven.isANumberCard, `seven is a number card`, true, `yes`)
    core.expect(seven.color, `the color of seven`, "red", `red`)
  })
}

export function testCardImages() {
  return core.test("test card images", function testCardImages() {
    const it = new CardImage()
    core.echoTestAction(`set queen to a new card whose rank is queen, suit is spades and direction is down`)
    const queen = new Card({
      rank: "queen",
      suit: "spades",
      direction: "down"
    })
    core.echoTestAction(`get a new card image whose card is the queen`)
    const it2 = new CardImage({ card: queen })
    core.expect(it2.suit, `its suit`, "spades", `spades`)
    core.expect(it2.picture, `its picture`, "🂭", `"🂭"`)
    core.expect(it2.color, `its color`, "black", `black`)

    core.echoTestAction(`set seven to a new card image whose rank is 7 and suit is hearts`)
    const seven = new CardImage({ rank: 7, suit: "hearts" })
    core.expect(seven.card?.name!, `the name of seven's card`, "7 of hearts", `"7 of hearts"`)
    core.expect(seven.picture, `the picture of seven`, "🂷", `"🂷"`)
    core.expect(seven.color, `the color of seven`, "red", `red`)

    core.expect((new CardImage({ rank: "ace", suit: "clubs" })).picture, `the picture of a new card image whose rank is ace and suit is clubs`, "🃑", `"🃑"`)
    core.expect((new CardImage({ rank: "king", suit: "diamonds" })).picture, `the picture of a new card image whose rank is king and suit is diamonds`, "🃎", `"🃎"`)

    core.echoTestAction(`get a new card image whose direction is down`)
    const it3 = new CardImage({ direction: "down" })
    core.expect(it3.picture, `its picture`, "🂠", `"🂠"`)
    core.expect(it3.color, `its color`, "blue", `blue`)
  })
}
// -----------
export type Layout = (typeof Pile.Layouts)[number]

/** A pile of cards, e.g. in a game like solitaire */
export class Pile extends ViewableList<Card> {
  static instanceType = Card
  static elementTag = core.defineElement(this, "test-project")

  // A card can only be in one pile at a time
  /** How its cards lie:  on top of each other, or down a column -- styles.css */
  // - its "layout" is one of stacked or vertical
  static Layouts = ["stacked", "vertical"] as const
  @prop({ oneOf: () => Pile.Layouts })
  accessor layout!: Layout

  get color() {
    if (this.isEmpty) return "none"
    return this.lastItem!.color
  }

  get value() {
    if (this.isEmpty) return 0
    return this.lastItem!.value
  }

  /** Its id, then its cards' short names:  stock: Q♠↑ 7♥↓ */
  @derived get shortName() {
    let summary = `${this.id}:`
    this.forEach((card) => (summary = `${summary} ${card.shortName}`))
    return summary
  }

  whenCardDroppedOn(card: Card) {
    card.moveToPile(this)
  }

  static droppable = true

  static exclusive = true
}
export interface Pile {
  canTake(card: Card): boolean
  canGiveUp(card: Card): boolean
  drawItsPlaceholder(): any /* spell: type unknown */
}

/**
 * `<test-project-pile>`:  a pile, drawn in its own element, e.g. by `draw the pile`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pile's properties;  its methods call its pile's.
 * - What every view's element does, e.g. drawing its pile, is `SpellElement`'s.
 */
export class PileElement extends SpellElement<Pile> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-pile", "pile", [
    { name: "layout", kind: "string", description: "Its layout." }
  ])

  whenCardDroppedOn(card: Card) {
    return this.currentThing?.whenCardDroppedOn(card)
  }
}
core.useElement(Pile, PileElement)

export function testPiles() {
  return core.test("test piles", function testPiles() {
    core.echoTestAction(`set the stock to a new pile with id "stock"`)
    const stock = new Pile({ id: "stock" })
    core.expect(stock.color, `stock's color`, "none", `"none"`)
    core.expect(stock.value, `stock's value`, 0, `0`)
    core.echoTestAction(`add a new card with rank queen, suit spades and direction up to the stock`)
    stock.append(new Card({
      rank: "queen",
      suit: "spades",
      direction: "up"
    }))
    core.echoTestAction(`add a new card with rank 7, suit hearts and direction down to the stock`)
    stock.append(new Card({
      rank: 7,
      suit: "hearts",
      direction: "down"
    }))
    core.expect(stock.color, `stock's color`, "red", `red`)
    core.expect(stock.value, `stock's value`, 7, `7`)
    core.expect(stock.shortName, `stock's short name`, "stock: Q♠↑ 7♥↓", `"stock: Q♠↑ 7♥↓"`)

    /** a card is in one pile at a time */
    const discards = new Pile({ id: "discards" })
    core.echoTestAction(`get the top card of the stock`)
    const it = stock.lastItem
    core.echoTestAction(`add it to the discards`)
    discards.append(it!)
    core.expect(it?.pile === discards, `its pile is the discards`, true, `yes`)
    core.expect(stock.length, `the number of cards in the stock`, 1, `1`)
    core.expect(discards.shortName, `the discards' short name`, "discards: 7♥↓", `"discards: 7♥↓"`)
  })
}
// -----------
/** a deck of playing cards */
@thing
export class Deck extends ViewableList<Card> {
  static instanceType = Card
  static elementTag = core.defineElement(this, "test-project")

  /** Create one of each card, ace of clubs first */
  create() {
    Card.Ranks.forEach((rank: Rank) => Card.Suits.forEach((suit: Suit) => this.append(new Card({ rank: rank, suit: suit }))))
  }

  /** its card names, top to bottom */
  @derived get shortName() {
    const cardNames = new List<string>({ instanceType: "text" })
    this.forEach((card) => cardNames.append(card.shortName))
    return `deck: ${cardNames}`
  }
}

/**
 * `<test-project-deck>`:  a deck, drawn in its own element, e.g. by `draw the deck`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its deck's properties;  its methods call its deck's.
 * - What every view's element does, e.g. drawing its deck, is `SpellElement`'s.
 */
export class DeckElement extends SpellElement<Deck> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-deck", "deck", [])

  create() {
    return this.currentThing?.create()
  }
}
core.useElement(Deck, DeckElement)

export function testANewDeck() {
  return core.test("test a new deck", function testANewDeck() {
    const it = new Deck()
    core.echoTestAction(`the deck is a new deck`)
    const deck = new Deck()
    core.expect(deck.length, `the number of cards in the deck`, 52, `52`)
    core.expect(deck.filter((card) => card.rank === "queen").length, `the number of (cards in the deck where it is a queen)`, 4, `4`)
    core.expect(deck.firstItem?.shortName!, `deck's first card's short name`, "A♣↓", `"A♣↓"`)
    core.expect(deck.lastItem?.name!, `deck's last card's name`, "king of spades", `"king of spades"`)
    core.echoTestAction(`shuffle the deck`)
    deck.randomize()
    core.expect(deck.length, `the number of cards in the deck`, 52, `52`)
  })
}
// -----------
/** The cards not played yet, face down:  a click turns the next one over, so none can be taken from it */
export class StockPile extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout(): Layout {
    return "stacked"
  }

  canTake(card: Card) {
    return false
  }

  canGiveUp(card: Card) {
    return false
  }

  drawItsPlaceholder() {
    return <test-project-card-image direction={"down"} part="placeholder" />
  }

  async onClick(event: ClickEvent) {
    await solitaire.turnOverTheNextCard()
  }
}

/**
 * `<test-project-stock-pile>`:  a stock pile, drawn in its own element, e.g. by `draw the stock pile`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its stock pile's properties;  its methods call its stock pile's.
 * - What every view's element does, e.g. drawing its stock pile, is `SpellElement`'s.
 */
export class StockPileElement extends SpellElement<StockPile> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-stock-pile", "stock pile", [])

  canTake(card: Card) {
    return this.currentThing?.canTake(card)
  }

  canGiveUp(card: Card) {
    return this.currentThing?.canGiveUp(card)
  }

  drawItsPlaceholder() {
    return this.currentThing?.drawItsPlaceholder()
  }

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }
}
core.useElement(StockPile, StockPileElement)

/** Where the stock's cards go as they're turned over */
export class DiscardPile extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout(): Layout {
    return "stacked"
  }

  canTake(card: Card) {
    return false
  }

  canGiveUp(card: Card) {
    return card === this.lastItem
  }

  static itemsDraggable = true
}

/**
 * `<test-project-discard-pile>`:  a discard pile, drawn in its own element, e.g. by `draw the discard pile`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its discard pile's properties;  its methods call its discard pile's.
 * - What every view's element does, e.g. drawing its discard pile, is `SpellElement`'s.
 */
export class DiscardPileElement extends SpellElement<DiscardPile> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-discard-pile", "discard pile", [])

  canTake(card: Card) {
    return this.currentThing?.canTake(card)
  }

  canGiveUp(card: Card) {
    return this.currentThing?.canGiveUp(card)
  }
}
core.useElement(DiscardPile, DiscardPileElement)

/** Where a suit is built up, ace to king, one card at a time */
export class Foundation extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout(): Layout {
    return "stacked"
  }

  // - its "suit" is a card suit
  @prop({ oneOf: () => Card.Suits })
  accessor suit!: Suit

  canGiveUp(card: Card) {
    return false
  }

  drawItsPlaceholder() {
    // a light grey ace of its suit, face up
    return <test-project-card-image rank={"ace"} prop:suit={this.suit} part="placeholder" />
  }

  canTake(card: Card) {
    return this.suit === card.suit && this.value === card.value - 1 && card.isOnTopOfItsPile
  }

  static droppable = true
}

/**
 * `<test-project-foundation>`:  a foundation, drawn in its own element, e.g. by `draw the foundation`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its foundation's properties;  its methods call its foundation's.
 * - What every view's element does, e.g. drawing its foundation, is `SpellElement`'s.
 */
export class FoundationElement extends SpellElement<Foundation> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-foundation", "foundation", [
    { name: "suit", kind: "string", description: "Its suit." }
  ])

  canGiveUp(card: Card) {
    return this.currentThing?.canGiveUp(card)
  }

  drawItsPlaceholder() {
    return this.currentThing?.drawItsPlaceholder()
  }

  canTake(card: Card) {
    return this.currentThing?.canTake(card)
  }
}
core.useElement(Foundation, FoundationElement)

/** A column, built down from king to ace, red and black in turn */
export class Column extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout(): Layout {
    return "vertical"
  }

  canGiveUp(card: Card) {
    return card.isFaceDirection("up")
  }

  static itemsDraggable = true

  canTake(card: Card) {
    return (this.isEmpty && card.rank === "king") || (this.color !== card.color && this.value === card.value + 1)
  }

  static droppable = true
}

/**
 * `<test-project-column>`:  a column, drawn in its own element, e.g. by `draw the column`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its column's properties;  its methods call its column's.
 * - What every view's element does, e.g. drawing its column, is `SpellElement`'s.
 */
export class ColumnElement extends SpellElement<Column> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-column", "column", [])

  canGiveUp(card: Card) {
    return this.currentThing?.canGiveUp(card)
  }

  canTake(card: Card) {
    return this.currentThing?.canTake(card)
  }
}
core.useElement(Column, ColumnElement)

/** See https://en.wikipedia.org/wiki/Klondike_(solitaire) for the rules */
@thing
export class Solitaire extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  create() {
    this.deck.forEach((card) => this.stock.append(card))
    core.holdWhile(() => this.restartTheGame())
  }

  @drawn draw() {
    return (
      <>
        <ui-segment inverted={true} attach-to="top">
          <ui-toolbar class="GameBar" appearance="pills" inverted={true} size="small" shrinkable={true}>
            <ui-text slot="title" size="large" heavy={true}>Spell Solitaire</ui-text>
            {core.drawAction(this, "autoPlay", { "in-menu": true })}
            {core.drawAction(this, "cheat", { "in-menu": true })}
            {core.drawAction(this, "restartTheGame", { title: "Restart", "in-menu": true })}
            <spacer />
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
            <ui-text slot="right">Score: {this.score}</ui-text>
          </ui-toolbar>
        </ui-segment>
        <ui-container columns="7" padding="small" spacing="xs">
          <test-project-stock-pile id="stock" />
          <test-project-discard-pile id="discard pile" />
          <spacer />
          <test-project-foundation id="clubs" />
          <test-project-foundation id="diamonds" />
          <test-project-foundation id="hearts" />
          <test-project-foundation id="spades" />
          <test-project-column id="C1" />
          <test-project-column id="C2" />
          <test-project-column id="C3" />
          <test-project-column id="C4" />
          <test-project-column id="C5" />
          <test-project-column id="C6" />
          <test-project-column id="C7" />
        </ui-container>
        {core.drawContextMenu(this, ["autoPlay", "cheat", "restartTheGame", "-", "undo", "redo"])}
      </>
    )
  }
  // <deck "deck"hidden />
  @prop({ init: () => new Deck({ id: "deck" }), early: true })
  accessor deck!: Deck
  // <number "score" />
  @prop({ type: "number" })
  accessor score!: number
  // <stock-pile "stock"/>
  @prop({ init: () => new StockPile({ id: "stock" }), early: true })
  accessor stock!: StockPile
  // <discard-pile "discard pile"/>
  @prop({ init: () => new DiscardPile({ id: "discard pile" }), early: true })
  accessor discardPile!: DiscardPile
  // <foundation "clubs" suit=clubs/>
  @prop({ init: () => new Foundation({ id: "clubs", suit: "clubs" }), early: true })
  accessor clubs!: Foundation
  // <foundation "diamonds" suit=diamonds/>
  @prop({ init: () => new Foundation({ id: "diamonds", suit: "diamonds" }), early: true })
  accessor diamonds!: Foundation
  // <foundation "hearts" suit=hearts/>
  @prop({ init: () => new Foundation({ id: "hearts", suit: "hearts" }), early: true })
  accessor hearts!: Foundation
  // <foundation "spades" suit=spades/>
  @prop({ init: () => new Foundation({ id: "spades", suit: "spades" }), early: true })
  accessor spades!: Foundation
  // <column "C1"/>
  @prop({ init: () => new Column({ id: "C1" }), early: true })
  accessor C1!: Column
  // <column "C2"/>
  @prop({ init: () => new Column({ id: "C2" }), early: true })
  accessor C2!: Column
  // <column "C3"/>
  @prop({ init: () => new Column({ id: "C3" }), early: true })
  accessor C3!: Column
  // <column "C4"/>
  @prop({ init: () => new Column({ id: "C4" }), early: true })
  accessor C4!: Column
  // <column "C5"/>
  @prop({ init: () => new Column({ id: "C5" }), early: true })
  accessor C5!: Column
  // <column "C6"/>
  @prop({ init: () => new Column({ id: "C6" }), early: true })
  accessor C6!: Column
  // <column "C7"/>
  @prop({ init: () => new Column({ id: "C7" }), early: true })
  accessor C7!: Column

  async restartTheGame() {
    this.score = 0
    this.deck.forEach((card) => core.meanwhile(() => card.turnFaceDown()))
    await core.forEachSequential(core.filter(core.everyThing(Card), (card: Card) => card.pile !== this.stock), async (card: Card) => {
      core.meanwhile(() => this.stock.append(card))
      await core.pauseFor(10, "msec")
    })
    this.stock.randomize()
    // each row's first card lands face down, then turns up where it lies
    for (const row of core.getRange(1, 7)) {
      for (const column of core.getRange(row, 7)) {
        core.getItemAt(core.everyThing(Column), position(column))?.append(this.stock.lastItem!)
        await core.pauseFor(20, "msec")
        if (column === row) core.getItemAt(core.everyThing(Column), position(column))?.lastItem?.turnFaceUp()
      }
    }
    await this.turnOverTheNextCard()
  }

  /** Turn the stock's next card over, onto the discard pile:  the discard pile back into the stock when it's empty */
  async turnOverTheNextCard() {
    // - a click on the stock, one step to undo;  the deal's own turn none, as it starts the game
    if (this.stock.isEmpty) this.resetTheStock()
    const nextCard = this.stock.lastItem
    nextCard?.turnFaceUp()
    // as long as its flip takes (styles.css), so it turns over before it moves
    await core.pauseFor(300, "msec")
    this.discardPile.append(nextCard!)
  }

  /** The discard pile, turned over, back into the stock */
  resetTheStock() {
    const cards = this.discardPile.clone()
    cards.reverse()
    cards.forEach((card) => this.stock.append(card))
    this.stock.forEach((card) => card.turnFaceDown())
  }

  /** Play every card that can go somewhere, until none can */
  async autoPlay() {
    let anythingChanged: boolean = false
    if (!this.discardPile.isEmpty) {
      const testCard = this.discardPile.lastItem
      if (await testCard?.play()) {
        anythingChanged = true
        await core.pauseFor(500, "msec")
      }
    }
    // each column's last card onto its foundation
    await core.forEachSequential(core.everyThing(Column), async (pile: Column) => {
      if (pile.isEmpty) return
      const testCard = pile.lastItem!
      const foundation = core.filter(core.everyThing(Foundation), (pile: Foundation) => pile.suit === testCard.suit).firstItem
      if (core.canTake(foundation!, testCard)) {
        anythingChanged = true
        await testCard.play()
        await core.pauseFor(100, "msec")
      }
    })
    // each column's face-up cards, all together, onto another column
    await core.forEachSequential(core.everyThing(Column), async (pile: Column) => {
      const faceUpCards = pile.filter((card) => card.isFaceDirection("up"))
      if (faceUpCards.isEmpty) return
      const testCard = faceUpCards.firstItem!
      if (testCard.rank === "king" && testCard === pile.firstItem) return
      if (await testCard.play()) {
        anythingChanged = true
        await core.pauseFor(500, "msec")
      }
    })
    if (anythingChanged) await this.autoPlay()
  }

  /** Turn up a face-down card from a column, at random, onto the discard pile */
  cheat() {
    const remainingPiles = core.filter(core.everyThing(Column), (pile: Column) => !pile.isEmpty && pile.firstItem?.isFaceDirection("down"))
    if (core.isEmpty(remainingPiles)) return
    const pile = core.randomItemOf<Column>(remainingPiles)
    const card = pile?.filter((card) => card.isFaceDirection("down"))?.randomItem()
    // turned up as it moves:  it rises over its column face down, then turns as it glides onto the discard pile
    this.discardPile.append(card!)
    card?.turnFaceUp()
  }

  async onScoreChange(event: ScoreChangeEvent) {
    if (core.itemCountOf(core.mergeLists(core.everyThing(Foundation))) === 52) {
      await core.alert("You won!", "New game")
      await this.restartTheGame()
    }
  }
}

/**
 * `<test-project-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its solitaire's properties;  its methods call its solitaire's.
 * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.
 */
export class SolitaireElement extends SpellElement<Solitaire> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "solitaire", [
    { name: "deck", kind: "json", description: "Its deck." },
    { name: "score", kind: "number", description: "Its score." },
    { name: "stock", kind: "json", description: "Its stock." },
    { name: "discard-pile", kind: "json", description: "Its discardPile." },
    { name: "clubs", kind: "json", description: "Its clubs." },
    { name: "diamonds", kind: "json", description: "Its diamonds." },
    { name: "hearts", kind: "json", description: "Its hearts." },
    { name: "spades", kind: "json", description: "Its spades." },
    { name: "-c1", kind: "json", description: "Its C1." },
    { name: "-c2", kind: "json", description: "Its C2." },
    { name: "-c3", kind: "json", description: "Its C3." },
    { name: "-c4", kind: "json", description: "Its C4." },
    { name: "-c5", kind: "json", description: "Its C5." },
    { name: "-c6", kind: "json", description: "Its C6." },
    { name: "-c7", kind: "json", description: "Its C7." }
  ])

  create() {
    return this.currentThing?.create()
  }

  restartTheGame() {
    return this.currentThing?.restartTheGame()
  }

  turnOverTheNextCard() {
    return this.currentThing?.turnOverTheNextCard()
  }

  resetTheStock() {
    return this.currentThing?.resetTheStock()
  }

  autoPlay() {
    return this.currentThing?.autoPlay()
  }

  cheat() {
    return this.currentThing?.cheat()
  }

  onScoreChange(event: ScoreChangeEvent) {
    return this.currentThing?.onScoreChange(event)
  }
}
core.useElement(Solitaire, SolitaireElement)
export const solitaire = new Solitaire()
core.describeAction(Solitaire, "restartTheGame", { title: "Restart the Game", shortcuts: ["R"], icon: "sync alternate", undoneAs: "Restart the Game" })
core.describeAction(Solitaire, "turnOverTheNextCard", { title: "Turn Over the Next Card", undoneAs: "Turn Card" })
core.describeAction(Solitaire, "resetTheStock", { title: "Reset the Stock", undoneAs: "Reset the Stock" })
core.describeAction(Solitaire, "autoPlay", { title: "Auto Play", shortcuts: ["A"], icon: "play", undoneAs: "Auto Play" })
core.describeAction(Solitaire, "cheat", { title: "Cheat", shortcuts: ["C"], icon: "eye", undoneAs: "Cheat" })

// play the card on click if it is a legal move

core.heading("The piles")
///////////////
// ## The piles
///////////////
// Each kind of pile, what it may take or give up, and how it lies.
// While one's empty, it shows its placeholder, if it has one.

export function testTheMoves() {
  return core.test("test the moves", function testTheMoves() {
    core.echoTestAction(`set the column to a new column with id "T1"`)
    let column = new Column({ id: "T1" })
    core.echoTestAction(`set the king to a new card whose rank is king, suit is spades and direction is up`)
    const king = new Card({
      rank: "king",
      suit: "spades",
      direction: "up"
    })
    core.echoTestAction(`set the queen to a new card whose rank is queen, suit is hearts and direction is up`)
    const queen = new Card({
      rank: "queen",
      suit: "hearts",
      direction: "up"
    })
    core.echoTestAction(`set the jack to a new card whose rank is jack, suit is clubs and direction is up`)
    const jack = new Card({
      rank: "jack",
      suit: "clubs",
      direction: "up"
    })

    // an empty column takes only a king, then one lower in the other color
    core.expect(core.canTake(column, queen), `the column can take the queen`, false, `no`)
    core.expect(core.canTake(column, king), `the column can take the king`, true, `yes`)
    core.echoTestAction(`add the king to the column`)
    column.append(king)
    core.expect(core.canTake(column, jack), `the column can take the jack`, false, `no`)
    core.expect(core.canTake(column, queen), `the column can take the queen`, true, `yes`)
    core.echoTestAction(`add the queen to the column`)
    column.append(queen)
    core.expect(column.shortName, `the short name of the column`, "T1: K♠↑ Q♥↑", `"T1: K♠↑ Q♥↑"`)
    core.expect(core.canGiveUp(column, queen), `the column can give up the queen`, true, `yes`)
    core.echoTestAction(`turn the queen face down`)
    queen.turnFaceDown()
    core.expect(core.canGiveUp(column, queen), `the column can give up the queen`, false, `no`)

    /** a foundation takes its suit, ace first, then one higher:  each the last card of its pile */
    const foundation = new Foundation({ suit: "hearts" })
    core.echoTestAction(`set the two to a new card whose rank is 2, suit is hearts and direction is up`)
    const two = new Card({
      rank: 2,
      suit: "hearts",
      direction: "up"
    })
    core.echoTestAction(`set the ace to a new card whose rank is ace, suit is hearts and direction is up`)
    const ace = new Card({
      rank: "ace",
      suit: "hearts",
      direction: "up"
    })
    core.echoTestAction(`set the column to a new column with id "T2"`)
    column = new Column({ id: "T2" })
    core.echoTestAction(`add the two to the column`)
    column.append(two)
    core.echoTestAction(`add the ace to the column`)
    column.append(ace)
    core.expect(core.canTake(foundation, two), `the foundation can take the two`, false, `no`)
    core.expect(core.canTake(foundation, ace), `the foundation can take the ace`, true, `yes`)
    core.echoTestAction(`move the ace to the foundation`)
    ace.moveToPile(foundation)
    core.expect(core.canTake(foundation, two), `the foundation can take the two`, true, `yes`)
    core.echoTestAction(`add the queen to the column`)
    column.append(queen)
    core.expect(core.canTake(foundation, queen), `the foundation can take the queen`, false, `no`)
  })
}
// -----------
core.installStyles(undefined, `/* File styles.css:  what no attribute draws -- the felt, the toolbar's middle, and the cards and piles.¬   - The toolbar's bar, the board's grid and its spacing are their components' attributes (Solitaire.spell).¬   - A card is one letter of unicode's Playing Cards, as wide as its pile:  no <ui-*> tag draws one.¬   - A pile is styled by its layout (<solitaire-column layout="vertical">), each card in it by its place:¬     --index from 0, of --count;  an empty pile's placeholder by its part, ::part(placeholder). */¬¬/* A card's letter, in ems (measured in Chrome on a Mac):  0.604em wide, 0.805em tall, its left edge 0.049em in,¬   with 0.008em to spare above and below */¬:root,¬:host {¬  --card-width: 0.604;¬  /* its height, in widths:  (0.805 + 2 x 0.008) / 0.604 */¬  --card-height: 1.359;¬  /* down a column, how much of each card shows under the next:  its rank and suit */¬  --card-step-down: 0.2;¬}¬¬/* The table:  green felt, as on a casino's card table */¬solitaire-app {¬  display: block;¬  min-height: 100%;¬  border-radius: 12px;¬  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;¬}¬¬/* A pile:  as wide as its cell of the board, as tall as its cards */¬[layout] {¬  display: flow-root;¬  position: relative;¬  container-type: inline-size;¬  /* its top card glows when a dragged card would land on it (below), not the whole pile */¬  --spell-drop-glow: none;¬}¬/* its height, a floated sizer:  a padding's percentage is one of its width */¬[layout]::before {¬  content: "";¬  float: left;¬  width: 100%;¬  padding-top: calc(100% * var(--card-height));¬}¬¬/* Each card in a pile, and its placeholder:  a letter as wide as the pile, cut to the card it draws */¬[layout] > *,¬[layout]::part(placeholder) {¬  position: absolute;¬  display: block;¬  font-size: calc(100cqi / var(--card-width));¬}¬/* a card in no pile (one added to the table in the editor):  a column's usual width */¬solitaire-card:not([layout] > *) {¬  position: relative;¬  display: inline-block;¬  font-size: calc(6rem / var(--card-width));¬}¬[layout] > *,¬solitaire-card,¬[layout]::part(placeholder) {¬  width: calc(var(--card-width) * 1em);¬  height: calc(var(--card-width) * var(--card-height) * 1em);¬  overflow: hidden;¬  /* the font that draws the cards, so a theme's font never moves them */¬  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;¬  /* the face hugs the ink:  Apple Symbols' ink starts 0.917em down a line */¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  line-height: 0.917;¬  --ui-text-line-height: 0.917;¬  text-indent: -0.049em;¬  user-select: none;¬}¬¬/* A card:  a two sided view (Card.spell), its sides turning in 3D, so it cuts nothing itself;¬   a real deck's inks in every theme and scheme */¬[layout] > *,¬solitaire-card {¬  overflow: visible;¬  --spell-turn-perspective: 3em;¬  color-scheme: light;¬  --ui-red-text: #c8102e;¬  --ui-black-text: #1a1a1a;¬  --ui-blue-text: #2f6fd6;¬}¬/* each side:  its letter cut to the card, on a white face with the letter's rounded corners */¬[layout] > *::part(front),¬[layout] > *::part(back),¬solitaire-card::part(front),¬solitaire-card::part(back) {¬  display: block;¬  position: absolute;¬  inset: 0;¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  overflow: hidden;¬  background: #fff;¬  background-clip: content-box;¬  border-radius: 0.035em;¬}¬¬/* Turning over and moving ease, as a card is turned and slid */¬[layout] > * {¬  transition:¬    transform 0.3s ease-in-out,¬    translate 0.3s ease-out;¬}¬@media (prefers-reduced-motion: reduce) {¬  [layout] > * {¬    transition: none;¬  }¬}¬¬/* An empty pile's placeholder:  a faint pale card on the felt, whatever the card image's own ink */¬[layout]::part(placeholder) {¬  color: #d8f0e0;¬  --ui-red-text: currentColor;¬  --ui-black-text: currentColor;¬  --ui-blue-text: currentColor;¬  opacity: 0.4;¬}¬[layout]::part(placeholder):hover {¬  opacity: 0.5;¬}¬¬/* Dropping:  where a dragged card would land glows -- the pile's top card, or its placeholder¬   (:state(accepting-drop), set by the pile's rules) */¬[layout]:state(accepting-drop) > :last-child,¬[layout]:state(accepting-drop)::part(placeholder) {¬  opacity: 1;¬  border-radius: 0.035em;¬  box-shadow:¬    0 0 0 0.012em rgb(150 80 255 / 0.85),¬    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);¬}¬¬/* The layouts:  stacked puts every card on top of the one before;  vertical, each a step below it */¬[layout="vertical"]::before {¬  padding-top: calc(100% * var(--card-height) * (1 + (max(var(--count, 1), 1) - 1) * var(--card-step-down)));¬}¬[layout="vertical"] > * {¬  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));¬}¬`)
// -----------
if (!core.isCarryingOver) solitaire.start()
// -----------
if (!core.isCarryingOver) testCardSetup()
if (!core.isCarryingOver) testCardImages()
if (!core.isCarryingOver) testPiles()
if (!core.isCarryingOver) testANewDeck()
if (!core.isCarryingOver) testTheMoves()

// what each event this program hears holds
export type ClickEvent = SentEvent
export type ScoreChangeEvent = SentEvent & { value: number; was: number }

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CardElement` */
      "test-project-card": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CardImageElement` */
      "test-project-card-image": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PileElement` */
      "test-project-pile": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `DeckElement` */
      "test-project-deck": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StockPileElement` */
      "test-project-stock-pile": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `DiscardPileElement` */
      "test-project-discard-pile": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FoundationElement` */
      "test-project-foundation": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ColumnElement` */
      "test-project-column": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SolitaireElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
