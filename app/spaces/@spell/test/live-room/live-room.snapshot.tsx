import { core, App, View, Place, prop, drawn, on } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/LiveRoom.spell", start: 825, end: 844 } })
  accessor title!: string

  onSomeoneElseChange(event: any /* spell: type unknown */) {
    liveBox.news = `Someone else changed ${this.title}`
  }

  @drawn draw() {
    return (
      <ui-form class="recipe" value={this}>
        <ui-input name="title" aria-label="Recipe" />
      </ui-form>
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
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-recipe", "recipe", [])

  onSomeoneElseChange(event: any /* spell: type unknown */) {
    return this.currentThing?.onSomeoneElseChange(event)
  }
}
core.useElement(Recipe, RecipeElement)

/** A recipe box two people share:  who's here, and what the other one changed (epic data P13) */
export class FamilyCookbook extends Place {}
export const familyCookbook = core.place(new FamilyCookbook(), {
  name: "family_cookbook",
  kind: "live room",
  at: "/api/rooms/recipes"
})

export class LiveBox extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "news" is text
  @prop({ type: "text" })
  accessor news!: string

  // - its "changes" is a number
  @prop({ type: "number" })
  accessor changes!: number

  addOne() {
    core.saveThing(new Recipe({ title: "New" }))
  }

  @drawn draw() {
    return [
      <ui-text class="me">{core.currentPerson().name}</ui-text>,
      core.drawRead(() => core.peopleHere(), (person) => <ui-label class="here">{person.name}</ui-label>),
      <ui-text class="news">{this.news}</ui-text>,
      <ui-text class="changes">{this.changes}</ui-text>,
      <ui-button class="again" onClick={core.pressed(this, () => core.refreshSaved(Recipe))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Check now
      </ui-button>,
      <ui-button class="add" onClick={core.pressed(this, () => this.addOne())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Add one
      </ui-button>,
      core.drawRead(async () => await core.savedThings(Recipe), (recipe: Recipe) => core.drawThing(recipe))
    ]
  }
}

/**
 * `<test-project-app>`:  a live box, drawn in its own element, e.g. by `draw the live box`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its live box's properties;  its methods call its live box's.
 * - What every view's element does, e.g. drawing its live box, is `SpellElement`'s.
 */
export class LiveBoxElement extends SpellElement<LiveBox> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "live box", [
    { name: "news", kind: "string", description: "Its news." },
    { name: "changes", kind: "number", description: "Its changes." }
  ])

  addOne() {
    return this.currentThing?.addOne()
  }
}
core.useElement(LiveBox, LiveBoxElement)
export const liveBox = new LiveBox()

on<{ recipe: Recipe }>("a-recipe-change", ({ recipe }) => {
  liveBox.changes = liveBox.changes + 1
})

if (!core.isCarryingOver) liveBox.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `RecipeElement` */
      "test-project-recipe": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `LiveBoxElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
