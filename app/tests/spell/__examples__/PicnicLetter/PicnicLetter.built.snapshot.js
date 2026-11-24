import { core, Thing, App, Place, h } from "@spell/core"

export class Listing extends Thing {
  static { this.declareProp("person", { type: "text" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  static { this.declareProp("shift", { type: "text" }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  draw() {
    return h("ui-label", { class: "shift" }, () => this.shift)
  }

  static savedIn = {
    place: "published_sheet",
    collection: "listings",
    times: ["created", "modified"], select: ["person", "shift"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Message extends Thing {
  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  static { this.declareProp("thread", { type: "text" }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  draw() {
    return h("ui-text", { class: "count" }, () => this.text)
  }

  static savedIn = {
    place: "my_inbox",
    collection: "messages",
    times: ["created", "modified"], select: ["text", "thread"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class PublishedSheet extends Place {}
export const publishedSheet = core.place(new PublishedSheet(), {
  name: "published_sheet",
  kind: "data folder",
  at: "/api/places/spaces/picnic@rs/sheet",
  collections: { listings: { at: "volunteers" } },
  checkedEvery: 30
})

export class MyInbox extends Place {}
export const myInbox = core.place(new MyInbox(), {
  name: "my_inbox",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__inbox",
  checkedEvery: 30
})

// -----------
export class PicnicLetter extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("shifts", { readsFrom: ["published_sheet"] }) }
  get shifts() { return core.waitedValue(this, "shifts", async () => {
    return core.filter(await core.savedThings(Listing, {}, "looks through"), (listing) => core.isCurrentPerson(listing.person))
  }) }

  static { this.declareProp("counts", { readsFrom: ["my_inbox"] }) }
  get counts() { return core.waitedValue(this, "counts", async () => {
    return await core.savedThings(Message, { filter: { thread: "invitations" } })
  }) }

  draw() {
    return h("ui-container", { class: "letter" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "The Picnic:  your letter"),
        h("ui-segment", { class: "details" },
          h("ui-header", { size: "medium" }, "The day"),
          h("ui-text", { paragraph: true },
            "Saturday from 9 to 4, at Riverside Park, by the bandstand.  Bring a chair, and something to share."
          ),
          h("ui-text", { paragraph: true },
            "Your ticket's guest gets into the attendees' space once an organizer confirms it:  the map and the day's news are there."
          )
        ),
        h("ui-segment", { class: "your-shifts" },
          h("ui-header", { size: "medium" }, "You have signed up for these shifts"),
          h("ui-stack", { class: "shifts", direction: "horizontal", spacing: "sm", wrap: true },
            () => core.drawRead(() => this.shifts, (listing) => core.drawThing(listing), {
              waitingSay: () => "Reading the sheet",
              none: () => h("ui-text", { color: "grey" }, "No shifts yet:  sign up on the sheet."),
              failed: () => h("ui-text", { color: "grey" }, "Sign in to see your shifts.")
            })
          )
        ),
        h("ui-segment", { class: "your-invitations" },
          h("ui-header", { size: "medium" }, "Your invitations"),
          h("ui-stack", { class: "counts", spacing: "sm" },
            () => core.drawRead(() => this.counts, (message) => core.drawThing(message), { none: () => h("ui-text", { color: "grey" }, "You haven't asked for any yet."), failed: () => h("ui-text", { color: "grey" }, "Sign in to see your invitations.") })
          )
        )
      )
    )
  }
}
export const picnicLetter = new PicnicLetter()
// -----------
if (!core.isCarryingOver) picnicLetter.start()
