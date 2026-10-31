import { core, App, View, Place, h } from "@spell/core"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/RecipeBox.spell", start: 206, end: 225 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "servings" is a number
  static { this.declareProp("servings", { type: "number", declaredAt: { path: "/RecipeBox.spell", start: 229, end: 255 } }) }
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

/** The line a different back-end changes:  tests/spell/recipeBox.test.ts changes only this, for each one it runs */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "in memory" })

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

  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 648, end: 734 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe) => recipe.title.includes(this.search)), (item) => item.title)
  }, () => [this.search]) }

  addTheDraft() {
    if (this.draft === "") return
    core.saveThing(new Recipe({ title: this.draft, servings: 2 }))
    this.draft = ""
  }

  draw() {
    return [
      h("ui-form", { class: "box", value: this },
        h("ui-input", { class: "search", name: "search", "aria-label": "Search" }),
        h("ui-input", { class: "draft", name: "draft", "aria-label": "New recipe" }),
        h("ui-button", {
          class: "add",
          onClick: core.pressed(this, () => this.addTheDraft()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Add")
      ),
      core.drawRead(() => this.matches, (recipe) => core.drawThing(recipe), {
        waiting: () => h("ui-loader", { class: "waiting" }),
        none: () => h("ui-text", { class: "none" }, "No recipes yet. Add the first one."),
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
