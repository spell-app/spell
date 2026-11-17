import { core, Thing, List, App, View, Place, prop, derived, thing, drawn, withSpellPositions, positionOf, spellPosition, position } from "@spell/core"
import { E, SpellElement } from "@spell/elements"
import { Item, Aisle, AisleList, ShoppingSheet } from "@spell/project/@spell/examples/ShoppingList"

core.heading("Recipe Cards:  where the recipes are kept")
///////////////////////////////////////////////
// ## Recipe Cards:  where the recipes are kept
///////////////////////////////////////////////

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeCards.api.spell", start: 578, end: 597 } })
  accessor title!: string

  /** How many people it's written for:  the amounts are for that many */
  // - its "serves" is a number
  @prop({ type: "number", declaredAt: { path: "/RecipeCards.api.spell", start: 599, end: 693 } })
  accessor serves!: number

  /** A picture's address:  one in this example's pictures folder, or any on the web */
  // - its "picture" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeCards.api.spell", start: 695, end: 800 } })
  accessor picture!: string

  /** What goes in, in order:  kept inside the recipe */
  // - its "ingredients" is a list of ingredients
  @prop({ itemType: "Ingredient", init: () => new List<Ingredient>({ instanceType: "Ingredient" }), declaredAt: { path: "/RecipeCards.api.spell", start: 802, end: 897 } })
  accessor ingredients!: List<Ingredient>

  /** What to do, in order:  kept inside the recipe */
  // - its "steps" is a list of steps
  @prop({ itemType: "Step", init: () => new List<Step>({ instanceType: "Step" }), declaredAt: { path: "/RecipeCards.api.spell", start: 899, end: 980 } })
  accessor steps!: List<Step>

  static { this.declareProp("pickedCount", { declaredAt: { path: "/RecipeCard.spell", start: 210, end: 302 }, readsFrom: ["recipe_file"] }) }
  @derived get pickedCount() {
    return core.itemCountOf(core.filter(this.ingredients, (ingredient: Ingredient) => ingredient.picked))
  }

  /** Its card, in place of whatever was showing */
  pick() {
    recipeCards.chosen = this
    recipeCards.editing = undefined
  }

  /** Its Edit screen */
  edit() {
    recipeCards.editing = this
  }

  /** Each picked ingredient, for how many are eating, onto Shopping List's list;  the same thing in the same unit adds up */
  async addThePickedToTheShoppingList() {
    const dish = this.title
    await core.forEachSequential(this.ingredients, async (ingredient: Ingredient) => {
      if (ingredient.picked) {
        const measure = ingredient.shown
        const same = core.getItemAt<Item>(core.filter(await core.savedThings(Item, { filter: { got: false } }), (item: Item) => item.name === ingredient.name && item.unit === measure.unit), 0)
        if (same !== undefined) same.amount = same.amount + measure.number
        else {
          core.saveThing(new Item({
            name: ingredient.name,
            amount: measure.number,
            unit: measure.unit,
            aisle: ingredient.aisle,
            recipe: dish
          }))
        }
        ingredient.picked = false
      }
    })
  }

  @drawn draw() {
    return (
      <ui-card class="recipe" fluid={true}>
        <ui-image src={this.picture} alt={this.title} aspect-ratio="21:9" crop={true} hidden={this.picture !== "" ? undefined : true} />
        <ui-content>
          <ui-stack>
            <ui-stack direction="horizontal" justify="between">
              <ui-header size="large">{this.title}</ui-header>
              {core.drawAction(this, "edit")}
            </ui-stack>
            <ui-text color="grey">
              {"The recipe is for "}
              {this.serves}
              {" people.  These amounts are for the "}
              {recipeCards.diners}
              {" you're cooking for."}
            </ui-text>
            <ui-header size="small">Ingredients</ui-header>
            <ui-stack spacing="xs">{core.drawEach(this.ingredients, (ingredient) => core.drawThing(ingredient))}</ui-stack>
            <ui-stack direction="horizontal">
              <ui-button color="primary" icon="cart plus" disabled={this.pickedCount === 0} onClick={core.pressed(this, async () => await this.addThePickedToTheShoppingList())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                {"Add "}
                {this.pickedCount}
                {" ticked items to the shopping list"}
              </ui-button>
            </ui-stack>
            <ui-header size="small">Steps</ui-header>
            {this.drawSteps()}
          </ui-stack>
        </ui-content>
      </ui-card>
    )
  }

  drawSteps() {
    // Each step with its number
    return <ui-stack spacing="sm" part="steps">{this.drawNumberedSteps()}</ui-stack>
  }

  drawNumberedSteps() {
    return core.drawEach(this.steps, withSpellPositions((step: Step, place: number) => <ui-stack class="step" direction="horizontal" spacing="sm" align="start" part="numbered_steps">
      <ui-label circular={true} size="small">{place}</ui-label>
      <ui-text>{step.instruction}</ui-text>
    </ui-stack>))
  }

  static savedIn = {
    place: "recipe_file",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in recipe file
  @prop({ type: "date", declaredAt: { path: "/RecipeCards.api.spell", start: 553, end: 576 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in recipe file
  @prop({ type: "date", declaredAt: { path: "/RecipeCards.api.spell", start: 553, end: 576 } })
  accessor modified!: any /* spell: type unknown */
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
    { name: "picture", kind: "string", description: "Its picture." },
    { name: "ingredients", kind: "json", description: "Its ingredients." },
    { name: "steps", kind: "json", description: "Its steps." },
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  pick() {
    return this.currentThing?.pick()
  }

  edit() {
    return this.currentThing?.edit()
  }

  addThePickedToTheShoppingList() {
    return this.currentThing?.addThePickedToTheShoppingList()
  }

  drawSteps() {
    return this.currentThing?.drawSteps()
  }

  drawNumberedSteps() {
    return this.currentThing?.drawNumberedSteps()
  }
}
core.useElement(Recipe, RecipeElement)
core.describeAction(Recipe, "pick", { title: "Pick It", undoneAs: "Pick It" })
core.describeAction(Recipe, "edit", { title: "Edit", icon: "pencil", undoneAs: "Edit" })
core.describeAction(Recipe, "addThePickedToTheShoppingList", { title: "Add to shopping list", icon: "cart plus", undoneAs: "Add to shopping list" })

/** One line of a recipe:  how much, of what, and where it is in the shop */
export class Ingredient extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** For the recipe's own number of people;  nothing for "a pinch" or "to taste" */
  // - its "amount" is a number
  @prop({ type: "number" })
  accessor amount!: number

  /** "g", "ml", "tbsp", "cups" ...;  nothing for a count, 2 eggs */
  // - its "unit" is text
  @prop({ type: "text" })
  accessor unit!: string

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  /** Where it is in the shop, for the shopping list */
  // - its "aisle" is text
  @prop({ type: "text" })
  accessor aisle!: string

  /** How much a cup of it weighs, so grams show as cups:  flour 125, sugar 200;  nothing for most things */
  // - its "grams per cup" is a number
  @prop({ type: "number" })
  accessor gramsPerCup!: number

  /** Ticked, to go on the shopping list */
  // - its "picked" is yes or no
  @prop({ type: "choice" })
  accessor picked!: boolean

  /** For how many are eating:  its amount times diners over servings */
  static { this.declareProp("scaledAmount", { declaredAt: { path: "/Ingredient.spell", start: 236, end: 297 }, readsFrom: ["recipe_file"] }) }
  get scaledAmount() {
    return this.amount * recipeCards.scale
  }

  /** Its scaled amount in the cook's units */
  static { this.declareProp("shown", { declaredAt: { path: "/Ingredient.spell", start: 368, end: 1365 }, readsFrom: ["recipe_file"] }) }
  get shown() {
    const scaled = this.scaledAmount
    if (recipeCards.units === "cups") {
      if (this.unit === "g" && this.gramsPerCup > 0) return measureAmountInQuartersOfUnit(scaled / this.gramsPerCup, "cups")
      if (this.unit === "g") return measureAmountInUnit(scaled / core.convertMeasure(1, "Weight", "ounce", "gram"), "oz")
      if (this.unit === "kg") return measureAmountInUnit(scaled * 1000 / core.convertMeasure(1, "Weight", "ounce", "gram"), "oz")
      if (this.unit === "ml") return measureMillilitresInSpoonsOrCups(scaled)
      if (this.unit === "l") return measureMillilitresInSpoonsOrCups(scaled * 1000)
    } else {
      if (this.unit === "cups" && this.gramsPerCup > 0) return measureAmountInUnit(scaled * this.gramsPerCup, "g")
      if (this.unit === "cups") return measureAmountInUnit(scaled * core.convertMeasure(1, "Volume", "cup", "milliliter"), "ml")
      if (this.unit === "oz") return measureAmountInUnit(scaled * core.convertMeasure(1, "Weight", "ounce", "gram"), "g")
      if (this.unit === "lb") return measureAmountInUnit(scaled * core.convertMeasure(1, "Weight", "pound", "gram"), "g")
    }
    if (this.unit === "cups" || this.unit === "tbsp" || this.unit === "tsp") return measureAmountInQuartersOfUnit(scaled, this.unit)
    return measureAmountInUnit(scaled, this.unit)
  }

  /** A box to pick it, how much, and what */
  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack class="ingredient" direction="horizontal" spacing="sm">
          <ui-checkbox name="picked" aria-label="Tick to add to the shopping list" />
          <ui-text class="how-much" bold={true}>{this.shown.written}</ui-text>
          <ui-text>{this.name}</ui-text>
        </ui-stack>
      </ui-form>
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
    { name: "name", kind: "string", description: "Its name." },
    { name: "aisle", kind: "string", description: "Its aisle." },
    { name: "grams-per-cup", kind: "number", description: "Its gramsPerCup." },
    { name: "picked", kind: "boolean", description: "Its picked." }
  ])
}
core.useElement(Ingredient, IngredientElement)

/** One thing to do */
export class Step extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "instruction" is text
  @prop({ type: "text" })
  accessor instruction!: string
}

