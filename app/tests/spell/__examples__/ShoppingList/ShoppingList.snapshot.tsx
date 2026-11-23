import { core, List, App, View, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Shopping List:  where the list is kept")
////////////////////////////////////////////
// ## Shopping List:  where the list is kept
////////////////////////////////////////////

export class Item extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 518, end: 536 } })
  accessor name!: string

  /** How many, in its unit:  nothing when it doesn't matter */
  // - its "amount" is a number
  @prop({ type: "number", declaredAt: { path: "/ShoppingList.api.spell", start: 538, end: 622 } })
  accessor amount!: number

  /** "g", "cups", "tins" ...;  nothing for a count, 2 eggs */
  // - its "unit" is text
  @prop({ type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 624, end: 701 } })
  accessor unit!: string

  /** Where it is in the shop:  the list groups by it */
  // - its "aisle" is text
  @prop({ type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 703, end: 775 } })
  accessor aisle!: string

  /** Ticked off:  it's in the trolley */
  // - its "got" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/ShoppingList.api.spell", start: 777, end: 837 } })
  accessor got!: boolean

  /** The recipe it's for, when Recipe Cards added it */
  // - its "recipe" is text
  @prop({ type: "text", declaredAt: { path: "/ShoppingList.api.spell", start: 839, end: 912 } })
  accessor recipe!: string

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

  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack class="item" direction="horizontal" spacing="sm">
          <ui-checkbox name="got" aria-label="Got it" />
          <ui-text class="how-much" bold={true}>{this.howMuch}</ui-text>
          <ui-text class="name">{this.name}</ui-text>
          {core.drawIf(() => this.recipe !== "", () => <>
            <ui-text class="for" color="grey" size="small">for {this.recipe}</ui-text>
          </>)}
          {core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })}
        </ui-stack>
      </ui-form>
    )
  }

  static savedIn = {
    place: "shopping_sheet",
    collection: "items",
    times: ["created", "modified"]
  }

  // - it lives in shopping sheet
  @prop({ type: "date", declaredAt: { path: "/ShoppingList.api.spell", start: 490, end: 516 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in shopping sheet
  @prop({ type: "date", declaredAt: { path: "/ShoppingList.api.spell", start: 490, end: 516 } })
  accessor modified!: any /* spell: type unknown */
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
    { name: "got", kind: "boolean", description: "Its got." },
    { name: "recipe", kind: "string", description: "Its recipe." },
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  remove() {
    return this.currentThing?.remove()
  }
}
core.useElement(Item, ItemElement)
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
  @prop({ type: "text" })
  accessor name!: string

  /** What's still to get in it */
  // - its "items" is a list of items
  @prop({ itemType: "Item", init: () => new List<Item>({ instanceType: "Item" }) })
  accessor items!: List<Item>

  @drawn draw() {
    return (
      <ui-stack class="aisle" spacing="xs">
        <ui-header class="aisle-name" size="tiny">{this.name}</ui-header>
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

export class AisleList extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Each aisle with something still to get in it, once, in the order of their names */
  static { this.declareProp("aisles", { declaredAt: { path: "/AisleList.spell", start: 507, end: 942 }, readsFrom: ["shopping_sheet"] }) }
  get aisles() { return core.waitedValue(this, "aisles", async () => {
    const found = new List<Aisle>({ instanceType: "Aisle" })
    core.map(core.sortedBy(await core.savedThings(Item, { filter: { got: false } }), (item: Item) => item.aisle), (item: Item) => {
      let aisle = found.filter((aisle) => aisle.name === item.aisle).firstItem
      if (aisle === undefined) {
        aisle = new Aisle({ name: item.aisle })
        found.append(aisle!)
      }
      core.append(aisle?.items!, item)
    })
    return found
  }) }

  /** In the trolley already */
  static { this.declareProp("got", { declaredAt: { path: "/AisleList.spell", start: 944, end: 988 }, readsFrom: ["shopping_sheet"] }) }
  get got() { return core.waitedValue(this, "got", async () => {
    return await core.savedThings(Item, { filter: { got: true } })
  }) }

  @drawn draw() {
    return (
      <ui-stack class="aisle-list">
        {core.drawRead(() => this.aisles, (aisle: Aisle) => core.drawThing(aisle), { none: () => <ui-text color="grey">Nothing left to get</ui-text>, failed: () => <ui-text color="grey">{"Can't reach the list just now:  it tries again soon"}</ui-text> })}
        <ui-stack class="got" spacing="xs">
          {core.drawRead(() => this.got, (item: Item) => core.drawThing(item), { failed: () => {} })}
        </ui-stack>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-aisle-list>`:  an aisle list, drawn in its own element, e.g. by `draw the aisle list`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its aisle list's properties;  its methods call its aisle list's.
 * - What every view's element does, e.g. drawing its aisle list, is `SpellElement`'s.
 */
export class AisleListElement extends SpellElement<AisleList> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-aisle-list", "aisle list", [])
}
core.useElement(AisleList, AisleListElement)
// -----------
core.heading("Shopping List")
///////////////////
// ## Shopping List
///////////////////
// What to buy, by aisle:  add an item, tick it off as you shop, clear what you got, and print what's left.
// Its items are in a CSV file Numbers or Excel opens:  ShoppingList.api.spell says where.
// An item draws itself in Item.spell, and the list by aisle is AisleList.spell;  this file holds the app.

@thing
export class ShoppingList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "aisle list" is a new aisle list
  @prop({ init: () => new AisleList({ id: "aisle-list" }), early: true })
  accessor aisleList!: AisleList

  /** The next item, as the form above the list holds it */
  // - its "new item" is a new item
  @prop({ init: () => new Item(), early: true })
  accessor newItem!: Item

  /** The first time, with an empty file, a few to start with */
  async create() {
    let kept: undefined = undefined
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
    await core.inOneGo(async () => core.map(await core.filterInTurn(await core.savedThings(Item, { filter: { got: true } }), async (item: Item) => await core.answerOf(item, "got")), (item: Item) => core.removeSaved(item)))
  }

  /** Only what's still to get, by aisle:  styles.css says what's on paper */
  printTheList() {
    core.openPrinting()
  }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-toolbar>
            <ui-text size="large" heavy={true} slot="title">Shopping List</ui-text>
            {core.drawAction(this, "clearWhatIGot", { "in-menu": true })}
            {core.drawAction(this, "printTheList", { "in-menu": true })}
            <spacer />
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
          </ui-toolbar>
          <ui-form class="new-item" prop:value={this.newItem}>
            <ui-fields unstackable={true}>
              <ui-field width="3">
                <ui-input name="amount" type="number" min="0" placeholder="How many" aria-label="Amount" />
              </ui-field>
              <ui-field width="3">
                <ui-input name="unit" placeholder="Unit" aria-label="Unit" />
              </ui-field>
              <ui-field width="6">
                <ui-input name="name" placeholder="Something to buy" aria-label="Item" />
              </ui-field>
              <ui-field width="4">
                <ui-input name="aisle" placeholder="Aisle" aria-label="Aisle" action={true}>
                  {core.drawAction(this, "addTheNewItem", { slot: "action", color: "primary", "icon-only": true })}
                </ui-input>
              </ui-field>
            </ui-fields>
          </ui-form>
          {core.drawThing(this.aisleList)}
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
    { name: "aisle-list", kind: "json", description: "Its aisleList." },
    { name: "new-item", kind: "json", description: "Its newItem." }
  ])

  create() {
    return this.currentThing?.create()
  }

  addTheNewItem() {
    return this.currentThing?.addTheNewItem()
  }

  clearWhatIGot() {
    return this.currentThing?.clearWhatIGot()
  }

  printTheList() {
    return this.currentThing?.printTheList()
  }
}
core.useElement(ShoppingList, ShoppingListElement)
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `ItemElement` */
      "test-project-item": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `AisleElement` */
      "test-project-aisle": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `AisleListElement` */
      "test-project-aisle-list": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ShoppingListElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
