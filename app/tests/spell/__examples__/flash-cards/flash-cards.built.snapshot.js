import { core, List, App, TwoSidedView, h } from "@spell/core"

export class FlashCard extends TwoSidedView {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("word", { type: "text" }) }
  get word() { return this.getProp("word") }
  set word(value) { this.setProp("word", value) }

  static { this.declareProp("meaning", { type: "text" }) }
  get meaning() { return this.getProp("meaning") }
  set meaning(value) { this.setProp("meaning", value) }

  onClick(event) {
    this.turnOver()
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

export class Deck extends List {
  static instanceType = FlashCard
}

export function testTurningACardOver() {
  return core.test("test turning a card over", function testTurningACardOver() {
    const it = new FlashCard()
    core.echoTestAction(`set the card to a new flash card with word "el gato", meaning = "the cat"`)
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
export class Quiz extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("deck", { init: () => new Deck({ id: "deck" }), early: true }) }
  get deck() { return this.getProp("deck") }
  set deck(value) { this.setProp("deck", value) }

  static { this.declareProp("card", { type: "FlashCard" }) }
  get card() { return this.getProp("card") }
  set card(value) { this.setProp("card", value) }

  static { this.declareProp("known", { type: "number" }) }
  get known() { return this.getProp("known") }
  set known(value) { this.setProp("known", value) }

  static { this.declareProp("tried", { type: "number" }) }
  get tried() { return this.getProp("tried") }
  set tried(value) { this.setProp("tried", value) }

  get score() {
    if (this.tried === 0) return "Nothing tried yet"
    return `${this.known} of ${this.tried} right`
  }

  dealACard() {
    const others = this.deck.filter((card) => card !== this.card)
    this.card = others.randomItem()
    this.card?.turnFaceUp()
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

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-toolbar", { menu: "quiz menu", "aria-label": "Quiz", shrinkable: true },
          h("ui-text", { slot: "title", size: "large" }, "Flash Cards"),
          h("ui-text", { slot: "right" }, () => this.score)
        ),
        () => core.drawThing(this.card),
        h("ui-stack", { direction: "horizontal", justify: "center" },
          () => core.drawIf(() => this.card?.isFaceDirection("up"), () => [
            h("ui-button", {
              color: "primary",
              onClick: core.pressed(this, () => this.showTheAnswer()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Show the answer")
          ], () => [
            h("ui-button", {
              color: "positive",
              icon: "check",
              onClick: core.pressed(this, () => this.sayIKnew()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "I knew it"),
            h("ui-button", {
              color: "negative",
              appearance: "basic",
              icon: "close",
              onClick: core.pressed(this, () => this.sayIMissed()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "I missed it")
          ])
        )
      )
    )
  }
}
export const quiz = new Quiz()
core.describeAction(Quiz, "dealACard", { title: "Deal a Card", undoneAs: "Deal a Card" })
core.describeAction(Quiz, "showTheAnswer", { title: "Show the Answer", shortcuts: ["space"], undoneAs: "Show the Answer" })
core.describeAction(Quiz, "sayIKnew", { title: "I knew it", shortcuts: ["Y"], icon: "check", undoneAs: "I knew it" })
core.describeAction(Quiz, "sayIMissed", { title: "I missed it", shortcuts: ["N"], icon: "close", undoneAs: "I missed it" })
core.describeAction(Quiz, "startOver", { title: "Start Over", icon: "redo", undoneAs: "Start Over" })

core.describeMenu(Quiz, "quizMenu", { items: ["startOver"] })

export function addWordMeaningMeaning(word, meaning) {
  return core.asAction({ undoneAs: "Add Word Meaning Meaning" }, () => {
    quiz.deck.append(new FlashCard({ word: word, meaning: meaning }))
  })
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
