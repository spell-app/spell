import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Picnic Letter:  where its parts are read from")
///////////////////////////////////////////////////
// ## Picnic Letter:  where its parts are read from
///////////////////////////////////////////////////
// One page for every attendee:  the organizers send it as a pointer in their inboxes, and it reads, as whoever opens it,
// three places:  this text, the published sheet's shifts, and their own inbox.
// Your event's letter names its own spaces on the next lines:  "picnic@rs" is the Rock Society's picnic.

export class Listing extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 661, end: 684 } })
  accessor person!: string

  // - its "shift" is text
  @prop({ type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 689, end: 711 } })
  accessor shift!: string

  @drawn draw() {
    return <ui-label class="shift">{this.shift}</ui-label>
  }

  static savedIn = {
    place: "published_sheet",
    collection: "listings",
    times: ["created", "modified"], select: ["person", "shift"] }

  // - it lives in the published sheet
  @prop({ type: "date", declaredAt: { path: "/PicnicLetter.api.spell", start: 618, end: 649 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in the published sheet
  @prop({ type: "date", declaredAt: { path: "/PicnicLetter.api.spell", start: 618, end: 649 } })
  accessor modified!: any /* spell: type unknown */
}

export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 969, end: 990 } })
  accessor text!: string

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/PicnicLetter.api.spell", start: 995, end: 1018 } })
  accessor thread!: string

  @drawn draw() {
    return <ui-text class="count">{this.text}</ui-text>
  }

  static savedIn = {
    place: "my_inbox",
    collection: "messages",
    times: ["created", "modified"], select: ["text", "thread"] }

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/PicnicLetter.api.spell", start: 937, end: 957 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in my inbox
  @prop({ type: "date", declaredAt: { path: "/PicnicLetter.api.spell", start: 937, end: 957 } })
  accessor modified!: any /* spell: type unknown */
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

  static { this.declareProp("shifts", { declaredAt: { path: "/PicnicLetter.spell", start: 484, end: 541 }, readsFrom: ["published_sheet"] }) }
  get shifts() { return core.waitedValue(this, "shifts", async () => {
    return core.filter(await core.savedThings(Listing, {}, "looks through"), (listing: Listing) => core.isCurrentPerson(listing.person))
  }) }

  static { this.declareProp("counts", { declaredAt: { path: "/PicnicLetter.spell", start: 546, end: 612 }, readsFrom: ["my_inbox"] }) }
  get counts() { return core.waitedValue(this, "counts", async () => {
    return await core.savedThings(Message, { filter: { thread: "invitations" } })
  }) }

  @drawn draw() {
    return (
      <ui-container class="letter">
        <ui-stack>
          <ui-header size="large">{"The Picnic:  your letter"}</ui-header>
          <ui-segment class="details">
            <ui-header size="medium">The day</ui-header>
            <ui-text paragraph={true}>
              {"Saturday from 9 to 4, at Riverside Park, by the bandstand.  Bring a chair, and something to share."}
            </ui-text>
            <ui-text paragraph={true}>
              {"Your ticket's guest gets into the attendees' space once an organizer confirms it:  the map and the day's news are there."}
            </ui-text>
          </ui-segment>
          <ui-segment class="your-shifts">
            <ui-header size="medium">You have signed up for these shifts</ui-header>
            <ui-stack class="shifts" direction="horizontal" spacing="sm" wrap={true}>
              {core.drawRead(() => this.shifts, (listing: Listing) => core.drawThing(listing), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the sheet"}</ui-loader>,
                none: () => <ui-text color="grey">{"No shifts yet:  sign up on the sheet."}</ui-text>,
                failed: () => <ui-text color="grey">Sign in to see your shifts.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="your-invitations">
            <ui-header size="medium">Your invitations</ui-header>
            <ui-stack class="counts" spacing="sm">
              {core.drawRead(() => this.counts, (message: Message) => core.drawThing(message), { none: () => <ui-text color="grey">You haven't asked for any yet.</ui-text>, failed: () => <ui-text color="grey">Sign in to see your invitations.</ui-text> })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a picnic letter, drawn in its own element, e.g. by `draw the picnic letter`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its picnic letter's properties;  its methods call its picnic letter's.
 * - What every view's element does, e.g. drawing its picnic letter, is `SpellElement`'s.
 */
export class PicnicLetterElement extends SpellElement<PicnicLetter> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "picnic letter", [])
}
core.useElement(PicnicLetter, PicnicLetterElement)
export const picnicLetter = new PicnicLetter()
// -----------
if (!core.isCarryingOver) picnicLetter.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PicnicLetterElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
