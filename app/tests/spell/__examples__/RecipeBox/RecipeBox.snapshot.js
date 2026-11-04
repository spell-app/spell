import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Recipe Box:  where the recipes are kept")
/////////////////////////////////////////////
// ## Recipe Box:  where the recipes are kept
/////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 917, end: 936 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeBox.api.spell", start: 940, end: 966 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  // - its "notes" is text
  static { this.declareProp("notes", { type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 970, end: 989 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  draw() {
    return h("ui-card", { fluid: true },
      h("ui-content",
        h("ui-form", { class: "recipe", value: this },
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
          h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2", grow: true }))
        )
      )
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }
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
 * What's drawn and done with them is in RecipeBox.spellml.
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "database on this device" })

// -----------
core.heading("Recipe Box")
////////////////
// ## Recipe Box
////////////////
// Your recipes, on cards:  find one, add one, change one as you type, remove one and undo it.
// Where they're kept is in RecipeBox.api.spell, and only its first line knows.

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

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

  /** Newest first:  a new one joins the end, so they're shown the other way round */
  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spellml", start: 1560, end: 1766 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    const found = core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe) => core.includes(recipe.title, this.search))
    core.reverse(found)
    return found
  }, () => [this.search]) }

  addTheNewRecipe() {
    core.saveThing(this.newRecipe)
    this.newRecipe = new Recipe({ servings: 4 })
  }

  draw() {
    return [
      h("ui-stack", { class: "top", direction: "horizontal", wrap: true, align: "end", justify: "between" },
        h("ui-stack", { align: "start" },
          h("ui-header", { size: "large" }, "Recipe Box"),
          h("ui-text", { color: "grey" }, "Everything you type is saved as you go.")
        ),
        h("ui-toolbar", { class: "undo", menu: "box menu", "aria-label": "Recipes" }),
        h("ui-form", { class: "find", value: this },
          h("ui-field", { label: "Search" }, h("ui-input", { class: "search", name: "search", icon: "search" }))
        )
      ),
      h("ui-card", { class: "new", fluid: true },
        h("ui-content",
          h("ui-form", { "prop:value": () => this.newRecipe },
            h("ui-header", { size: "small" }, "Add a recipe"),
            h("ui-field", { label: "Recipe name" },
              h("ui-input", { class: "draft", name: "title", size: "large" })
            ),
            h("ui-field", { label: "Serves", inline: true },
              h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
            ),
            h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2", grow: true }))
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
      core.drawRead(() => this.matches, (recipe) => core.drawThing(recipe), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding your recipes"),
        none: () => h("ui-text", { class: "none", color: "grey" },
          () => this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."
        ),
        failed: () => h("ui-message", { class: "failed", color: "red" },
          "We can't reach your recipes right now.",
          h("ui-button", {
            class: "again",
            onClick: core.pressed(this, () => core.reloadSaved()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Try again")
        )
      })
    ]
  }
}
export const recipeBox = new RecipeBox()
// - its "box menu" is a menu of "undo"
core.describeMenu(RecipeBox, "boxMenu", { items: ["undo"] })
// -----------
core.installStyles(undefined, `/* File styles.css:  how the box is laid out.¬   - The box, <recipe-box-app>, is one grid:  its top row across, then a card each, the new recipe's first. */¬¬recipe-box-app {¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  --ui-card-margin-block: 0;¬}¬¬.top {¬  grid-column: 1 / -1;¬}¬¬/* the search takes the room that's left on the top row, and its own row on a phone */¬.find {¬  flex: 1 1 12em;¬}¬¬/* the new recipe's card stands beside two rows of others */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) recipeBox.start()
