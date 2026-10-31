import { core, App, View, Place, h } from "@spell/core"

core.heading("Recipe Box")
////////////////
// ## Recipe Box
////////////////

/** A recipe:  a card you can read and change */
export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeBox.spell", start: 625, end: 644 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeBox.spell", start: 648, end: 674 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  // - its "notes" is text
  static { this.declareProp("notes", { type: "text", declaredAt: { path: "/RecipeBox.spell", start: 678, end: 697 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  draw() {
    return h("ui-card", { fluid: true },
      h("ui-content",
        h("ui-form", { class: "recipe", value: this },
          h("ui-field", { label: "Recipe name" },
            h("ui-input", { class: "title", name: "title", size: "large" })
          ),
          h("ui-field", { label: "Serves", inline: true },
            h("ui-input", { class: "serves", name: "servings", type: "number", min: "1", labeled: "right", label: "people" })
          ),
          h("ui-field", { label: "Notes" }, h("ui-textarea", { name: "notes", rows: "2", grow: true }))
        )
      ),
      h("ui-extra", { part: "foot" },
        h("ui-button", {
          class: "remove",
          size: "small",
          appearance: "basic",
          onClick: core.pressed(this, () => core.removeSaved(this)),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Remove")
      )
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }
}

/**
 * Your recipes, on cards:  find one, add one, change one as you type, remove one and undo it.
 * Where they're kept is the next line, and only that line knows.  Change it to keep them somewhere else:
 * family cookbook is a folder at "http://127.0.0.1:4791/api/places/recipes"
 * family cookbook is a live room at "http://127.0.0.1:4791/api/rooms/recipes"
 * (Both are served on your computer by "yarn tsx scripts/recipe-servers.ts", at the top of Spell's folder.)
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "this device" })

core.heading("A recipe:  a card you can read and change")

core.heading("The box:  the card for a new recipe, then a card for each one you have")
/** The box:  the card for a new recipe, then a card for each one you have */
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

  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 1533, end: 1598 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe) => recipe.title.includes(this.search))
  }, () => [this.search]) }

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

  addTheNewRecipe() {
    core.saveThing(this.newRecipe)
    this.newRecipe = new Recipe({ servings: 4 })
  }

  draw() {
    return [
      h("header", { class: "top" },
        h("div", { class: "heading" },
          h("h1", "Recipe Box"),
          h("p", "Everything you type is saved as you go.")
        ),
        h("ui-toolbar", { class: "undo", menu: "box menu", "aria-label": "Recipes" }),
        h("ui-form", { value: this },
          h("ui-field", { label: "Search" }, h("ui-input", { class: "search", name: "search", icon: "search" }))
        )
      ),
      h("ui-card", { class: "new", fluid: true },
        h("ui-content",
          h("ui-form", { "prop:value": () => this.newRecipe },
            h("h2", "Add a recipe"),
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
        waiting: () => h("ui-loader", { class: "waiting", visible: true, inline: true, text: true }, "Finding your recipes"),
        none: () => h("ui-text", { class: "none" },
          () => this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."
        ),
        failed: () => h("ui-message", { class: "failed", color: "red" },
          h("p", "We can't reach your recipes right now."),
          h("ui-button", {
            class: "again",
            onClick: core.pressed(this, () => core.refreshSaved()),
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

if (!core.isCarryingOver) recipeBox.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the recipe box looks.¬   - The box is one grid, <recipe-box-app>:  its header across the top, then a card each, the new recipe's first.¬   - Each recipe is a <recipe-box-recipe>, an element of its own:  its insides are reached by their parts. */¬¬recipe-box-app {¬  --ui-card-margin-block: 0;¬  --ui-form-row-distance: 0.75em;¬  --ui-menu-margin: 0;¬  --ui-message-margin: 0;¬¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  padding-block-end: 1.5em;¬}¬¬recipe-box-recipe {¬  display: block;¬}¬¬/****************¬ * Across the top:  the title, then undo and search, on the right while there's room¬ ****************/¬¬.top {¬  grid-column: 1 / -1;¬}¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.5em 1em;¬¬  .heading {¬    flex: 1 1 100%;¬  }¬¬  h1,¬  p {¬    margin: 0;¬  }¬¬  p {¬    color: var(--ui-text-muted);¬  }¬¬  ui-form {¬    --ui-form-row-distance: 0;¬¬    flex: 1 1 10em;¬  }¬¬  /* with room, one line:  the search stays the same width as undo's words change */¬  @media (min-width: 40em) {¬    .heading {¬      flex-basis: 16em;¬    }¬¬    ui-form {¬      flex: 0 1 18em;¬    }¬  }¬}¬¬/****************¬ * The cards¬ ****************/¬¬/* the new recipe's card stands beside two rows of others:  no hole under its neighbours */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬¬.new h2 {¬  margin: 0 0 0.5em;¬  font-size: 1.15em;¬}¬¬/* the buttons at the foot of a card are at its right */¬.new ui-extra,¬recipe-box-recipe::part(foot) {¬  text-align: end;¬}¬¬/* said beside the new recipe's card, in place of the others */¬.none {¬  color: var(--ui-text-muted);¬}¬¬.waiting {¬  justify-self: start;¬}¬`)
