import { core, List, App, View, ViewableList, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("How the Task List works")
/////////////////////////////
// ## How the Task List works
/////////////////////////////
// The Task List example is a to-do list:  type a task and add it, tick it off when it's done,
// delete it, and drag the tasks into another order.
// Four ideas do the work:
// - each task is a THING of its own, which draws itself as a row:  a box to tick, its title, a button
// - the new task's field is a form bound to the app:  Add makes a task from what's typed
// - the count picks tasks out with "where":  "tasks in the checklist where it is active"
// - one line lets the list's tasks be dragged into another order
//
// This guide keeps those four, and leaves out where the tasks are kept:
// here they're in memory, and start afresh each run.
// Open Task List, from Make something on the home page, for all of it.

core.heading("A task")
/** A task */
export class Task extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is text
  @prop({ type: "text" })
  accessor title!: string

  // - its "done" is yes or no
  @prop({ type: "choice" })
  accessor done!: boolean

  get isDone() {
    return this.done
  }

  get isActive() {
    return !this.isDone
  }

  delete() {
    this.checklist.remove(this)
  }

  /** a form of its own, bound to the task:  ticking the box changes its "done" */
  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-checkbox name="done" aria-label="Done" />
          <ui-input name="title" aria-label="Task" appearance="transparent" fluid={true} />
          {core.drawAction(this, "delete", { "icon-only": true, appearance: "tertiary" })}
        </ui-stack>
      </ui-form>
    )
  }

  static draggable = true

  /** so a task knows its checklist, to leave it */
  get checklist() {
    return Checklist.ownerOf(this)!
  }

  get lastChecklist() {
    return Checklist.lastOwnerOf(this)
  }
}

/**
 * `<test-project-task>`:  a task, drawn in its own element, e.g. by `draw the task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its task's properties;  its methods call its task's.
 * - What every view's element does, e.g. drawing its task, is `SpellElement`'s.
 */
export class TaskElement extends SpellElement<Task> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-task", "task", [
    { name: "done", kind: "boolean", description: "Its done." }
  ])

  delete() {
    return this.currentThing?.delete()
  }
}
core.useElement(Task, TaskElement)

/** The checklist:  the tasks, one under the other */
export class Checklist extends ViewableList<Task> {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  @drawn draw() {
    return (
      <ui-stack spacing="xs">
        <slot />
      </ui-stack>
    )
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

/**
 * `<test-project-checklist>`:  a checklist, drawn in its own element, e.g. by `draw the checklist`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its checklist's properties;  its methods call its checklist's.
 * - What every view's element does, e.g. drawing its checklist, is `SpellElement`'s.
 */
export class ChecklistElement extends SpellElement<Checklist> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-checklist", "checklist", [])
}
core.useElement(Checklist, ChecklistElement)

core.describeAction(Task, "delete", { title: "Delete", icon: "trash alternate outline", undoneAs: "Delete" })

core.heading("The checklist:  the tasks, one under the other")
// its tasks can be dragged to another place

core.heading("How a task draws")
//## How a task draws

core.heading("The app")
/** The app */
export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "checklist" is a new checklist
  @prop({ init: () => new Checklist({ id: "checklist" }), early: true })
  accessor checklist!: Checklist

  /** the next task's title, as the new task's field holds it */
  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

  /** how many are left:  the tasks picked out with "where", counted */
  @derived get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  /** a new task at the end of the list;  the field empties */
  addTheDraft() {
    if (this.draft === "") return
    this.checklist.append(new Task({ title: this.draft }))
    this.draft = ""
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack>
          <ui-text color="grey">{this.activeCount} to do</ui-text>
          <ui-form prop:value={this}>
            <ui-input name="draft" placeholder="Something to do" aria-label="New task" fluid={true} action={true}>
              <ui-button slot="action" color="primary" disabled={this.draft === ""} onClick={core.pressed(this, () => this.addTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Add
              </ui-button>
            </ui-input>
          </ui-form>
          {core.drawThing(this.checklist)}
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a task list, drawn in its own element, e.g. by `draw the task list`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its task list's properties;  its methods call its task list's.
 * - What every view's element does, e.g. drawing its task list, is `SpellElement`'s.
 */
export class TaskListElement extends SpellElement<TaskList> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "task list", [
    { name: "checklist", kind: "json", description: "Its checklist." },
    { name: "draft", kind: "string", description: "Its draft." }
  ])

  addTheDraft() {
    return this.currentThing?.addTheDraft()
  }
}
core.useElement(TaskList, TaskListElement)
export const taskList = new TaskList()
core.describeAction(TaskList, "addTheDraft", { title: "Add the Draft", undoneAs: "Add the Draft" })

core.heading("Start:  three tasks, one of them done")
//## Start:  three tasks, one of them done
taskList.checklist.append(new Task({ title: "Read this guide", done: true }))
taskList.checklist.append(new Task({ title: "Tick a box on the right" }))
taskList.checklist.append(new Task({ title: "Drag a task to the top" }))

core.heading("A check")
/** A check */
export function testCountingTheTasksToDo() {
  return core.test("test counting the tasks to do", function testCountingTheTasksToDo() {
    core.echoTestAction(`set the list to a new checklist`)
    const list = new Checklist()
    core.echoTestAction(`add (a new task with title = "a", done = yes) to the list`)
    list.append(new Task({ title: "a", done: true }))
    core.echoTestAction(`add (a new task with title = "b") to the list`)
    list.append(new Task({ title: "b" }))
    core.expect(list.filter((task) => task.isActive).length, `the length of (tasks in the list where it is active)`, 1, `1`)
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Tick "Tick a box on the right":  the count drops to 1.
// - Type a task and press Add:  it's at the end of the list.
// - Drag "Drag a task to the top" up above the others, then delete it with its button.
// - Count the done ones too:  add a line under "its active count" that says
//       its "done count" is the length of (tasks in the checklist where it is done)
//   and show it beside the active count.
//
// Where next:  Task List, from Make something on the home page, which keeps its tasks on this device.

core.heading("Where the example keeps its tasks")
///////////////////////////////////////
// ## Where the example keeps its tasks
///////////////////////////////////////
// This guide's tasks live in memory:  reload, and they start again.
// Task List keeps them on this device, in the browser's own storage:  reload, and they're still there.
// No server is asked, and there's no sign-in.  Two lines, in its API file, say so:
//       my tasks is stored on this device
//       a task lives in my tasks
// After them, the words you already know reach the device:
//       for task in (every task) sorted by its order
//       add task to the tasks
//       remove it from the tasks
// A task kept there saves itself as it changes:  ticking it, or typing its title, is kept, with no save step.
// Its place in the list is kept the same way, as its "order":  a drop sets each task's order to its place,
//       - when a task is dropped on it:
//           keep the order
// so the tasks come back in the order they were dragged into.
// Keeping them somewhere else, a data folder on the server, a sheet, an atmosphere account, is a change to the first line:
// nothing else changes.
// -----------
if (!core.isCarryingOver) taskList.start()
// -----------
if (!core.isCarryingOver) testCountingTheTasksToDo()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TaskElement` */
      "test-project-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ChecklistElement` */
      "test-project-checklist": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TaskListElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
