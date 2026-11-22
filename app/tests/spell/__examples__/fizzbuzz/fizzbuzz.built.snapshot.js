import { core, Thing, List, Page, h, trigger, on } from "@spell/core"

export function playFizzbuzz() {
  return core.asAction({ undoneAs: "Play Fizzbuzz" }, () => {
    core.getRange(1, 100).forEach((number) => {
      if (core.isOfType(number / 15, "integer")) trigger("fizzbuzz", { number: number })
      else if (core.isOfType(number / 3, "integer")) trigger("fizz", { number: number })
      else if (core.isOfType(number / 5, "integer")) trigger("buzz", { number: number })
      else trigger("plain-number", { number: number })
    })
  })
}

// -----------
export class Result extends Thing {
  static { this.declareProp("number", { type: "number" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("word", { type: "text" }) }
  get word() { return this.getProp("word") }
  set word(value) { this.setProp("word", value) }

  get label() {
    if (this.word === "") return `${this.number}`
    return this.word
  }

  get color() {
    if (this.word === "fizzbuzz") return "purple"
    if (this.word === "fizz") return "blue"
    if (this.word === "buzz") return "green"
    return "grey"
  }
}

export class Tally extends List {
  static instanceType = Result

  draw() {
    return core.drawRead(() => this, (result) => h("ui-label", { color: () => result.color, appearance: "basic" }, () => result.label), { items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
  }
}

export class FizzbuzzExplainer extends Page {
  static elementTag = core.defineElement(this, "test-project")

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
core.describeAction(FizzbuzzExplainer, "showWordForNumber", { title: "Show Word for Number", undoneAs: "Show Word for Number" })

// -----------
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
playFizzbuzz()
// -----------
if (!core.isCarryingOver) fizzbuzzExplainer.start()
