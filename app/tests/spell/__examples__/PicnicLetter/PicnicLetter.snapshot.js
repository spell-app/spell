import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Picnic Letter:  where its parts are read from")
///////////////////////////////////////////////////
// ## Picnic Letter:  where its parts are read from
///////////////////////////////////////////////////
// One page for every attendee:  the organizers send it as a pointer in their inboxes, and it reads, as whoever opens it,
// three places:  this text, the published sheet's shifts, and their own inbox.
// Your event's letter names its own spaces on the next lines:  "picnic@rs" is the Rock Society's picnic.

export class Listing extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 631, end: 651 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "shift" is text
  static { this.declareProp("shift", { type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 655, end: 674 } }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  draw() {
    return h("ui-label", { class: "shift" }, () => this.shift)
  }

  static savedIn = { place: "published_sheet", collection: "listings" }
}

export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 890, end: 908 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "thread" is text
  static { this.declareProp("thread", { type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 912, end: 932 } }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  draw() {
    return h("ui-text", { class: "count" }, () => this.text)
  }

  static savedIn = { place: "my_inbox", collection: "messages" }
}

/** Who's on which shift, as everyone in the picnic sees it:  the sign-up sheet's projection. */
export class PublishedSheet extends Place {}
export const publishedSheet = core.place(new PublishedSheet(), {
  name: "published_sheet",
  kind: "data folder",
  at: "/api/places/spaces/picnic@rs/sheet",
  collections: { listings: { at: "volunteers" } },
  checkedEvery: 30
})

/** Your inbox in RS:  Spell writes how many invitations you've used there, as an update. */
export class MyInbox extends Place {}
export const myInbox = core.place(new MyInbox(), {
  name: "my_inbox",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__inbox",
  checkedEvery: 30
})

// -----------
core.heading("Picnic Letter")
///////////////////
// ## Picnic Letter
///////////////////
// The picnic's letter:  the same rules and details for everyone, then what's yours alone.
// Each part shows only what its reader may see:  your own shifts, your own invitations.

core.heading("A shift you signed up for")
//## A shift you signed up for

core.heading("Your invitations' count, from your inbox")
//## Your invitations' count, from your inbox

core.heading("The letter")
//## The letter

export class PicnicLetter extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("shifts", { declaredAt: { path: "/PicnicLetter.spell", start: 518, end: 575 }, readsFrom: ["published_sheet"] }) }
  get shifts() { return core.waitedValue(this, "shifts", async () => {
    return core.filter(await core.savedThings(Listing, {}, "looks through"), (listing) => core.isCurrentPerson(listing.person))
  }) }

  static { this.declareProp("counts", { declaredAt: { path: "/PicnicLetter.spell", start: 580, end: 646 }, readsFrom: ["my_inbox"] }) }
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
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the sheet"),
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
