import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Recipe File:  your recipes, in a file on your computer")
////////////////////////////////////////////////////////////
// ## Recipe File:  your recipes, in a file on your computer
////////////////////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeFile.api.spell", start: 389, end: 408 } })
  accessor title!: string

  // - its "servings" is a number
  @prop({ type: "number", declaredAt: { path: "/RecipeFile.api.spell", start: 410, end: 436 } })
  accessor servings!: number

  // - its "notes" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeFile.api.spell", start: 438, end: 457 } })
  accessor notes!: string

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-form class="recipe" prop:value={this}>
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

  static savedIn = {
    place: "cookbook_file",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in cookbook file
  @prop({ type: "date", declaredAt: { path: "/RecipeFile.api.spell", start: 362, end: 387 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in cookbook file
  @prop({ type: "date", declaredAt: { path: "/RecipeFile.api.spell", start: 362, end: 387 } })
  accessor modified!: any /* spell: type unknown */
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
  @prop({ init: () => new Recipe({ servings: 4 }), early: true })
  accessor newRecipe!: Recipe

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

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack direction="horizontal" wrap={true} align="end" justify="between">
          <ui-stack align="start">
            <ui-header size="large">Recipe File</ui-header>
            <ui-text color="grey">Open a recipes file, and every change goes back to it.</ui-text>
          </ui-stack>
          <ui-stack direction="horizontal">
            {core.drawAction(this, "openAFile")}
            {core.drawAction(this, "saveTheFile")}
            {core.drawAction(this, "undo")}
          </ui-stack>
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
              </ui-form>
            </ui-content>
            <ui-extra>
              <ui-button class="add" size="small" color="primary" disabled={this.newRecipe.title === ""} onClick={core.pressed(this, () => this.addTheNewRecipe())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Add recipe
              </ui-button>
            </ui-extra>
          </ui-card>
          {core.drawRead(async () => await core.savedThings(Recipe, {}, "as drawn"), (recipe: Recipe) => core.drawThing(recipe), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading your recipes"}</ui-loader>, none: () => <ui-card class="none">
            <ui-content>
              <ui-text color="grey">No recipes yet. Open a recipes file, or add your first one.</ui-text>
            </ui-content>
          </ui-card> })}
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
    { name: "new-recipe", kind: "json", description: "Its newRecipe." }
  ])

  openAFile() {
    return this.currentThing?.openAFile()
  }

  saveTheFile() {
    return this.currentThing?.saveTheFile()
  }

  addTheNewRecipe() {
    return this.currentThing?.addTheNewRecipe()
  }
}
core.useElement(Cookbook, CookbookElement)
export const cookbook = new Cookbook()
core.describeAction(Cookbook, "openAFile", { title: "Open", icon: "folder open", cantBeUndone: "keeps history" })
core.describeAction(Cookbook, "saveTheFile", { title: "Save", shortcuts: ["S"], icon: "save", cantBeUndone: "keeps history" })
core.describeAction(Cookbook, "addTheNewRecipe", { title: "Add the New Recipe", undoneAs: "Add the New Recipe" })
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
