import { core, Thing, App, Place, h } from "@spell/core"

export class Status extends Thing {
  static { this.declareProp("status", { type: "text", rules: [{ type: "empty" }, { type: "maxLength", value: "1" }] }) }
  get status() { return this.getProp("status") }
  set status(value) { this.setProp("status", value) }

  static { this.declareProp("createdAt", { type: "date", rules: [{ type: "empty" }] }) }
  get createdAt() { return this.getProp("createdAt") }
  set createdAt(value) { this.setProp("createdAt", value) }

  static { this.declareProp("owner", { type: "text" }) }
  get owner() { return this.getProp("owner") }
  set owner(value) { this.setProp("owner", value) }

  static { this.declareProp("who", { readsFrom: ["status_board"] }) }
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

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
// -----------
export class StatusBoard extends Place {}
export const statusBoard = core.place(new StatusBoard(), {
  name: "status_board",
  kind: "personal atmosphere account",
  collections: { statuses: { at: "xyz.statusphere.status", fields: { created: "created at" } } }
})

// -----------
core.useDefaults("/Statusphere.spell", {
  "ui-button": { size: "large", appearance: "basic" }
})

export class Statusphere extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("recent", { readsFrom: ["status_board"] }) }
  get recent() { return core.waitedValue(this, "recent", async () => {
    return await core.savedThings(Status, { sort: [{ field: "created", descending: true }] })
  }) }

  postEmoji(emoji) {
    core.saveThing(new Status({ status: emoji, createdAt: new Date() }))
  }

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
      () => core.drawRead(() => this.recent, (status) => core.drawThing(status), { waitingSay: () => "Finding statuses", none: () => h("ui-text", { color: "grey" }, "No statuses yet. Be the first!") })
    )
  }
}
export const statusphere = new Statusphere()
core.describeAction(Statusphere, "postEmoji", { title: "Post Emoji", undoneAs: "Post Emoji" })
// -----------
if (!core.isCarryingOver) statusphere.start()
