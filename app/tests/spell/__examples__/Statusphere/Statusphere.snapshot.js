import { core, Thing, App, Place, h } from "@spell/core"

/**
 * Read in from the Lexicon "xyz.statusphere.status" (spell space lexicon read):  its records' shape, as Spell says it.
 * - "status" holds at most 32 bytes:  Spell says lengths in letters
 */
export class Status extends Thing {
  // - its "status" is required text, with maximum length 1
  static { this.declareProp("status", { type: "text", rules: [{ type: "empty" }, { type: "maxLength", value: "1" }], declaredAt: { path: "/Status.spell", start: 262, end: 314 } }) }
  get status() { return this.getProp("status") }
  set status(value) { this.setProp("status", value) }

  // - its "created at" is a required date
  static { this.declareProp("createdAt", { type: "date", rules: [{ type: "empty" }], declaredAt: { path: "/Status.spell", start: 318, end: 353 } }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  /** whose it is:  the account it's in, which a record can't claim */
  // a status has an owner as text
  static { this.declareProp("owner", { type: "text", declaredAt: { path: "/Statusphere.api.spell", start: 574, end: 603 } }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  /** Its owner's handle, once their account says so;  else the account itself */
  static { this.declareProp("who", { declaredAt: { path: "/Statusphere.spell", start: 425, end: 693 }, readsFrom: ["status_board"] }) }
  get who() {
    const account = this.owner
    const person = core.getItemAt(core.filter(core.peopleHere(), (person) => person.id === account), 0)
    if (person === undefined) return account
    return person?.name
  }

  draw() {
    return h("ui-stack", { direction: "horizontal", align: "center" },
      h("ui-text", { size: "big" }, () => this.status),
      h("ui-text", "@", () => this.who),
      h("ui-text", { color: "grey", size: "small" }, () => core.dateShown(this.createdAt))
    )
  }

  static publishedAs = "xyz.statusphere.status"

  static savedIn = {
    place: "status_board",
    collection: "statuses",
    times: ["created", "modified"], select: ["status", "createdAt", "owner", "created"] }

  // a status is saved in the status board
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/Statusphere.api.spell", start: 468, end: 505 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // a status is saved in the status board
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/Statusphere.api.spell", start: 468, end: 505 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
// -----------
core.heading("Statusphere:  where the statuses are kept")
///////////////////////////////////////////////
// ## Statusphere:  where the statuses are kept
///////////////////////////////////////////////
/**
 * Everyone's statuses, each in its owner's own atmosphere account:  yours go in yours, once you sign in.
 * Their shape is Statusphere's own, read in from its Lexicon:  Status.spell, by "spell space lexicon read".
 * What's drawn and done with them is in Statusphere.spell.
 */
export class StatusBoard extends Place {}
export const statusBoard = core.place(new StatusBoard(), {
  name: "status_board",
  kind: "personal atmosphere account",
  collections: { statuses: { at: "xyz.statusphere.status", fields: { created: "created at" } } }
})

// -----------
core.heading("Statusphere")
/////////////////
// ## Statusphere
/////////////////
// Bluesky's example app, in Spell:  set your status, an emoji, and see everyone's as they arrive.
// Each status is a record in its owner's own atmosphere account, in the shape Statusphere's Lexicon says:  Status.spell.

// Every emoji to pick is a big, plain button
core.useDefaults("/Statusphere.spell", {
  "ui-button": { size: "large", appearance: "basic" }
})

core.heading("A status:  the emoji, who set it, and when")
//## A status:  the emoji, who set it, and when

core.heading("The app:  the emoji to pick, then everyone's statuses, newest first")
//## The app:  the emoji to pick, then everyone's statuses, newest first

export class Statusphere extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Newest first:  by when each was set */
  static { this.declareProp("recent", { declaredAt: { path: "/Statusphere.spell", start: 1028, end: 1155 }, readsFrom: ["status_board"] }) }
  get recent() { return core.waitedValue(this, "recent", async () => {
    return await core.savedThings(Status, { sort: [{ field: "created", descending: true }] })
  }) }

  /** Your status:  a new record in your own account, as Statusphere writes one */
  postEmoji(emoji) {
    core.saveThing(new Status({ status: emoji, createdAt: new Date() }))
  }

  /** One narrow column:  its title, the emoji to pick, then the statuses */
  draw() {
    return h("ui-container", { text: true },
      h("ui-stack", { align: "start" },
        h("ui-header", { size: "large" }, "Statusphere"),
        h("ui-text", { color: "grey" }, "Set your status on the Atmosphere")
      ),
      h("ui-card", { fluid: true },
        h("ui-content",
          h("ui-header", { size: "small" }, "Set your status"),
          h("ui-stack", { direction: "horizontal", wrap: true },
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("👍")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "👍"),
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("👎")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "👎"),
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("💙")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "💙"),
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("😎")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "😎"),
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("🦋")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "🦋"),
            h("ui-button", {
              onClick: core.pressed(this, () => this.postEmoji("🚀")),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "🚀")
          )
        )
      ),
      h("ui-header", { size: "small" }, "Recent"),
      () => core.drawRead(() => this.recent, (status) => core.drawThing(status), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Finding statuses"), none: () => h("ui-text", { color: "grey" }, "No statuses yet. Be the first!") })
    )
  }
}
export const statusphere = new Statusphere()
// -----------
if (!core.isCarryingOver) statusphere.start()