/**
 * `<test-project-step>`:  a step, drawn in its own element, e.g. by `draw the step`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its step's properties;  its methods call its step's.
 * - What every view's element does, e.g. drawing its step, is `SpellElement`'s.
 */
export class StepElement extends SpellElement<Step> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-step", "step", [
    { name: "instruction", kind: "string", description: "Its instruction." }
  ])
}
core.useElement(Step, StepElement)

/**
 * In a JSON file, in this example's own folder:  __data/recipes.json.
 * Plain JSON any editor opens, { "recipes": [...] }:  each recipe whole, its ingredients and steps inside it.
 * The page server writes it, the whole file at each save;  everyone using that page server shares the recipes.
 * The shopping list isn't here:  it's Shopping List's, in its CSV file, which this project imports (__project.json5).
 */
export class RecipeFile extends Place {}
export const recipeFile = core.place(new RecipeFile(), {
  name: "recipe_file",
  kind: "file",
  at: "/api/places/spaces/@spell/examples/RecipeCards/__data/recipes.json",
  checkedEvery: 30
})

// -----------
core.heading("Measures:  an amount in the cook's units")
//////////////////////////////////////////////
// ## Measures:  an amount in the cook's units
//////////////////////////////////////////////
// Metric (grams and millilitres), or cups and spoons:  the same amount, shown either way.
// The units' sizes are Spell's own measures, e.g. "1 cup in ml" is 236.6.
// Grams and counts show whole;  cups and spoons to the nearest quarter, "1 1/2".

