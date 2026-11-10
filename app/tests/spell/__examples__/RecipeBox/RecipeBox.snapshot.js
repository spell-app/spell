import { core, Thing, App, View, Place, h } from "@spell/core"

core.heading("Recipe Box:  where the recipes are kept")
/////////////////////////////////////////////
// ## Recipe Box:  where the recipes are kept
/////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 1162, end: 1181 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeBox.api.spell", start: 1185, end: 1211 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  // - its "notes" is text
  static { this.declareProp("notes", { type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 1215, end: 1234 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  /** Its Edit screen:  nothing changes until Save */
  edit() {
    recipeBox.editing = this
  }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-form", { class: "recipe", value: this },
          h("ui-field", { label: "Recipe name" },
            h("ui-button", {
              class: "edit",
              slot: "actions",
              icon: "pencil",
              size: "mini",
              appearance: "transparent",
              "aria-label": "Edit",
              title: "Edit",
              onClick: core.pressed(this, () => this.edit()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }),
            h("ui-button", {
              class: "remove",
              slot: "actions",
              icon: "close",
              size: "mini",
              appearance: "transparent",
              "aria-label": "Remove",
              title: "Remove",
              onClick: core.pressed(this, () => core.removeSaved(this)),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }),
            h("ui-input", { class: "title", name: "title", size: "large" })
          ),
          h("ui-field", { label: "Serves", inline: true },
            h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
          ),
          h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2" }))
        )
      )
    )
  }

  static savedIn = {
    place: "family_cookbook",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in family cookbook
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/RecipeBox.api.spell", start: 1131, end: 1158 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in family cookbook
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/RecipeBox.api.spell", start: 1131, end: 1158 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * Where they're kept is the next line, and only that line knows.  Change it to keep them somewhere else:
 * family cookbook is saved in the cloud
 * (each person's own, on Spell's server:  kept in the browser until they sign in;  the example FamilyCookbook)
 * family cookbook is a data folder at personal "recipes"
 * (each person's own box, in their space;  "recipes" alone is one box everyone shares, "owen@spell/recipes" Owen's)
 * family cookbook is a data folder at "http://127.0.0.1:4791/api/places/recipes"
 * family cookbook is a room at "http://127.0.0.1:4791/api/rooms/recipes"
 * (Both are served on your computer by "yarn tsx scripts/recipe-servers.ts", at the top of Spell's folder.)
 * family cookbook is a spreadsheet at "recipes.xlsx"
 * family cookbook is an excel file at "recipes.xlsx"
 * (the workbook beside this file, read only:  a spreadsheet reads Excel by the ".xlsx" ending, an excel file whatever it ends in)
 * What's drawn and done with them is in RecipeBox.spell.
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "database on this device" })

// -----------
core.heading("Recipe Box")
////////////////
// ## Recipe Box
////////////////
// Your recipes, on cards:  find one, add one, change one as you type or on its Edit screen, remove one and undo it.
// Where they're kept is in RecipeBox.api.spell, and only its first line knows.

