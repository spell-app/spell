import { core, App, View, ViewableList, h } from "@spell/core"

export function writeAmountAsMoney(amount) {
  return core.asAction({ undoneAs: "Write Amount As Money" }, () => {
    const cents = Math.round(amount * 100)
    const dollars = parseInt(cents / 100)
    const leftOver = cents - dollars * 100
    if (leftOver < 10) return `$${dollars}.0${leftOver}`
    return `$${dollars}.${leftOver}`
  })
}

export function testMoney() {
  return core.test("test money", function testMoney() {
    core.expect(writeAmountAsMoney(12.5), `write 12.5 as money`, "$12.50", `"$12.50"`)
    core.expect(writeAmountAsMoney(3.07), `write 3.07 as money`, "$3.07", `"$3.07"`)
    core.expect(writeAmountAsMoney(0), `write 0 as money`, "$0.00", `"$0.00"`)
  })
}
// -----------
export class Diner extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  get tip() {
    return this.amount * billSplitter.percent
  }

  get share() {
    return this.amount + this.tip
  }

  remove() {
    return billSplitter.diners.remove(this)
  }

  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { direction: "horizontal", spacing: "sm" },
        h("ui-input", { name: "name", placeholder: "Name", "aria-label": "Name", fluid: true }),
        h("ui-input", {
          name: "amount",
          type: "number",
          min: "0",
          step: "0.01",
          placeholder: "Amount",
          "aria-label": "Amount",
          fluid: true
        }),
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

  get lastTable() {
    return Table.lastOwnerOf(this)
  }
}

export class Table extends ViewableList {
  static instanceType = Diner
  static elementTag = core.defineElement(this, "test-project")

  drawItsPlaceholder() {
    return h("ui-text", { color: "grey", part: "placeholder" }, "Nobody yet:  add someone")
  }

  static exclusive = true
}

core.describeAction(Diner, "remove", { title: "Remove It", undoneAs: "Remove It" })

// -----------
export class BillSplitter extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("diners", { init: () => new Table({ id: "diners" }), early: true }) }
  get diners() { return this.getProp("diners") }
  set diners(value) { this.setProp("diners", value) }

  static { this.declareProp("percent", { type: "number", init: () => 0.18 }) }
  get percent() { return this.getProp("percent") }
  set percent(value) { this.setProp("percent", value) }

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

  create() {
    this.diners.append(new Diner({ name: "Ana", amount: 24 }))
    this.diners.append(new Diner({ name: "Ben", amount: 18.5 }))
    this.diners.append(new Diner({ name: "Cleo", amount: 31.25 }))
  }

  addSomeone() {
    this.diners.append(new Diner({ name: "", amount: 0 }))
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-header", { level: "2" }, "Bill Splitter"),
        h("ui-form", { "prop:value": this },
          h("ui-stack", { direction: "horizontal", spacing: "sm", wrap: true },
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
          h("ui-statistics", { widths: "3", size: "small", stackable: true, "stack-with": "page" },
            h("ui-statistic", { value: () => writeAmountAsMoney(this.subtotal), label: "Ordered" }),
            h("ui-statistic", { value: () => writeAmountAsMoney(this.tip), label: "Tip" }),
            h("ui-statistic", { value: () => writeAmountAsMoney(this.total), label: "Total", color: "green" })
          )
        )
      )
    )
  }
}
export const billSplitter = new BillSplitter()
core.describeAction(BillSplitter, "addSomeone", { title: "Add Someone", icon: "plus", undoneAs: "Add Someone" })
// -----------
if (!core.isCarryingOver) billSplitter.start()
// -----------
if (!core.isCarryingOver) testMoney()
