import { core, List, App, TwoSidedView, h } from "@spell/core"

core.heading("A flash card")
//////////////////
// ## A flash card
//////////////////
// A word on its front, what it means on its back.
// It's a two sided view, as Solitaire's cards are:  face up it shows the word, face down what it means.
// A click turns it over.

export class FlashCard extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  /** The Spanish word, on its front */
  // - its "word" is text
  static { this.declareProp("word", { type: "text" }) }
  get word() { return this.getProp("word") }
  set word(value) { this.setProp("word", value) }

  /** What it means, on its back */
  // - its "meaning" is text
  static { this.declareProp("meaning", { type: "text" }) }
  get meaning() { return this.getProp("meaning") }
  set meaning(value) { this.setProp("meaning", value) }

  /** A click turns it over */
  onClick(event) {
    return this.turnOver()
  }

  drawFront() {
    return h("ui-segment", { appearance: "raised", color: "blue", align: "center", padding: "lg", part: "front" },
      h("ui-text", { size: "small", color: "grey", "all-caps": true }, "Spanish"),
      h("ui-space"),
      h("ui-text", { size: "huge", bold: true }, () => this.word)
    )
  }

  drawBack() {
    return h("ui-segment", { appearance: "raised", color: "green", align: "center", padding: "lg", part: "back" },
      h("ui-text", { size: "small", color: "grey", "all-caps": true }, "What it means"),
      h("ui-space"),
      h("ui-text", { size: "huge", bold: true }, () => this.meaning)
    )
  }

  static clickable = true
}

/** The cards to learn */
export class Deck extends List {
  static instanceType = FlashCard
}

export function testTurningACardOver() {
  return core.test("test turning a card over", function testTurningACardOver() {
    const it = new FlashCard()
    core.echoTestAction(`set the card to a new flash card with word = "el gato", meaning = "the cat"`)
    const card = new FlashCard({ word: "el gato", meaning: "the cat" })
    core.echoTestAction(`turn the card face up`)
    card.turnFaceUp()
    core.expect(card.isFaceDirection("up"), `the card is face up`, true, `yes`)
    core.echoTestAction(`turn the card over`)
    card.turnOver()
    core.expect(card.isFaceDirection("down"), `the card is face down`, true, `yes`)
    core.echoTestAction(`turn the card over`)
    card.turnOver()
    core.expect(card.isFaceDirection("up"), `the card is face up`, true, `yes`)
  })
}

// -----------
core.heading("Flash Cards")
/////////////////
// ## Flash Cards
/////////////////
// A deck of cards to learn from:  a Spanish word on the front, what it means on the back.
// Click the card, or Show the answer, to turn it over, then say whether you knew it:
// the score keeps count, and the next card comes up at random.
// The card is this project's own, in `FlashCard.spellml`;  this file holds the quiz, and its words.

export class Quiz extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "deck" is a new deck
  static { this.declareProp("deck", { init: () => new Deck(), early: true }) }
  get deck() { return this.getProp("deck") }
  set deck(value) { this.setProp("deck", value) }

  /** The card showing */
  // - its "card" is a flash card
  static { this.declareProp("card", { type: "FlashCard" }) }
  get card() { return this.getProp("card") }
  set card(value) { this.setProp("card", value) }

  /** How many you knew */
  // - its "known" is a number
  static { this.declareProp("known", { type: "number" }) }
  get known() { return this.getProp("known") }
  set known(value) { this.setProp("known", value) }

  /** How many you've tried */
  // - its "tried" is a number
  static { this.declareProp("tried", { type: "number" }) }
  get tried() { return this.getProp("tried") }
  set tried(value) { this.setProp("tried", value) }

  /** Said in the toolbar */
  get score() {
    if (this.tried === 0) return "Nothing tried yet"
    return `${this.known} of ${this.tried} right`
  }

  /** A card from the deck at random, word up:  never the one just shown */
  dealACard() {
    const others = this.deck.filter((card) => card !== this.card)
    this.card = others.randomItem()
    this.card?.turnFaceUp()
  }

  /** The toolbar with the score, the card, then what you can do:  turn it over, or say how you did */
  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-toolbar", { menu: "quiz menu", "aria-label": "Quiz" },
          h("ui-text", { slot: "title", size: "large" }, "Flash Cards"),
          h("ui-text", { slot: "right" }, () => this.score)
        ),
        () => core.drawThing(this.card),
        h("ui-stack", { direction: "horizontal", justify: "center" },
          h("ui-button", {
            color: "primary",
            onClick: core.pressed(this, () => this.showTheAnswer()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => this.card?.isFaceDirection("up") ? undefined : true
          }, "Show the answer"),
          h("ui-button", {
            color: "positive",
            icon: "check",
            onClick: core.pressed(this, () => this.sayIKnew()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => !this.card?.isFaceDirection("up") ? undefined : true
          }, "I knew it"),
          h("ui-button", {
            color: "negative",
            appearance: "basic",
            icon: "close",
            onClick: core.pressed(this, () => this.sayIMissed()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
            hidden: () => !this.card?.isFaceDirection("up") ? undefined : true
          }, "I missed it")
        )
      )
    )
  }

  showTheAnswer() {
    this.card?.turnOver()
  }

  sayIKnew() {
    this.known = this.known + 1
    this.tried = this.tried + 1
    this.dealACard()
  }

  sayIMissed() {
    this.tried = this.tried + 1
    this.dealACard()
  }

  startOver() {
    this.known = 0
    this.tried = 0
    this.dealACard()
  }
}
export const quiz = new Quiz()

core.describeAction(Quiz, "showTheAnswer", { title: "Show the answer", shortcuts: ["space"] })
/** Counted, then the next card */
core.describeAction(Quiz, "sayIKnew", { title: "I knew it", shortcuts: ["Y"], icon: "check" })

core.describeAction(Quiz, "sayIMissed", { title: "I missed it", shortcuts: ["N"], icon: "close" })

core.describeAction(Quiz, "startOver", { title: "Start over", icon: "redo" })

// - its "quiz menu" is a menu of "start over"
core.describeMenu(Quiz, "quizMenu", { items: ["startOver"] })

core.heading("The deck:  twelve Spanish words -- add your own")
//## The deck:  twelve Spanish words -- add your own

export function addWordMeaningMeaning(word, meaning) {
  quiz.deck.append(new FlashCard({ word: word, meaning: meaning }))
}

addWordMeaningMeaning("el gato", "the cat")
addWordMeaningMeaning("el perro", "the dog")
addWordMeaningMeaning("la casa", "the house")
addWordMeaningMeaning("el libro", "the book")
addWordMeaningMeaning("la manzana", "the apple")
addWordMeaningMeaning("el agua", "the water")
addWordMeaningMeaning("la luna", "the moon")
addWordMeaningMeaning("el sol", "the sun")
addWordMeaningMeaning("la playa", "the beach")
addWordMeaningMeaning("el tren", "the train")
addWordMeaningMeaning("la llave", "the key")
addWordMeaningMeaning("la mariposa", "the butterfly")

quiz.startOver()
// -----------
if (!core.isCarryingOver) quiz.start()
// -----------
if (!core.isCarryingOver) testTurningACardOver()
