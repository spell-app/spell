import { core, List, App, View, TwoSidedView, ViewableList, h, positionOf, spellPosition, position } from "@spell/core"

export class Card extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  static Ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"]
  static { this.declareProp("rank", { oneOf: Card.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }

  static Suits = ["clubs", "diamonds", "hearts", "spades"]
  static { this.declareProp("suit", { oneOf: Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

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

  isTheRankOfSuit(rank, suit) {
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

  get shorthand() {
    const letter = this.value === 10 ? 10 : `${core.getItemAt(this.rank, 0) ?? ""}`.toLocaleUpperCase()
    const arrow = this.isFaceDirection("up") ? "↑" : "↓"
    return letter + this.symbol + arrow
  }

  drawFront() {
    return h("test-project-card-image", { "prop:card": this, part: "front" })
  }

  drawBack() {
    return h("test-project-card-image", { direction: () => "down", part: "back" })
  }

  moveToPile(pile) {

    if (!core.canGiveUp(this.pile, this) || !core.canTake(pile, this)) core.cancel()
    this.pile.startingWith(this).forEach((card) => pile.append(card))
  }

  get isOnTop() {
    return this === this.pile.lastItem
  }

  get isOnBottom() {
    return this === this.pile.firstItem
  }

  async play() {
    if (this.pile === solitaire.stock) {
      core.play("card slide")
      await solitaire.turnOverTheNextCard()
    } else {
      const endPile = core.filter(core.everyThing(Pile), (pile) => core.canTake(pile, this)).firstItem
      if (endPile === undefined) return false
      return this.moveToPile(endPile)
    }
  }

  afterMoveToPile(pile) {
    core.play("card place")
    solitaire.score = solitaire.score + this.thePointsForCardOnPile(pile)
    const it2 = this.lastPile
    if (it2 instanceof Column && !it2.isEmpty) it2.lastItem?.turnFaceUp()
  }

  thePointsForCardOnPile(pile) {
    if (pile instanceof Foundation) return 10
    if (this.lastPile === solitaire.discardPile) return 5
    return 0
  }

  async onClick(event) {
    if (this.isFaceDirection("up") || this.pile === solitaire.stock) core.answered(await this.play())
  }

  static draggable = true

  get pile() {
    return Pile.ownerOf(this)
  }

  get lastPile() {
    return Pile.lastOwnerOf(this)
  }
}
core.describeAction(Card, "moveToPile", { title: "Move Card to Pile", cancels: true, undoneAs: "Move Card to Pile" })
core.addAfterHook(Card, "moveToPile", { hook: "afterMoveToPile" })
core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })

export class CardImage extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("card", { type: "Card" }) }
  get card() { return this.getProp("card") }
  set card(value) { this.setProp("card", value) }

  static { this.declareProp("rank", { oneOf: () => Card.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }

  static { this.declareProp("suit", { oneOf: () => Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

  static Directions = ["up", "down"]
  static { this.declareProp("direction", { oneOf: CardImage.Directions }) }
  get direction() { return this.getProp("direction") }
  set direction(value) { this.setProp("direction", value) }

  isFaceDirection(direction) {
    return this.direction === direction
  }

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

  get picture() {
    if (this.isFaceDirection("down")) return "🂠"
    const column = this.card?.value
    if (this.card?.suit === "clubs") return core.getItemAt(["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], position(column))
    if (this.card?.suit === "diamonds") return core.getItemAt(["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], position(column))
    if (this.card?.suit === "hearts") return core.getItemAt(["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"], position(column))
    return core.getItemAt(["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], position(column))
  }

  draw() {
    return h("ui-text", { color: () => this.color }, () => this.picture)
  }
}

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
    core.expect(it2.shorthand, `its shorthand`, "Q♠↓", `"Q♠↓"`)
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
    core.expect(it2.shorthand, `its shorthand`, "Q♠↑", `"Q♠↑"`)

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
    core.expect(seven.card?.name, `the name of seven's card`, "7 of hearts", `"7 of hearts"`)
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
export class Pile extends ViewableList {
  static instanceType = Card
  static elementTag = core.defineElement(this, "test-project")

  static Layouts = ["stacked", "vertical"]
  static { this.declareProp("layout", { oneOf: Pile.Layouts }) }
  get layout() { return this.getProp("layout") }
  set layout(value) { this.setProp("layout", value) }

  get color() {
    if (this.isEmpty) return "none"
    return this.lastItem.color
  }

  get value() {
    if (this.isEmpty) return 0
    return this.lastItem.value
  }

  get shorthand() {
    let summary = `${this.id}:`
    this.forEach((card) => (summary = `${summary} ${card.shorthand}`))
    return summary
  }

  whenCardDroppedOn(card) {
    card.moveToPile(this)
  }

  static droppable = true

  static exclusive = true
}

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
    core.expect(stock.shorthand, `stock's shorthand`, "stock: Q♠↑ 7♥↓", `"stock: Q♠↑ 7♥↓"`)

    const discards = new Pile({ id: "discards" })
    core.echoTestAction(`get the top card of the stock`)
    const it = stock.lastItem
    core.echoTestAction(`add it to the discards`)
    discards.append(it)
    core.expect(it?.pile === discards, `its pile is the discards`, true, `yes`)
    core.expect(stock.length, `the number of cards in the stock`, 1, `1`)
    core.expect(discards.shorthand, `the discards' shorthand`, "discards: 7♥↓", `"discards: 7♥↓"`)
  })
}
// -----------
export class Deck extends ViewableList {
  static instanceType = Card
  static elementTag = core.defineElement(this, "test-project")

  create() {
    Card.Ranks.forEach((rank) => Card.Suits.forEach((suit) => this.append(new Card({ rank: rank, suit: suit }))))
  }

  get shorthand() {
    return `deck: ${core.mapToList(this, (card) => card.shorthand)}`
  }
}

export function testANewDeck() {
  return core.test("test a new deck", function testANewDeck() {
    const it = new Deck()
    core.echoTestAction(`the deck is a new deck`)
    const deck = new Deck()
    core.expect(deck.length, `the number of cards in the deck`, 52, `52`)
    core.expect(deck.filter((card) => card.rank === "queen").length, `the number of (cards in the deck where it is a queen)`, 4, `4`)
    core.expect(deck.firstItem?.shorthand, `deck's first card's shorthand`, "A♣↓", `"A♣↓"`)
    core.expect(deck.lastItem?.name, `deck's last card's name`, "king of spades", `"king of spades"`)
    core.echoTestAction(`shuffle the deck`)
    deck.randomize()
    core.expect(deck.length, `the number of cards in the deck`, 52, `52`)
  })
}
// -----------
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
    return h("test-project-card-image", { direction: () => "down", part: "placeholder" })
  }

  async onClick(event) {
    await solitaire.turnOverTheNextCard()
  }
}

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

export class Foundation extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout() {
    return "stacked"
  }

  static { this.declareProp("suit", { oneOf: () => Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

  canGiveUp(card) {
    return false
  }

  drawItsPlaceholder() {
    return h("test-project-card-image", { rank: () => "ace", "prop:suit": () => this.suit, part: "placeholder" })
  }

  canTake(card) {
    return this.suit === card.suit && this.value === card.value - 1 && card.isOnTop
  }

  static droppable = true
}

export class Column extends Pile {
  static elementTag = core.defineElement(this, "test-project")
  get layout() {
    return "vertical"
  }

  canGiveUp(card) {
    return card.isFaceDirection("up")
  }

  static itemsDraggable = true

  canTake(card) {
    return (this.isEmpty && card.rank === "king") || (this.color !== card.color && this.value === card.value + 1)
  }

  static droppable = true
}

export class Solitaire extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  create() {
    this.deck.forEach((card) => this.stock.append(card))
    core.holdWhile(() => this.dealTheCards())
  }

  draw() {
    return [
      h("ui-segment", { inverted: true, "attach-to": "top" },
        h("ui-toolbar", { size: "small", appearance: "pills", inverted: true, shrinkable: true },
          h("ui-text", { size: "big", slot: "title", heavy: true }, "Spell Solitaire"),
          core.drawAction(this, "autoPlay", { "in-menu": true }),
          core.drawAction(this, "cheat", { "in-menu": true }),
          core.drawAction(this, "dealTheCards", { title: "Restart", "in-menu": true }),
          h("spacer"),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true }),
          h("ui-text", { slot: "right" },
            h("b", "Score"),
            ": ",
            () => this.score
          )
        )
      ),
      h("ui-container", { columns: "7", padding: "small", spacing: "xs" },
        h("test-project-stock-pile", { id: "stock" }),
        h("test-project-discard-pile", { id: "discard-pile" }),
        h("spacer"),
        h("test-project-foundation", { id: "clubs" }),
        h("test-project-foundation", { id: "diamonds" }),
        h("test-project-foundation", { id: "hearts" }),
        h("test-project-foundation", { id: "spades" }),
        h("test-project-column", { id: "C2" }),
        h("test-project-column", { id: "C3" }),
        h("test-project-column", { id: "C1" }),
        h("test-project-column", { id: "C4" }),
        h("test-project-column", { id: "C5" }),
        h("test-project-column", { id: "C6" }),
        h("test-project-column", { id: "C7" })
      ),
      h("ui-modal", { id: "you-won", heading: "you won" },
        h("ui-content",
          h("ui-text", { size: "big" }, "Congratulations!"),
          h("ui-text", "Your score:  ", () => this.score)
        ),
        h("ui-actions",
          core.drawAction(this, "dealTheCards", { title: "New game", answer: "deal the cards", "in-dialog": true })
        )
      ),
      core.drawContextMenu(this, ["autoPlay", "cheat", "dealTheCards", "-", "undo", "redo"])
    ]
  }
  static { this.declareProp("deck", { init: () => new Deck({ id: "deck" }), early: true }) }
  get deck() { return this.getProp("deck") }
  set deck(value) { this.setProp("deck", value) }
  static { this.declareProp("score", { type: "number" }) }
  get score() { return this.getProp("score") }
  set score(value) { this.setProp("score", value) }
  static { this.declareProp("stock", { init: () => new StockPile({ id: "stock" }), early: true }) }
  get stock() { return this.getProp("stock") }
  set stock(value) { this.setProp("stock", value) }
  static { this.declareProp("discardPile", { init: () => new DiscardPile({ id: "discard-pile" }), early: true }) }
  get discardPile() { return this.getProp("discardPile") }
  set discardPile(value) { this.setProp("discardPile", value) }
  static { this.declareProp("clubs", { init: () => new Foundation({ id: "clubs", suit: "clubs" }), early: true }) }
  get clubs() { return this.getProp("clubs") }
  set clubs(value) { this.setProp("clubs", value) }
  static { this.declareProp("diamonds", { init: () => new Foundation({ id: "diamonds", suit: "diamonds" }), early: true }) }
  get diamonds() { return this.getProp("diamonds") }
  set diamonds(value) { this.setProp("diamonds", value) }
  static { this.declareProp("hearts", { init: () => new Foundation({ id: "hearts", suit: "hearts" }), early: true }) }
  get hearts() { return this.getProp("hearts") }
  set hearts(value) { this.setProp("hearts", value) }
  static { this.declareProp("spades", { init: () => new Foundation({ id: "spades", suit: "spades" }), early: true }) }
  get spades() { return this.getProp("spades") }
  set spades(value) { this.setProp("spades", value) }
  static { this.declareProp("C2", { init: () => new Column({ id: "C2" }), early: true }) }
  get C2() { return this.getProp("C2") }
  set C2(value) { this.setProp("C2", value) }
  static { this.declareProp("C3", { init: () => new Column({ id: "C3" }), early: true }) }
  get C3() { return this.getProp("C3") }
  set C3(value) { this.setProp("C3", value) }
  static { this.declareProp("C1", { init: () => new Column({ id: "C1" }), early: true }) }
  get C1() { return this.getProp("C1") }
  set C1(value) { this.setProp("C1", value) }
  static { this.declareProp("C4", { init: () => new Column({ id: "C4" }), early: true }) }
  get C4() { return this.getProp("C4") }
  set C4(value) { this.setProp("C4", value) }
  static { this.declareProp("C5", { init: () => new Column({ id: "C5" }), early: true }) }
  get C5() { return this.getProp("C5") }
  set C5(value) { this.setProp("C5", value) }
  static { this.declareProp("C6", { init: () => new Column({ id: "C6" }), early: true }) }
  get C6() { return this.getProp("C6") }
  set C6(value) { this.setProp("C6", value) }
  static { this.declareProp("C7", { init: () => new Column({ id: "C7" }), early: true }) }
  get C7() { return this.getProp("C7") }
  set C7(value) { this.setProp("C7", value) }

  async dealTheCards() {
    this.score = 0
    this.deck.forEach((card) => core.meanwhile(() => card.turnFaceDown()))
    await core.forEachSequential(core.filter(core.everyThing(Card), (card) => card.pile !== this.stock), async (card) => {
      core.meanwhile(() => this.stock.append(card))
      await core.pauseFor(10, "msec")
    })
    this.stock.randomize()
    for (const row of core.getRange(1, 7)) {
      for (const column of core.getRange(row, 7)) {
        core.getItemAt(core.everyThing(Column), position(column))?.append(this.stock.lastItem)
        await core.pauseFor(20, "msec")
        if (column === row) core.getItemAt(core.everyThing(Column), position(column))?.lastItem?.turnFaceUp()
      }
    }
    await this.turnOverTheNextCard()
  }

  async turnOverTheNextCard() {
    if (this.stock.isEmpty) this.resetTheStockPile()
    const nextCard = this.stock.lastItem
    nextCard?.turnFaceUp()
    await core.pauseFor(300, "msec")
    this.discardPile.append(nextCard)
  }

  resetTheStockPile() {
    const cards = this.discardPile.clone()
    cards.reverse()
    cards.forEach((card) => this.stock.append(card))
    this.stock.forEach((card) => card.turnFaceDown())
  }

  async autoPlay() {
    const candidates = core.mergeLists([
      this.discardPile.filter((card) => card.isOnTop),
      core.pickFromEach(core.everyThing(Column), (column) => column.lastItem),
      core.pickFromEach(core.everyThing(Column), (column) => column.filter((card) => card.isFaceDirection("up")).firstItem)
    ], List)

    candidates.removeWhere((card) => card.rank === "king" && card.isOnBottom)

    for (const card of candidates) {
      const pile = core.filter(core.everyThing(Pile), (pile) => core.canTake(pile, card) && pile !== card.lastPile).firstItem

      if (pile !== undefined) {
        core.answered(await card.play())
        await core.pauseFor(500, "msec")
        await this.autoPlay()
        return
      }
    }
  }

  cheat() {
    const card = core.randomItemOf(core.filter(core.mergeLists(core.everyThing(Column)), (card) => card.isFaceDirection("down")))
    if (card !== undefined) {
      this.discardPile.append(card)
      card?.turnFaceUp()
    }
  }

  async onScoreChange(event) {
    if (core.itemCountOf(core.mergeLists(core.everyThing(Foundation))) === 52) {
      core.play("win")
      await core.showDrawn("you won")
    }
  }
}
export const solitaire = new Solitaire()
core.describeAction(Solitaire, "dealTheCards", { title: "Deal the Cards", shortcuts: ["R"], icon: "sync alternate", undoneAs: "Deal the Cards" })
core.describeAction(Solitaire, "turnOverTheNextCard", { title: "Turn Over the Next Card", undoneAs: "Turn Card" })
core.describeAction(Solitaire, "resetTheStockPile", { title: "Reset the Stock Pile", undoneAs: "Reset the Stock Pile" })
core.describeAction(Solitaire, "autoPlay", { title: "Auto Play", shortcuts: ["A"], icon: "play", undoneAs: "Auto Play" })
core.describeAction(Solitaire, "cheat", { title: "Cheat", shortcuts: ["C"], icon: "eye", undoneAs: "Cheat" })

export function testTheMoves() {
  return core.test("test the moves", function testTheMoves() {
    core.echoTestAction(`set the column to a new column with id "Test1"`)
    const column = new Column({ id: "Test1" })
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

    core.expect(core.canTake(column, queen), `the column can take the queen`, false, `no`)
    core.expect(core.canTake(column, king), `the column can take the king`, true, `yes`)
    core.echoTestAction(`add the king to the column`)
    column.append(king)
    core.expect(core.canTake(column, jack), `the column can take the jack`, false, `no`)
    core.expect(core.canTake(column, queen), `the column can take the queen`, true, `yes`)
    core.echoTestAction(`add the queen to the column`)
    column.append(queen)
    core.expect(column.shorthand, `the shorthand of the column`, "Test1: K♠↑ Q♥↑", `"Test1: K♠↑ Q♥↑"`)
    core.expect(core.canGiveUp(column, queen), `the column can give up the queen`, true, `yes`)
    core.echoTestAction(`turn the queen face down`)
    queen.turnFaceDown()
    core.expect(core.canGiveUp(column, queen), `the column can give up the queen`, false, `no`)

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
    core.echoTestAction(`add the two to the column`)
    column.append(two)
    core.echoTestAction(`add the ace to the column`)
    column.append(ace)
    core.expect(core.canTake(foundation, two), `the foundation can take the two`, false, `no`)
    core.expect(core.canTake(foundation, ace), `the foundation can take the ace`, true, `yes`)
    core.echoTestAction(`move the ace to the foundation`)
    ace.moveToPile(foundation)
    core.expect(core.canTake(foundation, two), `the foundation can take the two`, true, `yes`)
    core.expect(core.canTake(foundation, queen), `the foundation can take the queen`, false, `no`)
  })
}
// -----------
core.installStyles(undefined, `/* File styles.css:  what no attribute draws -- the felt, the toolbar's middle, and the cards and piles.¬   - The toolbar's bar, the board's grid and its spacing are their components' attributes (Solitaire.spell).¬   - A card is one letter of unicode's Playing Cards, as wide as its pile:  no <ui-*> tag draws one.¬   - A pile is styled by its layout (<solitaire-column layout="vertical">), each card in it by its place:¬     --index from 0, of --count;  an empty pile's placeholder by its part, ::part(placeholder). */¬¬/* A card's letter, in ems (measured in Chrome on a Mac):  0.604em wide, 0.805em tall, its left edge 0.049em in,¬   with 0.008em to spare above and below */¬:root,¬:host {¬  --card-width: 0.604;¬  /* its height, in widths:  (0.805 + 2 x 0.008) / 0.604 */¬  --card-height: 1.359;¬  /* down a column, how much of each card shows under the next:  its rank and suit */¬  --card-step-down: 0.2;¬  /* the most cards a column can hold:  six face down, then a king to an ace face up */¬  --longest-column: 19;¬}¬¬/* The table:  green felt, as on a casino's card table */¬solitaire-app {¬  display: block;¬  min-height: 100%;¬  border-radius: 12px;¬  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;¬}¬¬/* A pile:  as wide as its cell of the board, as tall as its cards */¬[layout] {¬  display: flow-root;¬  position: relative;¬  container-type: inline-size;¬  /* its top card glows when a dragged card would land on it (below), not the whole pile */¬  --spell-drop-glow: none;¬}¬/* its height, a floated sizer:  a padding's percentage is one of its width */¬[layout]::before {¬  content: "";¬  float: left;¬  width: 100%;¬  padding-top: calc(100% * var(--card-height));¬}¬¬/* Each card in a pile, and its placeholder:  a letter as wide as the pile, cut to the card it draws */¬[layout] > *,¬[layout]::part(placeholder) {¬  position: absolute;¬  display: block;¬  font-size: calc(100cqi / var(--card-width));¬}¬/* a card in no pile (one added to the table in the editor):  a column's usual width, face up till it's turned */¬solitaire-card:not([layout] > *) {¬  position: relative;¬  display: inline-block;¬  font-size: calc(6rem / var(--card-width));¬}¬solitaire-card:not([layout] > *):not([direction]) {¬  transform: perspective(3em) rotateY(0deg);¬}¬[layout] > *,¬solitaire-card,¬[layout]::part(placeholder) {¬  width: calc(var(--card-width) * 1em);¬  height: calc(var(--card-width) * var(--card-height) * 1em);¬  overflow: hidden;¬  /* the font that draws the cards, so a theme's font never moves them */¬  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;¬  /* the face hugs the ink:  Apple Symbols' ink starts 0.917em down a line */¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  line-height: 0.917;¬  --ui-text-line-height: 0.917;¬  text-indent: -0.049em;¬  user-select: none;¬}¬¬/* A card:  a two sided view (Card.spell), its sides turning in 3D, so it cuts nothing itself;¬   a real deck's inks in every theme and scheme */¬[layout] > *,¬solitaire-card {¬  overflow: visible;¬  --spell-turn-perspective: 3em;¬  color-scheme: light;¬  --ui-red-text: #c8102e;¬  --ui-black-text: #1a1a1a;¬  --ui-blue-text: #2f6fd6;¬}¬/* each side:  its letter cut to the card, on a white face with the letter's rounded corners */¬[layout] > *::part(front),¬[layout] > *::part(back),¬solitaire-card::part(front),¬solitaire-card::part(back) {¬  display: block;¬  position: absolute;¬  inset: 0;¬  box-sizing: border-box;¬  padding-block: 0.008em;¬  overflow: hidden;¬  background: #fff;¬  background-clip: content-box;¬  border-radius: 0.035em;¬}¬¬/* Turning over and moving ease, as a card is turned and slid */¬[layout] > * {¬  transition:¬    transform 0.3s ease-in-out,¬    translate 0.3s ease-out;¬}¬@media (prefers-reduced-motion: reduce) {¬  [layout] > * {¬    transition: none;¬  }¬}¬¬/* An empty pile's placeholder:  a faint pale card on the felt, whatever the card image's own ink */¬[layout]::part(placeholder) {¬  color: #d8f0e0;¬  --ui-red-text: currentColor;¬  --ui-black-text: currentColor;¬  --ui-blue-text: currentColor;¬  opacity: 0.4;¬}¬[layout]::part(placeholder):hover {¬  opacity: 0.5;¬}¬¬/* Dropping:  where a dragged card would land glows -- the pile's top card, or its placeholder¬   (:state(accepting-drop), set by the pile's rules) */¬[layout]:state(accepting-drop) > :last-child,¬[layout]:state(accepting-drop)::part(placeholder) {¬  opacity: 1;¬  border-radius: 0.035em;¬  box-shadow:¬    0 0 0 0.012em rgb(150 80 255 / 0.85),¬    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);¬}¬¬/* The layouts:  stacked puts every card on top of the one before;  vertical, each a step below it,¬   its column always as tall as the longest it can be, so the board never grows as it fills */¬[layout="vertical"]::before {¬  padding-top: calc(¬    100% * var(--card-height) * (1 + (max(var(--count, 1), var(--longest-column)) - 1) * var(--card-step-down))¬  );¬}¬[layout="vertical"] > * {¬  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));¬}¬¬/* On a phone (Spell's phone:  a finger on a small screen), the game takes the whole width:¬   the bar half as tall, its title half as big, so the actions' icons fit beside it;¬   the board 4px inside the felt, with 4px between its piles */¬@media (pointer: coarse) and ((width < 600px) or (height < 600px)) {¬  solitaire-app > ui-segment {¬    --ui-segment-padding: 4px 8px;¬    --ui-text-size-big: 1;¬    --ui-menu-min-height: 0;¬    --ui-toolbar-pill-item-padding: 0.3em 0.4em;¬    --ui-menu-item-min: 24px;¬  }¬  solitaire-app > ui-container {¬    --ui-container-mobile-gutter: 0;¬    --ui-container-lightly-padded: 4px;¬    --ui-grid-very-compact-gutter: 4px;¬    --ui-grid-very-compact-row-spacing: 4px;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) solitaire.start()
// -----------
if (!core.isCarryingOver) testCardSetup()
if (!core.isCarryingOver) testCardImages()
if (!core.isCarryingOver) testPiles()
if (!core.isCarryingOver) testANewDeck()
if (!core.isCarryingOver) testTheMoves()
