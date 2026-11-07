import { core, List, App, View, ViewableList, prop, derived, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("How the Task List works")
/////////////////////////////
// ## How the Task List works
/////////////////////////////
// The Task List example is a to-do list:  type a task, tick it off when it's done,
// and choose whether to see them all, only the ones to do, or only the ones done.
// Three ideas do the work:
// - each task is a THING of its own, which draws itself as a row with a checkbox
// - the list picks tasks out with "where":  "tasks in its tasks where it is active"
// - the list draws each task, or skips it, as its filter says
//
// This guide keeps those three, and leaves out dragging, selecting, the property editor,
// and where the tasks are kept:  here they're in memory, and start afresh each run.
// Open Task List, in the Examples, for all of it.  Lista de tareas is the same list, written in Spanish.

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
    return !this.done
  }

  /** a form of its own, bound to the task:  ticking the box changes its "done" */
  @drawn draw() {
    return (
      <ui-form value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-checkbox name="done" aria-label="Done" />
          <ui-text>{this.title}</ui-text>
        </ui-stack>
      </ui-form>
    )
  }

  get checklist() {
    return Checklist.ownerOf(this)!
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
}
core.useElement(Task, TaskElement)

core.heading("The checklist:  the tasks, shown as its filter says")
export type Showing = (typeof Checklist.Showings)[number]

/** The checklist:  the tasks, shown as its filter says */
export class Checklist extends ViewableList<Task> {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  /** what it shows:  every task, the ones still to do, or the ones done */
  // - its "showing" is one of all, active or done
  static Showings = ["all", "active", "done"] as const
  @prop({ oneOf: () => Checklist.Showings })
  accessor showing!: Showing

  // each task in turn, unless the filter hides it:  "return nothing" draws nothing
  drawEachItem(item: Task) {
    if (this.showing === "active" && item.isDone) return undefined
    if (this.showing === "done" && item.isActive) return undefined
    return core.drawThing(item)
  }

  static exclusive = true
}

/**
 * `<test-project-checklist>`:  a checklist, drawn in its own element, e.g. by `draw the checklist`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its checklist's properties;  its methods call its checklist's.
 * - What every view's element does, e.g. drawing its checklist, is `SpellElement`'s.
 */
export class ChecklistElement extends SpellElement<Checklist> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-checklist", "checklist", [
    { name: "showing", kind: "string", description: "Its showing." }
  ])

  drawEachItem(item: Task) {
    return this.currentThing?.drawEachItem(item)
  }
}
core.useElement(Checklist, ChecklistElement)


core.heading("The app")
/** The app */
export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tasks" is a new checklist
  @prop({ init: () => new Checklist(), early: true })
  accessor tasks!: Checklist

  /** how many are left:  the tasks picked out with "where", counted */
  @derived get activeCount() {
    return this.tasks.filter((task) => task.isActive).length
  }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-menu appearance="secondary">
          <ui-item kind="header">{`${this.activeCount} to do`}</ui-item>
          <ui-item selected={this.tasks.showing === "all"} onClick={core.pressed(this, () => (this.tasks.showing = "all"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            All
          </ui-item>
          <ui-item selected={this.tasks.showing === "active"} onClick={core.pressed(this, () => (this.tasks.showing = "active"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            To do
          </ui-item>
          <ui-item selected={this.tasks.showing === "done"} onClick={core.pressed(this, () => (this.tasks.showing = "done"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Done
          </ui-item>
        </ui-menu>
        {core.drawThing(this.tasks)}
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
    { name: "tasks", kind: "json", description: "Its tasks." }
  ])
}
core.useElement(TaskList, TaskListElement)
export const taskList = new TaskList()

core.heading("Start:  three tasks, one of them done")
//## Start:  three tasks, one of them done
taskList.tasks.showing = "all"
taskList.tasks.append(new Task({ title: "Read this guide", done: true }))
taskList.tasks.append(new Task({ title: "Tick a box on the right" }))
taskList.tasks.append(new Task({ title: "Try the To do filter" }))

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
// - Tick "Tick a box on the right":  the count in the menu drops to 1.
// - Click "To do", then "Done":  the list shows only the tasks that fit.
// - Add a task:  copy one of the "add" lines under Start, and change its title.
// - Count the done ones too:  add a line under "its active count" that says
//       - its "done count" is the length of (tasks in its tasks where it is done)
//   and show it in the menu, the way the active count is.
//
// Where next:  Task List, in the Examples, where you type new tasks in, drag them into order,
// and select a few to change them all at once.

core.heading("Where the example keeps its tasks")
///////////////////////////////////////
// ## Where the example keeps its tasks
///////////////////////////////////////
// This guide's tasks live in memory:  reload, and they start again.
// Task List keeps them, in one of four places the person picks from "Keep them in", above the list:
// - This browser, where it starts:  "browser storage is a database on this device"
// - A JSON file on the server, one file a task:  "task files is a data folder at "tasks""
// - A CSV file on the server, one row a task:  "task sheet is a sheet at "tasks.csv"", the project's own file
// - Your atmosphere account, Bluesky's AT Protocol, as Statusphere does:  "task sky is a personal atmosphere account"
//
// Each place is an API file of its own, and each holds a KEEPER with the same three things:
//       - its "kept tasks" is every browser task
//       - to keep a new task titled (title as text):
//           set task to a new browser task with title = title
//           add task to the browser tasks
//           return task
// and its kind of task says how one is thrown away:
//       a "browser task" is a task:
//           - it lives in browser storage
//           - to throw it away:
//               remove it from the browser tasks
//
// The app never names a place.  It asks its keeper:
//       for task in the kept tasks of the keeper
//       set task to keep a new task titled title of the keeper
//       throw the task away
// Picking another place in "Keep them in" changes its "storage";  "when its storage changes", the app takes that place's
// keeper, and fills the list from it.  A task kept anywhere saves itself as it changes:  there's no save step.
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
