import { core, App, View, ViewableList, prop, derived, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Habit Tracker")
///////////////////
// ## Habit Tracker
///////////////////
// A week of checkboxes for each habit:  tick a day when you did it.
// Each habit counts its days, and its streak:  the most days in a row you kept it up.

core.heading("A habit")
/////////////
// ## A habit
/////////////
// Its name, a yes or no for each day of the week, and what they add up to.
// Each habit is its own element on the page, `<habit-tracker-habit>`.

export class Habit extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "monday" is yes or no
  @prop({ type: "choice" })
  accessor monday!: boolean

  // - its "tuesday" is yes or no
  @prop({ type: "choice" })
  accessor tuesday!: boolean

  // - its "wednesday" is yes or no
  @prop({ type: "choice" })
  accessor wednesday!: boolean

  // - its "thursday" is yes or no
  @prop({ type: "choice" })
  accessor thursday!: boolean

  // - its "friday" is yes or no
  @prop({ type: "choice" })
  accessor friday!: boolean

  // - its "saturday" is yes or no
  @prop({ type: "choice" })
  accessor saturday!: boolean

  // - its "sunday" is yes or no
  @prop({ type: "choice" })
  accessor sunday!: boolean

  /** Its week as one list, Monday first */
  get days() {
    return [this.monday, this.tuesday, this.wednesday, this.thursday, this.friday, this.saturday, this.sunday]
  }

  /** How many days this week it was done */
  @derived get count() {
    return core.itemCountOf(core.filter(this.days, (day: boolean) => day))
  }

  /** The most days in a row it was done */
  @derived get streak() {
    let run: number = 0
    let best: number = 0
    this.days.forEach((day: boolean) => {
      if (day) {
        run = run + 1
        if (run > best) best = run
      } else run = 0
    })
    return best
  }

  /** A form of its own, bound to it:  ticking a day, or typing a name, changes the habit */
  @drawn draw() {
    return (
      <ui-segment>
        <ui-form value={this}>
          <ui-stack spacing="sm">
            <ui-stack direction="horizontal" justify="between">
              <ui-input name="name" aria-label="Habit" appearance="transparent" />
              <ui-labels>
                <ui-label>{this.count} days</ui-label>
                <ui-label color="orange" icon="fire">{this.streak} in a row</ui-label>
              </ui-labels>
            </ui-stack>
            <ui-stack direction="horizontal" justify="between" wrap={true}>
              <ui-checkbox name="monday" label="Mon" />
              <ui-checkbox name="tuesday" label="Tue" />
              <ui-checkbox name="wednesday" label="Wed" />
              <ui-checkbox name="thursday" label="Thu" />
              <ui-checkbox name="friday" label="Fri" />
              <ui-checkbox name="saturday" label="Sat" />
              <ui-checkbox name="sunday" label="Sun" />
            </ui-stack>
          </ui-stack>
        </ui-form>
      </ui-segment>
    )
  }

  get week() {
    return Week.ownerOf(this)!
  }
}

/**
 * `<test-project-habit>`:  a habit, drawn in its own element, e.g. by `draw the habit`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its habit's properties;  its methods call its habit's.
 * - What every view's element does, e.g. drawing its habit, is `SpellElement`'s.
 */
export class HabitElement extends SpellElement<Habit> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-habit", "habit", [
    { name: "name", kind: "string", description: "Its name." },
    { name: "monday", kind: "boolean", description: "Its monday." },
    { name: "tuesday", kind: "boolean", description: "Its tuesday." },
    { name: "wednesday", kind: "boolean", description: "Its wednesday." },
    { name: "thursday", kind: "boolean", description: "Its thursday." },
    { name: "friday", kind: "boolean", description: "Its friday." },
    { name: "saturday", kind: "boolean", description: "Its saturday." },
    { name: "sunday", kind: "boolean", description: "Its sunday." }
  ])
}
core.useElement(Habit, HabitElement)

// A yes or no for each day of the week

// Worked out from its days, again as each one is ticked

export class Week extends ViewableList<Habit> {
  static instanceType = Habit
  static elementTag = core.defineElement(this, "test-project")

  /** Its habits one under the other;  while it's empty, a line saying so */
  @drawn draw() {
    return (
      <ui-stack spacing="sm">
        <ui-text color="grey" hidden={this.isEmpty ? undefined : true}>{"No habits yet:  add one above"}</ui-text>
        <slot />
      </ui-stack>
    )
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

/**
 * `<test-project-week>`:  a week, drawn in its own element, e.g. by `draw the week`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its week's properties;  its methods call its week's.
 * - What every view's element does, e.g. drawing its week, is `SpellElement`'s.
 */
export class WeekElement extends SpellElement<Week> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-week", "week", [])
}
core.useElement(Week, WeekElement)

export function testStreaks() {
  return core.test("test streaks", function testStreaks() {
    const it = new Habit()
    core.echoTestAction(`set the habit to a new habit with name = "Read", monday = yes, tuesday = yes, thursday = yes`)
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

core.heading("The week")
//////////////
// ## The week
//////////////
// The habits, one under the other:  `<habit-tracker-week>`, around its habits' elements.

// on the page, its habits can be dragged to another place

/** a habit is in one week */

core.heading("The tracker")
/////////////////
// ## The tracker
/////////////////
// The new habit's field, then a habit a row.

@thing
export class HabitTracker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "habits" is a new week
  @prop({ init: () => new Week(), early: true })
  accessor habits!: Week

  /** The next habit's name, as the new habit's field holds it */
  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

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

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack>
          <ui-header level="2">This week</ui-header>
          <ui-form value={this}>
            <ui-input name="draft" placeholder="A habit to keep, e.g. Read" aria-label="New habit" fluid={true} action={true}>
              <ui-button slot="action" color="primary" disabled={this.draft === ""} onClick={core.pressed(this, () => this.addTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Add
              </ui-button>
            </ui-input>
          </ui-form>
          {core.drawThing(this.habits)}
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a habit tracker, drawn in its own element, e.g. by `draw the habit tracker`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its habit tracker's properties;  its methods call its habit tracker's.
 * - What every view's element does, e.g. drawing its habit tracker, is `SpellElement`'s.
 */
export class HabitTrackerElement extends SpellElement<HabitTracker> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "habit tracker", [
    { name: "habits", kind: "json", description: "Its habits." },
    { name: "draft", kind: "string", description: "Its draft." }
  ])

  create() {
    return this.currentThing?.create()
  }

  addTheDraft() {
    return this.currentThing?.addTheDraft()
  }
}
core.useElement(HabitTracker, HabitTrackerElement)
export const habitTracker = new HabitTracker()
// -----------
if (!core.isCarryingOver) habitTracker.start()
// -----------
if (!core.isCarryingOver) testStreaks()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `HabitElement` */
      "test-project-habit": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `WeekElement` */
      "test-project-week": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `HabitTrackerElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
