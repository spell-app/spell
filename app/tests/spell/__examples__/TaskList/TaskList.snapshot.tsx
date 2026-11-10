import { core, Thing, List, App, View, ViewableList, Place, prop, derived, thing, drawn, withSpellPositions, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("A task")
////////////
// ## A task
////////////
// Something to do:  its title, its priority, and whether it's done.
// Each task is its own element on the page, `<task-list-task>`.
// A click selects it, shift and command (ctrl) more, for the property editor (`selectable`);
// a drag moves it, the selected ones with it (`draggable`).

export type Priority = (typeof Task.Priorities)[number]

export class Task extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** What to do */
  // - its "title" is text
  @prop({ type: "text" })
  accessor title!: string

  /** Anything else about it */
  // - its "notes" is text
  @prop({ type: "text" })
  accessor notes!: string

  // - its "priority" is one of low, normal or high
  static Priorities = ["low", "normal", "high"] as const
  @prop({ oneOf: () => Task.Priorities })
  accessor priority!: Priority

  // - its "done" is yes or no
  @prop({ type: "choice" })
  accessor done!: boolean

  /** Where it sits in its checklist, from 1:  kept with it, so the order people drag the tasks into comes back */
  // - its "order" is number
  @prop({ type: "number" })
  accessor order!: number

  get isDone() {
    return this.done
  }

  get isActive() {
    return !this.isDone
  }

  /** Gone from where it's kept:  a task kept nowhere has nothing to do;  each kind of kept task says how, in its keeper's file */
  throwAway() {
    return
  }

  /** A form of its own, bound to it:  checking the box, or typing a title, changes the task;  its priority shows only when it isn't normal */
  @drawn draw() {
    return (
      <ui-form value={this}>
        <ui-stack direction="horizontal" spacing="sm">
          <ui-icon name="grip vertical" color="grey" aria-label="Drag" />
          <ui-checkbox name="done" aria-label="Done" />
          <ui-input part="title" name="title" aria-label="Task" appearance="transparent" fluid={true} />
          <ui-label size="tiny" color={this.priority === "high" ? "red" : "grey"} hidden={this.priority !== "normal" ? undefined : true}>
            {this.priority}
          </ui-label>
        </ui-stack>
      </ui-form>
    )
  }

  static draggable = true

  static selectable = true

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
    { name: "notes", kind: "string", description: "Its notes." },
    { name: "priority", kind: "string", description: "Its priority." },
    { name: "done", kind: "boolean", description: "Its done." },
    { name: "order", kind: "number", description: "Its order." }
  ])

  throwAway() {
    return this.currentThing?.throwAway()
  }
}
core.useElement(Task, TaskElement)

