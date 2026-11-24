import { core, Thing, List, App, View, Place, h, withSpellPositions, positionOf, spellPosition, position } from "@spell/core"
import { Item, Aisle, AisleList, ShoppingSheet } from "@spell/project/@spell/examples/ShoppingList"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("serves", { type: "number" }) }
  get serves() { return this.getProp("serves") }
  set serves(value) { this.setProp("serves", value) }

  static { this.declareProp("picture", { type: "text" }) }
  get picture() { return this.getProp("picture") }
  set picture(value) { this.setProp("picture", value) }

  static { this.declareProp("ingredients", { itemType: "Ingredient", init: () => new List({ instanceType: "Ingredient" }) }) }
  get ingredients() { return this.getProp("ingredients") }
  set ingredients(value) { this.setProp("ingredients", value) }

  static { this.declareProp("steps", { itemType: "Step", init: () => new List({ instanceType: "Step" }) }) }
  get steps() { return this.getProp("steps") }
  set steps(value) { this.setProp("steps", value) }

  static { this.declareProp("pickedCount", { readsFrom: ["recipe_file"] }) }
  get pickedCount() {
    return core.itemCountOf(core.filter(this.ingredients, (ingredient) => ingredient.picked))
  }

  pick() {
    recipeCards.chosen = this
    recipeCards.editing = undefined
  }

  edit() {
    recipeCards.editing = this
  }

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
      () => core.drawIf(() => this.picture !== "", () => [
        h("ui-image", { src: () => this.picture, alt: () => this.title, "aspect-ratio": "21:9", crop: true })
      ]),
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Recipe, "pick", { title: "Pick It", undoneAs: "Pick It" })
core.describeAction(Recipe, "edit", { title: "Edit", icon: "pencil", undoneAs: "Edit" })
core.describeAction(Recipe, "addThePickedToTheShoppingList", { title: "Add to shopping list", icon: "cart plus", undoneAs: "Add to shopping list" })

export class Ingredient extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("amount", { type: "number" }) }
  get amount() { return this.getProp("amount") }
  set amount(value) { this.setProp("amount", value) }

  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("aisle", { type: "text" }) }
  get aisle() { return this.getProp("aisle") }
  set aisle(value) { this.setProp("aisle", value) }

  static { this.declareProp("gramsPerCup", { type: "number" }) }
  get gramsPerCup() { return this.getProp("gramsPerCup") }
  set gramsPerCup(value) { this.setProp("gramsPerCup", value) }

  static { this.declareProp("picked", { type: "choice" }) }
  get picked() { return this.getProp("picked") }
  set picked(value) { this.setProp("picked", value) }

  static { this.declareProp("scaledAmount", { readsFrom: ["recipe_file"] }) }
  get scaledAmount() {
    return this.amount * recipeCards.scale
  }

  static { this.declareProp("shown", { readsFrom: ["recipe_file"] }) }
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

export class Step extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("instruction", { type: "text" }) }
  get instruction() { return this.getProp("instruction") }
  set instruction(value) { this.setProp("instruction", value) }
}

export class RecipeFile extends Place {}
export const recipeFile = core.place(new RecipeFile(), {
  name: "recipe_file",
  kind: "file",
  at: "/api/places/spaces/@spell/examples/RecipeCards/__data/recipes.json",
  checkedEvery: 30
})

// -----------
export class Measure extends Thing {
  static { this.declareProp("number", { type: "number" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("unit", { type: "text" }) }
  get unit() { return this.getProp("unit") }
  set unit(value) { this.setProp("unit", value) }

  get written() {
    if (this.number === undefined || this.number === 0) return ""
    if (this.unit === "") return writeAmountForACook(this.number)
    if (this.unit === "cups" && this.number <= 1) return core.joined(writeAmountForACook(this.number), "cup", " ")
    return core.joined(writeAmountForACook(this.number), this.unit, " ")
  }
}

export function measureAmountInUnit(amount, unit) {
  return core.asAction({ undoneAs: "Measure Amount in Unit" }, () => new Measure({ number: Math.round(amount), unit: unit }))
}

export function measureAmountInQuartersOfUnit(amount, unit) {
  return core.asAction({ undoneAs: "Measure Amount in Quarters of Unit" }, () => new Measure({ number: Math.round(amount * 4) / 4, unit: unit }))
}

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
export class RecipeCard extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("chosen", { type: "Recipe" }) }
  get chosen() { return this.getProp("chosen") }
  set chosen(value) { this.setProp("chosen", value) }

  static { this.declareProp("editing", { type: "Recipe" }) }
  get editing() { return this.getProp("editing") }
  set editing(value) { this.setProp("editing", value) }

  static { this.declareProp("diners", { type: "number", init: () => 4 }) }
  get diners() { return this.getProp("diners") }
  set diners(value) { this.setProp("diners", value) }

  static Units = ["metric", "cups"]
  static { this.declareProp("units", { oneOf: RecipeCard.Units }) }
  get units() { return this.getProp("units") }
  set units(value) { this.setProp("units", value) }

  static { this.declareProp("scale", { readsFrom: ["recipe_file"] }) }
  get scale() {
    if (this.chosen === undefined || this.chosen?.serves === 0) return 1
    return this.diners / this.chosen?.serves
  }

  static { this.declareProp("aisleList", { init: () => new AisleList({ id: "aisle-list" }), early: true }) }
  get aisleList() { return this.getProp("aisleList") }
  set aisleList(value) { this.setProp("aisleList", value) }

  async create() {
    try {
      if (core.itemCountOf(await core.savedThings(Recipe)) === 0) {
        addTheTomatoSoup()
        addTheRedLentilDal()
        addThePancakes()
      }
    }
    catch (error) {
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

// -----------

// -----------
export class RecipeEditor extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("recipe", { type: "Recipe" }) }
  get recipe() { return this.getProp("recipe") }
  set recipe(value) { this.setProp("recipe", value) }

  get draft() {
    return core.draftOf(this.recipe)
  }

  save() {
    core.saveDraft(this.draft)
    recipeCards.editing = undefined
  }

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
    const thisEditor = this
    return core.drawEach(this.draft.ingredients, (one) => core.drawThing(new IngredientRow({ editor: thisEditor, ingredient: one })))
  }

  drawStepRows() {
    const thisEditor = this
    return core.drawEach(this.draft.steps, (one) => core.drawThing(new StepRow({ editor: thisEditor, step: one })))
  }
}

export class IngredientRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("ingredient", { type: "Ingredient" }) }
  get ingredient() { return this.getProp("ingredient") }
  set ingredient(value) { this.setProp("ingredient", value) }

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

export class StepRow extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("step", { type: "Step" }) }
  get step() { return this.getProp("step") }
  set step(value) { this.setProp("step", value) }

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
