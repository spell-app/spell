import { core, Thing, List, Page, prop, derived, drawn, on, trigger, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("The console")
/////////////////
// ## The console
/////////////////
// One of FizzBuzz's listeners:  it prints each number as it's counted, and the word it gets.

on<{ number: number }>("fizzbuzz", ({ number }) => core.console.log(number, "fizzbuzz"))
on<{ number: number }>("fizz", ({ number }) => core.console.log(number, "fizz"))
on<{ number: number }>("buzz", ({ number }) => core.console.log(number, "buzz"))
on<{ number: number }>("plain-number", ({ number }) => core.console.log(number))
// -----------
core.heading("The explainer")
///////////////////
// ## The explainer
///////////////////
// A page about FizzBuzz:  its results, drawn as the counting sends them, then how it works and where it comes from.
// It's FizzBuzz's second listener, beside the console:  one algorithm, two listeners.
// - The counting fills this page and the console at once.
// - Turn it off (its import's `active`) and the example runs as a plain program, printing to the console.

core.heading("A result")
//////////////
// ## A result
//////////////
// One number the counting sent, and the word it got.

export class Result extends Thing {
  // - its "number" is a number
  @prop({ type: "number" })
  accessor number!: number

  /** fizz, buzz or fizzbuzz;  empty for a plain number */
  // - its "word" is text
  @prop({ type: "text" })
  accessor word!: string

  /** What its label says:  its word, or the number itself */
  get label() {
    if (this.word === "") return `${this.number}`
    return this.word
  }

  /** Fizz blue, buzz green, both purple */
  get color() {
    if (this.word === "fizzbuzz") return "purple"
    if (this.word === "fizz") return "blue"
    if (this.word === "buzz") return "green"
    return "grey"
  }
}

/** Every result so far, a label each, in a row that wraps */
export class Tally extends List<Result> {
  static instanceType = Result

  @drawn draw() {
    return core.drawRead(() => this, (result: Result) => <ui-label color={result.color} appearance="basic">{result.label}</ui-label>, { items: () => <ui-stack direction="horizontal" wrap={true} spacing="xs" /> })
  }
}

core.heading("The page")
//## The page

export class FizzbuzzExplainer extends Page {
  static elementTag = core.defineElement(this, "test-project")

  // "tally" is a new tally
  @prop({ init: () => new Tally({ id: "tally" }), early: true })
  accessor tally!: Tally

  @derived get fizzes() {
    return this.tally.filter((result) => result.word === "fizz").length
  }

  @derived get buzzes() {
    return this.tally.filter((result) => result.word === "buzz").length
  }

  @derived get fizzbuzzes() {
    return this.tally.filter((result) => result.word === "fizzbuzz").length
  }

  @derived get plainNumbers() {
    return this.tally.filter((result) => result.word === "").length
  }

  /** The results first, a count of each word and a label per number, then how it works and its roots */
  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-header level="1">FizzBuzz</ui-header>
          <ui-section label="The results">
            <ui-statistics widths="4" size="mini">
              <ui-statistic value={this.fizzes} label="fizz" color="blue" />
              <ui-statistic value={this.buzzes} label="buzz" color="green" />
              <ui-statistic value={this.fizzbuzzes} label="fizzbuzz" color="purple" />
              <ui-statistic value={this.plainNumbers} label="plain numbers" />
            </ui-statistics>
            {core.drawThing(this.tally)}
          </ui-section>
          <ui-section label="How it works">
            <ui-markdown>
              {"Count from 1 to 100, and say a word in place of some of the numbers:\n\n- a number 3 goes into exactly:  **fizz**\n- a number 5 goes into exactly:  **buzz**\n- a number both go into, which is any number 15 goes into:  **fizzbuzz**\n- every other number:  the number itself\n\nThe order of the checks matters:  15 is checked first, because 15 is a fizz and a buzz too.\n\nThis example's counting doesn't print anything.\nIt sends an event for each number, `fizz`, `buzz`, `fizzbuzz` or `plain number`, carrying the number,\nand whoever is listening decides what to do with it:\nthe console prints a line, and this page adds a label."}
            </ui-markdown>
          </ui-section>
          <ui-section label="Where it comes from">
            <ui-markdown>
              {"FizzBuzz began as a children's counting game in Britain, played to practise division:\nplayers count in turn, and anyone who says a number instead of \"fizz\" or \"buzz\" is out.\n\nIt became famous among programmers in early 2007, as a test of whether someone can write code at all.\nImran Ghory suggested it as a quick screen for job interviews,\nand Jeff Atwood's post \"Why Can't Programmers.. Program?\" spread the idea widely.\nSince then it has been written in nearly every programming language."}
            </ui-markdown>
          </ui-section>
        </ui-stack>
      </ui-container>
    )
  }

  /** One result more in the tally */
  showWordForNumber(word: string, number: number) {
    this.tally.append(new Result({ number: number, word: word }))
  }

  onFizzbuzz(event: { number?: number }) {
    const { number } = event
    this.showWordForNumber("fizzbuzz", number)
  }

  onFizz(event: { number?: number }) {
    const { number } = event
    this.showWordForNumber("fizz", number)
  }

  onBuzz(event: { number?: number }) {
    const { number } = event
    this.showWordForNumber("buzz", number)
  }

  onPlainNumber(event: { number?: number }) {
    const { number } = event
    this.showWordForNumber("", number)
  }
}