/** How much, and in what:  what an ingredient shows, and what goes on the shopping list */
export class Measure extends Thing {
  // - its "number" is a number
  @prop({ type: "number" })
  accessor number!: number

  // - its "unit" is text
  @prop({ type: "text" })
  accessor unit!: string

  /** As a cook writes it:  "200 g", "1 1/2 cups", "2" */
  get written() {
    if (this.number === undefined || this.number === 0) return ""
    if (this.unit === "") return writeAmountForACook(this.number)
    if (this.unit === "cups" && this.number <= 1) return core.joined(writeAmountForACook(this.number), "cup", " ")
    return core.joined(writeAmountForACook(this.number), this.unit, " ")
  }
}

/** Whole:  grams, millilitres, counts */
export function measureAmountInUnit(amount: number, unit: string) {
  return core.asAction({ undoneAs: "Measure Amount in Unit" }, () => new Measure({ number: Math.round(amount), unit: unit }))
}

/** To the nearest quarter:  cups and spoons */
export function measureAmountInQuartersOfUnit(amount: number, unit: string) {
  return core.asAction({ undoneAs: "Measure Amount in Quarters of Unit" }, () => new Measure({ number: Math.round(amount * 4) / 4, unit: unit }))
}

/** The spoon or cup a cook would reach for */
export function measureMillilitresInSpoonsOrCups(millilitres: number) {
  return core.asAction({ undoneAs: "Measure Millilitres in Spoons or Cups" }, () => {
    if (millilitres < core.convertMeasure(1, "Volume", "tablespoon", "milliliter")) return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(1, "Volume", "teaspoon", "milliliter"), "tsp")
    if (millilitres < core.convertMeasure(0.25, "Volume", "cup", "milliliter")) return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(1, "Volume", "tablespoon", "milliliter"), "tbsp")
    return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(1, "Volume", "cup", "milliliter"), "cups")
  })
}

