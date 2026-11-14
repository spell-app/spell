import { core, List, App, TwoSidedView, ViewableList, h, positionOf, spellPosition, position, sendCall } from "@spell/core"

////////////////////
// ## A playing card
////////////////////
// A card says what its rank, suit and color are:  a deck, a pile or the game only reads them.
// It's a two sided view:  face up it shows its picture, face down the back every card shares.
// On the page each card is its own element, `<solitaire-card>`:  people may drag it (`draggable`), when its pile lets it go.

export class Card extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  // - its "rank" is one of ace, 2 ... 10, jack, queen, king
  //   it "is a (rank)"
  static Ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"]
  static { this.declareProp("rank", { oneOf: Card.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }
  isARank(rank) {
    return this.rank === rank
  }

  get value() {
    return spellPosition(positionOf(Card.Ranks, this.rank))
  }

  get isAFaceCard() {
    return core.includes(["jack", "queen", "king"], this.rank)
  }

  get isANumberCard() {
    return !this.isAFaceCard
  }

  // - its "suit" is one of clubs, diamonds, hearts or spades
  //   it "is a (suit)"
  static Suits = ["clubs", "diamonds", "hearts", "spades"]
  static { this.declareProp("suit", { oneOf: Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }
  isASuit(suit) {
    return this.suit === suit
  }

  // - its "color" is one of red, black
  //   red if it is a diamond or it is a heart
  //   black otherwise
  static Colors = ["red", "black"]
  get color() {
    if (this.isASuit("diamonds") || this.isASuit("hearts")) return "red"
    return "black"
  }

  get symbol() {
    if (this.isASuit("clubs")) return "♣"
    if (this.isASuit("diamonds")) return "♦"
    if (this.isASuit("hearts")) return "♥"
    return "♠"
  }

  get name() {
    return core.joined(core.joined(this.rank, "of", " "), this.suit, " ")
  }

  isTheRankOfSuit(rank, suit) {
    return this.rank === rank && this.suit === suit
  }

  /** Its short name:  Q♠↓ is the queen of spades, face down */
  get state() {
    const letter = this.value === 10 ? 10 : `${core.getItemAt(this.rank, 0) ?? ""}`.toLocaleUpperCase()
    const arrow = this.isFaceDirection("up") ? "↑" : "↓"
    return letter + this.symbol + arrow
  }

  /** Its face:  https://www.compart.com/en/unicode/block/U+1F0A0 */
  get picture() {
    let column = this.value
    if (this.isASuit("clubs")) return core.getItemAt(["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], position(column))
    if (this.isASuit("diamonds")) return core.getItemAt(["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], position(column))
    if (this.isASuit("hearts")) return core.getItemAt(["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"], position(column))
    return core.getItemAt(["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], position(column))
  }

  /** Over every card and pile around it while the cheat moves it -- styles.css */
  // - its "lifted" is yes or no
  static { this.declareProp("lifted", { type: "choice" }) }
  get lifted() { return this.getProp("lifted") }
  set lifted(value) { this.setProp("lifted", value) }

  drawFront() {
    return h("ui-text", { color: () => this.color, part: "front" }, () => this.picture)
  }

  drawBack() {
    return h("ui-text", { color: "blue", part: "back" }, "🂠")
  }

  /** what the move scores:  10 on a foundation, 5 from the discards, else nothing */
  countThePointsForCardOnPile(pile) {
    if (pile instanceof Foundation) return 10
    if (this.pile === solitaire.discards) return 5
    return 0
  }

  /** a click plays it */
  async onClick(event) {
    await this.play()
  }

  /** a drag starting clears the last hint */
  onDrag(event) {
    solitaire.hint = ""
  }

  /** dropped where no pile takes it, or Escape pressed:  it slides back, and the score says so */
  onDragCancelled(event) {
    solitaire.hint = " -- Not there"
  }

  static draggable = true

  get pile() {
    return Pile.ownerOf(this)
  }

  async play() {
    if (this.pile === solitaire.stock) {
      await solitaire.playFromTheStock()
      return
    }
    const endPile = core.filter(core.everyThing(Pile), (pile) => core.canTake(pile, this)).firstItem
    if (endPile === undefined) return false
    return await this.putOnPile(endPile)
  }

  async putOnPile(pile) {
    const startPile = this.pile
    if (!core.canGiveUp(startPile, this)) return false
    if (!core.canTake(pile, this)) return false
    const points = this.countThePointsForCardOnPile(pile)
    startPile.startingWith(this).forEach((card) => core.move(card, pile))
    if (startPile instanceof Tableau && !startPile.isEmpty) {
      await core.pauseFor(200, "msec")
      startPile.lastItem?.turnFaceUp()
    }
    solitaire.moves = solitaire.moves + 1
    solitaire.score = solitaire.score + points
    return true
  }

  get clickableWhen() {
    return this.isFaceDirection("up") || this.pile === solitaire.stock
  }

  static clickable = true
}
// Ace is low:  ace = 1 ... king = 13

// What a person, test or console calls it

// One letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css

export function testCardSetup(...args) {
  return sendCall("test_card_setup", args)
}
// -----------
////////////
// ## A deck
////////////
// The 52 cards of a standard deck, ace of clubs first.

export class Deck extends List {
  static instanceType = Card

  /** One of each card, ace of clubs first:  each starts face down, as every two sided view does */
  create() {
    Card.Ranks.forEach((rank) => Card.Suits.forEach((suit) => this.append(new Card({ rank: rank, suit: suit }))))
  }

  /** Its cards' short names, top to bottom */
  get state() {
    const cardNames = new List({ instanceType: "text" })
    this.forEach((card) => cardNames.append(card.state))
    return `deck: ${cardNames}`
  }
}

export function testANewDeck(...args) {
  return sendCall("test_a_new_deck", args)
}
// -----------
/////////////////////
// ## A pile of cards
/////////////////////
// A game's stock, its discards, a column on the table:  the game names its piles, and says what each kind takes.
// Each pile is its own element around its cards' elements, `<solitaire-tableau>` around `<solitaire-card>`s.
// A card dragged over it glows when it would take the card, by its own rules (`droppable`).

export class Pile extends ViewableList {
  static instanceType = Card
  static elementTag = core.defineElement(this, "test-project")

  /** How its cards lie:  on top of each other, or down a column -- styles.css */
  // - its "layout" is one of stacked or vertical
  static Layouts = ["stacked", "vertical"]
  static { this.declareProp("layout", { oneOf: Pile.Layouts }) }
  get layout() { return this.getProp("layout") }
  set layout(value) { this.setProp("layout", value) }

  /** Its last card's:  what the next card goes on */
  get color() {
    if (this.isEmpty) return "none"
    return this.lastItem.color
  }

  /** Its last card's */
  get value() {
    if (this.isEmpty) return 0
    return this.lastItem.value
  }

  /** Its id, then its cards' short names:  stock: Q♠↑ 7♥↓ */
  get state() {
    let summary = `${this.id}:`
    this.forEach((card) => (summary = `${summary} ${card.state}`))
    return summary
  }

  /** while a card it would take is over it, the score shows what the move would add -- gone as the card leaves */
  whileCardDraggedOver(card) {
    const points = card.countThePointsForCardOnPile(this)
    if (core.canTake(this, card) && points > 0) solitaire.hint = ` (+${points})`
  }

  async whenCardDroppedOn(card) {
    await card.putOnPile(this)
  }

  static droppable = true

  static exclusive = true
}

export function testPiles(...args) {
  return sendCall("test_piles", args)
}

/** a card is in one pile at a time:  putting it on another pile takes it off this one */
// -----------
////////////////////////
// ## Klondike Solitaire
////////////////////////
// Deal seven columns, then build four foundations, ace to king, one suit each:
// [wikipedia](https://en.wikipedia.org/wiki/Klondike_(solitaire)) has its rules, and what each pile is called.
// The cards, the deck and the piles are this project's own:  `Card`, `Deck` and `Pile`.

/** The cards not played yet, face down:  a click turns the next one over, so none can be taken from it */
export class StockPile extends Pile {
  static elementTag = core.defineElement(this, "test-project")

  get layout() {
    return "stacked"
  }

  canTake(card) {
    return false
  }

  canGiveUp(card) {
    return false
  }

  drawItsPlaceholder() {
    // A light grey card, face down
    return h("ui-text", { part: "placeholder" }, "🂠")
  }

  /** Empty:  a click turns the discards back over;  a click on one of its cards is the card's */
  async onClick(event) {
    await solitaire.turnAStockCard()
  }
}

/** Where the stock's cards go as they're turned over */
export class DiscardPile extends Pile {
  static elementTag = core.defineElement(this, "test-project")

  get layout() {
    return "stacked"
  }

  canTake(card) {
    return false
  }

  canGiveUp(card) {
    return card === this.lastItem
  }

  static itemsDraggable = true
}

/** Where a suit is built up, ace to king, one card at a time */
export class Foundation extends Pile {
  static elementTag = core.defineElement(this, "test-project")

  get layout() {
    return "stacked"
  }

  // - its "suit" is a card suit
  static { this.declareProp("suit", { oneOf: () => Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

  canGiveUp(card) {
    return false
  }

  drawItsPlaceholder() {
    // A light grey ace of its suit, face up
    return h("ui-text", { part: "placeholder" }, () => (new Card({ rank: "ace", suit: this.suit })).picture)
  }

  canTake(card) {
    if (card !== card.pile.lastItem) return false
    return this.suit === card.suit && this.value + 1 === card.value
  }

  static droppable = true
}

/** A column, built down from king to ace, red and black in turn */
export class Tableau extends Pile {
  static elementTag = core.defineElement(this, "test-project")

  get layout() {
    return "vertical"
  }

  canGiveUp(card) {
    return card.isFaceDirection("up")
  }

  static itemsDraggable = true

  canTake(card) {
    if (this.isEmpty) return card.isARank("king")
    return this.color !== card.color && this.value === card.value + 1
  }

  static droppable = true
}

export class Solitaire extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "score" is a number
  static { this.declareProp("score", { type: "number" }) }
  get score() { return this.getProp("score") }
  set score(value) { this.setProp("score", value) }

  /** The cards played this game:  a stock card turned over isn't one */
  // - its "moves" is a number
  static { this.declareProp("moves", { type: "number" }) }
  get moves() { return this.getProp("moves") }
  set moves(value) { this.setProp("moves", value) }

  /** Said beside the score:  what a drag would add, e.g. (+10), a drop nowhere, a win */
  // - its "hint" is text
  static { this.declareProp("hint", { type: "text" }) }
  get hint() { return this.getProp("hint") }
  set hint(value) { this.setProp("hint", value) }

  /** a change to a property is an event:  each runs just after the change lands */
  onScoreChange(event) {
    /** every card on a foundation:  the game is won */
    let home = this.clubs.length + this.diamonds.length
    home = home + this.hearts.length + this.spades.length
    if (home === 52) this.hint = " -- You won!"
  }

  /** a card played:  the last hint goes */
  onMovesChange(event) {
    this.hint = ""
  }

  // "deck" is a new deck
  static { this.declareProp("deck", { init: () => new Deck({ id: "deck" }), early: true }) }
  get deck() { return this.getProp("deck") }
  set deck(value) { this.setProp("deck", value) }

  // "stock" is a new stock pile
  static { this.declareProp("stock", { init: () => new StockPile({ id: "stock" }), early: true }) }
  get stock() { return this.getProp("stock") }
  set stock(value) { this.setProp("stock", value) }

  // "discards" is a new discard pile
  static { this.declareProp("discards", { init: () => new DiscardPile({ id: "discards" }), early: true }) }
  get discards() { return this.getProp("discards") }
  set discards(value) { this.setProp("discards", value) }

  // "clubs" is a new foundation with suit = clubs
  static { this.declareProp("clubs", { init: () => new Foundation({ id: "clubs", suit: "clubs" }), early: true }) }
  get clubs() { return this.getProp("clubs") }
  set clubs(value) { this.setProp("clubs", value) }

  // "diamonds" is a new foundation with suit = diamonds
  static { this.declareProp("diamonds", { init: () => new Foundation({ id: "diamonds", suit: "diamonds" }), early: true }) }
  get diamonds() { return this.getProp("diamonds") }
  set diamonds(value) { this.setProp("diamonds", value) }

  // "hearts" is a new foundation with suit = hearts
  static { this.declareProp("hearts", { init: () => new Foundation({ id: "hearts", suit: "hearts" }), early: true }) }
  get hearts() { return this.getProp("hearts") }
  set hearts(value) { this.setProp("hearts", value) }

  // "spades" is a new foundation with suit = spades
  static { this.declareProp("spades", { init: () => new Foundation({ id: "spades", suit: "spades" }), early: true }) }
  get spades() { return this.getProp("spades") }
  set spades(value) { this.setProp("spades", value) }

  // "T1" is a new tableau
  static { this.declareProp("T1", { init: () => new Tableau({ id: "T1" }), early: true }) }
  get T1() { return this.getProp("T1") }
  set T1(value) { this.setProp("T1", value) }

  // "T2" is a new tableau
  static { this.declareProp("T2", { init: () => new Tableau({ id: "T2" }), early: true }) }
  get T2() { return this.getProp("T2") }
  set T2(value) { this.setProp("T2", value) }

  // "T3" is a new tableau
  static { this.declareProp("T3", { init: () => new Tableau({ id: "T3" }), early: true }) }
  get T3() { return this.getProp("T3") }
  set T3(value) { this.setProp("T3", value) }

  // "T4" is a new tableau
  static { this.declareProp("T4", { init: () => new Tableau({ id: "T4" }), early: true }) }
  get T4() { return this.getProp("T4") }
  set T4(value) { this.setProp("T4", value) }

  // "T5" is a new tableau
  static { this.declareProp("T5", { init: () => new Tableau({ id: "T5" }), early: true }) }
  get T5() { return this.getProp("T5") }
  set T5(value) { this.setProp("T5", value) }

  // "T6" is a new tableau
  static { this.declareProp("T6", { init: () => new Tableau({ id: "T6" }), early: true }) }
  get T6() { return this.getProp("T6") }
  set T6(value) { this.setProp("T6", value) }

  // "T7" is a new tableau
  static { this.declareProp("T7", { init: () => new Tableau({ id: "T7" }), early: true }) }
  get T7() { return this.getProp("T7") }
  set T7(value) { this.setProp("T7", value) }

  /** Every card of the deck into the stock */
  create() {
    this.deck.forEach((card) => this.stock.append(card))
  }

  /** The discards, turned over, back into the stock */
  resetTheStock() {
    const cards = this.discards.clone()
    cards.reverse()
    cards.forEach((card) => {
      this.stock.append(card)
      card.turnFaceDown()
    })
  }

  /** Turn the stock's next card over, onto the discards:  the discards back into the stock when it's empty */
  async playFromTheStock() {
    if (this.stock.isEmpty) this.resetTheStock()
    const it = this.stock.lastItem
    it?.turnFaceUp()
    // as long as its flip takes (styles.css), so it turns over before it moves
    await core.pauseFor(300, "msec")
    this.discards.append(it)
  }

  /** Gather every card into the stock, shuffle it, and deal the tableaus:  one card more in each, left to right */
  async dealTheCards() {
    for (const card of this.deck) {
      const startPile = card.pile
      card.turnFaceDown()
      if (startPile !== this.stock) {
        this.stock.append(card)
        await core.pauseFor(50, "msec")
      }
    }
    this.stock.randomize()
    // each row's first card lands face down, then turns up where it lies
    for (const row of core.getRange(1, 7)) {
      for (const column of core.getRange(row, 7)) {
        core.getItemAt(core.everyThing(Tableau), position(column))?.append(this.stock.lastItem)
        if (column === row) core.getItemAt(core.everyThing(Tableau), position(column))?.lastItem?.turnFaceUp()
        await core.pauseFor(50, "msec")
      }
    }
    await this.playFromTheStock()
  }

  draw() {
    return [
      h("ui-segment", { inverted: true, attach: "top" },
        h("ui-toolbar", { class: "GameBar", "aria-label": "Game" },
          h("ui-text", { slot: "title", size: "large", heavy: true }, "Solitaire"),
          h("ui-buttons", { slot: "center", padding: "compact" },
            core.drawAction(this, "autoPlay"),
            core.drawAction(this, "cheat"),
            core.drawAction(this, "restartTheGame")
          ),
          h("ui-buttons", { slot: "center", padding: "compact" },
            core.drawAction(this, "undo", { "icon-only": true }),
            core.drawAction(this, "redo", { "icon-only": true })
          ),
          h("ui-text", { slot: "right" },
            "Moves: ",
            () => this.moves,
            "  ·  Score: ",
            () => this.score,
            () => this.hint
          )
        )
      ),
      h("ui-container",
        h("ui-segment", { appearance: "basic" },
          h("ui-grid", { columns: "7", spacing: "xs" },
            core.drawContextMenu(this, ["autoPlay", "cheat", "restartTheGame", "-", "undo", "redo"]),
            h("test-project-stock-pile", { id: "stock" }),
            h("test-project-discard-pile", { id: "discards" }),
            h("ui-column"),
            h("test-project-foundation", { id: "clubs" }),
            h("test-project-foundation", { id: "diamonds" }),
            h("test-project-foundation", { id: "hearts" }),
            h("test-project-foundation", { id: "spades" }),
            h("test-project-tableau", { id: "T1" }),
            h("test-project-tableau", { id: "T2" }),
            h("test-project-tableau", { id: "T3" }),
            h("test-project-tableau", { id: "T4" }),
            h("test-project-tableau", { id: "T5" }),
            h("test-project-tableau", { id: "T6" }),
            h("test-project-tableau", { id: "T7" })
          )
        )
      )
    ]
  }

  async turnAStockCard() {
    await this.playFromTheStock()
  }

  async restartTheGame() {
    this.score = 0
    this.moves = 0
    this.hint = ""
    await this.dealTheCards()
  }

  async autoPlay() {
    let anythingChanged = false
    if (!this.discards.isEmpty) {
      const testCard = this.discards.lastItem
      if (await testCard?.play()) {
        anythingChanged = true
        await core.pauseFor(500, "msec")
      }
    }
    // each tableau's last card onto its foundation
    await core.forEachSequential(core.everyThing(Tableau), async (pile) => {
      if (pile.isEmpty) return
      const testCard = pile.lastItem
      const foundation = core.filter(core.everyThing(Foundation), (pile) => pile.suit === testCard.suit).firstItem
      if (core.canTake(foundation, testCard)) {
        anythingChanged = true
        await testCard.play()
        await core.pauseFor(100, "msec")
      }
    })
    // each tableau's face-up cards, all together, onto another tableau
    await core.forEachSequential(core.everyThing(Tableau), async (pile) => {
      const faceUpCards = pile.filter((card) => card.isFaceDirection("up"))
      if (faceUpCards.isEmpty) return
      const testCard = faceUpCards.firstItem
      if (testCard.isARank("king") && testCard === pile.firstItem) return
      if (await testCard.play()) {
        anythingChanged = true
        await core.pauseFor(500, "msec")
      }
    })
    if (anythingChanged) await this.autoPlay()
  }

  async cheat() {
    const remainingPiles = core.filter(core.everyThing(Tableau), (pile) => !pile.isEmpty && pile.firstItem?.isFaceDirection("down"))
    if (core.isEmpty(remainingPiles)) return
    const pile = core.randomItemOf(remainingPiles)
    const card = pile?.filter((card) => card.isFaceDirection("down"))?.randomItem()
    // over every card around it, then turned face up as it moves onto the discards
    card.lifted = true
    card?.turnFaceUp()
    this.discards.append(card)
    await core.pauseFor(300, "msec")
    card.lifted = false
  }
}
export let solitaire

// One of each, made with the solitaire

// Each pauses a moment, so a deal animates
/** A click on the empty stock:  one step to undo, where the deal's own turn isn't */
core.describeAction(Solitaire, "turnAStockCard", { title: "Turn A Stock Card", undoneAs: "Turn Card" })

// Its moves:  the toolbar's buttons, its keys, and the board's right click;  each says its title once, for all three
core.describeAction(Solitaire, "restartTheGame", { title: "Restart", shortcuts: ["N"], undoneAs: "Restart" })
/** Play every card that can go somewhere, until none can */
core.describeAction(Solitaire, "autoPlay", { title: "Auto Play", shortcuts: ["A"], undoneAs: "Auto Play" })
/** Turn up a face-down card from a tableau, at random, onto the discards */
core.describeAction(Solitaire, "cheat", { title: "Cheat", shortcuts: ["C"], undoneAs: "Cheat" })

////////////////////
// ## Playing a card
////////////////////
// What a click or a drag does:  the card's own moves, and each pile's, as the game plays them.

/**
 * the card, and every card on it, onto the first pile that takes it;  it says whether it moved
 * - the stock's card turns over onto the discards instead
 */
core.describeAction(Card, "play", { title: "Play A Card", undoneAs: "Play Card" })

/**
 * the card, and every card on it, onto the pile, if the piles' rules let it go and take it;  it says whether it moved
 * - the pile it left turns its new last card up;  the move counts, and scores
 */
core.describeAction(Card, "putOnPile", { title: "Put A Card On A Pile", undoneAs: "Move Card" })

// each card's events, and when it may be clicked:  the Inspector lists them, as written here
// only a card face up, or the stock's, can be clicked:  the others show no pointer

///////////////
// ## The piles
///////////////
// Each kind of pile, what it may take or give up, and how it lies.
// While one's empty, it shows its placeholder, if it has one.

/** only its top card may be picked up */

/** one card at a time, the last of its pile:  its suit, one higher */

/** its face-up cards may be picked up, with every card on them */
/** a king onto an empty one;  else one lower, in the other color */

export function testTheMoves(...args) {
  return sendCall("test_the_moves", args)
}

// -----------
core.installStyles(undefined, `/* File styles.css:  what no attribute draws -- the felt, the toolbar's middle, and the cards and piles.¬   - The toolbar's bar, the board's grid and its spacing are their components' attributes (Solitaire.spell).¬   - A card is one letter of unicode's Playing Cards, as wide as its pile:  no <ui-*> tag draws one.¬   - A pile is styled by its layout (<solitaire-tableau layout="vertical">), each card in it by its place:¬     --index from 0, of --count;  an empty pile's placeholder by its part, ::part(placeholder). */¬¬/* A card's letter, in ems (measured in Chrome on a Mac):  0.604em wide, 0.805em tall, its left edge 0.049em in,¬   with 0.008em to spare above and below */¬:root,¬:host {¬  --card-width: 0.604;¬  /* its height, in widths:  (0.805 + 2 x 0.008) / 0.604 */¬  --card-height: 1.359;¬  /* down a column, how much of each card shows under the next:  its rank and suit */¬  --card-step-down: 0.2;¬}¬¬/* The table:  green felt, as on a casino's card table */¬solitaire-app {¬  display: block;¬  min-height: 100%;¬  border-radius: 12px;¬  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;¬}¬¬/* The toolbar:  its buttons in the true middle, the title and the score taking equal room on either side;¬   in pills (no attribute rounds a joined group:  \`circular\` parts its buttons) */¬.GameBar::part(title),¬.GameBar::part(right) {¬  flex: 1 1 0;¬}¬.GameBar::part(right) {¬  justify-content: flex-end;¬}¬ui-buttons {¬  --ui-button-radius: var(--ui-radius-pill);¬}¬/* a phone:  no title, and the score on a line of its own, so every button keeps its name */¬@media (width < 36rem) {¬  .GameBar::part(toolbar) {¬    flex-wrap: wrap;¬    justify-content: center;¬  }¬  .GameBar::part(title) {¬    display: none;¬  }¬  .GameBar::part(right) {¬    flex: 1 0 100%;¬    justify-content: center;¬  }¬}¬¬/* A pile:  as wide as its cell of the board, as tall as its cards */¬[layout] {¬  display: flow-root;¬  position: relative;¬  container-type: inline-size;¬  /* its top card glows when a dragged card would land on it (below), not the whole pile */¬  --spell-drop-glow: none;¬}¬/* its height, a floated sizer:  a padding's percentage is one of its width */¬[layout]::before {¬  content: "";¬  float: left;¬  width: 100%;¬  padding-top: calc(100% * var(--card-height));¬}¬¬/* Each card in a pile, and its placeholder:  a letter as wide as the pile, cut to the card it draws */¬[layout] > *,¬[layout]::part(placeholder) {¬  position: absolute;¬  display: block;¬  font-size: calc(100cqi / var(--card-width));¬}¬/* a card in no pile (one added to the table in the editor):  a column's usual width */¬solitaire-card:not([layout] > *) {¬  position: relative;¬  display: inline-block;¬  font-size: calc(6rem / var(--card-width));¬}¬[layout] > *,¬solitaire-card,¬[layout]::part(placeholder) {¬  width: calc(var(--card-width) * 1em);¬  height: calc(var(--card-width) * var(--card-height) * 1em);¬  overflow: hidden;¬  /* the font that draws the cards, so a theme's font never moves them */¬  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;¬  /* the face hugs the ink:  Apple Symbols' ink starts 0.917em down a line */¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  line-height: 0.917;¬  --ui-text-line-height: 0.917;¬  text-indent: -0.049em;¬  user-select: none;¬}¬¬/* A card:  a two sided view (Card.spell), its sides turning in 3D, so it cuts nothing itself;¬   a real deck's inks in every theme and scheme */¬[layout] > *,¬solitaire-card {¬  overflow: visible;¬  --spell-turn-perspective: 3em;¬  color-scheme: light;¬  --ui-red-text: #c8102e;¬  --ui-black-text: #1a1a1a;¬  --ui-blue-text: #2f6fd6;¬}¬/* each side:  its letter cut to the card, on a white face with the letter's rounded corners */¬[layout] > *::part(front),¬[layout] > *::part(back),¬solitaire-card::part(front),¬solitaire-card::part(back) {¬  display: block;¬  position: absolute;¬  inset: 0;¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  overflow: hidden;¬  background: #fff;¬  background-clip: content-box;¬  border-radius: 0.035em;¬}¬¬/* Moving:  the cheat's card is "lifted" over every card around it, and turns face up as it goes to the discards¬   (the game pauses 0.3s for it:  Solitaire.spell) */¬[layout] > * {¬  transition:¬    transform 0.3s ease-in-out,¬    translate 0.3s ease-out;¬}¬[layout] > [lifted] {¬  z-index: 5;¬}¬[layout] > [lifted][direction="up"] {¬  @starting-style {¬    transform: perspective(var(--spell-turn-perspective, 100em)) rotateY(180deg);¬  }¬}¬@media (prefers-reduced-motion: reduce) {¬  [layout] > * {¬    transition: none;¬  }¬}¬¬/* An empty pile's placeholder:  a faint pale card on the felt */¬[layout]::part(placeholder) {¬  color: #d8f0e0;¬  opacity: 0.4;¬}¬[layout]::part(placeholder):hover {¬  opacity: 0.5;¬}¬¬/* Dropping:  where a dragged card would land glows -- the pile's top card, or its placeholder¬   (:state(accepting-drop), set by the pile's rules) */¬[layout]:state(accepting-drop) > :last-child,¬[layout]:state(accepting-drop)::part(placeholder) {¬  opacity: 1;¬  border-radius: 0.035em;¬  box-shadow:¬    0 0 0 0.012em rgb(150 80 255 / 0.85),¬    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);¬}¬¬/* The layouts:  stacked puts every card on top of the one before;  vertical, each a step below it */¬[layout="vertical"]::before {¬  padding-top: calc(100% * var(--card-height) * (1 + (max(var(--count, 1), 1) - 1) * var(--card-step-down)));¬}¬[layout="vertical"] > * {¬  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));¬}¬`)
// -----------

// -----------

/** Binds each thing the program keeps, from Python's state. */
export function adopt(state) {
  solitaire = state["solitaire"]
}

