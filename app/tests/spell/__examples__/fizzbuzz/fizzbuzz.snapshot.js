import { core, Thing, List, Page, h, on, trigger } from "@spell/core"

core.heading("The console")
/////////////////
// ## The console
/////////////////
// One of FizzBuzz's listeners:  it prints each number as it's counted, and the word it gets.

on("fizzbuzz", (event) => {
  const { number } = event
  core.console.log(number, "fizzbuzz")
})
on("fizz", (event) => {
  const { number } = event
  core.console.log(number, "fizz")
})
on("buzz", (event) => {
  const { number } = event
  core.console.log(number, "buzz")
})
on("plain-number", (event) => {
  const { number } = event
  core.console.log(number)
})
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
  static { this.declareProp("number", { type: "number" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  /** fizz, buzz or fizzbuzz;  empty for a plain number */
  // - its "word" is text
  static { this.declareProp("word", { type: "text" }) }
  get word() { return this.getProp("word") }
  set word(value) { this.setProp("word", value) }

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
export class Tally extends List {
  static instanceType = Result

  draw() {
    return core.drawRead(() => this, (result) => h("ui-label", { color: () => result.color, appearance: "basic" }, () => result.label), { items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
  }
}

core.heading("The page")
//## The page

export class FizzbuzzExplainer extends Page {
  static elementTag = core.defineElement(this, "test-project")

  // "tally" is a new tally
  static { this.declareProp("tally", { init: () => new Tally({ id: "tally" }), early: true }) }
  get tally() { return this.getProp("tally") }
  set tally(value) { this.setProp("tally", value) }

  get fizzes() {
    return this.tally.filter((result) => result.word === "fizz").length
  }

  get buzzes() {
    return this.tally.filter((result) => result.word === "buzz").length
  }

  get fizzbuzzes() {
    return this.tally.filter((result) => result.word === "fizzbuzz").length
  }

  get plainNumbers() {
    return this.tally.filter((result) => result.word === "").length
  }

  /** The results first, a count of each word and a label per number, then how it works and its roots */
  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-header", { level: "1" }, "FizzBuzz"),
        h("ui-section", { label: "The results" },
          h("ui-statistics", { widths: "4", size: "mini" },
            h("ui-statistic", { value: () => this.fizzes, label: "fizz", color: "blue" }),
            h("ui-statistic", { value: () => this.buzzes, label: "buzz", color: "green" }),
            h("ui-statistic", { value: () => this.fizzbuzzes, label: "fizzbuzz", color: "purple" }),
            h("ui-statistic", { value: () => this.plainNumbers, label: "plain numbers" })
          ),
          () => core.drawThing(this.tally)
        ),
        h("ui-section", { label: "How it works" },
          h("ui-markdown",
            "Count from 1 to 100, and say a word in place of some of the numbers:\n\n- a number 3 goes into exactly:  **fizz**\n- a number 5 goes into exactly:  **buzz**\n- a number both go into, which is any number 15 goes into:  **fizzbuzz**\n- every other number:  the number itself\n\nThe order of the checks matters:  15 is checked first, because 15 is a fizz and a buzz too.\n\nThis example's counting doesn't print anything.\nIt sends an event for each number, `fizz`, `buzz`, `fizzbuzz` or `plain number`, carrying the number,\nand whoever is listening decides what to do with it:\nthe console prints a line, and this page adds a label."
          )
        ),
        h("ui-section", { label: "Where it comes from" },
          h("ui-markdown",
            "FizzBuzz began as a children's counting game in Britain, played to practise division:\nplayers count in turn, and anyone who says a number instead of \"fizz\" or \"buzz\" is out.\n\nIt became famous among programmers in early 2007, as a test of whether someone can write code at all.\nImran Ghory suggested it as a quick screen for job interviews,\nand Jeff Atwood's post \"Why Can't Programmers.. Program?\" spread the idea widely.\nSince then it has been written in nearly every programming language."
          )
        )
      )
    )
  }

  /** One result more in the tally */
  showWordForNumber(word, number) {
    this.tally.append(new Result({ number: number, word: word }))
  }

  onFizzbuzz(event) {
    const { number } = event
    this.showWordForNumber("fizzbuzz", number)
  }

  onFizz(event) {
    const { number } = event
    this.showWordForNumber("fizz", number)
  }

  onBuzz(event) {
    const { number } = event
    this.showWordForNumber("buzz", number)
  }

  onPlainNumber(event) {
    const { number } = event
    this.showWordForNumber("", number)
  }
}
export const fizzbuzzExplainer = new FizzbuzzExplainer()
core.describeAction(FizzbuzzExplainer, "showWordForNumber", { title: "Show Word As Text For Number As A Number", undoneAs: "Show Word As Text For Number As A Number" })

core.heading("Listening")
///////////////
// ## Listening
///////////////
// The page listens itself:  each event the counting sends becomes a result in its tally.

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
