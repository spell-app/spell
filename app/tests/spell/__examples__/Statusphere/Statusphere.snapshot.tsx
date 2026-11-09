import { core, Thing, App, Place, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

/**
 * Read in from the Lexicon "xyz.statusphere.status" (spell space lexicon read):  its records' shape, as Spell says it.
 * - "status" holds at most 32 bytes:  Spell says lengths in letters
 */
export class Status extends Thing {
  // - its "status" is required text, with maximum length 1
  @prop({ type: "text", rules: [{ type: "empty" }, { type: "maxLength", value: "1" }], declaredAt: { path: "/Status.spell", start: 262, end: 314 } })
  accessor status!: string

  // - its "created at" is a required date
  @prop({ type: "date", rules: [{ type: "empty" }], declaredAt: { path: "/Status.spell", start: 318, end: 353 } })
  accessor createdAt!: Date

  /** whose it is:  the account it's in, which a record can't claim */
  // a status has an owner as text
  @prop({ type: "text", declaredAt: { path: "/Statusphere.api.spell", start: 519, end: 548 } })
  accessor owner!: string

  /** Its owner's handle, once their account says so;  else the account itself */
  static { this.declareProp("who", { declaredAt: { path: "/Statusphere.spellml", start: 425, end: 693 }, readsFrom: ["status_board"] }) }
  @derived get who() {
    const account = this.owner
    const person = core.getItemAt(core.filter(core.peopleHere(), (person) => person.id === account), 0)
    if (person === undefined) return account
    return person?.name
  }

  @drawn draw() {
    return (
      <ui-stack direction="horizontal" align="center">
        <ui-text size="big">{this.status}</ui-text>
        <ui-text>@{this.who}</ui-text>
        <ui-text color="grey" size="small">{core.dateShown(this.createdAt)}</ui-text>
      </ui-stack>
    )
  }

  static publishedAs = "xyz.statusphere.status"

  static savedIn = {
    place: "status_board",
    collection: "statuses",
    times: ["created", "modified"], select: ["status", "createdAt", "owner"] }

  // a status is saved in the status board
  @prop({ type: "date", declaredAt: { path: "/Statusphere.api.spell", start: 415, end: 452 } })
  accessor created!: any /* spell: type unknown */

  // a status is saved in the status board
  @prop({ type: "date", declaredAt: { path: "/Statusphere.api.spell", start: 415, end: 452 } })
  accessor modified!: any /* spell: type unknown */
}
// -----------
core.heading("Statusphere:  where the statuses are kept")
///////////////////////////////////////////////
// ## Statusphere:  where the statuses are kept
///////////////////////////////////////////////
/**
 * Everyone's statuses, each in its owner's own atmosphere account:  yours go in yours, once you sign in.
 * Their shape is Statusphere's own, read in from its Lexicon:  Status.spell, by "spell space lexicon read".
 * What's drawn and done with them is in Statusphere.spellml.
 */
export class StatusBoard extends Place {}
export const statusBoard = core.place(new StatusBoard(), {
  name: "status_board",
  kind: "personal atmosphere account",
  collections: { statuses: { at: "xyz.statusphere.status" } }
})

// -----------
core.heading("Statusphere")
/////////////////
// ## Statusphere
/////////////////
// Bluesky's example app, in Spell:  set your status, an emoji, and see everyone's as they arrive.
// Each status is a record in its owner's own atmosphere account, in the shape Statusphere's Lexicon says:  Status.spell.

// Every emoji to pick is a big, plain button
core.useDefaults("/Statusphere.spellml", {
  "ui-button": { size: "large", appearance: "basic" }
})

core.heading("A status:  the emoji, who set it, and when")
//## A status:  the emoji, who set it, and when

core.heading("The app:  the emoji to pick, then everyone's statuses, newest first")
//## The app:  the emoji to pick, then everyone's statuses, newest first

export class Statusphere extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Newest first:  by when each was set, the other way round */
  static { this.declareProp("recent", { declaredAt: { path: "/Statusphere.spellml", start: 1028, end: 1202 }, readsFrom: ["status_board"] }) }
  get recent() { return core.waitedValue(this, "recent", async () => {
    const found = await core.savedThings(Status, { sort: [{ field: "created_at" }] })
    core.reverse(found)
    return found
  }) }

  /** Your status:  a new record in your own account, as Statusphere writes one */
  postEmoji(emoji: string) {
    core.saveThing(new Status({ status: emoji, createdAt: new Date() }))
  }

  /** One narrow column:  its title, the emoji to pick, then the statuses */
  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack align="start">
          <ui-header size="large">Statusphere</ui-header>
          <ui-text color="grey">Set your status on the Atmosphere</ui-text>
        </ui-stack>
        <ui-card fluid={true}>
          <ui-content>
            <ui-header size="small">Set your status</ui-header>
            <ui-stack direction="horizontal" wrap={true}>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("👍"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                👍
              </ui-button>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("👎"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                👎
              </ui-button>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("💙"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                💙
              </ui-button>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("😎"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                😎
              </ui-button>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("🦋"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                🦋
              </ui-button>
              <ui-button onClick={core.pressed(this, () => this.postEmoji("🚀"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                🚀
              </ui-button>
            </ui-stack>
          </ui-content>
        </ui-card>
        <ui-header size="small">Recent</ui-header>
        {core.drawRead(() => this.recent, (status: Status) => core.drawThing(status), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Finding statuses"}</ui-loader>, none: () => <ui-text color="grey">No statuses yet. Be the first!</ui-text> })}
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a statusphere, drawn in its own element, e.g. by `draw the statusphere`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its statusphere's properties;  its methods call its statusphere's.
 * - What every view's element does, e.g. drawing its statusphere, is `SpellElement`'s.
 */
export class StatusphereElement extends SpellElement<Statusphere> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "statusphere", [])

  postEmoji(emoji: string) {
    return this.currentThing?.postEmoji(emoji)
  }
}
core.useElement(Statusphere, StatusphereElement)
export const statusphere = new Statusphere()
// -----------
if (!core.isCarryingOver) statusphere.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `StatusphereElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
