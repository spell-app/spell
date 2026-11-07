import { core, App, View, ViewableList, h, sendCall } from "@spell/core"

///////////////////
// ## Habit Tracker
///////////////////
// A week of checkboxes for each habit:  tick a day when you did it.
// Each habit counts its days, and its streak:  the most days in a row you kept it up.

/////////////
// ## A habit
/////////////
// Its name, a yes or no for each day of the week, and what they add up to.
// Each habit is its own element on the page, `<habit-tracker-habit>`.

export class Habit extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "monday" is yes or no
  static { this.declareProp("monday", { type: "choice" }) }
  get monday() { return this.getProp("monday") }
  set monday(value) { this.setProp("monday", value) }

  // - its "tuesday" is yes or no
  static { this.declareProp("tuesday", { type: "choice" }) }
  get tuesday() { return this.getProp("tuesday") }
  set tuesday(value) { this.setProp("tuesday", value) }

  // - its "wednesday" is yes or no
  static { this.declareProp("wednesday", { type: "choice" }) }
  get wednesday() { return this.getProp("wednesday") }
  set wednesday(value) { this.setProp("wednesday", value) }

  // - its "thursday" is yes or no
  static { this.declareProp("thursday", { type: "choice" }) }
  get thursday() { return this.getProp("thursday") }
  set thursday(value) { this.setProp("thursday", value) }

  // - its "friday" is yes or no
  static { this.declareProp("friday", { type: "choice" }) }
  get friday() { return this.getProp("friday") }
  set friday(value) { this.setProp("friday", value) }

  // - its "saturday" is yes or no
  static { this.declareProp("saturday", { type: "choice" }) }
  get saturday() { return this.getProp("saturday") }
  set saturday(value) { this.setProp("saturday", value) }

  // - its "sunday" is yes or no
  static { this.declareProp("sunday", { type: "choice" }) }
  get sunday() { return this.getProp("sunday") }
  set sunday(value) { this.setProp("sunday", value) }

  /** Its week as one list, Monday first */
  get days() {
    return [this.monday, this.tuesday, this.wednesday, this.thursday, this.friday, this.saturday, this.sunday]
  }

  /** How many days this week it was done */
  get count() {
    return core.itemCountOf(core.filter(this.days, (day) => day))
  }

  /** The most days in a row it was done */
  get streak() {
    let run = 0
    let best = 0
    this.days.forEach((day) => {
      if (day) {
        run = run + 1
        if (run > best) best = run
      } else run = 0
    })
    return best
  }

  /** A form of its own, bound to it:  ticking a day, or typing a name, changes the habit */
  draw() {
    return h("ui-segment",
      h("ui-form", { value: this },
        h("ui-stack", { spacing: "sm" },
          h("ui-stack", { direction: "horizontal", justify: "between" },
            h("ui-input", { name: "name", "aria-label": "Habit", appearance: "transparent" }),
            h("ui-labels",
              h("ui-label", () => this.count, " days"),
              h("ui-label", { color: "orange", icon: "fire" }, () => this.streak, " in a row")
            )
          ),
          h("ui-stack", { direction: "horizontal", justify: "between", wrap: true },
            h("ui-checkbox", { name: "monday", label: "Mon" }),
            h("ui-checkbox", { name: "tuesday", label: "Tue" }),
            h("ui-checkbox", { name: "wednesday", label: "Wed" }),
            h("ui-checkbox", { name: "thursday", label: "Thu" }),
            h("ui-checkbox", { name: "friday", label: "Fri" }),
            h("ui-checkbox", { name: "saturday", label: "Sat" }),
            h("ui-checkbox", { name: "sunday", label: "Sun" })
          )
        )
      )
    )
  }

  get week() {
    return Week.ownerOf(this)
  }
}

// A yes or no for each day of the week

// Worked out from its days, again as each one is ticked

export class Week extends ViewableList {
  static instanceType = Habit
  static elementTag = core.defineElement(this, "test-project")

  /** Its habits one under the other;  while it's empty, a line saying so */
  draw() {
    return h("ui-stack", { spacing: "sm" },
      h("ui-text", { color: "grey", hidden: () => this.isEmpty ? undefined : true },
        "No habits yet:  add one above"
      ),
      h("slot")
    )
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

export function testStreaks(...args) {
  return sendCall("test_streaks", args)
}

//////////////
// ## The week
//////////////
// The habits, one under the other:  `<habit-tracker-week>`, around its habits' elements.

// on the page, its habits can be dragged to another place

/** a habit is in one week */

/////////////////
// ## The tracker
/////////////////
// The new habit's field, then a habit a row.

export class HabitTracker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "habits" is a new week
  static { this.declareProp("habits", { init: () => new Week(), early: true }) }
  get habits() { return this.getProp("habits") }
  set habits(value) { this.setProp("habits", value) }

  /** The next habit's name, as the new habit's field holds it */
  // - its "draft" is text
  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  /** A new tracker starts with three habits, a few days ticked */
  create() {
    this.habits.append(new Habit({
      name: "Read",
      monday: true,
      tuesday: true,
      wednesday: true,
      friday: true
    }))
    this.habits.append(new Habit({
      name: "Walk",
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true
    }))
    this.habits.append(new Habit({
      name: "Stretch",
      monday: true,
      saturday: true
    }))
  }

  /** The draft, as a new habit at the end;  the field empties */
  addTheDraft() {
    if (this.draft === "") return
    this.habits.append(new Habit({ name: this.draft }))
    this.draft = ""
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-header", { level: "2" }, "This week"),
        h("ui-form", { value: this },
          h("ui-input", {
            name: "draft",
            placeholder: "A habit to keep, e.g. Read",
            "aria-label": "New habit",
            fluid: true,
            action: true
          },
            h("ui-button", {
              slot: "action",
              color: "primary",
              disabled: () => this.draft === "",
              onClick: () => sendCall("add_the_draft", [], this),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Add")
          )
        ),
        () => core.drawThing(this.habits)
      )
    )
  }
}
export let habitTracker
// -----------

// -----------

/** Binds each thing the program keeps, from Python's state. */
export function adopt(state) {
  habitTracker = state["habit_tracker"]
}