/** A whole number, then a quarter, a half or three quarters:  1.5 is "1 1/2" */
export function writeAmountForACook(amount: number) {
  return core.asAction({ undoneAs: "Write Amount for a Cook" }, () => {
    const quarters = Math.round(amount * 4)
    const whole = parseInt(quarters / 4)
    const leftOver = quarters - whole * 4
    let part: string = ""
    if (leftOver === 1) part = "1/4"
    if (leftOver === 2) part = "1/2"
    if (leftOver === 3) part = "3/4"
    if (part === "") return `${whole}`
    if (whole === 0) return part
    return core.joined(whole, part, " ")
  })
}

export function testFractions() {
  return core.test("test fractions", function testFractions() {
    core.expect(writeAmountForACook(1.5), `write 1.5 for a cook`, "1 1/2", `"1 1/2"`)
    core.expect(writeAmountForACook(0.25), `write 0.25 for a cook`, "1/4", `"1/4"`)
    core.expect(writeAmountForACook(200), `write 200 for a cook`, "200", `"200"`)
    core.expect(measureMillilitresInSpoonsOrCups(250).written, `the written of (measure 250 in spoons or cups)`, "1 cup", `"1 cup"`)
    core.expect(measureMillilitresInSpoonsOrCups(15).written, `the written of (measure 15 in spoons or cups)`, "1 tbsp", `"1 tbsp"`)
  })
}
// -----------
core.heading("Three recipes to start with")
/////////////////////////////////
// ## Three recipes to start with
/////////////////////////////////
// Added the first time Recipe Cards runs, while its file has none:  change them, or add your own.
// The pictures were drawn for this example, and are free to use:  they're in its pictures folder.

export function addTheTomatoSoup() {
  return core.asAction({ undoneAs: "Add the Tomato Soup" }, () => {
    const soup = new Recipe({
      title: "Tomato Soup",
      serves: 4,
      picture: "/spaces/@spell/examples/RecipeCards/pictures/tomato-soup.svg"
    })
    core.append(soup.ingredients, new Ingredient({
      amount: 1,
      unit: "kg",
      name: "ripe tomatoes",
      aisle: "Fruit and veg"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 1,
      name: "onion",
      aisle: "Fruit and veg"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 2,
      unit: "cloves",
      name: "garlic",
      aisle: "Fruit and veg"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 2,
      unit: "tbsp",
      name: "olive oil",
      aisle: "Oils and spices"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 500,
      unit: "ml",
      name: "vegetable stock",
      aisle: "Tins and jars"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 1,
      unit: "tsp",
      name: "sugar",
      aisle: "Baking"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 15,
      unit: "g",
      name: "fresh basil",
      aisle: "Fruit and veg"
    }))
    core.append(soup.ingredients, new Ingredient({
      amount: 100,
      unit: "ml",
      name: "single cream",
      aisle: "Dairy"
    }))
    core.append(soup.steps, new Step({ instruction: "Heat the oven to 200 °C.  Halve the tomatoes, and roast them for 30 minutes with the onion, quartered, and the garlic." }))
    core.append(soup.steps, new Step({ instruction: "Warm the oil in a big pan, and tip in everything from the roasting tin." }))
    core.append(soup.steps, new Step({ instruction: "Pour in the stock, add the sugar, and simmer for 10 minutes." }))
    core.append(soup.steps, new Step({ instruction: "Blend until smooth, with most of the basil.  Season with salt and pepper." }))
    core.append(soup.steps, new Step({ instruction: "Serve with a swirl of cream and the last of the basil on top." }))
    core.saveThing(soup)
  })
}

