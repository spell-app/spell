import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Sign-Up Sheet:  where a picnic's sign-ups are kept")
////////////////////////////////////////////////////////
// ## Sign-Up Sheet:  where a picnic's sign-ups are kept
////////////////////////////////////////////////////////

export class Volunteer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1377, end: 1397 } })
  accessor person!: string

  // - its "shift" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1401, end: 1420 } })
  accessor shift!: string

  // - its "note" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1424, end: 1442 } })
  accessor note!: string

  @drawn draw() {
    return (
      <ui-form class="master-row" value={this}>
        <ui-stack direction="horizontal" spacing="md" align="center" wrap={true}>
          <ui-label>{this.shift}</ui-label>
          <ui-text>{this.person}</ui-text>
          <ui-input name="note" placeholder="A note only organizers see" aria-label="Organizers' note" fluid={true} />
        </ui-stack>
      </ui-form>
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "volunteers" }
}

/**
 * Who may sign up, and how many invitations each may ask for:  the organizers work it out from their standing and
 * their shifts ("work out the invitations", on the page).
 */
export class Attendee extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1680, end: 1700 } })
  accessor person!: string

  // - its "standing" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1704, end: 1726 } })
  accessor standing!: string

  // - its "invitations" is a number
  @prop({ type: "number", declaredAt: { path: "/SignUpSheet.api.spell", start: 1730, end: 1759 } })
  accessor invitations!: number

  @drawn draw() {
    return (
      <ui-stack class="attendee" direction="horizontal" spacing="md" align="center">
        <ui-text>{this.person}</ui-text>
        <ui-text color="grey">{this.standing}</ui-text>
        <ui-text class="invitations" color="grey">{this.invitations} invitations</ui-text>
        <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Take them off the list" title="Take them off the list" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "attendees" }
}

/** A ticket someone asked for, for a guest:  an organizer confirms it. */
export class Ticket extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1891, end: 1911 } })
  accessor person!: string

  // - its "guest" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1915, end: 1934 } })
  accessor guest!: string

  // - its "event" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1938, end: 1957 } })
  accessor event!: string

  // - its "status" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1961, end: 1981 } })
  accessor status!: string

  @drawn draw() {
    return (
      <ui-stack class="ticket" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-text>{this.person}</ui-text>
        <ui-text color="grey">for {this.guest}</ui-text>
        <ui-label class="status">{this.status}</ui-label>
        <ui-button class="confirm" size="small" disabled={this.status === "confirmed"} title="Confirm it:  its guest gets into the attendees' space" onClick={core.pressed(this, () => (this.status = "confirmed"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Confirm
        </ui-button>
      </ui-stack>
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "tickets" }
}

/** A message in your inbox:  your invitations' count is one, in the conversation "invitations". */
export class Message extends Thing {
  // - its "text" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2293, end: 2311 } })
  accessor text!: string

  // - its "recipients" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2315, end: 2339 } })
  accessor recipients!: string

  // - its "thread" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2343, end: 2363 } })
  accessor thread!: string

  // - its "page" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2367, end: 2385 } })
  accessor page!: string

  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2389, end: 2408 } })
  accessor title!: string

  // - its "line" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2412, end: 2430 } })
  accessor line!: string

  @drawn draw() {
    return <ui-text class="count">{this.text}</ui-text>
  }

  static savedIn = { place: "my_inbox", collection: "messages" }
}

export class PublishedVolunteer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2506, end: 2526 } })
  accessor person!: string

  // - its "shift" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2530, end: 2549 } })
  accessor shift!: string

  @drawn draw() {
    return (
      <ui-stack class="signed-up" direction="horizontal" spacing="md" align="center" wrap={true}>
        <ui-label>{this.shift}</ui-label>
        <ui-text>{this.person}</ui-text>
      </ui-stack>
    )
  }

  static savedIn = { place: "published_sheet", collection: "published_volunteers" }
}

/**
 * The master sheet is in the picnic's private space:  only its organizers read it, notes and all.
 * Anyone in the picnic's shared space signs up here all the same, and changes only their own row.
 * Each shift takes two people:  two asking for the last place at once, one gets it, the other is told it's gone.
 * Its tickets are kept here too:  the picnic has 40, each attendee asks for as many as their row says, and a ticket
 * an organizer confirms lets its guest into the attendees' space, where the day's details are.
 * Your event's sheet names its own spaces on the next lines:  "picnic@rs" is the Rock Society's picnic.
 */
export class SignUpSheet extends Place {}
export const signUpSheet = core.place(new SignUpSheet(), {
  name: "sign_up_sheet",
  kind: "data folder",
  at: "/api/places/spaces/picnic@rs/__private/signups",
  sheet: {
    signUpsFrom: "picnic@rs/sheet",
    onlyFrom: "attendees",
    mostEach: [{ field: "shift", most: 2 }, { field: "event", most: 40 }],
    allowance: { collection: "tickets", field: "invitations" },
    joins: { collection: "tickets", address: "picnic@rs/__attendees" }
  },
  checkedEvery: 30, firstReads: () => [[Volunteer], [Ticket], [Attendee]] })

