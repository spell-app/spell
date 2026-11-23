import { core, Thing, App, Place, h } from "@spell/core"

export class Volunteer extends Thing {
  static { this.declareProp("person", { type: "text" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  static { this.declareProp("shift", { type: "text" }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  static { this.declareProp("note", { type: "text" }) }
  get note() { return this.getProp("note") }
  set note(value) { this.setProp("note", value) }

  draw() {
    return h("ui-form", { class: "master-row", "prop:value": this },
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

  static savedIn = {
    place: "sign_up_sheet",
    collection: "volunteers",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Attendee extends Thing {
  static { this.declareProp("person", { type: "text" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  static { this.declareProp("standing", { type: "text" }) }
  get standing() { return this.getProp("standing") }
  set standing(value) { this.setProp("standing", value) }

  static { this.declareProp("invitations", { type: "number" }) }
  get invitations() { return this.getProp("invitations") }
  set invitations(value) { this.setProp("invitations", value) }

  draw() {
    return h("ui-stack", { class: "attendee", direction: "horizontal", spacing: "md", align: "center" },
      h("ui-text", () => this.person),
      h("ui-text", { color: "grey" }, () => this.standing),
      h("ui-text", { class: "invitations", color: "grey" }, () => this.invitations, " invitations"),
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

  static savedIn = {
    place: "sign_up_sheet",
    collection: "attendees",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Ticket extends Thing {
  static { this.declareProp("person", { type: "text" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  static { this.declareProp("guest", { type: "text" }) }
  get guest() { return this.getProp("guest") }
  set guest(value) { this.setProp("guest", value) }

  static { this.declareProp("event", { type: "text" }) }
  get event() { return this.getProp("event") }
  set event(value) { this.setProp("event", value) }

  static { this.declareProp("status", { type: "text" }) }
  get status() { return this.getProp("status") }
  set status(value) { this.setProp("status", value) }

  draw() {
    return h("ui-stack", { class: "ticket", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-text", () => this.person),
      h("ui-text", { color: "grey" }, "for ", () => this.guest),
      h("ui-label", { class: "status" }, () => this.status),
      h("ui-button", {
        class: "confirm",
        size: "small",
        disabled: () => this.status === "confirmed",
        title: "Confirm it:  its guest gets into the attendees' space",
        onClick: core.pressed(this, () => (this.status = "confirmed")),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Confirm")
    )
  }

  static savedIn = {
    place: "sign_up_sheet",
    collection: "tickets",
    times: ["created", "modified"]
  }

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

  static { this.declareProp("recipients", { type: "text" }) }
  get recipients() { return this.getProp("recipients") }
  set recipients(value) { this.setProp("recipients", value) }

  static { this.declareProp("thread", { type: "text" }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  static { this.declareProp("page", { type: "text" }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("line", { type: "text" }) }
  get line() { return this.getProp("line") }
  set line(value) { this.setProp("line", value) }

  draw() {
    return h("ui-text", { class: "count" }, () => this.text)
  }

  static savedIn = {
    place: "my_inbox",
    collection: "messages",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class PublishedVolunteer extends Thing {
  static { this.declareProp("person", { type: "text" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  static { this.declareProp("shift", { type: "text" }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  draw() {
    return h("ui-stack", { class: "signed-up", direction: "horizontal", spacing: "md", align: "center", wrap: true },
      h("ui-label", () => this.shift),
      h("ui-text", () => this.person)
    )
  }

  static savedIn = {
    place: "published_sheet",
    collection: "published_volunteers",
    times: ["created", "modified"], select: ["person", "shift"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

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
  checkedEvery: 30
})

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

export class MyInbox extends Place {}
export const myInbox = core.place(new MyInbox(), {
  name: "my_inbox",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__inbox",
  checkedEvery: 30
})

// -----------
export class SignUpPage extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("newVolunteer", { init: () => new Volunteer(), early: true }) }
  get newVolunteer() { return this.getProp("newVolunteer") }
  set newVolunteer(value) { this.setProp("newVolunteer", value) }

  static { this.declareProp("newAttendee", { init: () => new Attendee(), early: true }) }
  get newAttendee() { return this.getProp("newAttendee") }
  set newAttendee(value) { this.setProp("newAttendee", value) }

  static { this.declareProp("newTicket", { init: () => new Ticket(), early: true }) }
  get newTicket() { return this.getProp("newTicket") }
  set newTicket(value) { this.setProp("newTicket", value) }

  static { this.declareProp("counts", { readsFrom: ["my_inbox"] }) }
  get counts() { return core.waitedValue(this, "counts", async () => {
    return await core.savedThings(Message, { filter: { thread: "invitations" } })
  }) }

  static { this.declareProp("newLetter", { init: () => new Message(), early: true }) }
  get newLetter() { return this.getProp("newLetter") }
  set newLetter(value) { this.setProp("newLetter", value) }

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

  async workOutTheInvitations() {
    await core.forEachSequential(core.duplicateList(await core.savedThings(Attendee)), async (attendee) => {
      const shifts = core.itemCountOf(await core.savedThings(Volunteer, { filter: { person: attendee.person } }))
      attendee.invitations = shifts + 1
      if (attendee.standing === "member") attendee.invitations = shifts + 2
    })
  }

  async sendTheLetter() {
    let everyone = ""
    core.map(core.duplicateList(await core.savedThings(Attendee)), (attendee) => (everyone = everyone + attendee.person + ", "))
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
              waitingSay: () => "Reading the sheet",
              none: () => h("ui-text", { class: "none", color: "grey" }, "Nobody yet:  be the first."),
              failed: () => h("ui-text", { color: "red" }, "We can't read the sheet right now.")
            })
          )
        ),
        h("ui-segment", { class: "invitations" },
          h("ui-header", { size: "medium" }, "Your invitations"),
          h("ui-stack", { class: "counts", spacing: "sm" },
            () => core.drawRead(() => this.counts, (message) => core.drawThing(message), { none: () => h("ui-text", { color: "grey" }, "You haven't asked for any yet."), failed: () => h("ui-text", { color: "grey" }, "Sign in to see your invitations.") })
          ),
          h("ui-form", { "prop:value": () => this.newTicket },
            h("ui-input", {
              name: "guest",
              placeholder: "Who it's for:  their name, or address",
              "aria-label": "Who the ticket is for",
              fluid: true,
              action: true
            },
              h("ui-button", {
                class: "ask",
                slot: "action",
                color: "primary",
                disabled: () => this.newTicket.guest === "",
                onClick: core.pressed(this, () => this.askForTheTicket()),
                style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
              }, "Ask for a ticket")
            )
          )
        ),
        h("ui-segment", { class: "organizers" },
          h("ui-header", { size: "medium" }, "Organizers"),
          h("ui-header", { size: "small" }, "The master sheet"),
          h("ui-stack", { class: "master", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Volunteer, {}, "as drawn"), (volunteer) => core.drawThing(volunteer), {
              waitingSay: () => "Reading the master sheet",
              none: () => h("ui-text", { color: "grey" }, "Nobody's signed up yet."),
              failed: () => h("ui-text", { class: "organizers-only", color: "grey" }, "Only the picnic's organizers see this.")
            })
          ),
          h("ui-header", { size: "small" }, "Tickets"),
          h("ui-stack", { class: "tickets", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Ticket, {}, "as drawn"), (ticket) => core.drawThing(ticket), {
              waitingSay: () => "Reading the tickets",
              none: () => h("ui-text", { color: "grey" }, "Nobody's asked for one yet."),
              failed: () => h("ui-text", { color: "grey" }, "Only the picnic's organizers see this.")
            })
          ),
          h("ui-header", { size: "small" }, "Who may sign up"),
          h("ui-stack", { direction: "horizontal", spacing: "sm", wrap: true },
            h("ui-button", {
              class: "work-out",
              size: "small",
              onClick: core.pressed(this, async () => await this.workOutTheInvitations()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Work out the invitations"),
            h("ui-button", {
              class: "send-letter",
              size: "small",
              onClick: core.pressed(this, async () => await this.sendTheLetter()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Send the letter")
          ),
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
            () => core.drawRead(async () => await core.savedThings(Attendee, {}, "as drawn"), (attendee) => core.drawThing(attendee), { waitingSay: () => "Reading the list", failed: () => h("ui-text", { color: "grey" }, "Only the picnic's organizers see this.") })
          )
        )
      )
    )
  }
}
export const signUpPage = new SignUpPage()
core.describeAction(SignUpPage, "takeTheShift", { title: "Take the Shift", undoneAs: "Take the Shift" })
core.describeAction(SignUpPage, "takeSetup", { title: "Take Setup", undoneAs: "Take Setup" })
core.describeAction(SignUpPage, "takeServing", { title: "Take Serving", undoneAs: "Take Serving" })
core.describeAction(SignUpPage, "takeCleanup", { title: "Take Cleanup", undoneAs: "Take Cleanup" })
core.describeAction(SignUpPage, "askForTheTicket", { title: "Ask for the Ticket", undoneAs: "Ask for the Ticket" })
core.describeAction(SignUpPage, "workOutTheInvitations", { title: "Work Out the Invitations", undoneAs: "Work Out the Invitations" })
core.describeAction(SignUpPage, "sendTheLetter", { title: "Send the Letter", undoneAs: "Send the Letter" })
core.describeAction(SignUpPage, "addTheNewAttendee", { title: "Add the New Attendee", undoneAs: "Add the New Attendee" })
// -----------
if (!core.isCarryingOver) signUpPage.start()
