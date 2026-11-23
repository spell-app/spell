import { core, List, App, View, Place, h } from "@spell/core"

core.heading("Shopping List:  where the list is kept")
////////////////////////////////////////////
// ## Shopping List:  where the list is kept
////////////////////////////////////////////

export class Item extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 518, end: 536 } }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** How many, in its unit:  nothing when it doesn't matter */
  // - its "amount" is a number
  static { this.declareProp("amount", { type: "number", declaredAt: { path: "/ShoppingList.api.spell", start: 538, end: 622 } }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  /** "g", "cups", "tins" ...;  nothing for a count, 2 eggs */
  // - its "unit" is text
  static { this.declareProp("unit", { type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 624, end: 701 } }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  /** Where it is in the shop:  the list groups by it */
  // - its "aisle" is text
  static { this.declareProp("aisle", { type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 703, end: 775 } }) }
  get aisle() { return this.getProp("aisle") }
  set aisle(value) { this.setProp("aisle", value) }

  /** Ticked off:  it's in the trolley */
  // - its "got" is yes or no
  static { this.declareProp("got", { type: "choice", declaredAt: { path: "/ShoppingList.api.spell", start: 777, end: 837 } }) }
  get got() { return this.getProp("got") }
  set got(value) { this.setProp("got", value) }

  /** The recipe it's for, when Recipe Cards added it */
  // - its "recipe" is text
  static { this.declareProp("recipe", { type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 839, end: 912 } }) }
  get recipe() { return this.getProp("recipe") }
  set recipe(value) { this.setProp("recipe", value) }

  static { this.declareProp("isNeeded", { declaredAt: { path: "/ShoppingList.api.spell", start: 914, end: 945 }, readsFrom: ["shopping_sheet"] }) }
  get isNeeded() {
    return !this.got
  }

  /** Its amount and unit as people write them:  "2", "200 g", "1 1/2 cups";  nothing with no amount */
  static { this.declareProp("howMuch", { declaredAt: { path: "/Item.spell", start: 234, end: 439 }, readsFrom: ["shopping_sheet"] }) }
  get howMuch() {
    if (this.amount === undefined || this.amount === 0) return ""
    return core.joined(this.amount, this.unit, " ")
  }

  /** Off the list, and out of the file */
  remove() {
    core.removeSaved(this)
  }

  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { class: "item", direction: "horizontal", spacing: "sm" },
        h("ui-checkbox", { name: "got", "aria-label": "Got it" }),
        h("ui-text", { class: "how-much", bold: true }, () => this.howMuch),
        h("ui-text", { class: "name" }, () => this.name),
        () => core.drawIf(() => this.recipe !== "", () => [h("ui-text", { class: "for", color: "grey", size: "small" }, "for ", () => this.recipe)]),
        core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })
      )
    )
  }

  static savedIn = {
    place: "shopping_sheet",
    collection: "items",
    times: ["created", "modified"]
  }

  // - it lives in shopping sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/ShoppingList.api.spell", start: 490, end: 516 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in shopping sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/ShoppingList.api.spell", start: 490, end: 516 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Item, "remove", { title: "Remove", icon: "close", undoneAs: "Remove" })

/**
 * In a CSV file, in this example's own folder:  __data/shopping.csv.
 * Open it in Numbers or Excel:  a row for each item, a column for each of its fields.
 * The page server writes it, changing only the lines that change;  everyone using that page server shares one list.
 * Recipe Cards keeps the ingredients you pick here too:  it imports this file, so both name this one list.
 */
export class ShoppingSheet extends Place {}
export const shoppingSheet = core.place(new ShoppingSheet(), {
  name: "shopping_sheet",
  kind: "sheet",
  at: "/api/places/spaces/@spell/examples/ShoppingList/__data/shopping.csv"
})

// -----------
core.heading("An item on the list")
/////////////////////////
// ## An item on the list
/////////////////////////
// A row of its own:  a box to tick, how much, its name, the recipe it's for, and a button to take it off.
// Ticking the box changes the item, which saves itself:  the CSV file's line changes at once.

