import { core, List, App, View, h } from "@spell/core"

core.heading("How the Shopping List works")
/////////////////////////////////
// ## How the Shopping List works
/////////////////////////////////
// The Shopping List example is a small app for what you need to buy.
// You add an item, tick it off as you shop, clear what you got, and print what's left.
// It keeps the list in a CSV file:  a plain spreadsheet file that Numbers or Excel opens.
//
// Three ideas do the work, and this guide shows each one:
// - an item draws itself as a row, with a box you tick
// - the list works out its aisles from the items, so each aisle shows what's still to get
// - one line in the example says where the items are kept
//
// Here the items are kept in memory, so they start again each time you run it.
// For the whole example, open Shopping List from Examples on the home page.

core.heading("An item")
/** An item */
export class Item extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "amount" is a number
  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  // - its "unit" is text
  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  // - its "aisle" is text
  static { this.declareProp("aisle", { type: "text" }) }
  get aisle() { return this.getProp("aisle") }
  set aisle(value) { this.setProp("aisle", value) }

  /** ticked off:  it's in the trolley */
  // - its "got" is yes or no
  static { this.declareProp("got", { type: "choice" }) }
  get got() { return this.getProp("got") }
  set got(value) { this.setProp("got", value) }

  /** a form of its own, bound to the item:  ticking the box changes its "got" */
  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { direction: "horizontal", spacing: "sm" },
        h("ui-checkbox", { name: "got", "aria-label": "Got it" }),
        h("ui-text", { bold: true }, () => core.joined(this.amount, this.unit, " ")),
        h("ui-text", () => this.name)
      )
    )
  }
}

core.heading("An aisle:  its name, and what's still to get in it")
/** An aisle:  its name, and what's still to get in it */
export class Aisle extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "items" is a list of items
  static { this.declareProp("items", { itemType: "Item", init: () => new List({ instanceType: "Item" }) }) }
  get items() { return this.getProp("items") }
  set items(value) { this.setProp("items", value) }

  draw() {
    return h("ui-stack", { spacing: "xs" },
      h("ui-header", { size: "tiny" }, () => this.name),
      () => core.drawEach(this.items, (item) => core.drawThing(item))
    )
  }
}

core.heading("The app")
/** The app */
export class ShoppingList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** everything on the list, in memory here;  the example's are in its CSV file */
  // - its "items" is a list of items
  static { this.declareProp("items", { itemType: "Item", init: () => new List({ instanceType: "Item" }) }) }
  get items() { return this.getProp("items") }
  set items(value) { this.setProp("items", value) }

  /** each aisle with something still to get in it, once, A to Z */
  get aisles() {
    const found = new List({ instanceType: "Aisle" })
    core.map(core.sortedBy(this.items, (item) => item.aisle), (item) => {
      if (!item.got) {
        let aisle = found.filter((aisle) => aisle.name === item.aisle).firstItem
        if (aisle === undefined) {
          aisle = new Aisle({ name: item.aisle })
          found.append(aisle)
        }
        core.append(aisle?.items, item)
      }
    })
    return found
  }

  /** every ticked item off the list */
  clearWhatIGot() {
    core.removeWhere(this.items, (item) => item.got)
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        core.drawAction(this, "clearWhatIGot"),
        () => core.drawEach(this.aisles, (aisle) => core.drawThing(aisle))
      )
    )
  }
}
export const shoppingList = new ShoppingList()
core.describeAction(ShoppingList, "clearWhatIGot", { title: "Clear what I got", undoneAs: "Clear what I got" })

core.heading("Start:  five things to buy, one already got")
//## Start:  five things to buy, one already got
core.append(shoppingList.items, new Item({
  name: "milk",
  amount: 2,
  unit: "litres",
  aisle: "Dairy"
}))
core.append(shoppingList.items, new Item({
  name: "eggs",
  amount: 12,
  aisle: "Dairy"
}))
core.append(shoppingList.items, new Item({
  name: "bananas",
  amount: 6,
  aisle: "Fruit and veg"
}))
core.append(shoppingList.items, new Item({
  name: "bread",
  amount: 1,
  unit: "loaf",
  aisle: "Bakery"
}))
core.append(shoppingList.items, new Item({
  name: "coffee",
  amount: 250,
  unit: "g",
  aisle: "Drinks",
  got: true
}))

core.heading("A check")
/** A check */
export function testTheAisles() {
  return core.test("test the aisles", function testTheAisles() {
    core.echoTestAction(`set list to a new shopping list`)
    const list = new ShoppingList()
    core.echoTestAction(`add (a new item with name "milk", aisle "Dairy") to list's items`)
    core.append(list.items, new Item({ name: "milk", aisle: "Dairy" }))
    core.echoTestAction(`add (a new item with name "eggs", aisle "Dairy") to list's items`)
    core.append(list.items, new Item({ name: "eggs", aisle: "Dairy" }))
    core.echoTestAction(`add (a new item with name "apples", aisle "Fruit", got = yes) to list's items`)
    core.append(list.items, new Item({
      name: "apples",
      aisle: "Fruit",
      got: true
    }))
    core.expect(core.itemCountOf(list.aisles), `the length of list's aisles`, 1, `1`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Tick "milk":  it leaves Dairy, which still has the eggs.
// - Press "Clear what I got":  the coffee goes for good.
// - Give an item an aisle of its own, "Frozen", and see a new heading.
//
// Where next:  Shopping List, from Examples on the home page, which keeps its items in a CSV file.

core.heading("Where the example keeps its items")
///////////////////////////////////////
// ## Where the example keeps its items
///////////////////////////////////////
// This guide's items live in memory:  reload, and they start again.
// Shopping List keeps them in a CSV file, in its own folder:  __data/shopping.csv.
// One line, in its API file, says so:
//       shopping sheet is a sheet at "shopping.csv"
// and an item says it lives there:
//       it lives in shopping sheet
// The page server writes the file, changing only the lines that change:  open it in Numbers or Excel and see.
// After those lines, the words you already know reach the file:
//       add (a new item with ...) to the items
//       every item where its got is no
//       remove items from the items where its got is yes
// Recipe Cards imports that API file, so the ingredients it adds land in the same file, on the same list.

core.heading("On paper")
//////////////
// ## On paper
//////////////
// Shopping List's Print button runs one step:
//       open printing
// which opens the browser's Print dialog for the app alone, not the editor around it.
// Its CSS says what's on paper:  only what's still to get, each with its box to tick.
//       @media print {
//         ui-toolbar, .new-item, .got, .item ui-button { display: none; }
//       }
// -----------
if (!core.isCarryingOver) shoppingList.start()
// -----------
if (!core.isCarryingOver) testTheAisles()
