import { core, List, App, View, h } from "@spell/core"

core.heading("How Recipe Cards work")
///////////////////////////
// ## How Recipe Cards work
///////////////////////////
// Recipe Cards is a small app for cooking.
// You pick a recipe, say how many people are eating, and every amount changes to match.
// You can see the amounts in grams and ml, or in cups and spoons,
// and send the ingredients you tick to the Shopping List example's list.
// It keeps the recipes in a JSON file:  a plain text file any editor opens.
//
// Three ideas do the work, and this guide shows each one:
// - a recipe holds its own list of ingredients, saved with it
// - each amount is worked out from how many people are eating
// - Spell knows how big a cup is, so it can turn millilitres into cups
//
// Here the recipe is kept in memory, so it starts again each time you run it.
// For the whole example, open Recipe Cards from Examples on the home page.

core.heading("An ingredient, and a recipe that holds them")
/** An ingredient, and a recipe that holds them */
export class Ingredient extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** for the recipe's own number of people */
  // - its "amount" is a number
  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  // - its "unit" is text
  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** for how many are eating */
  get scaled() {
    return this.amount * recipeCards.scale
  }

  draw() {
    return h("ui-stack", { direction: "horizontal", spacing: "sm" },
      h("ui-text", { bold: true }, () => core.joined(this.scaled, this.unit, " ")),
      h("ui-text", () => this.name)
    )
  }
}

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "serves" is a number
  static { this.declareProp("serves", { type: "number" }) }
  get serves() { return this.getProp("serves") }
  set serves(value) { this.setProp("serves", value) }

  /** kept inside the recipe:  the example's JSON file holds each recipe whole */
  // - its "ingredients" is a list of ingredients
  static { this.declareProp("ingredients", { itemType: "Ingredient", init: () => new List({ instanceType: "Ingredient" }) }) }
  get ingredients() { return this.getProp("ingredients") }
  set ingredients(value) { this.setProp("ingredients", value) }

  draw() {
    return h("ui-stack", { spacing: "xs" },
      h("ui-header", { size: "small" }, () => this.title),
      () => core.drawEach(this.ingredients, (ingredient) => core.drawThing(ingredient))
    )
  }
}

core.heading("Cups and millilitres, by Spell's measures")
//## Cups and millilitres, by Spell's measures
/** a cup's size is Spell's own, from its volume units */
export function countTheCupsInMillilitres(millilitres) {
  return core.asAction({ undoneAs: "Count the Cups in Millilitres" }, () => millilitres / core.convertMeasure(
    1,
    "Volume",
    "cup",
    "milliliter"
  ))
}

core.heading("The app")
/** The app */
export class RecipeCard extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** how many are eating */
  // - its "diners" is a number starting at 6
  static { this.declareProp("diners", { type: "number", init: () => 6 }) }
  get diners() { return this.getProp("diners") }
  set diners(value) { this.setProp("diners", value) }

  // "soup" is a new recipe with title "Tomato Soup", serves = 4
  static { this.declareProp("soup", { init: () => new Recipe({
    id: "soup",
    title: "Tomato Soup",
    serves: 4
  }), early: true }) }
  get soup() { return this.getProp("soup") }
  set soup(value) { this.setProp("soup", value) }

  /** how much more, or less, than the recipe says */
  get scale() {
    return this.diners / this.soup.serves
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-form", { "prop:value": this },
          h("ui-field", { label: "Cooking for" },
            h("ui-input", { name: "diners", type: "number", min: "1", labeled: "right", label: "people" })
          )
        ),
        () => core.drawThing(this.soup)
      )
    )
  }
}
export const recipeCards = new RecipeCard()

core.heading("Start:  the soup's ingredients")
//## Start:  the soup's ingredients
core.append(recipeCards.soup.ingredients, new Ingredient({
  amount: 1000,
  unit: "g",
  name: "ripe tomatoes"
}))
core.append(recipeCards.soup.ingredients, new Ingredient({
  amount: 2,
  unit: "tbsp",
  name: "olive oil"
}))
core.append(recipeCards.soup.ingredients, new Ingredient({
  amount: 500,
  unit: "ml",
  name: "vegetable stock"
}))

core.heading("A check")
//## A check
/** a cup is 236.6 ml, so 1 litre is a little over 4 cups */
export function testTheMeasures() {
  return core.test("test the measures", function testTheMeasures() {
    core.expect(Math.round(countTheCupsInMillilitres(1000) * 10), `round ((count the cups in 1000) * 10)`, 42, `42`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Change "Cooking for" to 2:  every amount halves.
// - Show the stock in cups:  change its line in "to draw it" to say {count the cups in its scaled}.
// - Add a step list:  a "step" with its words, and "its steps is a list of steps" on the recipe.
//
// Where next:  Recipe Cards, from Examples on the home page, with its pictures, its Edit screen and its shopping list.

core.heading("Where the example keeps its recipes")
/////////////////////////////////////////
// ## Where the example keeps its recipes
/////////////////////////////////////////
// This guide's recipe lives in memory:  reload, and it starts again.
// Recipe Cards keeps them in a JSON file, in its own folder:  __data/recipes.json.
// One line, in its API file, says so:
//       recipe file is a json file at "recipes.json"
// and a recipe says it lives there:
//       it lives in recipe file
// The page server writes the file whole, as plain JSON:  { "recipes": [ ... ] },
// each recipe with its ingredients and steps inside it, as this guide's recipe holds them.
// Its shopping list isn't there:  Recipe Cards imports Shopping List's API file, in its project file,
//       { "path": "@spell/examples/ShoppingList", "import": ["Item", "Aisle", "AisleList"] }
// so the ingredients it adds land in Shopping List's CSV file, and both show the same list.
// -----------
if (!core.isCarryingOver) recipeCards.start()
// -----------
if (!core.isCarryingOver) testTheMeasures()