export function testCheckingOneOff() {
  return core.test("test checking one off", function testCheckingOneOff() {
    const it = new Task()
    core.echoTestAction(`set the task to a new task with title = "Write the tests"`)
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
// The app asks a KEEPER for its tasks, and never says where they are:
// each kind of keeper is in a file of its own, and says it in its own way.
//   TaskList.browser.api.spell:  in this browser, the one it starts with
//   TaskList.server.api.spell:  in a JSON file on the server
//   TaskList.csv.api.spell:  in a CSV file on the server
//   TaskList.atmosphere.api.spell:  in your own atmosphere account, Bluesky's AT Protocol
// Every keeper does the same three things:
// - its kept tasks:  the tasks it has, read when the app picks it
// - keep a new task titled ...:  a new task, kept from now on
// - throw away a task:  a task's own action, which its kind of task says
// A task kept anywhere saves itself as it changes:  ticking it, or typing its title, is kept, with no save step.
// Its place in the list is kept the same way, as its order:  so the tasks come back in the order people dragged them into.

export class TaskKeeper extends Thing {
  /** the tasks it has, in any order:  the app puts them in their own order */
  // - its "kept tasks" is a list of tasks
  @prop({ itemType: "Task", init: () => new List<Task>({ instanceType: "Task" }) })
  accessor keptTasks!: List<Task>

  /** a new task, kept from now on, which it hands back */
  keepANewTaskTitledTitle(title: string) {
    return new Task({ title: title })
  }
}
// -----------
core.heading("Kept in this browser")
//////////////////////////
// ## Kept in this browser
//////////////////////////

export class BrowserTask extends Task {
  static elementTag = core.defineElement(this, "test-project")

  throwAway() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "browser_storage",
    collection: "browser_tasks",
    times: ["created", "modified"]
  }

  // - it lives in browser storage
  @prop({ type: "date", declaredAt: { path: "/TaskList.browser.api.spell", start: 298, end: 325 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in browser storage
  @prop({ type: "date", declaredAt: { path: "/TaskList.browser.api.spell", start: 298, end: 325 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * `<test-project-browser-task>`:  a browser task, drawn in its own element, e.g. by `draw the browser task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its browser task's properties;  its methods call its browser task's.
 * - What every view's element does, e.g. drawing its browser task, is `SpellElement`'s.
 */
export class BrowserTaskElement extends SpellElement<BrowserTask> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-browser-task", "browser task", [
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  throwAway() {
    return this.currentThing?.throwAway()
  }
}
core.useElement(BrowserTask, BrowserTaskElement)

export class BrowserKeeper extends TaskKeeper {
  static { this.declareProp("keptTasks", { declaredAt: { path: "/TaskList.browser.api.spell", start: 478, end: 519 }, readsFrom: ["browser_storage"] }) }
  get keptTasks() { return core.waitedValue(this, "keptTasks", async () => {
    return await core.savedThings(BrowserTask)
  }) }

  keepANewTaskTitledTitle(title: string) {
    const task = new BrowserTask({ title: title })
    core.saveThing(task)
    return task
  }
}

/**
 * The tasks stay on this device, in this browser's own storage:  nobody else sees them, and no server is asked.
 * The app starts here, so it runs with no server and no sign-in.
 */
export class BrowserStorage extends Place {}
export const browserStorage = core.place(new BrowserStorage(), { name: "browser_storage", kind: "database on this device" })

// -----------
core.heading("Kept in a JSON file on the server")
///////////////////////////////////////
// ## Kept in a JSON file on the server
///////////////////////////////////////

export class ServerTask extends Task {
  static elementTag = core.defineElement(this, "test-project")

  throwAway() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "task_files",
    collection: "server_tasks",
    times: ["created", "modified"]
  }

  // - it lives in task files
  @prop({ type: "date", declaredAt: { path: "/TaskList.server.api.spell", start: 466, end: 488 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in task files
  @prop({ type: "date", declaredAt: { path: "/TaskList.server.api.spell", start: 466, end: 488 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * `<test-project-server-task>`:  a server task, drawn in its own element, e.g. by `draw the server task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its server task's properties;  its methods call its server task's.
 * - What every view's element does, e.g. drawing its server task, is `SpellElement`'s.
 */
export class ServerTaskElement extends SpellElement<ServerTask> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-server-task", "server task", [
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  throwAway() {
    return this.currentThing?.throwAway()
  }
}
core.useElement(ServerTask, ServerTaskElement)

export class ServerKeeper extends TaskKeeper {
  static { this.declareProp("keptTasks", { declaredAt: { path: "/TaskList.server.api.spell", start: 639, end: 679 }, readsFrom: ["task_files"] }) }
  get keptTasks() { return core.waitedValue(this, "keptTasks", async () => {
    return await core.savedThings(ServerTask)
  }) }

  keepANewTaskTitledTitle(title: string) {
    const task = new ServerTask({ title: title })
    core.saveThing(task)
    return task
  }
}

/**
 * The tasks are a project data folder on Spell's server:  each task a JSON file, in this project's `__data/tasks`.
 * Everyone who runs the app shares them, and each person changes only the tasks they made.
 * Open one in an editor and change it:  the app shows it at its next check.
 */
export class TaskFile extends Place {}
export const taskFiles = core.place(new TaskFile(), {
  name: "task_files",
  kind: "data folder",
  at: "/api/places/spaces/@spell/examples/TaskList/__data/tasks",
  checkedEvery: 30
})

// -----------
core.heading("Kept in a CSV file on the server")
//////////////////////////////////////
// ## Kept in a CSV file on the server
//////////////////////////////////////

export class SheetTask extends Task {
  static elementTag = core.defineElement(this, "test-project")

  throwAway() {
    core.removeSaved(this)
  }

  static savedIn = {
    place: "task_sheet",
    collection: "sheet_tasks",
    times: ["created", "modified"]
  }

  // - it lives in task sheet
  @prop({ type: "date", declaredAt: { path: "/TaskList.csv.api.spell", start: 615, end: 637 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in task sheet
  @prop({ type: "date", declaredAt: { path: "/TaskList.csv.api.spell", start: 615, end: 637 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * `<test-project-sheet-task>`:  a sheet task, drawn in its own element, e.g. by `draw the sheet task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its sheet task's properties;  its methods call its sheet task's.
 * - What every view's element does, e.g. drawing its sheet task, is `SpellElement`'s.
 */
export class SheetTaskElement extends SpellElement<SheetTask> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-sheet-task", "sheet task", [
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  throwAway() {
    return this.currentThing?.throwAway()
  }
}
core.useElement(SheetTask, SheetTaskElement)

export class SheetKeeper extends TaskKeeper {
  static { this.declareProp("keptTasks", { declaredAt: { path: "/TaskList.csv.api.spell", start: 786, end: 825 }, readsFrom: ["task_sheet"] }) }
  get keptTasks() { return core.waitedValue(this, "keptTasks", async () => {
    return await core.savedThings(SheetTask)
  }) }

  keepANewTaskTitledTitle(title: string) {
    const task = new SheetTask({ title: title })
    core.saveThing(task)
    return task
  }
}

/**
 * The tasks are one CSV file on Spell's server, this project's `__data/tasks.csv`:  a row each, under the columns its first line names.
 * Everyone who runs the app shares it, and anyone changes any row:  a CSV file has no column saying whose a row is.
 * Each change rewrites only its own line, so the file reads well in a diff;  open it in a sheet or an editor and change it,
 * and the app shows it at its next check.
 */
export class TaskSheet extends Place {}
export const taskSheet = core.place(new TaskSheet(), {
  name: "task_sheet",
  kind: "sheet",
  at: "/api/places/spaces/@spell/examples/TaskList/__data/tasks.csv",
  idColumn: "id",
  checkedEvery: 30
})

// -----------
core.heading("Kept in your atmosphere account")
/////////////////////////////////////
// ## Kept in your atmosphere account
/////////////////////////////////////

export class SkyTask extends Task {
  static elementTag = core.defineElement(this, "test-project")

  throwAway() {
    core.removeSaved(this)
  }

  /** whose it is:  the account it's in, which a record can't claim */
  // a sky task has an owner as text
  @prop({ type: "text", declaredAt: { path: "/TaskList.atmosphere.api.spell", start: 642, end: 673 } })
  accessor owner!: string

  static savedIn = {
    place: "task_sky",
    collection: "sky_tasks",
    times: ["created", "modified"]
  }

  // - it lives in task sky
  @prop({ type: "date", declaredAt: { path: "/TaskList.atmosphere.api.spell", start: 454, end: 474 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in task sky
  @prop({ type: "date", declaredAt: { path: "/TaskList.atmosphere.api.spell", start: 454, end: 474 } })
  accessor modified!: any /* spell: type unknown */
}

/**
 * `<test-project-sky-task>`:  a sky task, drawn in its own element, e.g. by `draw the sky task`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its sky task's properties;  its methods call its sky task's.
 * - What every view's element does, e.g. drawing its sky task, is `SpellElement`'s.
 */
export class SkyTaskElement extends SpellElement<SkyTask> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-sky-task", "sky task", [
    { name: "owner", kind: "string", description: "Its owner." },
    { name: "created", kind: "json", description: "Its created." },
    { name: "modified", kind: "json", description: "Its modified." }
  ])

  throwAway() {
    return this.currentThing?.throwAway()
  }
}
core.useElement(SkyTask, SkyTaskElement)

export class SkyKeeper extends TaskKeeper {
  /** only your own:  everyone's tasks are in their own accounts */
  static { this.declareProp("keptTasks", { declaredAt: { path: "/TaskList.atmosphere.api.spell", start: 735, end: 873 }, readsFrom: ["task_sky"] }) }
  get keptTasks() { return core.waitedValue(this, "keptTasks", async () => {
    return await core.savedThings(SkyTask, { filter: { owner: core.currentPerson().id } })
  }) }

  keepANewTaskTitledTitle(title: string) {
    const task = new SkyTask({ title: title })
    core.saveThing(task)
    return task
  }
}

/**
 * The tasks are records in your own atmosphere account, Bluesky's AT Protocol, as Statusphere's statuses are:
 * sign in, and they go with you to any app that reads them.
 * Records there are public:  anyone can read them, so keep nothing private in a task.
 */
export class TaskSky extends Place {}
export const taskSky = core.place(new TaskSky(), {
  name: "task_sky",
  kind: "personal atmosphere account",
  collections: { skyTasks: { at: "spaces.spell.examples.tasklist.task" } }
})

// -----------
core.heading("Task List")
///////////////
// ## Task List
///////////////
// A to-do list:  add a task, check it off, filter the list, and edit the selected tasks together.
// Its tasks are this project's own `<spell-view "task">`;  this file holds their list, and the app.
// Where they're kept is the person's pick, "Keep them in":  each place is a keeper in an API file of its own,
// TaskList.browser.api.spell, TaskList.server.api.spell, TaskList.csv.api.spell and TaskList.atmosphere.api.spell, all doing what TaskList.api.spell says.

core.heading("The checklist")
///////////////////
// ## The checklist
///////////////////
// The tasks, each its own element inside it:  `<task-list-checklist>`, around its `<task-list-task>`s.

export type Showing = (typeof Checklist.Showings)[number]

export class Checklist extends ViewableList<Task> {
  static instanceType = Task
  static elementTag = core.defineElement(this, "test-project")

  /** What it shows:  every task, the ones still to do, or the ones done */
  // - its "showing" is one of all, active or done
  //   - it "is showing (showing)"
  static Showings = ["all", "active", "done"] as const
  @prop({ oneOf: () => Checklist.Showings })
  accessor showing!: Showing
  isShowingShowing(showing: Showing) {
    return this.showing === showing
  }

  /** a drop has moved its tasks:  each keeps its new place */
  whenTaskDroppedOn(task: Task) {
    this.keepTheOrder()
  }

  // each task, unless the filter hides it
  drawEachItem(item: Task) {
    if (this.isShowingShowing("active") && item.isDone) return undefined
    if (this.isShowingShowing("done") && item.isActive) return undefined
    return core.drawThing(item)
  }

  /** Its tasks one under the other;  while it's empty, a line saying so */
  @drawn draw() {
    return (
      <ui-stack spacing="xs">
        <ui-text color="grey" hidden={this.isEmpty ? undefined : true}>Nothing to do</ui-text>
        <slot />
      </ui-stack>
    )
  }

  /** Each task keeps its place in the list, from 1, where it's kept:  so the order people drag them into comes back next time */
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
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-checklist", "checklist", [
    { name: "showing", kind: "string", description: "Its showing." }
  ])

  isShowingShowing(showing: Showing) {
    return this.currentThing?.isShowingShowing(showing)
  }

  whenTaskDroppedOn(task: Task) {
    return this.currentThing?.whenTaskDroppedOn(task)
  }

  drawEachItem(item: Task) {
    return this.currentThing?.drawEachItem(item)
  }

  keepTheOrder() {
    return this.currentThing?.keepTheOrder()
  }
}
core.useElement(Checklist, ChecklistElement)

// on the page, its tasks can be dragged to another place:  they move as the pointer does, gliding there

export function testTheFilter() {
  return core.test("test the filter", function testTheFilter() {
    const it = new Checklist()
    core.echoTestAction(`set the tasks to a new checklist`)
    const tasks = new Checklist()
    core.echoTestAction(`add (a new task with title = "a", done = yes) to the tasks`)
    tasks.append(new Task({ title: "a", done: true }))
    core.echoTestAction(`add (a new task with title = "b") to the tasks`)
    tasks.append(new Task({ title: "b" }))
    core.expect(tasks.filter((task) => task.isActive).length, `the length of (tasks in the tasks where it is active)`, 1, `1`)
  })
}

export function testADraggedOrderIsKept() {
  return core.test("test a dragged order is kept", function testADraggedOrderIsKept() {
    const it = new Checklist()
    core.echoTestAction(`set the tasks to a new checklist`)
    const tasks = new Checklist()
    core.echoTestAction(`set the first to a new task with title = "first"`)
    const first = new Task({ title: "first" })
    core.echoTestAction(`set the second to a new task with title = "second"`)
    const second = new Task({ title: "second" })
    core.echoTestAction(`add the second to the tasks`)
    tasks.append(second)
    core.echoTestAction(`add the first to the tasks`)
    tasks.append(first)
    core.echoTestAction(`keep the order of the tasks`)
    tasks.keepTheOrder()
    core.expect(second.order, `the order of the second`, 1, `1`)
    core.expect(first.order, `the order of the first`, 2, `2`)
    core.expect(core.getItemAt(core.sortedBy(tasks, (item: Task) => item.order), 0)?.title!, `the title of the first task in (the tasks sorted by its order)`, "second", `"second"`)
  })
}

/** a task is in one checklist at a time */

core.heading("The app")
/////////////
// ## The app
/////////////
// Its toolbar, the new task's field, then the list beside the property editor.

export type Storage = (typeof TaskList.Storages)[number]

@thing
export class TaskList extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "checklist" is a new checklist
  @prop({ init: () => new Checklist(), early: true })
  accessor checklist!: Checklist

  /** The next task's title, as the new task's field holds it */
  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

  @derived get activeCount() {
    return this.checklist.filter((task) => task.isActive).length
  }

  /** Where the tasks are kept:  this browser, a JSON file on the server, a CSV file on the server, or your atmosphere account */
  // - its "storage" is one of browser, server, csv or atmosphere
  static Storages = ["browser", "server", "csv", "atmosphere"] as const
  @prop({ oneOf: () => TaskList.Storages })
  accessor storage!: Storage

  /** Who keeps them, for where they're kept:  one of the keepers in the API files */
  // - its "keeper" is a task keeper
  @prop({ type: "TaskKeeper" })
  accessor keeper!: TaskKeeper

  async onStorageChange(event: StorageChangeEvent) {
    if (this.storage === "server") this.keeper = new ServerKeeper()
    else if (this.storage === "csv") this.keeper = new SheetKeeper()
    else if (this.storage === "atmosphere") this.keeper = new SkyKeeper()
    else this.keeper = new BrowserKeeper()
    await this.fillTheChecklist()
  }

  /** The keeper's tasks, in the list;  a keeper with none starts with a few */
  async fillTheChecklist() {
    core.clear(this.checklist)
    core.map(core.sortedBy((await core.answerOf(this.keeper, "keptTasks"))!, (item: Task) => item.order), (task: Task) => this.checklist.append(task))
    if (!this.checklist.isEmpty) return
    this.addTheStartingTaskTitleWithPriorityLevel("Write the Task List example", "high")
    this.addTheStartingTaskTitleWithPriorityLevel("Teach it to draw", "normal")
    this.addTheStartingTaskTitleWithPriorityLevel("Select some tasks, then edit them together", "normal")
    this.addTheStartingTaskTitleWithPriorityLevel("Drag tasks to reorder them", "low")
    this.checklist.firstItem!.done = true
  }

  /** A new task list keeps its tasks in this browser, and shows every one */
  create() {
    this.checklist.showing = "all"
    this.storage = "browser"
    this.keeper = new BrowserKeeper()
    this.fillTheChecklist()
  }

  addTheStartingTaskTitleWithPriorityLevel(title: string, level: string) {
    const task = this.keeper?.keepANewTaskTitledTitle(title)
    task!.priority = level
    this.checklist.append(task!)
    task!.order = this.checklist.length
  }

  /** The draft, as a new task at the end of the list;  the field empties */
  addTheDraft() {
    if (this.draft === "") return
    const title = this.draft
    const task = this.keeper?.keepANewTaskTitledTitle(title)
    task!.priority = "normal"
    this.checklist.append(task!)
    task!.order = this.checklist.length
    this.draft = ""
  }

  /** The property editor edits every selected task at once:  a property they disagree on shows Mixed */
  @drawn draw() {
    return (
      <ui-container>
        <ui-stack>
          <ui-toolbar menu="tasks menu" aria-label="Tasks">
            <ui-text slot="title" size="large">Task List</ui-text>
            <ui-text slot="right">
              <span hidden={this.activeCount === 0 ? undefined : "until-found"}>All done</span>
              <span hidden={!(this.activeCount === 0) ? undefined : "until-found"}>{this.activeCount} to do</span>
            </ui-text>
          </ui-toolbar>
          <ui-form value={this}>
            <ui-stack>
              <ui-field label="Keep them in" inline={true}>
                <ui-select name="storage">
                  <ui-item value="browser" icon="desktop">This browser</ui-item>
                  <ui-item value="server" icon="server">A JSON file on the server</ui-item>
                  <ui-item value="csv" icon="table">A CSV file on the server</ui-item>
                  <ui-item value="atmosphere" icon="cloud">Your atmosphere account</ui-item>
                </ui-select>
              </ui-field>
              <ui-input name="draft" placeholder="Something to do" aria-label="New task" fluid={true} action={true}>
                <ui-button slot="action" color="primary" disabled={this.draft === ""} onClick={core.pressed(this, () => this.addTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                  Add
                </ui-button>
              </ui-input>
            </ui-stack>
          </ui-form>
          <ui-grid columns="2" stackable={true} context-menu="list menu">
            {core.drawThing(this.checklist)}
            <ui-property-editor label="Selected tasks" schema="task-list-task" prop:value={this.checklist.selection}>
              <ui-property name="title" />
              <ui-property name="priority" />
              <ui-property name="done" />
              <ui-property name="notes" />
            </ui-property-editor>
          </ui-grid>
        </ui-stack>
      </ui-container>
    )
  }

  showAll() {
    this.checklist.showing = "all"
  }

  get showAllIsSelected() {
    return this.checklist.isShowingShowing("all")
  }

  showToDo() {
    this.checklist.showing = "active"
  }

  get showToDoIsSelected() {
    return this.checklist.isShowingShowing("active")
  }

  showDone() {
    this.checklist.showing = "done"
  }

  get showDoneIsSelected() {
    return this.checklist.isShowingShowing("done")
  }

  removeTheDoneTasks() {
    this.checklist.filter((task) => task.isDone).forEach((task) => {
      task.throwAway()
      this.checklist.remove(task)
    })
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
    { name: "draft", kind: "string", description: "Its draft." },
    { name: "storage", kind: "string", description: "Its storage." },
    { name: "keeper", kind: "string", description: "Its keeper." }
  ])

  onStorageChange(event: StorageChangeEvent) {
    return this.currentThing?.onStorageChange(event)
  }

  fillTheChecklist() {
    return this.currentThing?.fillTheChecklist()
  }

  create() {
    return this.currentThing?.create()
  }

  addTheStartingTaskTitleWithPriorityLevel(title: string, level: string) {
    return this.currentThing?.addTheStartingTaskTitleWithPriorityLevel(title, level)
  }

  addTheDraft() {
    return this.currentThing?.addTheDraft()
  }

  showAll() {
    return this.currentThing?.showAll()
  }

  showToDo() {
    return this.currentThing?.showToDo()
  }

  showDone() {
    return this.currentThing?.showDone()
  }

  removeTheDoneTasks() {
    return this.currentThing?.removeTheDoneTasks()
  }
}
core.useElement(TaskList, TaskListElement)
export const taskList = new TaskList()

// Where the tasks are kept:  the person picks, and the app asks that keeper

// Which tasks the list shows:  the toolbar ticks the one it's showing
core.describeAction(TaskList, "showAll", { title: "All", icon: "list", selectedWhen: "showAllIsSelected" })
core.describeAction(TaskList, "showToDo", { title: "To do", icon: "square outline", selectedWhen: "showToDoIsSelected" })
core.describeAction(TaskList, "showDone", { title: "Done", icon: "check square outline", selectedWhen: "showDoneIsSelected" })
core.describeAction(TaskList, "removeTheDoneTasks", { title: "Remove the done tasks", icon: "trash alternate outline" })

// The toolbar's buttons, and the list's right click:  the same actions
// - its "tasks menu" is a menu of "show all" , "show to do" , "show done" , "-" and "remove the done tasks"
core.describeMenu(TaskList, "tasksMenu", { items: ["showAll", "showToDo", "showDone", "-", "removeTheDoneTasks"] })

// - its "show menu" is a menu of "show all" , "show to do" and "show done" titled "Show"
core.describeMenu(TaskList, "showMenu", { items: ["showAll", "showToDo", "showDone"], title: "Show" })

// A right click on the list:  which tasks it shows, as a menu of its own, then tidying up
// - its "list menu" is a menu of "show menu" , "-" and "remove the done tasks"
core.describeMenu(TaskList, "listMenu", { items: ["showMenu", "-", "removeTheDoneTasks"] })
// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - Each task is an element of its own inside the list, <task-list-checklist>:¬     <task-list-browser-task>, <task-list-server-task> or <task-list-sky-task>, for where it's kept.¬   - Its title's field fills the row by itself:  it's \`fluid\`, in a row of a \`<stack>\`. */¬¬/* done:  it fades */¬task-list-checklist > [done] {¬  opacity: 0.6;¬}¬`)
// -----------
if (!core.isCarryingOver) taskList.start()
// -----------
if (!core.isCarryingOver) testCheckingOneOff()
if (!core.isCarryingOver) testTheFilter()
if (!core.isCarryingOver) testADraggedOrderIsKept()

// what each event this program hears holds
export type StorageChangeEvent = SentEvent & { value: Storage; was: Storage }

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TaskElement` */
      "test-project-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `BrowserTaskElement` */
      "test-project-browser-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ServerTaskElement` */
      "test-project-server-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SheetTaskElement` */
      "test-project-sheet-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SkyTaskElement` */
      "test-project-sky-task": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `ChecklistElement` */
      "test-project-checklist": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `TaskListElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