export function testHowMuchReads() {
  return core.test("test how much reads", function testHowMuchReads() {
    const it = new Item()
    core.echoTestAction(`set the item to a new item with name "flour", amount = 200, unit = "g"`)
    let item = new Item({
      name: "flour",
      amount: 200,
      unit: "g"
    })
    core.expect(item.howMuch, `the item's how much`, "200 g", `"200 g"`)
    core.echoTestAction(`set the item to a new item with name "lemons"`)
    item = new Item({ name: "lemons" })
    core.expect(item.howMuch, `the item's how much`, "", `""`)
  })
}
// -----------
core.heading("The list, by aisle")
////////////////////////
// ## The list, by aisle
////////////////////////
// What's still to get, an aisle at a time, A to Z;  then what you've got, faded, at the bottom.
// Shopping List draws it, and so does Recipe Cards:  it imports this file, so both show the same list.

export class Aisle extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** What's still to get in it */
  // - its "items" is a list of items
  static { this.declareProp("items", { itemType: "Item", init: () => new List({ instanceType: "Item" }) }) }
  get items() { return this.getProp("items") }
  set items(value) { this.setProp("items", value) }

  draw() {
    return h("ui-stack", { class: "aisle", spacing: "xs" },
      h("ui-header", { class: "aisle-name", size: "tiny" }, () => this.name),
      () => core.drawEach(this.items, (item) => core.drawThing(item))
    )
  }
}

export class AisleList extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Each aisle with something still to get in it, once, in the order of their names */
  static { this.declareProp("aisles", { declaredAt: { path: "/AisleList.spell", start: 507, end: 942 }, readsFrom: ["shopping_sheet"] }) }
  get aisles() { return core.waitedValue(this, "aisles", async () => {
    const found = new List({ instanceType: "Aisle" })
    core.map(core.sortedBy(await core.savedThings(Item, { filter: { got: false } }), (item) => item.aisle), (item) => {
      let aisle = found.filter((aisle) => aisle.name === item.aisle).firstItem
      if (aisle === undefined) {
        aisle = new Aisle({ name: item.aisle })
        found.append(aisle)
      }
      core.append(aisle?.items, item)
    })
    return found
  }) }

  /** In the trolley already */
  static { this.declareProp("got", { declaredAt: { path: "/AisleList.spell", start: 944, end: 988 }, readsFrom: ["shopping_sheet"] }) }
  get got() { return core.waitedValue(this, "got", async () => {
    return await core.savedThings(Item, { filter: { got: true } })
  }) }

  draw() {
    return h("ui-stack", { class: "aisle-list" },
      () => core.drawRead(() => this.aisles, (aisle) => core.drawThing(aisle), { none: () => h("ui-text", { color: "grey" }, "Nothing left to get"), failed: () => h("ui-text", { color: "grey" }, "Can't reach the list just now:  it tries again soon") }),
      h("ui-stack", { class: "got", spacing: "xs" },
        () => core.drawRead(() => this.got, (item) => core.drawThing(item), { failed: () => {} })
      )
    )
  }
}
// -----------
core.heading("Shopping List")
///////////////////
// ## Shopping List
///////////////////
// What to buy, by aisle:  add an item, tick it off as you shop, clear what you got, and print what's left.
// Its items are in a CSV file Numbers or Excel opens:  ShoppingList.api.spell says where.
// An item draws itself in Item.spell, and the list by aisle is AisleList.spell;  this file holds the app.

