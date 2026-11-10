import { core, App, View, ViewableList, h } from "@spell/core"

core.heading("Money")
///////////
// ## Money
///////////
// An amount as dollars and cents:  12.5 is "$12.50".

export function writeAmountAsMoney(amount) {
  const cents = Math.round(amount * 100)
  const dollars = parseInt(cents / 100)
  const leftOver = cents - dollars * 100
  if (leftOver < 10) return `$${dollars}.0${leftOver}`
  return `$${dollars}.${leftOver}`
}

export function testMoney() {
  return core.test("test money", function testMoney() {
    core.expect(writeAmountAsMoney(12.5), `write 12.5 as money`, "$12.50", `"$12.50"`)
    core.expect(writeAmountAsMoney(3.07), `write 3.07 as money`, "$3.07", `"$3.07"`)
    core.expect(writeAmountAsMoney(0), `write 0 as money`, "$0.00", `"$0.00"`)
  })
}

// -----------
core.heading("A diner")
/////////////
// ## A diner
/////////////
// Someone at the table:  their name, what they ordered, and what they owe.
// Each diner is its own element on the page, a row of Spell UI's fields bound to it:
// typing a name or an amount changes the diner, and every sum follows.

export class Diner extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** What they ordered, before the tip */
  // - its "amount" is a number
  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  /** Their share of the tip:  the same part of it as their part of the bill */
  get tip() {
    return this.amount * billSplitter.percent
  }

  /** What they owe */
  get share() {
    return this.amount + this.tip
  }

  /** Takes them off the bill */
  remove() {
    return billSplitter.diners.remove(this)
  }

  /** Their name, their amount, what they owe, and a button to take them off */
  draw() {
    return h("ui-form", { value: this },
      h("ui-stack", { direction: "horizontal", spacing: "sm" },
        h("ui-input", { name: "name", placeholder: "Name", "aria-label": "Name" }),
        h("ui-input", { name: "amount", type: "number", min: "0", step: "0.01", "aria-label": "Amount", label: "$" }),
        h("ui-space", { fluid: true }),
        h("ui-text", { bold: true }, () => writeAmountAsMoney(this.share)),
        h("ui-button", {
          icon: "close",
          appearance: "basic",
          "aria-label": "Remove",
          onClick: core.pressed(this, () => this.remove()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        })
      )
    )
  }

  get table() {
    return Table.ownerOf(this)
  }
}

/** The diners, one a row */
export class Table extends ViewableList {
  static instanceType = Diner
  static elementTag = core.defineElement(this, "test-project")

  drawItsPlaceholder() {
    return h("ui-text", { color: "grey" }, "Nobody yet:  add someone")
  }

  static exclusive = true
}

/** a diner sits at one table */
// -----------
core.heading("Bill Splitter")
///////////////////
// ## Bill Splitter
///////////////////
// Who owes what after a meal:  each person pays for what they ordered, and their share of the tip.
// Change a name, an amount or the tip, and every sum follows.
// A diner is this project's own, in `Diner.spell`, and how money is written is in `Money.spell`:
// this file holds the bill.

core.heading("The bill")
//## The bill

export class BillSplitter extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "diners" is a new table
  static { this.declareProp("diners", { init: () => new Table(), early: true }) }
  get diners() { return this.getProp("diners") }
  set diners(value) { this.setProp("diners", value) }

  /** The tip, as a part of what was ordered:  kept as its fraction, so 18% is 0.18 */
  // - its "percent" is a percent starting at 18%
  static { this.declareProp("percent", { type: "number", init: () => 0.18 }) }
  get percent() { return this.getProp("percent") }
  set percent(value) { this.setProp("percent", value) }

  /** What everyone ordered, added up */
  get subtotal() {
    let addedUp = 0
    this.diners.forEach((diner) => (addedUp = addedUp + diner.amount))
    return addedUp
  }

  get tip() {
    return this.subtotal * this.percent
  }

  get total() {
    return this.subtotal + this.tip
  }

  /** Three diners to start with */
  create() {
    this.diners.append(new Diner({ name: "Ana", amount: 24 }))
    this.diners.append(new Diner({ name: "Ben", amount: 18.5 }))
    this.diners.append(new Diner({ name: "Cleo", amount: 31.25 }))
  }

  /** The tip, the diners, then the sums */
  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-header", { level: "2" }, "Bill Splitter"),
        h("ui-form", { value: this },
          h("ui-stack", { direction: "horizontal", spacing: "sm" },
            h("ui-text", { bold: true }, "Tip"),
            h("ui-input", { name: "percent", type: "percent", min: "0", step: "1", "aria-label": "Tip percent" }),
            h("ui-buttons", { size: "small", appearance: "basic" },
              h("ui-button", {
                onClick: core.pressed(this, () => (this.percent = 0.15)),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "15%"),
              h("ui-button", {
                onClick: core.pressed(this, () => (this.percent = 0.18)),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "18%"),
              h("ui-button", {
                onClick: core.pressed(this, () => (this.percent = 0.2)),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "20%")
            )
          )
        ),
        () => core.drawThing(this.diners),
        h("ui-stack", { direction: "horizontal" },
          h("ui-button", {
            appearance: "basic",
            icon: "plus",
            onClick: core.pressed(this, () => this.addSomeone()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Add someone")
        ),
        h("ui-segment",
          h("ui-statistics", { widths: "3", size: "small" },
            h("ui-statistic", { value: () => writeAmountAsMoney(this.subtotal), label: "Ordered" }),
            h("ui-statistic", { value: () => writeAmountAsMoney(this.tip), label: "Tip" }),
            h("ui-statistic", { value: () => writeAmountAsMoney(this.total), label: "Total", color: "green" })
          )
        )
      )
    )
  }

  addSomeone() {
    this.diners.append(new Diner({ name: "", amount: 0 }))
  }
}
export const billSplitter = new BillSplitter()

/** An empty row, for the next person */
core.describeAction(BillSplitter, "addSomeone", { title: "add someone", icon: "plus" })
// -----------
if (!core.isCarryingOver) billSplitter.start()
// -----------
if (!core.isCarryingOver) testMoney()
