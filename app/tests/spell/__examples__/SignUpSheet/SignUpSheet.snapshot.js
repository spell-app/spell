import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Sign-Up Sheet:  where a picnic's sign-ups are kept")
////////////////////////////////////////////////////////
// ## Sign-Up Sheet:  where a picnic's sign-ups are kept
////////////////////////////////////////////////////////

export class Volunteer extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1020, end: 1040 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "shift" is text
  static { this.declareProp("shift", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1044, end: 1063 } }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  // - its "note" is text
  static { this.declareProp("note", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1067, end: 1085 } }) }
  get note() { return this.getProp("note") }
  set note(value) { this.setProp("note", value) }

  draw() {
    return h("ui-form", { class: "master-row", value: this },
      h("ui-stack", { direction: "horizontal", spacing: "md", align: "center", wrap: true },
        h("ui-label", () => this.shift),
        h("ui-text", () => this.person),
        h("ui-input", {
          name: "note",
          placeholder: "A note only organizers see",
          "aria-label": "Organizers' note",
          fluid: true
        })
      )
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "volunteers" }
}

export class Attendee extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1149, end: 1169 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  draw() {
    return h("ui-stack", { class: "attendee", direction: "horizontal", spacing: "md", align: "center" },
      h("ui-text", () => this.person),
      h("ui-button", {
        class: "remove",
        icon: "close",
        size: "mini",
        appearance: "transparent",
        "aria-label": "Take them off the list",
        title: "Take them off the list",
        onClick: core.pressed(this, () => core.removeSaved(this)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      })
    )
  }

  static savedIn = { place: "sign_up_sheet", collection: "attendees" }
}

export class PublishedVolunteer extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1245, end: 1265 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "shift" is text
  static { this.declareProp("shift", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1269, end: 1288 } }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  draw() {
    return h("ui-stack", { class: "signed-up", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-label", () => this.shift),
      h("ui-text", () => this.person)
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
  static { this.declareProp("newVolunteer", { init: () => new Volunteer(), early: true }) }
  get newVolunteer() { return this.getProp("newVolunteer") }
  set newVolunteer(value) { this.setProp("newVolunteer", value) }

  // - its "new attendee" is a new attendee
  static { this.declareProp("newAttendee", { init: () => new Attendee(), early: true }) }
  get newAttendee() { return this.getProp("newAttendee") }
  set newAttendee(value) { this.setProp("newAttendee", value) }

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

  draw() {
    return h("ui-container", { class: "sign-up-sheet" },
      h("ui-stack",
        h("ui-header", { size: "large" }, "The Picnic:  sign up for a shift"),
        h("ui-text", { color: "grey" }, "Two people a shift.  Signed up, you're on the sheet below."),
        h("ui-segment", { class: "sign-up" },
          h("ui-header", { size: "medium" }, "Sign up for"),
          h("ui-stack", { direction: "horizontal", spacing: "sm", wrap: true },
            h("ui-button", {
              class: "setup",
              color: "primary",
              onClick: core.pressed(this, () => this.takeSetup()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Setup, 9 to 11"),
            h("ui-button", {
              class: "serving",
              color: "primary",
              onClick: core.pressed(this, () => this.takeServing()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Serving, 11 to 2"),
            h("ui-button", {
              class: "cleanup",
              color: "primary",
              onClick: core.pressed(this, () => this.takeCleanup()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Cleanup, 2 to 4")
          )
        ),
        h("ui-segment", { class: "published" },
          h("ui-header", { size: "medium" }, "Who's on which shift"),
          h("ui-stack", { class: "published-rows", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(PublishedVolunteer, {}, "as drawn"), (volunteer) => core.drawThing(volunteer), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the sheet"),
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nobody yet:  be the first."),
              failed: () => h("ui-text", { color: "red" }, "We can't read the sheet right now.")
            })
          )
        ),
        h("ui-segment", { class: "organizers" },
          h("ui-header", { size: "medium" }, "Organizers"),
          h("ui-header", { size: "small" }, "The master sheet"),
          h("ui-stack", { class: "master", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Volunteer, {}, "as drawn"), (volunteer) => core.drawThing(volunteer), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the master sheet"),
              none: () => h("ui-text", { color: "grey" }, "Nobody's signed up yet."),
              failed: () => h("ui-text", { class: "organizers-only", color: "grey" }, "Only the picnic's organizers see this.")
            })
          ),
          h("ui-header", { size: "small" }, "Who may sign up"),
          h("ui-form", { "prop:value": () => this.newAttendee },
            h("ui-input", {
              name: "person",
              placeholder: "bo@rs",
              "aria-label": "Add an attendee, by their address",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "add",
                slot: "action",
                color: "primary",
                disabled: () => this.newAttendee.person === "",
                onClick: core.pressed(this, () => this.addTheNewAttendee()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Add")
            )
          ),
          h("ui-stack", { class: "attendees", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Attendee, {}, "as drawn"), (attendee) => core.drawThing(attendee), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the list"), failed: () => h("ui-text", { color: "grey" }, "Only the picnic's organizers see this.") })
          )
        )
      )
    )
  }
}
export const signUpPage = new SignUpPage()
// -----------
if (!core.isCarryingOver) signUpPage.start()
