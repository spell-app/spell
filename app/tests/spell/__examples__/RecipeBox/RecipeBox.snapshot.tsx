import { core, App, View, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeBox.spell", start: 436, end: 455 } })
  accessor title!: string

  // - its "servings" is a number
  @prop({ type: "number", declaredAt: { path: "/RecipeBox.spell", start: 459, end: 485 } })
  accessor servings!: number

  @drawn draw() {
    return (
      <ui-form class="recipe" value={this}>
        <ui-input name="title" aria-label="Recipe" />
        <ui-text class="servings">serves {this.servings}</ui-text>
        <ui-button class="remove" onClick={core.pressed(this, () => this.remove())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Remove
        </ui-button>
      </ui-form>
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }

  remove() {
    core.removeSaved(this)
  }
}

/**
 * `<test-project-recipe>`:  a recipe, drawn in its own element, e.g. by `draw the recipe`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe's properties;  its methods call its recipe's.
 * - What every view's element does, e.g. drawing its recipe, is `SpellElement`'s.
 */
export class RecipeElement extends SpellElement<Recipe> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe", "recipe", [
    { name: "servings", kind: "number", description: "Its servings." }
  ])

  remove() {
    return this.currentThing?.remove()
  }
}
core.useElement(Recipe, RecipeElement)

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
  @prop({ type: "text" })
  accessor search!: string

  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 878, end: 964 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe: Recipe) => recipe.title.includes(this.search)), (item: Recipe) => item.title)
  }) }

  addTheDraft() {
    if (this.draft === "") return
    core.saveThing(new Recipe({ title: this.draft, servings: 2 }))
    this.draft = ""
  }

  @drawn draw() {
    return [
      <ui-form class="box" value={this}>
        <ui-input class="draft" name="draft" label="New recipe" aria-label="New recipe" />
        <ui-button class="add" disabled={this.draft === ""} onClick={core.pressed(this, () => this.addTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Add
        </ui-button>
        <ui-input class="search" name="search" label="Search" aria-label="Search" />
      </ui-form>,
      core.drawRead(() => this.matches, (recipe: Recipe) => core.drawThing(recipe), {
        waiting: () => <ui-loader class="waiting" />,
        none: () => <ui-text class="none">
          {this.search === "" ? "No recipes yet. Add the first one." : "No recipes match your search."}
        </ui-text>,
        failed: () => <ui-message class="failed" color="red">
          Can't reach the cookbook right now.
          <ui-button class="again" onClick={core.pressed(this, () => core.refreshSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Try again
          </ui-button>
        </ui-message>
      })
    ]
  }
}

/**
 * `<test-project-app>`:  a recipe box, drawn in its own element, e.g. by `draw the recipe box`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe box's properties;  its methods call its recipe box's.
 * - What every view's element does, e.g. drawing its recipe box, is `SpellElement`'s.
 */
export class RecipeBoxElement extends SpellElement<RecipeBox> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "recipe box", [
    { name: "search", kind: "string", description: "Its search." },
    { name: "draft", kind: "string", description: "Its draft." }
  ])

  addTheDraft() {
    return this.currentThing?.addTheDraft()
  }
}
core.useElement(RecipeBox, RecipeBoxElement)
export const recipeBox = new RecipeBox()

if (!core.isCarryingOver) recipeBox.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecipeElement` */
      "test-project-recipe": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeBoxElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