export function addTheRedLentilDal() {
  return core.asAction({ undoneAs: "Add the Red Lentil Dal" }, () => {
    const dal = new Recipe({
      title: "Red Lentil Dal",
      serves: 4,
      picture: "/spaces/@spell/examples/RecipeCards/pictures/red-lentil-dal.svg"
    })
    core.append(dal.ingredients, new Ingredient({
      amount: 250,
      unit: "g",
      name: "red lentils",
      aisle: "Rice and pulses",
      gramsPerCup: 190
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 1,
      name: "onion",
      aisle: "Fruit and veg"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 3,
      unit: "cloves",
      name: "garlic",
      aisle: "Fruit and veg"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 20,
      unit: "g",
      name: "fresh ginger",
      aisle: "Fruit and veg"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 1,
      unit: "tbsp",
      name: "vegetable oil",
      aisle: "Oils and spices"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 2,
      unit: "tsp",
      name: "cumin seeds",
      aisle: "Oils and spices"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 1,
      unit: "tsp",
      name: "ground turmeric",
      aisle: "Oils and spices"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 400,
      unit: "g",
      name: "chopped tomatoes",
      aisle: "Tins and jars"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 400,
      unit: "ml",
      name: "coconut milk",
      aisle: "Tins and jars"
    }))
    core.append(dal.ingredients, new Ingredient({
      amount: 1,
      name: "lime",
      aisle: "Fruit and veg"
    }))
    core.append(dal.steps, new Step({ instruction: "Rinse the lentils until the water runs clear." }))
    core.append(dal.steps, new Step({ instruction: "Fry the cumin seeds in the oil until they crackle, then the onion, chopped, until soft." }))
    core.append(dal.steps, new Step({ instruction: "Stir in the garlic and ginger, grated, and the turmeric, for a minute." }))
    core.append(dal.steps, new Step({ instruction: "Add the lentils, the tomatoes, the coconut milk and 500 ml of water.  Simmer for 25 minutes, stirring now and then." }))
    core.append(dal.steps, new Step({ instruction: "Squeeze in the lime, season with salt, and serve with rice." }))
    core.saveThing(dal)
  })
}

export function addThePancakes() {
  return core.asAction({ undoneAs: "Add the Pancakes" }, () => {
    const pancakes = new Recipe({
      title: "Blueberry Pancakes",
      serves: 4,
      picture: "/spaces/@spell/examples/RecipeCards/pictures/pancakes.svg"
    })
    core.append(pancakes.ingredients, new Ingredient({
      amount: 200,
      unit: "g",
      name: "plain flour",
      aisle: "Baking",
      gramsPerCup: 125
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 2,
      unit: "tsp",
      name: "baking powder",
      aisle: "Baking"
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 1,
      unit: "tbsp",
      name: "sugar",
      aisle: "Baking"
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 2,
      name: "eggs",
      aisle: "Dairy"
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 300,
      unit: "ml",
      name: "milk",
      aisle: "Dairy"
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 30,
      unit: "g",
      name: "butter",
      aisle: "Dairy"
    }))
    core.append(pancakes.ingredients, new Ingredient({
      amount: 150,
      unit: "g",
      name: "blueberries",
      aisle: "Fruit and veg"
    }))
    core.append(pancakes.steps, new Step({ instruction: "Whisk the flour, baking powder, sugar and a pinch of salt in a bowl." }))
    core.append(pancakes.steps, new Step({ instruction: "Melt the butter.  Beat it with the eggs and milk, then whisk into the flour until just smooth." }))
    core.append(pancakes.steps, new Step({ instruction: "Heat a frying pan over a medium heat, with a little butter." }))
    core.append(pancakes.steps, new Step({ instruction: "Pour in a small ladle of batter, scatter on a few blueberries, and cook until bubbles show.  Flip, and cook a minute more." }))
    core.append(pancakes.steps, new Step({ instruction: "Keep them warm while you cook the rest, and serve with maple syrup." }))
    core.saveThing(pancakes)
  })
}
// -----------
core.heading("Recipe Cards")
//////////////////
// ## Recipe Cards
//////////////////
// Your recipes:  pick one, set how many are eating, and every amount scales;
// show it in metric or in cups and spoons;  tick ingredients and add them to the shopping list.
// The recipes are in a JSON file, RecipeCards.api.spell says where;  the shopping list is Shopping List's own, imported.

export type Units = (typeof RecipeCard.Units)[number]