/** What everyone in the picnic sees:  who's on which shift, never an organizer's note. */
export class PublishedSheet extends Place {}
export const publishedSheet = core.place(new PublishedSheet(), {
  name: "published_sheet",
  kind: "data folder",
  at: "/api/places/spaces/picnic@rs/sheet",
  collections: { publishedVolunteers: { at: "volunteers" } },
  checkedEvery: 30,
  projection: {
    into: "picnic@rs/sheet",
    of: "/api/places/spaces/picnic@rs/__private/signups",
    fields: ["person", "shift"]
  }
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
core.heading("Sign-Up Sheet")
///////////////////
// ## Sign-Up Sheet
///////////////////
// A picnic's sign-up sheet:  pick a shift and sign up, then see yourself on the published sheet.
// Where it's all kept is in SignUpSheet.api.spell, and only its first lines know.
// Then your invitations:  ask for a ticket for a guest, as many as yours allow.
// The organizers' part shows only to them:  the master sheet with its notes, the tickets to confirm, and who may sign up.

core.heading("A row for each:  who's on which shift")
//## A row for each:  who's on which shift

core.heading("The page:  sign up, the published sheet, then the organizers' part")
//## The page:  sign up, the published sheet, then the organizers' part

export class SignUpPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "new volunteer" is a new volunteer
  @prop({ init: () => new Volunteer(), early: true })
  accessor newVolunteer!: Volunteer

  // - its "new attendee" is a new attendee
  @prop({ init: () => new Attendee(), early: true })
  accessor newAttendee!: Attendee

  // - its "new ticket" is a new ticket
  @prop({ init: () => new Ticket(), early: true })
  accessor newTicket!: Ticket

  static { this.declareProp("counts", { declaredAt: { path: "/SignUpSheet.spellml", start: 2300, end: 2366 }, readsFrom: ["my_inbox"] }) }
  get counts() { return core.waitedValue(this, "counts", async () => {
    return await core.savedThings(Message, { filter: { thread: "invitations" } })
  }) }

  // - its "new letter" is a new message
  @prop({ init: () => new Message(), early: true })
  accessor newLetter!: Message

  takeTheShift() {
    this.newVolunteer.person = core.currentPerson().id
    core.saveThing(this.newVolunteer)
    this.newVolunteer = new Volunteer()
  }

  takeSetup() {
    this.newVolunteer.shift = "setup"
    this.takeTheShift()
  }

  takeServing() {
    this.newVolunteer.shift = "serving"
    this.takeTheShift()
  }

  takeCleanup() {
    this.newVolunteer.shift = "cleanup"
    this.takeTheShift()
  }

  askForTheTicket() {
    this.newTicket.person = core.currentPerson().id
    this.newTicket.event = "picnic"
    core.saveThing(this.newTicket)
    this.newTicket = new Ticket()
  }

  /** Two for a member, one for a guest, and one more for each shift they took */
  async workOutTheInvitations() {
    await core.forEachSequential(core.duplicateList(await core.savedThings(Attendee)), async (attendee: Attendee) => {
      const shifts = core.itemCountOf(await core.savedThings(Volunteer, { filter: { person: attendee.person } })) as number
      attendee.invitations = shifts + 1
      if (attendee.standing === "member") attendee.invitations = shifts + 2
    })
  }

  /** The picnic's letter to every attendee:  a pointer to its page in their inboxes, which reads what's theirs as each one opens it */
  async sendTheLetter() {
    let everyone: string = ""
    core.map(core.duplicateList(await core.savedThings(Attendee)), (attendee: Attendee) => (everyone = everyone + attendee.person + ", "))
    this.newLetter.recipients = everyone
    this.newLetter.text = "Your letter for the picnic"
    this.newLetter.page = "picnic@rs/PicnicLetter"
    this.newLetter.title = "The Picnic:  your letter"
    this.newLetter.line = "The day's details, your shifts, and your invitations"
    core.saveThing(this.newLetter)
    this.newLetter = new Message()
  }

  addTheNewAttendee() {
    core.saveThing(this.newAttendee)
    this.newAttendee = new Attendee()
  }

  @drawn draw() {
    return (
      <ui-container class="sign-up-sheet">
        <ui-stack>
          <ui-header size="large">{"The Picnic:  sign up for a shift"}</ui-header>
          <ui-text color="grey">{"Two people a shift.  Signed up, you're on the sheet below."}</ui-text>
          <ui-segment class="sign-up">
            <ui-header size="medium">Sign up for</ui-header>
            <ui-stack direction="horizontal" spacing="sm" wrap={true}>
              <ui-button class="setup" color="primary" onClick={core.pressed(this, () => this.takeSetup())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Setup, 9 to 11
              </ui-button>
              <ui-button class="serving" color="primary" onClick={core.pressed(this, () => this.takeServing())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Serving, 11 to 2
              </ui-button>
              <ui-button class="cleanup" color="primary" onClick={core.pressed(this, () => this.takeCleanup())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Cleanup, 2 to 4
              </ui-button>
            </ui-stack>
          </ui-segment>
          <ui-segment class="published">
            <ui-header size="medium">Who's on which shift</ui-header>
            <ui-stack class="published-rows" spacing="sm">
              {core.drawRead(async () => await core.savedThings(PublishedVolunteer, {}, "as drawn"), (volunteer: PublishedVolunteer) => core.drawThing(volunteer), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the sheet"}</ui-loader>,
                none: () => <ui-text class="none" color="grey">{"Nobody yet:  be the first."}</ui-text>,
                failed: () => <ui-text color="red">We can't read the sheet right now.</ui-text>
              })}
            </ui-stack>
          </ui-segment>
          <ui-segment class="invitations">
            <ui-header size="medium">Your invitations</ui-header>
            <ui-stack class="counts" spacing="sm">
              {core.drawRead(() => this.counts, (message: Message) => core.drawThing(message), { none: () => <ui-text color="grey">You haven't asked for any yet.</ui-text>, failed: () => <ui-text color="grey">Sign in to see your invitations.</ui-text> })}
            </ui-stack>
            <ui-form prop:value={this.newTicket}>
              <ui-input name="guest" placeholder="Who it's for:  their name, or address" aria-label="Who the ticket is for" fluid={true} action={true}>
                <ui-button class="ask" slot="action" color="primary" disabled={this.newTicket.guest === ""} onClick={core.pressed(this, () => this.askForTheTicket())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Ask for a ticket
                </ui-button>
              </ui-input>
            </ui-form>
          </ui-segment>
          <ui-segment class="organizers">
            <ui-header size="medium">Organizers</ui-header>
            <ui-header size="small">The master sheet</ui-header>
            <ui-stack class="master" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Volunteer, {}, "as drawn"), (volunteer: Volunteer) => core.drawThing(volunteer), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the master sheet"}</ui-loader>,
                none: () => <ui-text color="grey">Nobody's signed up yet.</ui-text>,
                failed: () => <ui-text class="organizers-only" color="grey">Only the picnic's organizers see this.</ui-text>
              })}
            </ui-stack>
            <ui-header size="small">Tickets</ui-header>
            <ui-stack class="tickets" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Ticket, {}, "as drawn"), (ticket: Ticket) => core.drawThing(ticket), {
                waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the tickets"}</ui-loader>,
                none: () => <ui-text color="grey">Nobody's asked for one yet.</ui-text>,
                failed: () => <ui-text color="grey">Only the picnic's organizers see this.</ui-text>
              })}
            </ui-stack>
            <ui-header size="small">Who may sign up</ui-header>
            <ui-stack direction="horizontal" spacing="sm" wrap={true}>
              <ui-button class="work-out" size="small" onClick={core.pressed(this, async () => await this.workOutTheInvitations())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Work out the invitations
              </ui-button>
              <ui-button class="send-letter" size="small" onClick={core.pressed(this, async () => await this.sendTheLetter())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Send the letter
              </ui-button>
            </ui-stack>
            <ui-form prop:value={this.newAttendee}>
              <ui-input name="person" placeholder="bo@rs" aria-label="Add an attendee, by their address" fluid={true} action={true}>
                <ui-button class="add" slot="action" color="primary" disabled={this.newAttendee.person === ""} onClick={core.pressed(this, () => this.addTheNewAttendee())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Add
                </ui-button>
              </ui-input>
            </ui-form>
            <ui-stack class="attendees" spacing="sm">
              {core.drawRead(async () => await core.savedThings(Attendee, {}, "as drawn"), (attendee: Attendee) => core.drawThing(attendee), { waiting: () => <ui-loader visible={true} inline={true} text={true}>{"Reading the list"}</ui-loader>, failed: () => <ui-text color="grey">Only the picnic's organizers see this.</ui-text> })}
            </ui-stack>
          </ui-segment>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a sign up page, drawn in its own element, e.g. by `draw the sign up page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its sign up page's properties;  its methods call its sign up page's.
 * - What every view's element does, e.g. drawing its sign up page, is `SpellElement`'s.
 */
export class SignUpPageElement extends SpellElement<SignUpPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "sign up page", [
    { name: "new-volunteer", kind: "json", description: "Its newVolunteer." },
    { name: "new-attendee", kind: "json", description: "Its newAttendee." },
    { name: "new-ticket", kind: "json", description: "Its newTicket." },
    { name: "new-letter", kind: "json", description: "Its newLetter." }
  ])

  takeTheShift() {
    return this.currentThing?.takeTheShift()
  }

  takeSetup() {
    return this.currentThing?.takeSetup()
  }

  takeServing() {
    return this.currentThing?.takeServing()
  }

  takeCleanup() {
    return this.currentThing?.takeCleanup()
  }

  askForTheTicket() {
    return this.currentThing?.askForTheTicket()
  }

  workOutTheInvitations() {
    return this.currentThing?.workOutTheInvitations()
  }

  sendTheLetter() {
    return this.currentThing?.sendTheLetter()
  }

  addTheNewAttendee() {
    return this.currentThing?.addTheNewAttendee()
  }
}
core.useElement(SignUpPage, SignUpPageElement)
export const signUpPage = new SignUpPage()
// -----------
if (!core.isCarryingOver) signUpPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `SignUpPageElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