/**
 * `<test-project-fizzbuzz-explainer>`:  a fizzbuzz explainer, drawn in its own element, e.g. by `draw the fizzbuzz explainer`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its fizzbuzz explainer's properties;  its methods call its fizzbuzz explainer's.
 * - What every view's element does, e.g. drawing its fizzbuzz explainer, is `SpellElement`'s.
 */
export class FizzbuzzExplainerElement extends SpellElement<FizzbuzzExplainer> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-fizzbuzz-explainer", "fizzbuzz explainer", [
    { name: "tally", kind: "json", description: "Its tally." }
  ])

  showWordForNumber(word: string, number: number) {
    return this.currentThing?.showWordForNumber(word, number)
  }

  onFizzbuzz(event: FizzbuzzEvent) {
    return this.currentThing?.onFizzbuzz(event)
  }

  onFizz(event: FizzEvent) {
    return this.currentThing?.onFizz(event)
  }

  onBuzz(event: BuzzEvent) {
    return this.currentThing?.onBuzz(event)
  }

  onPlainNumber(event: PlainNumberEvent) {
    return this.currentThing?.onPlainNumber(event)
  }
}
core.useElement(FizzbuzzExplainer, FizzbuzzExplainerElement)
export const fizzbuzzExplainer = new FizzbuzzExplainer()

core.heading("Listening")
///////////////
// ## Listening
///////////////
// The page listens itself:  each event the counting sends becomes a result in its tally.

core.describeAction(FizzbuzzExplainer, "showWordForNumber", { title: "Show (word As Text) For (number As A Number)", undoneAs: "Show (word As Text) For (number As A Number)" })
// -----------
core.heading("FizzBuzz")
//////////////
// ## FizzBuzz
//////////////
// Counting to 100:  fizz for every number 3 goes into, buzz for 5, fizzbuzz for both.
// The counting prints nothing itself:  it says what each number is, as an event, to whoever's listening.
// - `Console.spell` listens, and prints each one.
// - `Explainer.spell` listens too, and shows them on a page.

/** each number from 1 to 100, as one of four events:  fizzbuzz, fizz, buzz, or a plain number */
export function playFizzbuzz() {
  core.getRange(1, 100).forEach((number) => {
    if (core.isOfType(number / 15, "integer")) trigger("fizzbuzz", { number: number })
    else if (core.isOfType(number / 3, "integer")) trigger("fizz", { number: number })
    else if (core.isOfType(number / 5, "integer")) trigger("buzz", { number: number })
    else trigger("plain-number", { number: number })
  })
}

playFizzbuzz()
// -----------
if (!core.isCarryingOver) fizzbuzzExplainer.start()

// what each event this program hears holds
export type FizzbuzzEvent = SentEvent & { number: number }
export type FizzEvent = SentEvent & { number: number }
export type BuzzEvent = SentEvent & { number: number }
export type PlainNumberEvent = SentEvent & { number: number }

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `FizzbuzzExplainerElement` */
      "test-project-fizzbuzz-explainer": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
