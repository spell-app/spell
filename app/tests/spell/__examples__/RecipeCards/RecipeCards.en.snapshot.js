/*! SPELL: WORDS RecipeCards en */
export const words = {
  lang: "en",
  types: {
    Recipe: {
      title: "title",
      serves: "serves",
      picture: "picture",
      ingredients: "ingredients",
      steps: "steps",
      pickedCount: "picked count",
      pick: "pick it",
      edit: "edit",
      addThePickedToTheShoppingList: "add the picked to the shopping list",
      draw: "draw it"
    },
    Ingredient: {
      amount: "amount",
      unit: "unit",
      name: "name",
      aisle: "aisle",
      gramsPerCup: "grams per cup",
      picked: "picked",
      scaledAmount: "scaled amount",
      shown: "shown",
      draw: "draw it"
    },
    Step: {
      instruction: "instruction"
    },
    Measure: {
      number: "number",
      unit: "unit",
      written: "written"
    },
    RecipeCard: {
      chosen: "chosen",
      editing: "editing",
      diners: "diners",
      units: "units",
      scale: "scale",
      aisleList: "aisle list",
      showMetric: "show metric",
      showCupsAndSpoons: "show cups and spoons",
      draw: "draw it"
    },
    RecipeEditor: {
      recipe: "recipe",
      draft: "draft",
      save: "save",
      cancel: "cancel",
      addIngredient: "add ingredient",
      addStep: "add step",
      draw: "draw it"
    },
    IngredientRow: {
      ingredient: "ingredient",
      editor: "editor",
      moveUp: "move up",
      remove: "remove",
      draw: "draw it"
    },
    StepRow: {
      step: "step",
      editor: "editor",
      moveUp: "move up",
      remove: "remove",
      draw: "draw it"
    }
  },
  groups: {
    RecipeCard: [
      { name: "Units", members: ["showMetric", "showCupsAndSpoons", "draw"] }
    ]
  }
}
