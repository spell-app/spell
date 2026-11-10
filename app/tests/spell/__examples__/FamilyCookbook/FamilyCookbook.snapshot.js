import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Family Cookbook:  your recipes, saved in the cloud")
////////////////////////////////////////////////////////
// ## Family Cookbook:  your recipes, saved in the cloud
////////////////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/FamilyCookbook.api.spell", start: 423, end: 442 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/FamilyCookbook.api.spell", start: 446, end: 472 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  // - its "notes" is text
  static { this.declareProp("notes", { type: "text", declaredAt: { path: "/FamilyCookbook.api.spell", start: 476, end: 495 } }) }
  get notes() { return this.getProp("notes") }
  set notes(value) { this.setProp("notes", value) }

  draw() {
    return h("ui-card",
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
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/FamilyCookbook.api.spell", start: 392, end: 419 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in family cookbook
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/FamilyCookbook.api.spell", start: 392, end: 419 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * The next line keeps them in your own space on Spell's server:  sign in on any device, and they're there.
 * Until you sign in, they're kept in this browser, and the page says so;  once you do, they go up.
 * What's drawn and done with them is in FamilyCookbook.spell.
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), {
  name: "family_cookbook",
  kind: "the cloud",
  at: "/api/places/spaces/personal/family-cookbook",
  checkedEvery: 5
})

// -----------
core.heading("Family Cookbook")
/////////////////////
// ## Family Cookbook
/////////////////////
// Your recipes, on cards, saved in the cloud:  sign in on your laptop and your phone, and both show the same ones.
// Where they're kept is in FamilyCookbook.api.spell, and only its first line knows.

// Every notes box grows as you type
core.useDefaults("/FamilyCookbook.spell", {
  "ui-textarea": { grow: true }
})

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

core.heading("The box:  the card for a new recipe, then a card for each one you have")
//## The box:  the card for a new recipe, then a card for each one you have

export class Cookbook extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "new recipe" is a new recipe with servings = 4
  static { this.declareProp("newRecipe", { init: () => new Recipe({ servings: 4 }), early: true }) }
  get newRecipe() { return this.getProp("newRecipe") }
  set newRecipe(value) { this.setProp("newRecipe", value) }

  /** Newest first, by when each was saved */
  static { this.declareProp("matches", { declaredAt: { path: "/FamilyCookbook.spell", start: 1231, end: 1397 }, readsFrom: ["family_cookbook"] }) }
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
          h("ui-header", { size: "large" }, "Family Cookbook"),
          h("ui-text", { color: "grey" },
            "Everything you type is saved as you go:  in the cloud, once you sign in."
          )
        ),
        h("ui-toolbar", { class: "undo", menu: "box menu", "aria-label": "Recipes" }),
        h("ui-form", { class: "find", value: this },
          h("ui-field", { label: "Search" }, h("ui-input", { class: "search", name: "search", icon: "search" }))
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
      )
    )
  }
}
export const cookbook = new Cookbook()
// - its "box menu" is a menu of "undo"
core.describeMenu(Cookbook, "boxMenu", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) cookbook.start()