@thing
export class RecipeCard extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** The recipe on show */
  // - its "chosen" is a recipe
  @prop({ type: "Recipe" })
  accessor chosen!: Recipe

  /** The recipe on its Edit screen, while one is */
  // - its "editing" is a recipe
  @prop({ type: "Recipe" })
  accessor editing!: Recipe

  /** How many are eating */
  // - its "diners" is a number starting at 4
  @prop({ type: "number", init: () => 4 })
  accessor diners!: number

  /** Grams and millilitres, or cups and spoons */
  // - its "units" is one of metric or cups
  static Units = ["metric", "cups"] as const
  @prop({ oneOf: () => RecipeCard.Units })
  accessor units!: Units

  /** How much more, or less, than the recipe says */
  static { this.declareProp("scale", { declaredAt: { path: "/RecipeCards.spell", start: 613, end: 797 }, readsFrom: ["recipe_file"] }) }
  get scale() {
    if (this.chosen === undefined || this.chosen?.serves === 0) return 1
    return this.diners / this.chosen?.serves
  }

  /** Shopping List's own list, by aisle:  the same list, from its CSV file */
  // "aisle list" is a new aisle list
  @prop({ init: () => new AisleList({ id: "aisle-list" }), early: true })
  accessor aisleList!: AisleList

  /** The first time, with an empty file, three recipes to start with */
  async create() {
    try {
      if (core.itemCountOf(await core.savedThings(Recipe)) === 0) {
        addTheTomatoSoup()
        addTheRedLentilDal()
        addThePancakes()
      }
    }
    catch (error) {
      // The file can't be read just now:  the recipes list says so
      return
    }
    this.chosen = core.getItemAt(await core.savedThings(Recipe), 0)
  }

  showMetric() {
    this.units = "metric"
  }
  get showMetricIsSelected() {
    return this.units === "metric"
  }

  showCupsAndSpoons() {
    this.units = "cups"
  }
  get showCupsAndSpoonsIsSelected() {
    return this.units === "cups"
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack>
          <ui-toolbar>
            <ui-text size="large" heavy={true} slot="title">Recipe Cards</ui-text>
            {core.drawAction(this, "showMetric", { "in-menu": true })}
            {core.drawAction(this, "showCupsAndSpoons", { "in-menu": true })}
            <spacer />
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
          </ui-toolbar>
          <ui-grid stackable={true}>
            <ui-column width="5">
              <ui-stack>
                <ui-buttons direction="vertical" fluid={true} basic={true}>
                  {core.drawRead(async () => await core.savedThings(Recipe, {}, "as drawn"), (recipe: Recipe) => <ui-button active={recipe === recipe.chosen} onClick={core.pressed(this, () => recipe.pick())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                    {recipe.title}
                  </ui-button>)}
                </ui-buttons>
                <ui-form prop:value={this}>
                  <ui-field label="Cooking for">
                    <ui-input name="diners" type="number" min="1" labeled="right" label="people" />
                  </ui-field>
                </ui-form>
                <ui-header size="small">Shopping list</ui-header>
                <ui-text color="grey" size="small">Ticked ingredients go here, on the Shopping List app's own list</ui-text>
                {core.drawThing(this.aisleList)}
              </ui-stack>
            </ui-column>
            <ui-column width="11">{this.drawScreen()}</ui-column>
          </ui-grid>
        </ui-stack>
      </ui-container>
    )
  }

  drawScreen() {
    // The Edit screen while a recipe is being changed;  else the chosen recipe's card
    if (this.editing) return core.drawThing(new RecipeEditor({ recipe: this.editing }))
    else if (this.chosen) return core.drawThing(this.chosen!)
    else return <ui-text color="grey" part="screen">Choose a recipe on the left to see its ingredients and steps.</ui-text>
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
    { name: "chosen", kind: "string", description: "Its chosen." },
    { name: "editing", kind: "string", description: "Its editing." },
    { name: "diners", kind: "number", description: "Its diners." },
    { name: "units", kind: "string", description: "Its units." },
    { name: "aisle-list", kind: "json", description: "Its aisleList." }
  ])

  create() {
    return this.currentThing?.create()
  }

  showMetric() {
    return this.currentThing?.showMetric()
  }

  showCupsAndSpoons() {
    return this.currentThing?.showCupsAndSpoons()
  }

  drawScreen() {
    return this.currentThing?.drawScreen()
  }
}
core.useElement(RecipeCard, RecipeCardElement)
export const recipeCards = new RecipeCard()
core.describeAction(RecipeCard, "showMetric", { title: "Grams and ml", selectedWhen: "showMetricIsSelected", undoneAs: "Grams and ml" })
core.describeAction(RecipeCard, "showCupsAndSpoons", { title: "Cups and spoons", selectedWhen: "showCupsAndSpoonsIsSelected", undoneAs: "Cups and spoons" })

// -----------
core.heading("An ingredient, scaled and in the cook's units")
///////////////////////////////////////////////////
// ## An ingredient, scaled and in the cook's units
///////////////////////////////////////////////////
// Its amount is for the recipe's own number of people:  shown for how many are eating, in metric or in cups and spoons.
// A box beside it picks it for the shopping list.

// -----------
core.heading("A recipe's card, and its Edit screen")
//////////////////////////////////////////
// ## A recipe's card, and its Edit screen
//////////////////////////////////////////
// The card:  its picture, how many it's for, its ingredients to pick, and its numbered steps.
// The Edit screen changes a draft:  nothing changes until Save.

// -----------
core.heading("A recipe's Edit screen")
////////////////////////////
// ## A recipe's Edit screen
////////////////////////////
// A form over a draft of the recipe:  change its title, how many it serves and its picture;
// add, remove and move its ingredients and steps.  Nothing changes until Save;  Cancel forgets it all.

