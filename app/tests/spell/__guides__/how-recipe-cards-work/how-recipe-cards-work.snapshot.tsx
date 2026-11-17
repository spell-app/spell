import { core, List, App, View, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "number" })
  accessor amount!: number

  // - its "unit" is text
  @prop({ type: "text" })
  accessor unit!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  /** for how many are eating */
  get scaled() {
    return this.amount * recipeCards.scale
  }

  @drawn draw() {
    return (
      <ui-stack direction="horizontal" spacing="sm">
        <ui-text bold={true}>{core.joined(this.scaled, this.unit, " ")}</ui-text>
        <ui-text>{this.name}</ui-text>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-ingredient>`:  an ingredient, drawn in its own element, e.g. by `draw the ingredient`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its ingredient's properties;  its methods call its ingredient's.
 * - What every view's element does, e.g. drawing its ingredient, is `SpellElement`'s.
 */
export class IngredientElement extends SpellElement<Ingredient> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-ingredient", "ingredient", [
    { name: "amount", kind: "number", description: "Its amount." },
    { name: "unit", kind: "string", description: "Its unit." },
    { name: "name", kind: "string", description: "Its name." }
  ])
}
core.useElement(Ingredient, IngredientElement)

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text" })
  accessor title!: string

  // - its "serves" is a number
  @prop({ type: "number" })
  accessor serves!: number

  /** kept inside the recipe:  the example's JSON file holds each recipe whole */
  // - its "ingredients" is a list of ingredients
  @prop({ itemType: "Ingredient", init: () => new List<Ingredient>({ instanceType: "Ingredient" }) })
  accessor ingredients!: List<Ingredient>

  @drawn draw() {
    return (
      <ui-stack spacing="xs">
        <ui-header size="small">{this.title}</ui-header>
        {core.drawEach(this.ingredients, (ingredient) => core.drawThing(ingredient))}
      </ui-stack>
    )
  }
}

/**
 * `<test-project-recipe>`:  a recipe, drawn in its own element, e.g. by `draw the recipe`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe's properties;  its methods call its recipe's.
 * - What every view's element does, e.g. drawing its recipe, is `SpellElement`'s.
 */
export class RecipeElement extends SpellElement<Recipe> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe", "recipe", [
    { name: "serves", kind: "number", description: "Its serves." },
    { name: "ingredients", kind: "json", description: "Its ingredients." }
  ])
}
core.useElement(Recipe, RecipeElement)

core.heading("Cups and millilitres, by Spell's measures")
//## Cups and millilitres, by Spell's measures
/** a cup's size is Spell's own, from its volume units */
export function countTheCupsInMillilitres(millilitres: number) {
  return core.asAction({ undoneAs: "Count the Cups in Millilitres" }, () => millilitres / core.convertMeasure(1, "Volume", "cup", "milliliter"))
}

core.heading("The app")
/** The app */
export class RecipeCard extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** how many are eating */
  // - its "diners" is a number starting at 6
  @prop({ type: "number", init: () => 6 })
  accessor diners!: number

  // "soup" is a new recipe with title "Tomato Soup", serves = 4
  @prop({ init: () => new Recipe({
    id: "soup",
    title: "Tomato Soup",
    serves: 4
  }), early: true })
  accessor soup!: Recipe

  /** how much more, or less, than the recipe says */
  get scale() {
    return this.diners / this.soup.serves
  }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-form prop:value={this}>
            <ui-field label="Cooking for">
              <ui-input name="diners" type="number" min="1" labeled="right" label="people" />
            </ui-field>
          </ui-form>
          {core.drawThing(this.soup)}
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a recipe card, drawn in its own element, e.g. by `draw the recipe card`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe card's properties;  its methods call its recipe card's.
 * - What every view's element does, e.g. drawing its recipe card, is `SpellElement`'s.
 */
export class RecipeCardElement extends SpellElement<RecipeCard> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "recipe card", [
    { name: "diners", kind: "number", description: "Its diners." },
    { name: "soup", kind: "json", description: "Its soup." }
  ])
}
core.useElement(RecipeCard, RecipeCardElement)
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `IngredientElement` */
      "test-project-ingredient": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeElement` */
      "test-project-recipe": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeCardElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
