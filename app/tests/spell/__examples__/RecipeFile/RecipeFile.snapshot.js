import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Recipe File:  your recipes, in a file on your computer")
////////////////////////////////////////////////////////////
// ## Recipe File:  your recipes, in a file on your computer
////////////////////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeFile.api.spell", start: 389, end: 408 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeFile.api.spell", start: 410, end: 436 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  // - its "notes" is text
  static { this.declareProp("notes", { type: "text", declaredAt: { path: "/RecipeFile.api.spell", start: 438, end: 457 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  draw() {
    return h("ui-card",
      h("ui-content",
        h("ui-form", { class: "recipe", "prop:value": this },
          h("ui-field", { label: "Recipe name" },
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
    place: "cookbook_file",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in cookbook file
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/RecipeFile.api.spell", start: 362, end: 387 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in cookbook file
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/RecipeFile.api.spell", start: 362, end: 387 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * The next line keeps them in a JSON file you pick:  the app remembers it, and every change goes back to it.
 * In Safari and Firefox, which can't save back to a file, your changes are kept in this browser,
 * and saving downloads the file.
 */
export class CookbookFile extends Place {}
export const cookbookFile = core.place(new CookbookFile(), {
  name: "cookbook_file",
  kind: "file",
  picked: true
})

// -----------
core.heading("Recipe File")
/////////////////
// ## Recipe File
/////////////////
// Your recipes, on cards, in a file on your computer:  open it once, and every change is saved back to it.
// Where they're kept is in RecipeFile.api.spell, and only its first line knows.

// Every notes box grows as you type
core.useDefaults("/RecipeFile.spell", {
  "ui-textarea": { grow: true }
})

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

core.heading("The box:  the card for a new recipe, then a card for each one in the file")
//## The box:  the card for a new recipe, then a card for each one in the file

export class Cookbook extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "new recipe" is a new recipe with servings = 4
  static { this.declareProp("newRecipe", { init: () => new Recipe({ servings: 4 }), early: true }) }
  get newRecipe() { return this.getProp("newRecipe") }
  set newRecipe(value) { this.setProp("newRecipe", value) }

  async openAFile() {
    await core.pickFileFor("cookbook_file")
  }

  async saveTheFile() {
    await core.savePickedFile("cookbook_file")
  }

  addTheNewRecipe() {
    core.saveThing(this.newRecipe)
    this.newRecipe = new Recipe({ servings: 4 })
  }

  draw() {
    return h("ui-container",
      h("ui-stack", { direction: "horizontal", wrap: true, align: "end", justify: "between" },
        h("ui-stack", { align: "start" },
          h("ui-header", { size: "large" }, "Recipe File"),
          h("ui-text", { color: "grey" }, "Open a recipes file, and every change goes back to it.")
        ),
        h("ui-stack", { direction: "horizontal" },
          core.drawAction(this, "openAFile"),
          core.drawAction(this, "saveTheFile"),
          core.drawAction(this, "undo")
        )
      ),
      h("ui-cards",
        h("ui-card", { class: "new" },
          h("ui-content",
            h("ui-form", { "prop:value": () => this.newRecipe },
              h("ui-header", { size: "small" }, "Add a recipe"),
              h("ui-field", { label: "Recipe name" },
                h("ui-input", { class: "draft", name: "title", size: "large" })
              ),
              h("ui-field", { label: "Serves", inline: true },
                h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
              )
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
        () => core.drawRead(async () => await core.savedThings(Recipe, {}, "as drawn"), (recipe) => core.drawThing(recipe), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading your recipes"), none: () => h("ui-card", { class: "none" },
          h("ui-content",
            h("ui-text", { color: "grey" }, "No recipes yet. Open a recipes file, or add your first one.")
          )
        ) })
      )
    )
  }
}
export const cookbook = new Cookbook()
core.describeAction(Cookbook, "openAFile", { title: "Open", icon: "folder open", cantBeUndone: "keeps history" })
core.describeAction(Cookbook, "saveTheFile", { title: "Save", icon: "save", cantBeUndone: "keeps history" })
core.describeAction(Cookbook, "addTheNewRecipe", { title: "Add the New Recipe", undoneAs: "Add the New Recipe" })
// -----------
if (!core.isCarryingOver) cookbook.start()