export class RecipeEditor extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** The recipe being changed */
  // - its "recipe" is a recipe
  @prop({ type: "Recipe" })
  accessor recipe!: Recipe

  /** A copy to change:  the recipe stays as it was until Save */
  get draft() {
    return core.draftOf(this.recipe!)
  }

  /** Every change at once, one step to undo */
  save() {
    core.saveDraft(this.draft)
    recipeCards.editing = undefined
  }

  /** The recipe never changed */
  cancel() {
    core.discardDraft(this.draft)
    recipeCards.editing = undefined
  }

  addIngredient() {
    core.append(this.draft.ingredients, new Ingredient())
  }

  addStep() {
    core.append(this.draft.steps, new Step())
  }

  @drawn draw() {
    return (
      <ui-card class="editor" fluid={true}>
        <ui-content>
          <ui-form prop:value={this.draft}>
            <ui-header size="medium">Edit {this.recipe?.title}</ui-header>
            <ui-fields>
              <ui-field label="Recipe" width="10">
                <ui-input name="title" />
              </ui-field>
              <ui-field label="Serves" width="6">
                <ui-input name="serves" type="number" min="1" labeled="right" label="people" />
              </ui-field>
            </ui-fields>
            <ui-field label="Picture">
              <ui-input name="picture" placeholder="A link to a photo (optional)" />
            </ui-field>
          </ui-form>
          <ui-header size="small">Ingredients</ui-header>
          {this.drawIngredientRows()}
          {core.drawAction(this, "addIngredient", { appearance: "basic" })}
          <ui-header size="small">Steps</ui-header>
          {this.drawStepRows()}
          {core.drawAction(this, "addStep", { appearance: "basic" })}
        </ui-content>
        <ui-extra>{core.drawAction(this, "save", { color: "primary" })}{core.drawAction(this, "cancel")}</ui-extra>
      </ui-card>
    )
  }

  drawIngredientRows() {
    /** A row of fields for each ingredient on the draft */
    const thisEditor = this
    return core.drawEach(this.draft.ingredients, (one) => core.drawThing(new IngredientRow({ editor: thisEditor, ingredient: one })))
  }

  drawStepRows() {
    /** A box for each step on the draft */
    const thisEditor = this
    return core.drawEach(this.draft.steps, (one) => core.drawThing(new StepRow({ editor: thisEditor, step: one })))
  }
}

/**
 * `<test-project-recipe-editor>`:  a recipe editor, drawn in its own element, e.g. by `draw the recipe editor`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe editor's properties;  its methods call its recipe editor's.
 * - What every view's element does, e.g. drawing its recipe editor, is `SpellElement`'s.
 */
export class RecipeEditorElement extends SpellElement<RecipeEditor> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe-editor", "recipe editor", [
    { name: "recipe", kind: "string", description: "Its recipe." }
  ])

  save() {
    return this.currentThing?.save()
  }

  cancel() {
    return this.currentThing?.cancel()
  }

  addIngredient() {
    return this.currentThing?.addIngredient()
  }

  addStep() {
    return this.currentThing?.addStep()
  }

  drawIngredientRows() {
    return this.currentThing?.drawIngredientRows()
  }

  drawStepRows() {
    return this.currentThing?.drawStepRows()
  }
}
core.useElement(RecipeEditor, RecipeEditorElement)

/** One ingredient's fields on the Edit screen, with buttons to move it and take it out */
export class IngredientRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "ingredient" is an ingredient
  @prop({ type: "Ingredient" })
  accessor ingredient!: Ingredient

  // - its "editor" is a recipe editor
  @prop({ type: "RecipeEditor" })
  accessor editor!: RecipeEditor

  moveUp() {
    const list = this.editor?.draft?.ingredients
    const moving = this.ingredient
    const place = spellPosition(positionOf(list!, moving!))
    if (place === 1) return
    core.remove(list!, moving!)
    core.addBefore(list!, core.getItemAt(list, position(place - 1))!, moving!)
  }

  remove() {
    core.remove(this.editor?.draft?.ingredients!, this.ingredient!)
  }

  @drawn draw() {
    return (
      <ui-form prop:value={this.ingredient}>
        <ui-fields unstackable={true}>
          <ui-field width="2">
            <ui-input name="amount" type="number" min="0" aria-label="Amount" />
          </ui-field>
          <ui-field width="2">
            <ui-input name="unit" placeholder="g, cups ..." aria-label="Unit" />
          </ui-field>
          <ui-field width="6">
            <ui-input name="name" placeholder="Ingredient" aria-label="Ingredient" />
          </ui-field>
          <ui-field width="3">
            <ui-input name="aisle" placeholder="Shop aisle" aria-label="Aisle" />
          </ui-field>
          <ui-field width="3">
            <ui-stack direction="horizontal" spacing="xs">
              {core.drawAction(this, "moveUp", { "icon-only": true, appearance: "tertiary" })}
              {core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })}
            </ui-stack>
          </ui-field>
        </ui-fields>
      </ui-form>
    )
  }
}

