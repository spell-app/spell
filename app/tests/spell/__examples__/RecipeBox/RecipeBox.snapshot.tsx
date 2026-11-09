import { core, Thing, App, View, Place, prop, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Recipe Box:  where the recipes are kept")
/////////////////////////////////////////////
// ## Recipe Box:  where the recipes are kept
/////////////////////////////////////////////

export class Recipe extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 1162, end: 1181 } })
  accessor title!: string

  // - its "servings" is a number
  @prop({ type: "number", declaredAt: { path: "/RecipeBox.api.spell", start: 1185, end: 1211 } })
  accessor servings!: number

  // - its "notes" is text
  @prop({ type: "text", declaredAt: { path: "/RecipeBox.api.spell", start: 1215, end: 1234 } })
  accessor notes!: string

  /** Its Edit screen:  nothing changes until Save */
  edit() {
    recipeBox.editing = this
  }

  @drawn draw() {
    return (
      <ui-card>
        <ui-content>
          <ui-form class="recipe" value={this}>
            <ui-field label="Recipe name">
              <ui-button class="edit" slot="actions" icon="pencil" size="mini" appearance="transparent" aria-label="Edit" title="Edit" onClick={core.pressed(this, () => this.edit())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
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
    place: "family_cookbook",
    collection: "recipes",
    times: ["created", "modified"]
  }

  // - it lives in family cookbook
  @prop({ type: "date", declaredAt: { path: "/RecipeBox.api.spell", start: 1131, end: 1158 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in family cookbook
  @prop({ type: "date", declaredAt: { path: "/RecipeBox.api.spell", start: 1131, end: 1158 } })
  accessor modified!: any /* spell: type unknown */
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
 * family cookbook is a spreadsheet at "recipes.xlsx"
 * family cookbook is an excel file at "recipes.xlsx"
 * (the workbook beside this file, read only:  a spreadsheet reads Excel by the ".xlsx" ending, an excel file whatever it ends in)
 * What's drawn and done with them is in RecipeBox.spellml.
 */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "database on this device" })

// -----------
core.heading("Recipe Box")
////////////////
// ## Recipe Box
////////////////
// Your recipes, on cards:  find one, add one, change one as you type or on its Edit screen, remove one and undo it.
// Where they're kept is in RecipeBox.api.spell, and only its first line knows.

// Every notes box grows as you type

export class RecipeEditor extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** The recipe being changed */
  // - its "recipe" is a recipe
  @prop({ type: "Recipe" })
  accessor recipe!: Recipe

  /** A copy to change:  the recipe stays as it was until Save */
  get draft() {
    return core.draftOf(this.recipe!)
  }

  /** Every changed field, sent together */
  save() {
    core.saveDraft(this.draft)
    recipeBox.editing = undefined
  }

  /** Forget the copy:  the recipe never changed */
  cancel() {
    core.discardDraft(this.draft)
    recipeBox.editing = undefined
  }

  @drawn draw() {
    return (
      <ui-card class="editor">
        <ui-content>
          <ui-form prop:value={this.draft}>
            <ui-header size="small">Edit {this.recipe?.title}</ui-header>
            <ui-field label="Recipe name">
              <ui-input class="edit-title" name="title" size="large" />
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
          <ui-button class="save" size="small" color="primary" disabled={this.draft.title === ""} onClick={core.pressed(this, () => this.save())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Save
          </ui-button>
          <ui-button class="cancel" size="small" onClick={core.pressed(this, () => this.cancel())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Cancel
          </ui-button>
        </ui-extra>
      </ui-card>
    )
  }
}

/**
 * `<test-project-recipe-editor>`:  a recipe editor, drawn in its own element, e.g. by `draw the recipe editor`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its recipe editor's properties;  its methods call its recipe editor's.
 * - What every view's element does, e.g. drawing its recipe editor, is `SpellElement`'s.
 */
export class RecipeEditorElement extends SpellElement<RecipeEditor> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe-editor", "recipe editor", [
    { name: "recipe", kind: "string", description: "Its recipe." }
  ])

  save() {
    return this.currentThing?.save()
  }

  cancel() {
    return this.currentThing?.cancel()
  }
}
core.useElement(RecipeEditor, RecipeEditorElement)

core.useDefaults("/RecipeBox.spellml", {
  "ui-textarea": { grow: true }
})

core.heading("A recipe:  a card you can read and change")
//## A recipe:  a card you can read and change

core.heading("Its Edit screen:  a form over a draft, so nothing changes until Save")
//## Its Edit screen:  a form over a draft, so nothing changes until Save

core.heading("The box:  the card for a new recipe, then a card for each one you have")
//## The box:  the card for a new recipe, then a card for each one you have

@thing
export class RecipeBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "new recipe" is a new recipe with servings = 4
  @prop({ init: () => new Recipe({ servings: 4 }), early: true })
  accessor newRecipe!: Recipe

  /** The recipe on its Edit screen, while one is */
  // - its "editing" is a recipe
  @prop({ type: "Recipe" })
  accessor editing!: Recipe

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

  /** Newest first, by when each was saved */
  static { this.declareProp("matches", { declaredAt: { path: "/RecipeBox.spellml", start: 3402, end: 3568 }, readsFrom: ["family_cookbook"] }) }
  get matches() { return core.waitedValue(this, "matches", async () => {
    return core.sortedBy(core.filter(await core.savedThings(Recipe, {}, "looks through"), (recipe: Recipe) => core.includes(recipe.title, this.search)), (item: Recipe) => core.descending(item.created))
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
            <ui-header size="large">Recipe Box</ui-header>
            <ui-text color="grey">Everything you type is saved as you go.</ui-text>
          </ui-stack>
          <ui-toolbar class="undo" menu="box menu" aria-label="Recipes" />
          <ui-form class="find" value={this}>
            <ui-field label="Search">
              <ui-input class="search" name="search" icon="search" />
            </ui-field>
          </ui-form>
        </ui-stack>
        {this.drawScreen()}
      </ui-container>
    )
  }

  // Its Edit screen, while a recipe is being changed;  else the cards:  its own drawing, so its `if` picks just one
  drawScreen() {
    if (this.editing) return core.drawThing(new RecipeEditor({ recipe: this.editing }))
    else {
      return (
        <ui-cards columns="3" doubling={true} part="screen">
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
            waiting: () => <ui-loader visible={true} inline={true} text={true} part="screen">{"Finding your recipes"}</ui-loader>,
            none: () => <ui-text class="none" color="grey" part="screen">
              {this.search === "" ? "No recipes yet. Add your first one." : "No recipes match your search."}
            </ui-text>,
            failed: () => <ui-message class="failed" color="red" part="screen">
              We can't reach your recipes right now.
              <ui-button class="again" onClick={core.pressed(this, () => core.reloadSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Try again
              </ui-button>
            </ui-message>
          })}
        </ui-cards>
      )
    }
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
    { name: "new-recipe", kind: "json", description: "Its newRecipe." },
    { name: "editing", kind: "string", description: "Its editing." }
  ])

  create() {
    return this.currentThing?.create()
  }

  addTheNewRecipe() {
    return this.currentThing?.addTheNewRecipe()
  }

  drawScreen() {
    return this.currentThing?.drawScreen()
  }
}
core.useElement(RecipeBox, RecipeBoxElement)
export const recipeBox = new RecipeBox()
// - its "box menu" is a menu of "undo"
core.describeMenu(RecipeBox, "boxMenu", { items: ["undo"] })
// -----------
if (!core.isCarryingOver) recipeBox.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecipeEditorElement` */
      "test-project-recipe-editor": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `RecipeBoxElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
