import { core, App, View, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Recipe Box")
////////////////
// ## Recipe Box
////////////////

/** A recipe:  a card you can read and change */
export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeBox.spell", start: 625, end: 644 } })
  accessor title!: string

  // - its "servings" is a number
  @prop({ type: "number", declaredAt: { path: "/RecipeBox.spell", start: 648, end: 674 } })
  accessor servings!: number

  // - its "notes" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeBox.spell", start: 678, end: 697 } })
  accessor notes!: string

  @drawn draw() {
    return (
      <ui-card fluid={true}>
        <ui-content>
          <ui-form class="recipe" value={this}>
            <ui-field label="Recipe name">
              <ui-button class="remove" slot="actions" icon="close" size="mini" appearance="transparent" aria-label="Remove" title="Remove" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
              <ui-input class="title" name="title" size="large" />
            </ui-field>
            <ui-field label="Serves" inline={true}>
              <ui-input class="serves" name="servings" type="number" min="1" labeled="right" label="people" />
            </ui-field>
            <ui-field label="Notes">
              <ui-textarea name="notes" rows="2" grow={true} />
            </ui-field>
          </ui-form>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }
}

/**
 * `<test-project-recipe>`:  a recipe, drawn in its own element, e.g. by `draw the recipe`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe's properties;  its methods call its recipe's.
 * - What every view's element does, e.g. drawing its recipe, is `SpellElement`'s.
 */
export class RecipeElement extends SpellElement<Recipe> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe", "recipe", [
    { name: "servings", kind: "number", description: "Its servings." },
    { name: "notes", kind: "string", description: "Its notes." }
  ])
}
core.useElement(Recipe, RecipeElement)

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
@thing
export class RecipeBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "new recipe" is a new recipe with servings = 4
  @prop({ init: () => new Recipe({ servings: 4 }), early: true })
  accessor newRecipe!: Recipe

  /** newest first:  a new one joins the end, so they're shown the other way round */
  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spell", start: 1626, end: 1738 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    const found = core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe: Recipe) => recipe.title.includes(this.search))
    core.reverse(found)
    return found
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

  @drawn draw() {
    return [
      <header class="top">
        <div class="heading">
          <h1>Recipe Box</h1>
          <p>Everything you type is saved as you go.</p>
        </div>
        <ui-toolbar class="undo" menu="box menu" aria-label="Recipes" />
        <ui-form value={this}>
          <ui-field label="Search">
            <ui-input class="search" name="search" icon="search" />
          </ui-field>
        </ui-form>
      </header>,
      <ui-card class="new" fluid={true}>
        <ui-content>
          <ui-form prop:value={this.newRecipe}>
            <h2>Add a recipe</h2>
            <ui-field label="Recipe name">
              <ui-input class="draft" name="title" size="large" />
            </ui-field>
            <ui-field label="Serves" inline={true}>
              <ui-input class="serves" name="servings" type="number" min="1" labeled="right" label="people" />
            </ui-field>
            <ui-field label="Notes">
              <ui-textarea name="notes" rows="2" grow={true} />
            </ui-field>
          </ui-form>
        </ui-content>
        <ui-extra>
          <ui-button class="add" size="small" color="primary" disabled={this.newRecipe.title === ""} onClick={core.pressed(this, () => this.addTheNewRecipe())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Add recipe
          </ui-button>
        </ui-extra>
      </ui-card>,
      core.drawRead(() => this.matches, (recipe: Recipe) => core.drawThing(recipe), {
        waiting: () => <ui-loader class="waiting" visible={true} inline={true} text={true}>Finding your recipes</ui-loader>,
        none: () => <ui-text class="none">
          {this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."}
        </ui-text>,
        failed: () => <ui-message class="failed" color="red">
          <p>We can't reach your recipes right now.</p>
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
    { name: "new-recipe", kind: "json", description: "Its newRecipe." }
  ])

  create() {
    return this.currentThing?.create()
  }

  addTheNewRecipe() {
    return this.currentThing?.addTheNewRecipe()
  }
}
core.useElement(RecipeBox, RecipeBoxElement)
export const recipeBox = new RecipeBox()
// - its "box menu" is a menu of "undo"
core.describeMenu(RecipeBox, "boxMenu", { items: ["undo"] })

if (!core.isCarryingOver) recipeBox.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the recipe box looks.¬   - The box is one grid, <recipe-box-app>:  its header across the top, then a card each, the new recipe's first.¬   - Each recipe is a <recipe-box-recipe>, an element of its own:  its insides are reached by their parts. */¬¬recipe-box-app {¬  --ui-card-margin-block: 0;¬  --ui-form-row-distance: 0.75em;¬  --ui-menu-margin: 0;¬  --ui-message-margin: 0;¬¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18em), 1fr));¬  align-items: start;¬  gap: 1em;¬  max-width: 66em;¬  margin-inline: auto;¬  padding-block-end: 1.5em;¬}¬¬recipe-box-recipe {¬  display: block;¬}¬¬/****************¬ * Across the top:  the title, then undo and search, on the right while there's room¬ ****************/¬¬.top {¬  grid-column: 1 / -1;¬}¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.5em 1em;¬¬  .heading {¬    flex: 1 1 100%;¬  }¬¬  h1,¬  p {¬    margin: 0;¬  }¬¬  p {¬    color: var(--ui-text-muted);¬  }¬¬  ui-form {¬    --ui-form-row-distance: 0;¬¬    flex: 1 1 10em;¬  }¬¬  /* with room, one line:  the search stays the same width as undo's words change */¬  @media (min-width: 40em) {¬    .heading {¬      flex-basis: 16em;¬    }¬¬    ui-form {¬      flex: 0 1 18em;¬    }¬  }¬}¬¬/****************¬ * The cards¬ ****************/¬¬/* the new recipe's card stands beside two rows of others:  no hole under its neighbours */¬@media (min-width: 40em) {¬  .new::part(card) {¬    grid-row: span 2;¬  }¬}¬¬.new h2 {¬  margin: 0 0 0.5em;¬  font-size: 1.15em;¬}¬¬/* Add, at the foot of its card, on the right */¬.new ui-extra {¬  text-align: end;¬}¬¬/* said beside the new recipe's card, in place of the others */¬.none {¬  color: var(--ui-text-muted);¬}¬¬.waiting {¬  justify-self: start;¬}¬`)

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