/**
 * `<test-project-ingredient-row>`:  an ingredient row, drawn in its own element, e.g. by `draw the ingredient row`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its ingredient row's properties;  its methods call its ingredient row's.
 * - What every view's element does, e.g. drawing its ingredient row, is `SpellElement`'s.
 */
export class IngredientRowElement extends SpellElement<IngredientRow> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-ingredient-row", "ingredient row", [
    { name: "ingredient", kind: "string", description: "Its ingredient." },
    { name: "editor", kind: "string", description: "Its editor." }
  ])

  moveUp() {
    return this.currentThing?.moveUp()
  }

  remove() {
    return this.currentThing?.remove()
  }
}
core.useElement(IngredientRow, IngredientRowElement)

/** One step's words on the Edit screen, with buttons to move it and take it out */
export class StepRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "step" is a step
  @prop({ type: "Step" })
  accessor step!: Step

  // - its "editor" is a recipe editor
  @prop({ type: "RecipeEditor" })
  accessor editor!: RecipeEditor

  moveUp() {
    const list = this.editor?.draft?.steps
    const moving = this.step
    const place = spellPosition(positionOf(list!, moving!))
    if (place === 1) return
    core.remove(list!, moving!)
    core.addBefore(list!, core.getItemAt(list, position(place - 1))!, moving!)
  }

  remove() {
    core.remove(this.editor?.draft?.steps!, this.step!)
  }

  @drawn draw() {
    return (
      <ui-form prop:value={this.step}>
        <ui-stack direction="horizontal" spacing="xs">
          <ui-textarea name="instruction" rows="2" aria-label="Step" fluid={true} />
          {core.drawAction(this, "moveUp", { "icon-only": true, appearance: "tertiary" })}
          {core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })}
        </ui-stack>
      </ui-form>
    )
  }
}

/**
 * `<test-project-step-row>`:  a step row, drawn in its own element, e.g. by `draw the step row`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its step row's properties;  its methods call its step row's.
 * - What every view's element does, e.g. drawing its step row, is `SpellElement`'s.
 */
export class StepRowElement extends SpellElement<StepRow> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-step-row", "step row", [
    { name: "step", kind: "string", description: "Its step." },
    { name: "editor", kind: "string", description: "Its editor." }
  ])

  moveUp() {
    return this.currentThing?.moveUp()
  }

  remove() {
    return this.currentThing?.remove()
  }
}
core.useElement(StepRow, StepRowElement)

core.describeAction(RecipeEditor, "save", { title: "Save changes", icon: "check", undoneAs: "Save changes" })
core.describeAction(RecipeEditor, "cancel", { title: "Cancel", icon: "close", undoneAs: "Cancel" })
core.describeAction(RecipeEditor, "addIngredient", { title: "Add an ingredient", icon: "plus", undoneAs: "Add an ingredient" })
core.describeAction(RecipeEditor, "addStep", { title: "Add a step", icon: "plus", undoneAs: "Add a step" })

core.describeAction(IngredientRow, "moveUp", { title: "Move Up", icon: "arrow up", undoneAs: "Move Up" })
core.describeAction(IngredientRow, "remove", { title: "Remove", icon: "trash alternate outline", undoneAs: "Remove" })

core.describeAction(StepRow, "moveUp", { title: "Move Up", icon: "arrow up", undoneAs: "Move Up" })
core.describeAction(StepRow, "remove", { title: "Remove", icon: "trash alternate outline", undoneAs: "Remove" })

// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet. */¬¬/* the shopping list's ticked items:  they fade, as on Shopping List */¬.got {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) recipeCards.start()
// -----------
if (!core.isCarryingOver) testFractions()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecipeElement` */
      "test-project-recipe": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `IngredientElement` */
      "test-project-ingredient": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StepElement` */
      "test-project-step": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeCardElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeEditorElement` */
      "test-project-recipe-editor": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `IngredientRowElement` */
      "test-project-ingredient-row": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StepRowElement` */
      "test-project-step-row": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
