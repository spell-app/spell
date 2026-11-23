import { core, List, App, View, ViewableList, Place, prop, derived, thing, drawn, withSpellPositions } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "text", declaredAt: { path: "/Task.spell", start: 358, end: 393 } })
  accessor title!: string

  // - its "done" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/Task.spell", start: 395, end: 418 } })
  accessor done!: boolean

  /** Where it sits in its checklist, from 1:  kept with it, so the order you drag the tasks into comes back */
  // - its "order" is number
  @prop({ type: "number", declaredAt: { path: "/Task.spell", start: 420, end: 549 } })
  accessor order!: number

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
  @drawn draw() {
    return (
      <ui-form prop:value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-icon name="grip vertical" color="grey" aria-label="Drag" />
          <ui-checkbox name="done" aria-label="Done" />
          <ui-input name="title" aria-label="Task" appearance="transparent" fluid={true} />
          {core.drawAction(this, "delete", { "icon-only": true, appearance: "tertiary" })}
        </ui-stack>
      </ui-form>
    )
  }

  static draggable = true

  /** a task is in one checklist at a time */
  static { this.declareProp("checklist", { declaredAt: { path: "/Task.spell", start: 1733, end: 1764 } }) }
  get checklist() {
    return Checklist.ownerOf(this)!
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
  @prop({ type: "date", declaredAt: { path: "/TaskList.api.spell", start: 395, end: 419 } })
  accessor created!: any /* spell: type unknown */

  // a task lives in my tasks
  @prop({ type: "date", declaredAt: { path: "/TaskList.api.spell", start: 395, end: 419 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * `<test-project-task>`:  a task, drawn in its own element, e.g. by `draw the task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its task's properties;  its methods call its task's.
 * - What every view's element does, e.g. drawing its task, is `SpellElement`'s.
 */
export class TaskElement extends SpellElement<Task> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-task", "task", [
    { name: "done", kind: "boolean", description: "Its done." },
    { name: "order", kind: "number", description: "Its order." },
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  delete() {
    return this.currentThing?.delete()
  }
}
core.useElement(Task, TaskElement)

export class Checklist extends ViewableList<Task> {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  /** a drop has moved its tasks:  each keeps its new place */
  whenTaskDroppedOn(task: Task) {
    this.keepTheOrder()
  }

  /** Its tasks one under the other;  while it's empty, a line saying so */
  @drawn draw() {
    return (
      <ui-stack spacing="xs">
        {core.drawIf(() => this.isEmpty, () => <>
          <ui-text color="grey">Nothing to do</ui-text>
        </>)}
        <slot />
      </ui-stack>
    )
  }

  /** Each task keeps its place in the list, from 1:  so the order you drag them into comes back next time */
  keepTheOrder() {
    this.forEach(withSpellPositions((task, place) => (task.order = place)))
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

  whenTaskDroppedOn(task: Task) {
    return this.currentThing?.whenTaskDroppedOn(task)
  }

  keepTheOrder() {
    return this.currentThing?.keepTheOrder()
  }
}
core.useElement(Checklist, ChecklistElement)

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
    core.expect(core.getItemAt(core.sortedBy(list, (item: Task) => item.order), 0)?.title!, `the title of the first task in (the list sorted by its order)`, "second", `"second"`)
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

@thing
export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // "checklist" is a new checklist
  @prop({ init: () => new Checklist({ id: "checklist" }), early: true })
  accessor checklist!: Checklist

  /** The next task's title, as the new task's field holds it */
  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

  static { this.declareProp("activeCount", { declaredAt: { path: "/TaskList.spell", start: 575, end: 654 }, readsFrom: ["my_tasks"] }) }
  @derived get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  /** The tasks kept on this device, in their order */
  create() {
    core.holdWhile(() => this.fillTheChecklist())
  }

  /** The first time, with none kept yet, a few to start with */
  async fillTheChecklist() {
    core.clear(this.checklist)
    core.map(core.sortedBy(await core.savedThings(Task), (item: Task) => item.order), (task: Task) => this.checklist.append(task))
    if (!this.checklist.isEmpty) return
    this.addTheTaskTitle("Add a task above")
    this.addTheTaskTitle("Tick it off when it's done")
    this.addTheTaskTitle("Drag a task by its handle to move it")
    this.addTheTaskTitle("Delete one with its button")
    this.checklist.firstItem!.done = true
  }

  /** A new task at the end of the list, kept on this device */
  addTheTaskTitle(title: string) {
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

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack>
          <ui-stack direction="horizontal" justify="between">
            <ui-header level="2">Task List</ui-header>
            <ui-stack direction="horizontal" spacing="sm">
              <ui-text color="grey">
                {core.drawIf(() => this.activeCount === 0, () => <>All done</>, () => <>{this.activeCount} to do</>)}
              </ui-text>
              {core.drawAction(this, "takeTheTour", { appearance: "tertiary" })}
            </ui-stack>
          </ui-stack>
          <ui-form prop:value={this}>
            <ui-input id="new task" name="draft" placeholder="Something to do" aria-label="New task" fluid={true} action={true}>
              <ui-button slot="action" color="primary" disabled={this.draft === ""} onClick={core.pressed(this, () => this.addTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Add
              </ui-button>
            </ui-input>
          </ui-form>
          {core.drawThing(this.checklist)}
        </ui-stack>
        <ui-tour name="Task List" summary="Add your tasks, tick them off and put them in order.">
          <ui-tour-step target="new task">Type something to do here, then press Add.</ui-tour-step>
          <ui-tour-step target="checklist">Your tasks are here. Tick one off when it's done.</ui-tour-step>
          <ui-tour-step target="checklist">Drag a task by its handle to move it.</ui-tour-step>
          <ui-tour-step>That's it. Your tasks stay on this device for next time.</ui-tour-step>
        </ui-tour>
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

  create() {
    return this.currentThing?.create()
  }

  fillTheChecklist() {
    return this.currentThing?.fillTheChecklist()
  }

  addTheTaskTitle(title: string) {
    return this.currentThing?.addTheTaskTitle(title)
  }

  addTheDraft() {
    return this.currentThing?.addTheDraft()
  }

  takeTheTour() {
    return this.currentThing?.takeTheTour()
  }
}
core.useElement(TaskList, TaskListElement)
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
