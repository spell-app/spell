import { core, Thing, List, App, View, Place, h, withSpellPositions, positionOf, spellPosition, position } from "@spell/core"
import { Item, Aisle, AisleList, ShoppingSheet } from "@spell/project/@spell/examples/ShoppingList"

core.heading("Recipe Cards:  where the recipes are kept")
///////////////////////////////////////////////
// ## Recipe Cards:  where the recipes are kept
///////////////////////////////////////////////

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeCards.api.spell", start: 578, end: 597 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  /** How many people it's written for:  the amounts are for that many */
  // - its "serves" is a number
  static { this.declareProp("serves", { type: "number", declaredAt: { path: "/RecipeCards.api.spell", start: 599, end: 693 } }) }
  get serves() { return this.getProp("serves") }
  set serves(value) { this.setProp("serves", value) }

  /** A picture's address:  one in this example's pictures folder, or any on the web */
  // - its "picture" is text
  static { this.declareProp("picture", { type: "text", declaredAt: { path: "/RecipeCards.api.spell", start: 695, end: 800 } }) }
  get picture() { return this.getProp("picture") }
  set picture(value) { this.setProp("picture", value) }

  /** What goes in, in order:  kept inside the recipe */
  // - its "ingredients" is a list of ingredients
  static { this.declareProp("ingredients", { itemType: "Ingredient", init: () => new List({ instanceType: "Ingredient" }), declaredAt: { path: "/RecipeCards.api.spell", start: 802, end: 897 } }) }
  get ingredients() { return this.getProp("ingredients") }
  set ingredients(value) { this.setProp("ingredients", value) }

  /** What to do, in order:  kept inside the recipe */
  // - its "steps" is a list of steps
  static { this.declareProp("steps", { itemType: "Step", init: () => new List({ instanceType: "Step" }), declaredAt: { path: "/RecipeCards.api.spell", start: 899, end: 980 } }) }
  get steps() { return this.getProp("steps") }
  set steps(value) { this.setProp("steps", value) }

  static { this.declareProp("pickedCount", { declaredAt: { path: "/RecipeCard.spell", start: 210, end: 302 }, readsFrom: ["recipe_file"] }) }
  get pickedCount() {
    return core.itemCountOf(core.filter(this.ingredients, (ingredient) => ingredient.picked))
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
    await core.forEachSequential(this.ingredients, async (ingredient) => {
      if (ingredient.picked) {
        const measure = ingredient.shown
        const same = core.getItemAt(core.filter(await core.savedThings(Item, { filter: { got: false } }), (item) => item.name === ingredient.name && item.unit === measure.unit), 0)
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

  draw() {
    return h("ui-card", { class: "recipe", fluid: true },
      h("ui-image", {
        src: () => this.picture,
        alt: () => this.title,
        "aspect-ratio": "21:9",
        crop: true,
        hidden: () => this.picture !== "" ? undefined : true
      }),
      h("ui-content",
        h("ui-stack",
          h("ui-stack", { direction: "horizontal", justify: "between" },
            h("ui-header", { size: "large" }, () => this.title),
            core.drawAction(this, "edit")
          ),
          h("ui-text", { color: "grey" },
            "The recipe is for ",
            () => this.serves,
            " people.  These amounts are for the ",
            () => recipeCards.diners,
            " you're cooking for."
          ),
          h("ui-header", { size: "small" }, "Ingredients"),
          h("ui-stack", { spacing: "xs" },
            () => core.drawEach(this.ingredients, (ingredient) => core.drawThing(ingredient))
          ),
          h("ui-stack", { direction: "horizontal" },
            h("ui-button", {
              color: "primary",
              icon: "cart plus",
              disabled: () => this.pickedCount === 0,
              onClick: core.pressed(this, async () => await this.addThePickedToTheShoppingList()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Add ", () => this.pickedCount, " ticked items to the shopping list")
          ),
          h("ui-header", { size: "small" }, "Steps"),
          () => this.drawSteps()
        )
      )
    )
  }

  drawSteps() {
    // Each step with its number
    return h("ui-stack", { spacing: "sm", part: "steps" }, () => this.drawNumberedSteps())
  }

  drawNumberedSteps() {
    return core.drawEach(this.steps, withSpellPositions((step, place) => h("ui-stack", { class: "step", direction: "horizontal", spacing: "sm", align: "start", part: "numbered_steps" },
      h("ui-label", { circular: true, size: "small" }, () => place),
      h("ui-text", () => step.instruction)
    )))
  }

  static savedIn = {
    place: "recipe_file",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in recipe file
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/RecipeCards.api.spell", start: 553, end: 576 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in recipe file
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/RecipeCards.api.spell", start: 553, end: 576 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Recipe, "pick", { title: "Pick It", undoneAs: "Pick It" })
core.describeAction(Recipe, "edit", { title: "Edit", icon: "pencil", undoneAs: "Edit" })
core.describeAction(Recipe, "addThePickedToTheShoppingList", { title: "Add to shopping list", icon: "cart plus", undoneAs: "Add to shopping list" })

/** One line of a recipe:  how much, of what, and where it is in the shop */
export class Ingredient extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** For the recipe's own number of people;  nothing for "a pinch" or "to taste" */
  // - its "amount" is a number
  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  /** "g", "ml", "tbsp", "cups" ...;  nothing for a count, 2 eggs */
  // - its "unit" is text
  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  /** Where it is in the shop, for the shopping list */
  // - its "aisle" is text
  static { this.declareProp("aisle", { type: "text" }) }
  get aisle() { return this.getProp("aisle") }
  set aisle(value) { this.setProp("aisle", value) }

  /** How much a cup of it weighs, so grams show as cups:  flour 125, sugar 200;  nothing for most things */
  // - its "grams per cup" is a number
  static { this.declareProp("gramsPerCup", { type: "number" }) }
  get gramsPerCup() { return this.getProp("gramsPerCup") }
  set gramsPerCup(value) { this.setProp("gramsPerCup", value) }

  /** Ticked, to go on the shopping list */
  // - its "picked" is yes or no
  static { this.declareProp("picked", { type: "choice" }) }
  get picked() { return this.getProp("picked") }
  set picked(value) { this.setProp("picked", value) }

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
      if (this.unit === "g") {
        return measureAmountInUnit(scaled / core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "oz")
      }
      if (this.unit === "kg") {
        return measureAmountInUnit(scaled * 1000 / core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "oz")
      }
      if (this.unit === "ml") return measureMillilitresInSpoonsOrCups(scaled)
      if (this.unit === "l") return measureMillilitresInSpoonsOrCups(scaled * 1000)
    } else {
      if (this.unit === "cups" && this.gramsPerCup > 0) return measureAmountInUnit(scaled * this.gramsPerCup, "g")
      if (this.unit === "cups") {
        return measureAmountInUnit(scaled * core.convertMeasure(
          1,
          "Volume",
          "cup",
          "milliliter"
        ), "ml")
      }
      if (this.unit === "oz") {
        return measureAmountInUnit(scaled * core.convertMeasure(
          1,
          "Weight",
          "ounce",
          "gram"
        ), "g")
      }
      if (this.unit === "lb") {
        return measureAmountInUnit(scaled * core.convertMeasure(
          1,
          "Weight",
          "pound",
          "gram"
        ), "g")
      }
    }
    if (this.unit === "cups" || this.unit === "tbsp" || this.unit === "tsp") return measureAmountInQuartersOfUnit(scaled, this.unit)
    return measureAmountInUnit(scaled, this.unit)
  }

  /** A box to pick it, how much, and what */
  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { class: "ingredient", direction: "horizontal", spacing: "sm" },
        h("ui-checkbox", { name: "picked", "aria-label": "Tick to add to the shopping list" }),
        h("ui-text", { class: "how-much", bold: true }, () => this.shown.written),
        h("ui-text", () => this.name)
      )
    )
  }
}

/** One thing to do */
export class Step extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "instruction" is text
  static { this.declareProp("instruction", { type: "text" }) }
  get instruction() { return this.getProp("instruction") }
  set instruction(value) { this.setProp("instruction", value) }
}

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
  static { this.declareProp("number", { type: "number" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  // - its "unit" is text
  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  /** As a cook writes it:  "200 g", "1 1/2 cups", "2" */
  get written() {
    if (this.number === undefined || this.number === 0) return ""
    if (this.unit === "") return writeAmountForACook(this.number)
    if (this.unit === "cups" && this.number <= 1) return core.joined(writeAmountForACook(this.number), "cup", " ")
    return core.joined(writeAmountForACook(this.number), this.unit, " ")
  }
}

/** Whole:  grams, millilitres, counts */
export function measureAmountInUnit(amount, unit) {
  return core.asAction({ undoneAs: "Measure Amount in Unit" }, () => new Measure({ number: Math.round(amount), unit: unit }))
}

/** To the nearest quarter:  cups and spoons */
export function measureAmountInQuartersOfUnit(amount, unit) {
  return core.asAction({ undoneAs: "Measure Amount in Quarters of Unit" }, () => new Measure({ number: Math.round(amount * 4) / 4, unit: unit }))
}

/** The spoon or cup a cook would reach for */
export function measureMillilitresInSpoonsOrCups(millilitres) {
  return core.asAction({ undoneAs: "Measure Millilitres in Spoons or Cups" }, () => {
    if (millilitres < core.convertMeasure(
      1,
      "Volume",
      "tablespoon",
      "milliliter"
    )) {
      return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(
        1,
        "Volume",
        "teaspoon",
        "milliliter"
      ), "tsp")
    }
    if (millilitres < core.convertMeasure(
      0.25,
      "Volume",
      "cup",
      "milliliter"
    )) {
      return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(
        1,
        "Volume",
        "tablespoon",
        "milliliter"
      ), "tbsp")
    }
    return measureAmountInQuartersOfUnit(millilitres / core.convertMeasure(
      1,
      "Volume",
      "cup",
      "milliliter"
    ), "cups")
  })
}

/** A whole number, then a quarter, a half or three quarters:  1.5 is "1 1/2" */
export function writeAmountForACook(amount) {
  return core.asAction({ undoneAs: "Write Amount for a Cook" }, () => {
    const quarters = Math.round(amount * 4)
    const whole = parseInt(quarters / 4)
    const leftOver = quarters - whole * 4
    let part = ""
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

export class RecipeCard extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** The recipe on show */
  // - its "chosen" is a recipe
  static { this.declareProp("chosen", { type: "Recipe" }) }
  get chosen() { return this.getProp("chosen") }
  set chosen(value) { this.setProp("chosen", value) }

  /** The recipe on its Edit screen, while one is */
  // - its "editing" is a recipe
  static { this.declareProp("editing", { type: "Recipe" }) }
  get editing() { return this.getProp("editing") }
  set editing(value) { this.setProp("editing", value) }

  /** How many are eating */
  // - its "diners" is a number starting at 4
  static { this.declareProp("diners", { type: "number", init: () => 4 }) }
  get diners() { return this.getProp("diners") }
  set diners(value) { this.setProp("diners", value) }

  /** Grams and millilitres, or cups and spoons */
  // - its "units" is one of metric or cups
  static Units = ["metric", "cups"]
  static { this.declareProp("units", { oneOf: RecipeCard.Units }) }
  get units() { return this.getProp("units") }
  set units(value) { this.setProp("units", value) }

  /** How much more, or less, than the recipe says */
  static { this.declareProp("scale", { declaredAt: { path: "/RecipeCards.spell", start: 613, end: 797 }, readsFrom: ["recipe_file"] }) }
  get scale() {
    if (this.chosen === undefined || this.chosen?.serves === 0) return 1
    return this.diners / this.chosen?.serves
  }

  /** Shopping List's own list, by aisle:  the same list, from its CSV file */
  // "aisle list" is a new aisle list
  static { this.declareProp("aisleList", { init: () => new AisleList({ id: "aisle-list" }), early: true }) }
  get aisleList() { return this.getProp("aisleList") }
  set aisleList(value) { this.setProp("aisleList", value) }

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

  draw() {
    return h("ui-container",
      h("ui-stack",
        h("ui-toolbar",
          h("ui-text", { size: "large", heavy: true, slot: "title" }, "Recipe Cards"),
          core.drawAction(this, "showMetric", { "in-menu": true }),
          core.drawAction(this, "showCupsAndSpoons", { "in-menu": true }),
          h("spacer"),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })
        ),
        h("ui-grid", { stackable: true },
          h("ui-column", { width: "5" },
            h("ui-stack",
              h("ui-buttons", { direction: "vertical", fluid: true, basic: true },
                () => core.drawRead(async () => await core.savedThings(Recipe, {}, "as drawn"), (recipe) => h("ui-button", {
                  active: () => recipe === recipe.chosen,
                  onClick: core.pressed(this, () => recipe.pick()),
                  style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
                }, () => recipe.title))
              ),
              h("ui-form", { "prop:value": this },
                h("ui-field", { label: "Cooking for" },
                  h("ui-input", { name: "diners", type: "number", min: "1", labeled: "right", label: "people" })
                )
              ),
              h("ui-header", { size: "small" }, "Shopping list"),
              h("ui-text", { color: "grey", size: "small" },
                "Ticked ingredients go here, on the Shopping List app's own list"
              ),
              () => core.drawThing(this.aisleList)
            )
          ),
          h("ui-column", { width: "11" }, () => this.drawScreen())
        )
      )
    )
  }

  drawScreen() {
    // The Edit screen while a recipe is being changed;  else the chosen recipe's card
    if (this.editing) return core.drawThing(new RecipeEditor({ recipe: this.editing }))
    else if (this.chosen) return core.drawThing(this.chosen)
    else {
      return h("ui-text", { color: "grey", part: "screen" },
        "Choose a recipe on the left to see its ingredients and steps."
      )
    }
  }
}
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
  static { this.declareProp("recipe", { type: "Recipe" }) }
  get recipe() { return this.getProp("recipe") }
  set recipe(value) { this.setProp("recipe", value) }

  /** A copy to change:  the recipe stays as it was until Save */
  get draft() {
    return core.draftOf(this.recipe)
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

  draw() {
    return h("ui-card", { class: "editor", fluid: true },
      h("ui-content",
        h("ui-form", { "prop:value": () => this.draft },
          h("ui-header", { size: "medium" }, "Edit ", () => this.recipe?.title),
          h("ui-fields",
            h("ui-field", { label: "Recipe", width: "10" }, h("ui-input", { name: "title" })),
            h("ui-field", { label: "Serves", width: "6" },
              h("ui-input", { name: "serves", type: "number", min: "1", labeled: "right", label: "people" })
            )
          ),
          h("ui-field", { label: "Picture" },
            h("ui-input", { name: "picture", placeholder: "A link to a photo (optional)" })
          )
        ),
        h("ui-header", { size: "small" }, "Ingredients"),
        () => this.drawIngredientRows(),
        core.drawAction(this, "addIngredient", { appearance: "basic" }),
        h("ui-header", { size: "small" }, "Steps"),
        () => this.drawStepRows(),
        core.drawAction(this, "addStep", { appearance: "basic" })
      ),
      h("ui-extra",
        core.drawAction(this, "save", { color: "primary" }),
        core.drawAction(this, "cancel")
      )
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

/** One ingredient's fields on the Edit screen, with buttons to move it and take it out */
export class IngredientRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "ingredient" is an ingredient
  static { this.declareProp("ingredient", { type: "Ingredient" }) }
  get ingredient() { return this.getProp("ingredient") }
  set ingredient(value) { this.setProp("ingredient", value) }

  // - its "editor" is a recipe editor
  static { this.declareProp("editor", { type: "RecipeEditor" }) }
  get editor() { return this.getProp("editor") }
  set editor(value) { this.setProp("editor", value) }

  moveUp() {
    const list = this.editor?.draft?.ingredients
    const moving = this.ingredient
    const place = spellPosition(positionOf(list, moving))
    if (place === 1) return
    core.remove(list, moving)
    core.addBefore(list, core.getItemAt(list, position(place - 1)), moving)
  }

  remove() {
    core.remove(this.editor?.draft?.ingredients, this.ingredient)
  }

  draw() {
    return h("ui-form", { "prop:value": () => this.ingredient },
      h("ui-fields", { unstackable: true },
        h("ui-field", { width: "2" },
          h("ui-input", { name: "amount", type: "number", min: "0", "aria-label": "Amount" })
        ),
        h("ui-field", { width: "2" },
          h("ui-input", { name: "unit", placeholder: "g, cups ...", "aria-label": "Unit" })
        ),
        h("ui-field", { width: "6" },
          h("ui-input", { name: "name", placeholder: "Ingredient", "aria-label": "Ingredient" })
        ),
        h("ui-field", { width: "3" },
          h("ui-input", { name: "aisle", placeholder: "Shop aisle", "aria-label": "Aisle" })
        ),
        h("ui-field", { width: "3" },
          h("ui-stack", { direction: "horizontal", spacing: "xs" },
            core.drawAction(this, "moveUp", { "icon-only": true, appearance: "tertiary" }),
            core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })
          )
        )
      )
    )
  }
}

/** One step's words on the Edit screen, with buttons to move it and take it out */
export class StepRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "step" is a step
  static { this.declareProp("step", { type: "Step" }) }
  get step() { return this.getProp("step") }
  set step(value) { this.setProp("step", value) }

  // - its "editor" is a recipe editor
  static { this.declareProp("editor", { type: "RecipeEditor" }) }
  get editor() { return this.getProp("editor") }
  set editor(value) { this.setProp("editor", value) }

  moveUp() {
    const list = this.editor?.draft?.steps
    const moving = this.step
    const place = spellPosition(positionOf(list, moving))
    if (place === 1) return
    core.remove(list, moving)
    core.addBefore(list, core.getItemAt(list, position(place - 1)), moving)
  }

  remove() {
    core.remove(this.editor?.draft?.steps, this.step)
  }

  draw() {
    return h("ui-form", { "prop:value": () => this.step },
      h("ui-stack", { direction: "horizontal", spacing: "xs" },
        h("ui-textarea", { name: "instruction", rows: "2", "aria-label": "Step", fluid: true }),
        core.drawAction(this, "moveUp", { "icon-only": true, appearance: "tertiary" }),
        core.drawAction(this, "remove", { "icon-only": true, appearance: "tertiary" })
      )
    )
  }
}

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
