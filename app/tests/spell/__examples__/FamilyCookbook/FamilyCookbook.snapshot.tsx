import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Family Cookbook:  your recipes, saved in the cloud")
////////////////////////////////////////////////////////
// ## Family Cookbook:  your recipes, saved in the cloud
////////////////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/FamilyCookbook.api.spell", start: 423, end: 442 } })
  accessor title!: string

  // - its "servings" is a number
  @prop({ type: "number", declaredAt: { path: "/FamilyCookbook.api.spell", start: 446, end: 472 } })
  accessor servings!: number

  // - its "notes" is text
  @prop({ type: "text", declaredAt: { path: "/FamilyCookbook.api.spell", start: 476, end: 495 } })
  accessor notes!: string

  @drawn draw() {
    return (
      <ui-card>
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
              <ui-textarea name="notes" rows="2" />
            </ui-field>
          </ui-form>
        </ui-content>
      </ui-card>
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }
}

/**
 * The next line keeps them in your own space on Spell's server:  sign in on any device, and they're there.
 * Until you sign in, they're kept in this browser, and the page says so;  once you do, they go up.
 * What's drawn and done with them is in FamilyCookbook.spellml.
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
core.useDefaults("/FamilyCookbook.spellml", {
  "ui-textarea": { grow: true }
})

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

core.heading("The box:  the card for a new recipe, then a card for each one you have")
//## The box:  the card for a new recipe, then a card for each one you have

export class Cookbook extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "new recipe" is a new recipe with servings = 4
  @prop({ init: () => new Recipe({ servings: 4 }), early: true })
  accessor newRecipe!: Recipe

  /** Newest first:  a new one joins the end, so they're shown the other way round */
  static { this.declareProp("matches", { declaredAt: { path: "/FamilyCookbook.spellml", start: 1231, end: 1437 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    const found = core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe: Recipe) => core.includes(recipe.title, this.search))
    core.reverse(found)
    return found
  }, () => [this.search]) }

  addTheNewRecipe() {
    core.saveThing(this.newRecipe)
    this.newRecipe = new Recipe({ servings: 4 })
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack direction="horizontal" wrap={true} align="end" justify="between">
          <ui-stack align="start">
            <ui-header size="large">Family Cookbook</ui-header>
            <ui-text color="grey">{"Everything you type is saved as you go:  in the cloud, once you sign in."}</ui-text>
          </ui-stack>
          <ui-toolbar class="undo" menu="box menu" aria-label="Recipes" />
          <ui-form class="find" value={this}>
            <ui-field label="Search">
              <ui-input class="search" name="search" icon="search" />
            </ui-field>
          </ui-form>
        </ui-stack>
        <ui-cards>
          <ui-card class="new">
            <ui-content>
              <ui-form prop:value={this.newRecipe}>
                <ui-header size="small">Add a recipe</ui-header>
                <ui-field label="Recipe name">
                  <ui-input class="draft" name="title" size="large" />
                </ui-field>
                <ui-field label="Serves" inline={true}>
                  <ui-input class="serves" name="servings" type="number" min="1" labeled="right" label="people" />
                </ui-field>
                <ui-field label="Notes">
                  <ui-textarea name="notes" rows="2" />
                </ui-field>
              </ui-form>
            </ui-content>
            <ui-extra>
              <ui-button class="add" size="small" color="primary" disabled={this.newRecipe.title === ""} onClick={core.pressed(this, () => this.addTheNewRecipe())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Add recipe
              </ui-button>
            </ui-extra>
          </ui-card>
          {core.drawRead(() => this.matches, (recipe: Recipe) => core.drawThing(recipe), {
            waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding your recipes"}</ui-loader>,
            none: () => <ui-text class="none" color="grey">
              {this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."}
            </ui-text>,
            failed: () => <ui-message class="failed" color="red">
              We can't reach your recipes right now.
              <ui-button class="again" onClick={core.pressed(this, () => core.reloadSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Try again
              </ui-button>
            </ui-message>
          })}
        </ui-cards>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a cookbook, drawn in its own element, e.g. by `draw the cookbook`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its cookbook's properties;  its methods call its cookbook's.
 * - What every view's element does, e.g. drawing its cookbook, is `SpellElement`'s.
 */
export class CookbookElement extends SpellElement<Cookbook> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "cookbook", [
    { name: "search", kind: "string", description: "Its search." },
    { name: "new-recipe", kind: "json", description: "Its newRecipe." }
  ])

  addTheNewRecipe() {
    return this.currentThing?.addTheNewRecipe()
  }
}
core.useElement(Cookbook, CookbookElement)
export const cookbook = new Cookbook()
// - its "box menu" is a menu of "undo"
core.describeMenu(Cookbook, "boxMenu", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) cookbook.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `CookbookElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
