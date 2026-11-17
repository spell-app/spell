import { core, List, App, View, ViewableList, h } from "@spell/core"

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
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "done" is yes or no
  static { this.declareProp("done", { type: "choice" }) }
  get done() { return this.getProp("done") }
  set done(value) { this.setProp("done", value) }

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
  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { direction: "horizontal", spacing: "sm" },
        h("ui-checkbox", { name: "done", "aria-label": "Done" }),
        h("ui-input", { name: "title", "aria-label": "Task", appearance: "transparent", fluid: true }),
        core.drawAction(this, "delete", { "icon-only": true, appearance: "tertiary" })
      )
    )
  }

  static draggable = true

  /** so a task knows its checklist, to leave it */
  get checklist() {
    return Checklist.ownerOf(this)
  }

  get lastChecklist() {
    return Checklist.lastOwnerOf(this)
  }
}

/** The checklist:  the tasks, one under the other */
export class Checklist extends ViewableList {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  draw() {
    return h("ui-stack", { spacing: "xs" }, h("slot"))
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

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
  static { this.declareProp("checklist", { init: () => new Checklist({ id: "checklist" }), early: true }) }
  get checklist() { return this.getProp("checklist") }
  set checklist(value) { this.setProp("checklist", value) }

  /** the next task's title, as the new task's field holds it */
  // - its "draft" is text
  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  /** how many are left:  the tasks picked out with "where", counted */
  get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  /** a new task at the end of the list;  the field empties */
  addTheDraft() {
    if (this.draft === "") return
    this.checklist.append(new Task({ title: this.draft }))
    this.draft = ""
  }

  draw() {
    return h("ui-container",
      h("ui-stack",
        h("ui-text", { color: "grey" }, () => this.activeCount, " to do"),
        h("ui-form", { "prop:value": this },
          h("ui-input", { name: "draft", placeholder: "Something to do", "aria-label": "New task", fluid: true, action: true },
            h("ui-button", {
              slot: "action",
              color: "primary",
              disabled: () => this.draft === "",
              onClick: core.pressed(this, () => this.addTheDraft()),
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            }, "Add")
          )
        ),
        () => core.drawThing(this.checklist)
      )
    )
  }
}
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
