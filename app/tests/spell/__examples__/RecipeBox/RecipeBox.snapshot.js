import { core, App, View, Place, h } from "@spell/core"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeBox.spell", start: 436, end: 455 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeBox.spell", start: 459, end: 485 } }) }
  get servings() { return this.getProp("servings") }
  set servings(value) { this.setProp("servings", value) }

  draw() {
    return h("ui-form", { class: "recipe", value: this },
      h("ui-input", { name: "title", "aria-label": "Recipe" }),
      h("ui-text", { class: "servings" }, "serves ", () => this.servings),
      h("ui-button", {
        class: "remove",
        onClick: core.pressed(this, () => this.remove()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Remove")
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }

  remove() {
    core.removeSaved(this)
  }
}

/**
 * Where the recipes are kept:  in this browser, so no server is involved.
 * To keep them elsewhere, change this ONE line.  With "yarn tsx scripts/recipe-servers.ts" running, try:
 * family cookbook is a folder at "http://127.0.0.1:4791/api/places/recipes"
 * family cookbook is a live room at "http://127.0.0.1:4791/api/rooms/recipes"
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "this device" })

core.describeAction(Recipe, "remove", { title: "remove it", undoneAs: "Remove Recipe" })

export class RecipeBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  // - its "draft" is text
  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 878, end: 964 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe) => recipe.title.includes(this.search)), (item) => item.title)
  }) }

  addTheDraft() {
    if (this.draft === "") return
    core.saveThing(new Recipe({ title: this.draft, servings: 2 }))
    this.draft = ""
  }

  draw() {
    return [
      h("ui-form", { class: "box", value: this },
        h("ui-input", { class: "draft", name: "draft", label: "New recipe", "aria-label": "New recipe" }),
        h("ui-button", {
          class: "add",
          disabled: () => this.draft === "",
          onClick: core.pressed(this, () => this.addTheDraft()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Add"),
        h("ui-input", { class: "search", name: "search", label: "Search", "aria-label": "Search" })
      ),
      core.drawRead(() => this.matches, (recipe) => core.drawThing(recipe), {
        waiting: () => h("ui-loader", { class: "waiting" }),
        none: () => h("ui-text", { class: "none" },
          () => this.search === "" ? "No recipes yet. Add the first one." : "No recipes match your search."
        ),
        failed: () => h("ui-message", { class: "failed", color: "red" },
          "Can't reach the cookbook right now.",
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

if (!core.isCarryingOver) recipeBox.start()
