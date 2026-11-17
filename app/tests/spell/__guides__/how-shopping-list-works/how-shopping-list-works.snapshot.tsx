import { core, List, App, View, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "text" })
  accessor name!: string

  // - its "amount" is a number
  @prop({ type: "number" })
  accessor amount!: number

  // - its "unit" is text
  @prop({ type: "text" })
  accessor unit!: string

  // - its "aisle" is text
  @prop({ type: "text" })
  accessor aisle!: string

  /** ticked off:  it's in the trolley */
  // - its "got" is yes or no
  @prop({ type: "choice" })
  accessor got!: boolean

  /** a form of its own, bound to the item:  ticking the box changes its "got" */
  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-checkbox name="got" aria-label="Got it" />
          <ui-text bold={true}>{core.joined(this.amount, this.unit, " ")}</ui-text>
          <ui-text>{this.name}</ui-text>
        </ui-stack>
      </ui-form>
    )
  }
}

/**
 * `<test-project-item>`:  an item, drawn in its own element, e.g. by `draw the item`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its item's properties;  its methods call its item's.
 * - What every view's element does, e.g. drawing its item, is `SpellElement`'s.
 */
export class ItemElement extends SpellElement<Item> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-item", "item", [
    { name: "name", kind: "string", description: "Its name." },
    { name: "amount", kind: "number", description: "Its amount." },
    { name: "unit", kind: "string", description: "Its unit." },
    { name: "aisle", kind: "string", description: "Its aisle." },
    { name: "got", kind: "boolean", description: "Its got." }
  ])
}
core.useElement(Item, ItemElement)

core.heading("An aisle:  its name, and what's still to get in it")
/** An aisle:  its name, and what's still to get in it */
export class Aisle extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "items" is a list of items
  @prop({ itemType: "Item", init: () => new List<Item>({ instanceType: "Item" }) })
  accessor items!: List<Item>

  @drawn draw() {
    return (
      <ui-stack spacing="xs">
        <ui-header size="tiny">{this.name}</ui-header>
        {core.drawEach(this.items, (item) => core.drawThing(item))}
      </ui-stack>
    )
  }
}

/**
 * `<test-project-aisle>`:  an aisle, drawn in its own element, e.g. by `draw the aisle`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its aisle's properties;  its methods call its aisle's.
 * - What every view's element does, e.g. drawing its aisle, is `SpellElement`'s.
 */
export class AisleElement extends SpellElement<Aisle> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-aisle", "aisle", [
    { name: "name", kind: "string", description: "Its name." },
    { name: "items", kind: "json", description: "Its items." }
  ])
}
core.useElement(Aisle, AisleElement)

core.heading("The app")
/** The app */
export class ShoppingList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** everything on the list, in memory here;  the example's are in its CSV file */
  // - its "items" is a list of items
  @prop({ itemType: "Item", init: () => new List<Item>({ instanceType: "Item" }) })
  accessor items!: List<Item>

  /** each aisle with something still to get in it, once, A to Z */
  @derived get aisles() {
    const found = new List<Aisle>({ instanceType: "Aisle" })
    core.map(core.sortedBy(this.items, (item: Item) => item.aisle), (item: Item) => {
      if (!item.got) {
        let aisle = found.filter((aisle) => aisle.name === item.aisle).firstItem
        if (aisle === undefined) {
          aisle = new Aisle({ name: item.aisle })
          found.append(aisle!)
        }
        core.append(aisle?.items!, item)
      }
    })
    return found
  }

  /** every ticked item off the list */
  clearWhatIGot() {
    core.removeWhere(this.items, (item: Item) => item.got)
  }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          {core.drawAction(this, "clearWhatIGot")}
          {core.drawEach(this.aisles, (aisle) => core.drawThing(aisle))}
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a shopping list, drawn in its own element, e.g. by `draw the shopping list`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its shopping list's properties;  its methods call its shopping list's.
 * - What every view's element does, e.g. drawing its shopping list, is `SpellElement`'s.
 */
export class ShoppingListElement extends SpellElement<ShoppingList> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "shopping list", [
    { name: "items", kind: "json", description: "Its items." }
  ])

  clearWhatIGot() {
    return this.currentThing?.clearWhatIGot()
  }
}
core.useElement(ShoppingList, ShoppingListElement)
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `ItemElement` */
      "test-project-item": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `AisleElement` */
      "test-project-aisle": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ShoppingListElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
