import { core, App, View, Place, h, on } from "@spell/core"

export class Recipe extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/LiveRoom.spell", start: 825, end: 844 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  onSomeoneElseChange(event) {
    liveBox.news = `Someone else changed ${this.title}`
  }

  draw() {
    return h("ui-form", { class: "recipe", value: this },
      h("ui-input", { name: "title", "aria-label": "Recipe" })
    )
  }

  static savedIn = { place: "family_cookbook", collection: "recipes" }
}

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
  static { this.declareProp("news", { type: "text" }) }
  get news() { return this.getProp("news") }
  set news(value) { this.setProp("news", value) }

  // - its "changes" is a number
  static { this.declareProp("changes", { type: "number" }) }
  get changes() { return this.getProp("changes") }
  set changes(value) { this.setProp("changes", value) }

  addOne() {
    core.saveThing(new Recipe({ title: "New" }))
  }

  draw() {
    return [
      h("ui-text", { class: "me" }, () => core.currentPerson().name),
      core.drawRead(() => core.peopleHere(), (person) => h("ui-label", { class: "here" }, () => person.name)),
      h("ui-text", { class: "news" }, () => this.news),
      h("ui-text", { class: "changes" }, () => this.changes),
      h("ui-button", {
        class: "again",
        onClick: core.pressed(this, () => core.refreshSaved(Recipe)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Check now"),
      h("ui-button", {
        class: "add",
        onClick: core.pressed(this, () => this.addOne()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Add one"),
      core.drawRead(async () => await core.savedThings(Recipe), (recipe) => core.drawThing(recipe))
    ]
  }
}
export const liveBox = new LiveBox()

on("a-recipe-change", (event) => {
  const { recipe } = event
  liveBox.changes = liveBox.changes + 1
})

if (!core.isCarryingOver) liveBox.start()
