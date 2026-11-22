import { core, List, App, View, ViewableList, Place, h, withSpellPositions } from "@spell/core"

export class Task extends View {
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  static { this.declareProp("done", { type: "choice" }) }
  get done() { return this.getProp("done") }
  set done(value) { this.setProp("done", value) }

  static { this.declareProp("order", { type: "number" }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  static { this.declareProp("isDone", { readsFrom: ["my_tasks"] }) }
  get isDone() {
    return this.done
  }

  static { this.declareProp("isActive", { readsFrom: ["my_tasks"] }) }
  get isActive() {
    return !this.isDone
  }

  delete() {
    this.checklist.remove(this)
    core.removeSaved(this)
  }

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

  get checklist() {
    return Checklist.ownerOf(this)
  }

  get lastChecklist() {
    return Checklist.lastOwnerOf(this)
  }

  static savedIn = {
    place: "my_tasks",
    collection: "tasks",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Checklist extends ViewableList {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  whenTaskDroppedOn(task) {
    this.keepTheOrder()
  }

  draw() {
    return h("ui-stack", { spacing: "xs" },
      h("ui-text", { color: "grey", hidden: () => this.isEmpty ? undefined : true }, "Nothing to do"),
      h("slot")
    )
  }

  keepTheOrder() {
    this.forEach(withSpellPositions((task, place) => (task.order = place)))
  }

  static reorderItemsAfter = 0

  static exclusive = true
}

core.describeAction(Task, "delete", { title: "Delete", icon: "trash alternate outline", undoneAs: "Delete" })

core.describeAction(Checklist, "keepTheOrder", { title: "Keep the Order", undoneAs: "Keep the Order" })

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
export class MyTask extends Place {}
export const myTasks = core.place(new MyTask(), { name: "my_tasks", kind: "database on this device" })
// -----------
export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("checklist", { init: () => new Checklist({ id: "checklist" }), early: true }) }
  get checklist() { return this.getProp("checklist") }
  set checklist(value) { this.setProp("checklist", value) }

  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  static { this.declareProp("activeCount", { readsFrom: ["my_tasks"] }) }
  get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  create() {
    core.holdWhile(() => this.fillTheChecklist())
  }

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

  addTheTaskTitle(title) {
    const task = new Task({ title: title })
    core.saveThing(task)
    this.checklist.append(task)
    task.order = this.checklist.length
  }

  addTheDraft() {
    if (this.draft === "") return
    this.addTheTaskTitle(this.draft)
    this.draft = ""
  }

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
