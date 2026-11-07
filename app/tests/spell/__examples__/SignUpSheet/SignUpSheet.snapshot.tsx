import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Sign-Up Sheet:  where a picnic's sign-ups are kept")
////////////////////////////////////////////////////////
// ## Sign-Up Sheet:  where a picnic's sign-ups are kept
////////////////////////////////////////////////////////

export class Volunteer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1020, end: 1040 } })
  accessor person!: string

  // - its "shift" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1044, end: 1063 } })
  accessor shift!: string

  // - its "note" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1067, end: 1085 } })
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

export class Attendee extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1149, end: 1169 } })
  accessor person!: string

  @drawn draw() {
    return (
      <ui-stack class="attendee" direction="horizontal" spacing="md" align="center">
        <ui-text>{this.person}</ui-text>
        <ui-button class="remove" icon="close" size="mini" appearance="transparent" aria-label="Take them off the list" title="Take them off the list" onClick={core.pressed(this, () => core.removeSaved(this))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
      </ui-stack>
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "attendees" }
}

export class PublishedVolunteer extends Thing {
  // - its "person" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1245, end: 1265 } })
  accessor person!: string

  // - its "shift" is text
  @prop({ type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1269, end: 1288 } })
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
    mostEach: { field: "shift", most: 2 }
  },
  checkedEvery: 30, firstReads: () => [[Volunteer], [Attendee]] })

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

// -----------
core.heading("Sign-Up Sheet")
///////////////////
// ## Sign-Up Sheet
///////////////////
// A picnic's sign-up sheet:  pick a shift and sign up, then see yourself on the published sheet.
// Where it's all kept is in SignUpSheet.api.spell, and only its first lines know.
// The organizers' part shows only to them:  the master sheet with its notes, and who may sign up.

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
            <ui-header size="small">Who may sign up</ui-header>
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
    { name: "new-attendee", kind: "json", description: "Its newAttendee." }
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
