import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Sign-Up Sheet:  where a picnic's sign-ups are kept")
////////////////////////////////////////////////////////
// ## Sign-Up Sheet:  where a picnic's sign-ups are kept
////////////////////////////////////////////////////////

export class Volunteer extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1435, end: 1458 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "shift" is text
  static { this.declareProp("shift", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1463, end: 1485 } }) }
  get shift() { return this.getProp("shift") }
  set shift(value) { this.setProp("shift", value) }

  // - its "note" is text
  static { this.declareProp("note", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1490, end: 1511 } }) }
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

  static savedIn = {
    place: "sign_up_sheet",
    collection: "volunteers",
    times: ["created", "modified"]
  }

  // - it lives in the sign up sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 1394, end: 1423 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in the sign up sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 1394, end: 1423 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * Who may sign up, and how many invitations each may ask for:  the organizers work it out from their standing and
 * their shifts ("work out the invitations", on the page).
 */
export class Attendee extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1784, end: 1807 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "standing" is text
  static { this.declareProp("standing", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 1812, end: 1837 } }) }
  get standing() { return this.getProp("standing") }
  set standing(value) { this.setProp("standing", value) }

  // - its "invitations" is a number
  static { this.declareProp("invitations", { type: "number", declaredAt: { path: "/SignUpSheet.api.spell", start: 1842, end: 1878 } }) }
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

  // - it lives in the sign up sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 1743, end: 1772 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in the sign up sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 1743, end: 1772 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** A ticket someone asked for, for a guest:  an organizer confirms it. */
export class Ticket extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2047, end: 2070 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "guest" is text
  static { this.declareProp("guest", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2075, end: 2097 } }) }
  get guest() { return this.getProp("guest") }
  set guest(value) { this.setProp("guest", value) }

  // - its "event" is text
  static { this.declareProp("event", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2102, end: 2124 } }) }
  get event() { return this.getProp("event") }
  set event(value) { this.setProp("event", value) }

  // - its "status" is text
  static { this.declareProp("status", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2129, end: 2152 } }) }
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

  // - it lives in the sign up sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2006, end: 2035 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in the sign up sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2006, end: 2035 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/** A message in your inbox:  your invitations' count is one, in the conversation "invitations". */
export class Message extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2518, end: 2539 } }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }

  // - its "recipients" is text
  static { this.declareProp("recipients", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2544, end: 2571 } }) }
  get recipients() { return this.getProp("recipients") }
  set recipients(value) { this.setProp("recipients", value) }

  // - its "thread" is text
  static { this.declareProp("thread", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2576, end: 2599 } }) }
  get thread() { return this.getProp("thread") }
  set thread(value) { this.setProp("thread", value) }

  // - its "page" is text
  static { this.declareProp("page", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2604, end: 2625 } }) }
  get page() { return this.getProp("page") }
  set page(value) { this.setProp("page", value) }

  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2630, end: 2652 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "line" is text
  static { this.declareProp("line", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2657, end: 2678 } }) }
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

  // - it lives in my inbox
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2486, end: 2506 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in my inbox
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2486, end: 2506 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class PublishedVolunteer extends Thing {
  // - its "person" is text
  static { this.declareProp("person", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2790, end: 2813 } }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }

  // - its "shift" is text
  static { this.declareProp("shift", { type: "text", declaredAt: { path: "/SignUpSheet.api.spell", start: 2818, end: 2840 } }) }
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

  // - it lives in the published sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2747, end: 2778 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in the published sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/SignUpSheet.api.spell", start: 2747, end: 2778 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
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
  static { this.declareProp("newVolunteer", { init: () => new Volunteer(), early: true }) }
  get newVolunteer() { return this.getProp("newVolunteer") }
  set newVolunteer(value) { this.setProp("newVolunteer", value) }

  // - its "new attendee" is a new attendee
  static { this.declareProp("newAttendee", { init: () => new Attendee(), early: true }) }
  get newAttendee() { return this.getProp("newAttendee") }
  set newAttendee(value) { this.setProp("newAttendee", value) }

  // - its "new ticket" is a new ticket
  static { this.declareProp("newTicket", { init: () => new Ticket(), early: true }) }
  get newTicket() { return this.getProp("newTicket") }
  set newTicket(value) { this.setProp("newTicket", value) }

  static { this.declareProp("counts", { declaredAt: { path: "/SignUpSheet.spell", start: 2300, end: 2366 }, readsFrom: ["my_inbox"] }) }
  get counts() { return core.waitedValue(this, "counts", async () => {
    return await core.savedThings(Message, { filter: { thread: "invitations" } })
  }) }

  // - its "new letter" is a new message
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

  /** Two for a member, one for a guest, and one more for each shift they took */
  async workOutTheInvitations() {
    await core.forEachSequential(core.duplicateList(await core.savedThings(Attendee)), async (attendee) => {
      const shifts = core.itemCountOf(await core.savedThings(Volunteer, { filter: { person: attendee.person } }))
      attendee.invitations = shifts + 1
      if (attendee.standing === "member") attendee.invitations = shifts + 2
    })
  }

  /** The picnic's letter to every attendee:  a pointer to its page in their inboxes, which reads what's theirs as each one opens it */
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
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the sheet"),
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
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the master sheet"),
              none: () => h("ui-text", { color: "grey" }, "Nobody's signed up yet."),
              failed: () => h("ui-text", { class: "organizers-only", color: "grey" }, "Only the picnic's organizers see this.")
            })
          ),
          h("ui-header", { size: "small" }, "Tickets"),
          h("ui-stack", { class: "tickets", spacing: "sm" },
            () => core.drawRead(async () => await core.savedThings(Ticket, {}, "as drawn"), (ticket) => core.drawThing(ticket), {
              waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Reading the tickets"),
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
