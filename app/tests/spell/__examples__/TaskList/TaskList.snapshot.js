import { core, List, App, View, ViewableList, Place, h, withSpellPositions } from "@spell/core"

core.heading("A task, and the checklist that holds it")
/////////////////////////////////////////////
// ## A task, and the checklist that holds it
/////////////////////////////////////////////
// Something to do:  its title, and whether it's done.
// Each task is its own element on the page, `<task-list-task>`:
// a handle to drag it by, a box to tick, its title, and a button to delete it.
// Its checklist is one too, `<task-list-checklist>`, the tasks one under the other.

export class Task extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** What to do */
  // - its "title" is text
  static { this.declareProp("title", { type: "text", declaredAt: { path: "/Task.spell", start: 358, end: 393 } }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  // - its "done" is yes or no
  static { this.declareProp("done", { type: "choice", declaredAt: { path: "/Task.spell", start: 395, end: 418 } }) }
  get done() { return this.getProp("done") }
  set done(value) { this.setProp("done", value) }

  /** Where it sits in its checklist, from 1:  kept with it, so the order you drag the tasks into comes back */
  // - its "order" is number
  static { this.declareProp("order", { type: "number", declaredAt: { path: "/Task.spell", start: 420, end: 549 } }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  static { this.declareProp("isDone", { declaredAt: { path: "/Task.spell", start: 551, end: 582 }, readsFrom: ["my_tasks"] }) }
  get isDone() {
    return this.done
  }

  static { this.declareProp("isActive", { declaredAt: { path: "/Task.spell", start: 584, end: 616 }, readsFrom: ["my_tasks"] }) }
  get isActive() {
    return !this.isDone
  }

  /** Gone from its checklist, and from this device */
  delete() {
    this.checklist.remove(this)
    core.removeSaved(this)
  }

  /** A form of its own, bound to it:  ticking the box, or typing a title, changes the task */
  draw() {
    return h("ui-form", { "prop:value": this },
      h("ui-stack", { direction: "horizontal", spacing: "sm" },
        h("ui-icon", { name: "grip vertical", color: "grey", "aria-label": "Drag" }),
        h("ui-checkbox", { name: "done", "aria-label": "Done" }),
        h("ui-input", { name: "title", "aria-label": "Task", appearance: "transparent", fluid: true }),
        core.drawAction(this, "delete", { "icon-only": true, appearance: "tertiary" })
      )
    )
  }

  static draggable = true

  /** a task is in one checklist at a time */
  static { this.declareProp("checklist", { declaredAt: { path: "/Task.spell", start: 1733, end: 1764 } }) }
  get checklist() {
    return Checklist.ownerOf(this)
  }

  static { this.declareProp("lastChecklist", { declaredAt: { path: "/Task.spell", start: 1733, end: 1764 } }) }
  get lastChecklist() {
    return Checklist.lastOwnerOf(this)
  }

  static savedIn = {
    place: "my_tasks",
    collection: "tasks",
    times: ["created", "modified"]
  }

  // a task lives in my tasks
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/TaskList.api.spell", start: 395, end: 419 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // a task lives in my tasks
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/TaskList.api.spell", start: 395, end: 419 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Checklist extends ViewableList {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  /** a drop has moved its tasks:  each keeps its new place */
  whenTaskDroppedOn(task) {
    this.keepTheOrder()
  }

  /** Its tasks one under the other;  while it's empty, a line saying so */
  draw() {
    return h("ui-stack", { spacing: "xs" },
      h("ui-text", { color: "grey", hidden: () => this.isEmpty ? undefined : true }, "Nothing to do"),
      h("slot")
    )
  }

  /** Each task keeps its place in the list, from 1:  so the order you drag them into comes back next time */
  keepTheOrder() {
    this.forEach(withSpellPositions((task, place) => (task.order = place)))
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

core.describeAction(Task, "delete", { title: "Delete", icon: "trash alternate outline", undoneAs: "Delete" })

core.heading("The checklist")
//## The checklist

core.describeAction(Checklist, "keepTheOrder", { title: "Keep the Order", undoneAs: "Keep the Order" })
// on the page, its tasks can be dragged to another place:  they move as the pointer does, gliding there

export function testADraggedOrderIsKept() {
  return core.test("test a dragged order is kept", function testADraggedOrderIsKept() {
    const it = new Checklist()
    core.echoTestAction(`set the list to a new checklist`)
    const list = new Checklist()
    core.echoTestAction(`set the first to a new task with title "first"`)
    const first = new Task({ title: "first" })
    core.echoTestAction(`set the second to a new task with title "second"`)
    const second = new Task({ title: "second" })
    core.echoTestAction(`add the second to the list`)
    list.append(second)
    core.echoTestAction(`add the first to the list`)
    list.append(first)
    core.echoTestAction(`keep the order of the list`)
    list.keepTheOrder()
    core.expect(second.order, `the order of the second`, 1, `1`)
    core.expect(first.order, `the order of the first`, 2, `2`)
    core.expect(core.getItemAt(core.sortedBy(list, (item) => item.order), 0)?.title, `the title of the first task in (the list sorted by its order)`, "second", `"second"`)
  })
}

core.heading("How a task draws")
//## How a task draws

export function testCheckingOneOff() {
  return core.test("test checking one off", function testCheckingOneOff() {
    const it = new Task()
    core.echoTestAction(`set the task to a new task with title "Write the tests"`)
    const task = new Task({ title: "Write the tests" })
    core.expect(task.isActive, `the task is active`, true, `yes`)
    core.echoTestAction(`set the task's done to yes`)
    task.done = true
    core.expect(task.isDone, `the task is done`, true, `yes`)
  })
}
// -----------
core.heading("Task List:  where the tasks are kept")
//////////////////////////////////////////
// ## Task List:  where the tasks are kept
//////////////////////////////////////////
/**
 * On this device, in this browser's own storage:  nobody else sees them, no server is asked, and there's no sign-in.
 * A task saves itself as it changes:  ticking it, typing its title, or dragging it into place is kept, with no save step.
 * Change the first line to keep them somewhere else, and nothing else changes.
 */
export class MyTask extends Place {}
export const myTasks = core.place(new MyTask(), { name: "my_tasks", kind: "database on this device" })
// -----------
core.heading("Task List")
///////////////
// ## Task List
///////////////
// A to-do list:  type a task and add it, tick it off when it's done, delete it, and drag the tasks into order.
// Its tasks and their checklist are in Task.spell;  this file holds the app.
// They're kept on this device, so they're still there next time:  TaskList.api.spell says where.

core.heading("The app")
/////////////
// ## The app
/////////////
// A header saying how many are left, the new task's field, then the list;  and a tour of them, its Tour button in the header.

export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "checklist" is a new checklist
  static { this.declareProp("checklist", { init: () => new Checklist({ id: "checklist" }), early: true }) }
  get checklist() { return this.getProp("checklist") }
  set checklist(value) { this.setProp("checklist", value) }

  /** The next task's title, as the new task's field holds it */
  // - its "draft" is text
  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  static { this.declareProp("activeCount", { declaredAt: { path: "/TaskList.spell", start: 575, end: 654 }, readsFrom: ["my_tasks"] }) }
  get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  /** The tasks kept on this device, in their order */
  create() {
    core.holdWhile(() => this.fillTheChecklist())
  }

  /** The first time, with none kept yet, a few to start with */
  async fillTheChecklist() {
    core.clear(this.checklist)
    core.map(core.sortedBy(await core.savedThings(Task), (item) => item.order), (task) => this.checklist.append(task))
    if (!this.checklist.isEmpty) return
    this.addTheTaskTitle("Add a task above")
    this.addTheTaskTitle("Tick it off when it's done")
    this.addTheTaskTitle("Drag a task by its handle to move it")
    this.addTheTaskTitle("Delete one with its button")
    this.checklist.firstItem.done = true
  }

  /** A new task at the end of the list, kept on this device */
  addTheTaskTitle(title) {
    const task = new Task({ title: title })
    core.saveThing(task)
    this.checklist.append(task)
    task.order = this.checklist.length
  }

  /** The draft, as a new task;  the field empties */
  addTheDraft() {
    if (this.draft === "") return
    this.addTheTaskTitle(this.draft)
    this.draft = ""
  }

  /** A few steps through the app, pointing at each part */
  takeTheTour() {
    core.startTour("Task List")
  }

  draw() {
    return h("ui-container",
      h("ui-stack",
        h("ui-stack", { direction: "horizontal", justify: "between" },
          h("ui-header", { level: "2" }, "Task List"),
          h("ui-stack", { direction: "horizontal", spacing: "sm" },
            h("ui-text", { color: "grey" },
              h("span", { hidden: () => this.activeCount === 0 ? undefined : "until-found" }, "All done"),
              h("span", { hidden: () => !(this.activeCount === 0) ? undefined : "until-found" },
                () => this.activeCount,
                " to do"
              )
            ),
            core.drawAction(this, "takeTheTour", { appearance: "tertiary" })
          )
        ),
        h("ui-form", { "prop:value": this },
          h("ui-input", {
            id: "new task",
            name: "draft",
            placeholder: "Something to do",
            "aria-label": "New task",
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
        () => core.drawThing(this.checklist)
      ),
      h("ui-tour", { name: "Task List", summary: "Add your tasks, tick them off and put them in order." },
        h("ui-tour-step", { target: "new task" }, "Type something to do here, then press Add."),
        h("ui-tour-step", { target: "checklist" }, "Your tasks are here. Tick one off when it's done."),
        h("ui-tour-step", { target: "checklist" }, "Drag a task by its handle to move it."),
        h("ui-tour-step", "That's it. Your tasks stay on this device for next time.")
      )
    )
  }
}
export const taskList = new TaskList()
core.describeAction(TaskList, "fillTheChecklist", { title: "Fill the Checklist", undoneAs: "Fill the Checklist" })
core.describeAction(TaskList, "addTheTaskTitle", { title: "Add the Task Title", undoneAs: "Add the Task Title" })
core.describeAction(TaskList, "addTheDraft", { title: "Add the Draft", undoneAs: "Add the Draft" })
core.describeAction(TaskList, "takeTheTour", { title: "Tour", icon: "map signs", undoneAs: "Tour" })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - Each task is an element of its own inside the list, <task-list-checklist>:  <task-list-task>.¬   - Its title's field fills the row by itself:  it's \`fluid\`, in a row of a \`<stack>\`. */¬¬/* done:  it fades */¬task-list-checklist > [done] {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) taskList.start()
// -----------
if (!core.isCarryingOver) testADraggedOrderIsKept()
if (!core.isCarryingOver) testCheckingOneOff()
