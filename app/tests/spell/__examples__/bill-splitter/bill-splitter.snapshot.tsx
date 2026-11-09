import { core, App, View, ViewableList, prop, derived, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Money")
///////////
// ## Money
///////////
// An amount as dollars and cents:  12.5 is "$12.50".

export function writeAmountAsMoney(amount: number) {
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
  @prop({ type: "text" })
  accessor name!: string

  /** What they ordered, before the tip */
  // - its "amount" is a number
  @prop({ type: "number" })
  accessor amount!: number

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
  @drawn draw() {
    return (
      <ui-form value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-input name="name" placeholder="Name" aria-label="Name" />
          <ui-input name="amount" type="number" min="0" step="0.01" aria-label="Amount" label="$" />
          <ui-space fluid={true} />
          <ui-text bold={true}>{writeAmountAsMoney(this.share)}</ui-text>
          <ui-button icon="close" appearance="basic" aria-label="Remove" onClick={core.pressed(this, () => this.remove())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
        </ui-stack>
      </ui-form>
    )
  }

  get table() {
    return Table.ownerOf(this)!
  }
}

/**
 * `<test-project-diner>`:  a diner, drawn in its own element, e.g. by `draw the diner`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its diner's properties;  its methods call its diner's.
 * - What every view's element does, e.g. drawing its diner, is `SpellElement`'s.
 */
export class DinerElement extends SpellElement<Diner> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-diner", "diner", [
    { name: "name", kind: "string", description: "Its name." },
    { name: "amount", kind: "number", description: "Its amount." }
  ])

  remove() {
    return this.currentThing?.remove()
  }
}
core.useElement(Diner, DinerElement)

/** The diners, one a row */
export class Table extends ViewableList<Diner> {
  static instanceType = Diner
  static elementTag = core.defineElement(this, "test-project")

  drawItsPlaceholder() {
    return <ui-text color="grey">{"Nobody yet:  add someone"}</ui-text>
  }

  static exclusive = true
}

/**
 * `<test-project-table>`:  a table, drawn in its own element, e.g. by `draw the table`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its table's properties;  its methods call its table's.
 * - What every view's element does, e.g. drawing its table, is `SpellElement`'s.
 */
export class TableElement extends SpellElement<Table> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-table", "table", [])

  drawItsPlaceholder() {
    return this.currentThing?.drawItsPlaceholder()
  }
}
core.useElement(Table, TableElement)

/** a diner sits at one table */
// -----------
core.heading("Bill Splitter")
///////////////////
// ## Bill Splitter
///////////////////
// Who owes what after a meal:  each person pays for what they ordered, and their share of the tip.
// Change a name, an amount or the tip, and every sum follows.
// A diner is this project's own, in `Diner.spellml`, and how money is written is in `Money.spellml`:
// this file holds the bill.

core.heading("The bill")
//## The bill

@thing
export class BillSplitter extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "diners" is a new table
  @prop({ init: () => new Table(), early: true })
  accessor diners!: Table

  /** The tip, as a part of what was ordered:  kept as its fraction, so 18% is 0.18 */
  // - its "percent" is a percent starting at 18%
  @prop({ type: "number", init: () => 0.18 })
  accessor percent!: number

  /** What everyone ordered, added up */
  @derived get subtotal() {
    let addedUp: number = 0
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
  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-header level="2">Bill Splitter</ui-header>
          <ui-form value={this}>
            <ui-stack direction="horizontal" spacing="sm">
              <ui-text bold={true}>Tip</ui-text>
              <ui-input name="percent" type="percent" min="0" step="1" aria-label="Tip percent" />
              <ui-buttons size="small" appearance="basic">
                <ui-button onClick={core.pressed(this, () => (this.percent = 0.15))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  15%
                </ui-button>
                <ui-button onClick={core.pressed(this, () => (this.percent = 0.18))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  18%
                </ui-button>
                <ui-button onClick={core.pressed(this, () => (this.percent = 0.2))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  20%
                </ui-button>
              </ui-buttons>
            </ui-stack>
          </ui-form>
          {core.drawThing(this.diners)}
          <ui-stack direction="horizontal">
            <ui-button appearance="basic" icon="plus" onClick={core.pressed(this, () => this.addSomeone())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
              Add someone
            </ui-button>
          </ui-stack>
          <ui-segment>
            <ui-statistics widths="3" size="small">
              <ui-statistic value={writeAmountAsMoney(this.subtotal)} label="Ordered" />
              <ui-statistic value={writeAmountAsMoney(this.tip)} label="Tip" />
              <ui-statistic value={writeAmountAsMoney(this.total)} label="Total" color="green" />
            </ui-statistics>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }

  addSomeone() {
    this.diners.append(new Diner({ name: "", amount: 0 }))
  }
}

/**
 * `<test-project-app>`:  a bill splitter, drawn in its own element, e.g. by `draw the bill splitter`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its bill splitter's properties;  its methods call its bill splitter's.
 * - What every view's element does, e.g. drawing its bill splitter, is `SpellElement`'s.
 */
export class BillSplitterElement extends SpellElement<BillSplitter> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "bill splitter", [
    { name: "diners", kind: "json", description: "Its diners." },
    { name: "percent", kind: "number", description: "Its percent." }
  ])

  create() {
    return this.currentThing?.create()
  }

  addSomeone() {
    return this.currentThing?.addSomeone()
  }
}
core.useElement(BillSplitter, BillSplitterElement)
export const billSplitter = new BillSplitter()

/** An empty row, for the next person */
core.describeAction(BillSplitter, "addSomeone", { title: "add someone", icon: "plus" })
// -----------
if (!core.isCarryingOver) billSplitter.start()
// -----------
if (!core.isCarryingOver) testMoney()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `DinerElement` */
      "test-project-diner": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TableElement` */
      "test-project-table": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `BillSplitterElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
