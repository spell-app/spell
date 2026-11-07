import { core, List, App, TwoSidedView, prop, drawn, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "text" })
  accessor word!: string

  /** What it means, on its back */
  // - its "meaning" is text
  @prop({ type: "text" })
  accessor meaning!: string

  /** A click turns it over */
  onClick(event: ClickEvent) {
    return this.turnOver()
  }

  drawFront() {
    return (
      <ui-segment appearance="raised" color="blue" align="center" padding="lg" part="front">
        <ui-text size="small" color="grey" all-caps={true}>Spanish</ui-text>
        <ui-space />
        <ui-text size="huge" bold={true}>{this.word}</ui-text>
      </ui-segment>
    )
  }

  drawBack() {
    return (
      <ui-segment appearance="raised" color="green" align="center" padding="lg" part="back">
        <ui-text size="small" color="grey" all-caps={true}>What it means</ui-text>
        <ui-space />
        <ui-text size="huge" bold={true}>{this.meaning}</ui-text>
      </ui-segment>
    )
  }

  static clickable = true
}

/**
 * `<test-project-flash-card>`:  a flash card, drawn in its own element, e.g. by `draw the flash card`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its flash card's properties;  its methods call its flash card's.
 * - What every view's element does, e.g. drawing its flash card, is `SpellElement`'s.
 */
export class FlashCardElement extends SpellElement<FlashCard> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-flash-card", "flash card", [
    { name: "word", kind: "string", description: "Its word." },
    { name: "meaning", kind: "string", description: "Its meaning." }
  ])

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }

  drawFront() {
    return this.currentThing?.drawFront()
  }

  drawBack() {
    return this.currentThing?.drawBack()
  }
}
core.useElement(FlashCard, FlashCardElement)

/** The cards to learn */
export class Deck extends List<FlashCard> {
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
  @prop({ init: () => new Deck(), early: true })
  accessor deck!: Deck

  /** The card showing */
  // - its "card" is a flash card
  @prop({ type: "FlashCard" })
  accessor card!: FlashCard

  /** How many you knew */
  // - its "known" is a number
  @prop({ type: "number" })
  accessor known!: number

  /** How many you've tried */
  // - its "tried" is a number
  @prop({ type: "number" })
  accessor tried!: number

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
  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-toolbar menu="quiz menu" aria-label="Quiz">
            <ui-text slot="title" size="large">Flash Cards</ui-text>
            <ui-text slot="right">{this.score}</ui-text>
          </ui-toolbar>
          {core.drawThing(this.card!)}
          <ui-stack direction="horizontal" justify="center">
            <ui-button color="primary" onClick={core.pressed(this, () => this.showTheAnswer())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" hidden={this.card?.isFaceDirection("up") ? undefined : true}>
              Show the answer
            </ui-button>
            <ui-button color="positive" icon="check" onClick={core.pressed(this, () => this.sayIKnew())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" hidden={!this.card?.isFaceDirection("up") ? undefined : true}>
              I knew it
            </ui-button>
            <ui-button color="negative" appearance="basic" icon="close" onClick={core.pressed(this, () => this.sayIMissed())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" hidden={!this.card?.isFaceDirection("up") ? undefined : true}>
              I missed it
            </ui-button>
          </ui-stack>
        </ui-stack>
      </ui-container>
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

/**
 * `<test-project-app>`:  a quiz, drawn in its own element, e.g. by `draw the quiz`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its quiz's properties;  its methods call its quiz's.
 * - What every view's element does, e.g. drawing its quiz, is `SpellElement`'s.
 */
export class QuizElement extends SpellElement<Quiz> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "quiz", [
    { name: "deck", kind: "json", description: "Its deck." },
    { name: "card", kind: "string", description: "Its card." },
    { name: "known", kind: "number", description: "Its known." },
    { name: "tried", kind: "number", description: "Its tried." }
  ])

  dealACard() {
    return this.currentThing?.dealACard()
  }

  showTheAnswer() {
    return this.currentThing?.showTheAnswer()
  }

  sayIKnew() {
    return this.currentThing?.sayIKnew()
  }

  sayIMissed() {
    return this.currentThing?.sayIMissed()
  }

  startOver() {
    return this.currentThing?.startOver()
  }
}
core.useElement(Quiz, QuizElement)
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

export function addWordMeaningMeaning(word: string, meaning: string) {
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

// what each event this program hears holds
export type ClickEvent = SentEvent

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `FlashCardElement` */
      "test-project-flash-card": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `QuizElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