export class ShoppingList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "aisle list" is a new aisle list
  static { this.declareProp("aisleList", { init: () => new AisleList({ id: "aisle-list" }), early: true }) }
  get aisleList() { return this.getProp("aisleList") }
  set aisleList(value) { this.setProp("aisleList", value) }

  /** The next item, as the form above the list holds it */
  // - its "new item" is a new item
  static { this.declareProp("newItem", { init: () => new Item(), early: true }) }
  get newItem() { return this.getProp("newItem") }
  set newItem(value) { this.setProp("newItem", value) }

  /** The first time, with an empty file, a few to start with */
  async create() {
    let kept = undefined
    try {
      kept = await core.savedThings(Item)
    }
    catch (error) {
      // The file can't be read just now:  the list says so, and tries again
      return
    }
    if (core.isEmpty(kept)) {
      core.saveThing(new Item({
        name: "milk",
        aisle: "Dairy",
        amount: 2,
        unit: "litres"
      }))
      core.saveThing(new Item({
        name: "eggs",
        aisle: "Dairy",
        amount: 12
      }))
      core.saveThing(new Item({
        name: "bananas",
        aisle: "Fruit and veg",
        amount: 6
      }))
      core.saveThing(new Item({
        name: "spinach",
        aisle: "Fruit and veg",
        amount: 200,
        unit: "g"
      }))
      core.saveThing(new Item({
        name: "bread",
        aisle: "Bakery",
        amount: 1,
        unit: "loaf"
      }))
      core.saveThing(new Item({
        name: "coffee",
        aisle: "Drinks",
        amount: 250,
        unit: "g",
        got: true
      }))
    }
  }

  /** The form's item, onto the list and into the file;  the form empties, keeping its aisle */
  addTheNewItem() {
    if (this.newItem.name === "") return
    core.saveThing(this.newItem)
    this.newItem = new Item({ aisle: this.newItem.aisle })
  }

  /** Every ticked item off the list, in one step to undo */
  async clearWhatIGot() {
    await core.inOneGo(async () => core.map(await core.filterInTurn(await core.savedThings(Item, { filter: { got: true } }), async (item) => await core.answerOf(item, "got")), (item) => core.removeSaved(item)))
  }

  /** Only what's still to get, by aisle:  styles.css says what's on paper */
  printTheList() {
    core.openPrinting()
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-toolbar",
          h("ui-text", { size: "large", heavy: true, slot: "title" }, "Shopping List"),
          core.drawAction(this, "clearWhatIGot", { "in-menu": true }),
          core.drawAction(this, "printTheList", { "in-menu": true }),
          h("spacer"),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })
        ),
        h("ui-form", { class: "new-item", "prop:value": () => this.newItem },
          h("ui-fields", { unstackable: true },
            h("ui-field", { width: "3" },
              h("ui-input", { name: "amount", type: "number", min: "0", placeholder: "How many", "aria-label": "Amount" })
            ),
            h("ui-field", { width: "3" },
              h("ui-input", { name: "unit", placeholder: "Unit", "aria-label": "Unit" })
            ),
            h("ui-field", { width: "6" },
              h("ui-input", { name: "name", placeholder: "Something to buy", "aria-label": "Item" })
            ),
            h("ui-field", { width: "4" },
              h("ui-input", { name: "aisle", placeholder: "Aisle", "aria-label": "Aisle", action: true },
                core.drawAction(this, "addTheNewItem", { slot: "action", color: "primary", "icon-only": true })
              )
            )
          )
        ),
        () => core.drawThing(this.aisleList)
      )
    )
  }
}
export const shoppingList = new ShoppingList()
core.describeAction(ShoppingList, "addTheNewItem", { title: "Add", icon: "plus", undoneAs: "Add" })
core.describeAction(ShoppingList, "clearWhatIGot", { title: "Clear what I got", icon: "check", undoneAs: "Clear what I got" })
core.describeAction(ShoppingList, "printTheList", { title: "Print", icon: "print", undoneAs: "Print" })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet. */¬¬/* got:  it fades */¬.got {¬  opacity: 0.6;¬}¬¬/* On paper (\`open printing\`):  only what's still to get, by aisle, each with its box to tick */¬@media print {¬  ui-toolbar,¬  .new-item,¬  .got,¬  .item ui-button {¬    display: none;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) shoppingList.start()
// -----------
if (!core.isCarryingOver) testHowMuchReads()