// Every notes box grows as you type

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

  /** Every changed field, sent together */
  save() {
    core.saveDraft(this.draft)
    recipeBox.editing = undefined
  }

  /** Forget the copy:  the recipe never changed */
  cancel() {
    core.discardDraft(this.draft)
    recipeBox.editing = undefined
  }

  draw() {
    return h("ui-card", { class: "editor" },
      h("ui-content",
        h("ui-form", { "prop:value": () => this.draft },
          h("ui-header", { size: "small" }, "Edit ", () => this.recipe?.title),
          h("ui-field", { label: "Recipe name" },
            h("ui-input", { class: "edit-title", name: "title", size: "large" })
          ),
          h("ui-field", { label: "Serves", inline: true },
            h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
          ),
          h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2" }))
        )
      ),
      h("ui-extra",
        h("ui-button", {
          class: "save",
          size: "small",
          color: "primary",
          disabled: () => this.draft.title === "",
          onClick: core.pressed(this, () => this.save()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Save"),
        h("ui-button", {
          class: "cancel",
          size: "small",
          onClick: core.pressed(this, () => this.cancel()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Cancel")
      )
    )
  }
}

core.useDefaults("/RecipeBox.spell", {
  "ui-textarea": { grow: true }
})

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

core.heading("Its Edit screen:  a form over a draft, so nothing changes until Save")
//## Its Edit screen:  a form over a draft, so nothing changes until Save

core.heading("The box:  the card for a new recipe, then a card for each one you have")
//## The box:  the card for a new recipe, then a card for each one you have

export class RecipeBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "new recipe" is a new recipe with servings = 4
  static { this.declareProp("newRecipe", { init: () => new Recipe({ servings: 4 }), early: true }) }
  get newRecipe() { return this.getProp("newRecipe") }
  set newRecipe(value) { this.setProp("newRecipe", value) }

  /** The recipe on its Edit screen, while one is */
  // - its "editing" is a recipe
  static { this.declareProp("editing", { type: "Recipe" }) }
  get editing() { return this.getProp("editing") }
  set editing(value) { this.setProp("editing", value) }

  /** With nothing kept yet, a few to start from */
  async create() {
    if (core.itemCountOf(await core.savedThings(Recipe)) === 0) {
      core.saveThing(new Recipe({
        title: "Tomato soup",
        servings: 4,
        notes: "Roast the tomatoes first."
      }))
      core.saveThing(new Recipe({
        title: "Dal",
        servings: 6,
        notes: "Add the spices last."
      }))
      core.saveThing(new Recipe({
        title: "Pizza Margherita",
        servings: 2,
        notes: "A very hot oven."
      }))
    }
  }

  /** Newest first, by when each was saved */
  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 3402, end: 3568 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe) => core.includes(recipe.title, this.search)), (item) => core.descending(item.created))
  }, () => [this.search]) }

  addTheNewRecipe() {
    core.saveThing(this.newRecipe)
    this.newRecipe = new Recipe({ servings: 4 })
  }

  draw() {
    return h("ui-container",
      h("ui-stack", { direction: "horizontal", wrap: true, align: "end", justify: "between" },
        h("ui-stack", { align: "start" },
          h("ui-header", { size: "large" }, "Recipe Box"),
          h("ui-text", { color: "grey" }, "Everything you type is saved as you go.")
        ),
        h("ui-toolbar", { class: "undo", menu: "box menu", "aria-label": "Recipes" }),
        h("ui-form", { class: "find", value: this },
          h("ui-field", { label: "Search" }, h("ui-input", { class: "search", name: "search", icon: "search" }))
        )
      ),
      () => this.drawScreen()
    )
  }

  // Its Edit screen, while a recipe is being changed;  else the cards:  its own drawing, so its `if` picks just one
  drawScreen() {
    if (this.editing) return core.drawThing(new RecipeEditor({ recipe: this.editing }))
    else {
      return h("ui-cards", { columns: "3", doubling: true, part: "screen" },
        h("ui-card", { class: "new" },
          h("ui-content",
            h("ui-form", { "prop:value": () => this.newRecipe },
              h("ui-header", { size: "small" }, "Add a recipe"),
              h("ui-field", { label: "Recipe name" },
                h("ui-input", { class: "draft", name: "title", size: "large" })
              ),
              h("ui-field", { label: "Serves", inline: true },
                h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
              ),
              h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2" }))
            )
          ),
          h("ui-extra",
            h("ui-button", {
              class: "add",
              size: "small",
              color: "primary",
              disabled: () => this.newRecipe.title === "",
              onClick: core.pressed(this, () => this.addTheNewRecipe()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Add recipe")
          )
        ),
        () => core.drawRead(() => this.matches, (recipe) => core.drawThing(recipe), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "screen" }, "Finding your recipes"),
          none: () => h("ui-text", { class: "none", color: "grey", part: "screen" },
            () => this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."
          ),
          failed: () => h("ui-message", { class: "failed", color: "red", part: "screen" },
            "We can't reach your recipes right now.",
            h("ui-button", {
              class: "again",
              onClick: core.pressed(this, () => core.reloadSaved()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Try again")
          )
        })
      )
    }
  }
}
export const recipeBox = new RecipeBox()
// - its "box menu" is a menu of "undo"
core.describeMenu(RecipeBox, "boxMenu", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) recipeBox.start()
