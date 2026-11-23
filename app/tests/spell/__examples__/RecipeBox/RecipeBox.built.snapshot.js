import { core, Thing, App, View, Place, h } from "@spell/core"

export class Recipe extends Thing {
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("servings", { type: "number" }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  static { this.declareProp("notes", { type: "text" }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  edit() {
    recipeBox.editing = this
  }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-form", { class: "recipe", "prop:value": this },
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Recipe, "edit", { title: "Edit It", cantBeUndone: "keeps history" })

export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "database on this device" })

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
    recipeBox.editing = undefined
  }

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

core.describeAction(RecipeEditor, "save", { title: "Save It", cantBeUndone: "keeps history" })
core.describeAction(RecipeEditor, "cancel", { title: "Cancel It", cantBeUndone: "keeps history" })

export class RecipeBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  static { this.declareProp("newRecipe", { init: () => new Recipe({ servings: 4 }), early: true }) }
  get newRecipe() { return this.getProp("newRecipe") }
  set newRecipe(value) { this.setProp("newRecipe", value) }

  static { this.declareProp("editing", { type: "Recipe" }) }
  get editing() { return this.getProp("editing") }
  set editing(value) { this.setProp("editing", value) }

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

  static { this.declareProp("matches", { readsFrom: ["family_cookbook"] }) }
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
        h("ui-form", { class: "find", "prop:value": this, fluid: true },
          h("ui-field", { label: "Search" }, h("ui-input", { class: "search", name: "search", icon: "search" }))
        )
      ),
      () => this.drawScreen()
    )
  }

  drawScreen() {
    if (this.editing) return core.drawThing(new RecipeEditor({ recipe: this.editing }))
    else {
      return h("ui-cards", { columns: "3", doubling: true, stackable: true, part: "screen" },
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
          waitingSay: () => "Finding your recipes",
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
core.describeAction(RecipeBox, "addTheNewRecipe", { title: "Add the New Recipe", undoneAs: "Add the New Recipe" })
core.describeMenu(RecipeBox, "boxMenu", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) recipeBox.start()
