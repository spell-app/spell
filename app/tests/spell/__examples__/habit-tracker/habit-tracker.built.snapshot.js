import { core, App, View, ViewableList, h } from "@spell/core"

export class Habit extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("monday", { type: "choice" }) }
  get monday() { return this.getProp("monday") }
  set monday(value) { this.setProp("monday", value) }

  static { this.declareProp("tuesday", { type: "choice" }) }
  get tuesday() { return this.getProp("tuesday") }
  set tuesday(value) { this.setProp("tuesday", value) }

  static { this.declareProp("wednesday", { type: "choice" }) }
  get wednesday() { return this.getProp("wednesday") }
  set wednesday(value) { this.setProp("wednesday", value) }

  static { this.declareProp("thursday", { type: "choice" }) }
  get thursday() { return this.getProp("thursday") }
  set thursday(value) { this.setProp("thursday", value) }

  static { this.declareProp("friday", { type: "choice" }) }
  get friday() { return this.getProp("friday") }
  set friday(value) { this.setProp("friday", value) }

  static { this.declareProp("saturday", { type: "choice" }) }
  get saturday() { return this.getProp("saturday") }
  set saturday(value) { this.setProp("saturday", value) }

  static { this.declareProp("sunday", { type: "choice" }) }
  get sunday() { return this.getProp("sunday") }
  set sunday(value) { this.setProp("sunday", value) }

  get days() {
    return [this.monday, this.tuesday, this.wednesday, this.thursday, this.friday, this.saturday, this.sunday]
  }

  get count() {
    return core.itemCountOf(core.filter(this.days, (day) => day))
  }

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

  draw() {
    return h("ui-segment",
      h("ui-form", { "prop:value": this },
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

  get lastWeek() {
    return Week.lastOwnerOf(this)
  }
}

export class Week extends ViewableList {
  static instanceType = Habit
  static elementTag = core.defineElement(this, "test-project")

  draw() {
    return h("ui-stack", { spacing: "sm" },
      () => core.drawIf(() => this.isEmpty, () => [h("ui-text", { color: "grey" }, "No habits yet:  add one above")]),
      h("slot")
    )
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

export function testStreaks() {
  return core.test("test streaks", function testStreaks() {
    const it = new Habit()
    core.echoTestAction(`set the habit to a new habit with name "Read", monday = yes, tuesday = yes, thursday = yes`)
    const habit = new Habit({
      name: "Read",
      monday: true,
      tuesday: true,
      thursday: true
    })
    core.expect(habit.count, `the habit's count`, 3, `3`)
    core.expect(habit.streak, `the habit's streak`, 2, `2`)
    core.echoTestAction(`set the habit's wednesday to yes`)
    habit.wednesday = true
    core.expect(habit.streak, `the habit's streak`, 4, `4`)
  })
}

export class HabitTracker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("habits", { init: () => new Week({ id: "habits" }), early: true }) }
  get habits() { return this.getProp("habits") }
  set habits(value) { this.setProp("habits", value) }

  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

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

  addTheDraft() {
    if (this.draft === "") return
    this.habits.append(new Habit({ name: this.draft }))
    this.draft = ""
  }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack",
        h("ui-header", { level: "2" }, "This week"),
        h("ui-form", { "prop:value": this },
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
              onClick: core.pressed(this, () => this.addTheDraft()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Add")
          )
        ),
        () => core.drawThing(this.habits)
      )
    )
  }
}
export const habitTracker = new HabitTracker()
core.describeAction(HabitTracker, "addTheDraft", { title: "Add the Draft", undoneAs: "Add the Draft" })
// -----------
if (!core.isCarryingOver) habitTracker.start()
// -----------
if (!core.isCarryingOver) testStreaks()
