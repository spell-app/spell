import { core, List, App, TwoSidedView, prop, drawn, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("How Flash Cards work")
//////////////////////////
// ## How Flash Cards work
//////////////////////////
// The Flash Cards example is a deck of Spanish words to learn:
// the word on the front, what it means on the back.  Click the card to turn it over.
// Two ideas do the work:
// - a card is a TWO SIDED VIEW:  it knows which way up it is, and draws only that side
// - the quiz deals the next card at random from the deck

// This guide keeps those two, and leaves out the score.  Open Flash Cards, in the Examples, for the whole quiz.

core.heading("A card:  a word on the front, what it means on the back")
/////////////////////////////////////////////////////////////
// ## A card:  a word on the front, what it means on the back
/////////////////////////////////////////////////////////////
// `template="two sided view"` makes the card one of Spell's built-in two sided views, as Solitaire's cards are.
// It brings, with no code of its own:
// - which way it faces, up or down, and `it is face up`, `it is face down`
// - `turn it face up`, `turn it face down`, `turn it over`
// - a drawing that shows its front face up, and its back face down

// So the card only says what each side looks like:  its `<draw "front">` and its `<draw "back">`.
// - `clickable` shows a pointer over it, and `<on click>` says what a click does.
// - Each side is a Spell UI `<segment>`:  a raised panel, blue for the word and green for what it means.

export class FlashCard extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  // - its "word" is text
  @prop({ type: "text" })
  accessor word!: string

  // - its "meaning" is text
  @prop({ type: "text" })
  accessor meaning!: string

  onClick(event: ClickEvent) {
    return this.turnOver()
  }

  drawFront() {
    return (
      <ui-segment appearance="raised" color="blue" align="center" padding="lg" part="front">
        <ui-text size="huge" bold={true}>{this.word}</ui-text>
      </ui-segment>
    )
  }

  drawBack() {
    return (
      <ui-segment appearance="raised" color="green" align="center" padding="lg" part="back">
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

core.heading("The quiz:  the deck, and the card showing")
///////////////////////////////////////////////
// ## The quiz:  the deck, and the card showing
///////////////////////////////////////////////
// `deal a card` picks a card at random, never the one showing now, and turns it word up.

export class Quiz extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "deck" is a new deck
  @prop({ init: () => new Deck(), early: true })
  accessor deck!: Deck

  // - its "card" is a flash card
  @prop({ type: "FlashCard" })
  accessor card!: FlashCard

  dealACard() {
    const others = this.deck.filter((card) => card !== this.card)
    this.card = others.randomItem()
    this.card?.turnFaceUp()
  }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          {core.drawThing(this.card!)}
          <ui-stack direction="horizontal" justify="center">
            <ui-button color="primary" onClick={core.pressed(this, () => this.dealACard())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Next card
            </ui-button>
          </ui-stack>
        </ui-stack>
      </ui-container>
    )
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
    { name: "card", kind: "string", description: "Its card." }
  ])

  dealACard() {
    return this.currentThing?.dealACard()
  }
}
core.useElement(Quiz, QuizElement)
export const quiz = new Quiz()

core.heading("The deck:  four words to start -- add your own")
//## The deck:  four words to start -- add your own

export function addWordMeaningMeaning(word: string, meaning: string) {
  quiz.deck.append(new FlashCard({ word: word, meaning: meaning }))
}

addWordMeaningMeaning("el gato", "the cat")
addWordMeaningMeaning("el perro", "the dog")
addWordMeaningMeaning("la casa", "the house")
addWordMeaningMeaning("el libro", "the book")

quiz.dealACard()

core.heading("A check")
/////////////
// ## A check
/////////////
// A new card starts face down, as every two sided view does.

export function testTurningACardOver() {
  return core.test("test turning a card over", function testTurningACardOver() {
    core.echoTestAction(`set the card to a new flash card with word = "el gato", meaning = "the cat"`)
    const card = new FlashCard({ word: "el gato", meaning: "the cat" })
    core.expect(card.isFaceDirection("down"), `the card is face down`, true, `yes`)
    core.echoTestAction(`turn the card over`)
    card.turnOver()
    core.expect(card.isFaceDirection("up"), `the card is face up`, true, `yes`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Click the card on the right to turn it over, and "Next card" for another.
// - Add a word:  copy one of the "add" lines above, and change both its words.
// Click "Next card" until it comes up.
// - Make your own deck:  change all four lines to something you want to learn, in any language.

// Where next:  Flash Cards, in the Examples, which keeps score:  "I knew it" and "I missed it" buttons,
// a toolbar, and twelve words.
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
