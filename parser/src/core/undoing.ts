/**
 * Undo and redo in a running program (epic `prefs-and-undo` P6):  what an undoable action changed, put back.
 *
 * ```ts
 * class Card extends Thing {
 *   static { this.declareProp("faceUp", { type: "choice" }) }
 *   turnOver() { this.faceUp = !this.faceUp }
 *   static { this.declareAction("turnOver", { undoneAs: "Turn Card" }) }
 * }
 * card.turnOver()     // one step, "Turn Card"
 * game.undoTitle      // "Undo Turn Card"
 * game.undo()         // the card faces as it did;  ⌘Z does the same
 * ```
 *
 * - ONE history per run, `core.RUNTIME.history`:  a new run starts with none.
 *   - Loading saved state clears it (`core.fromJSON()`, `Loader.load()`):  the person's document changed (Q3).
 * - Only what an undoable action changes is recorded (Q2):  one declared with `Thing.declareAction()`.
 *   - everything it sets, and everything it adds to or takes from a list, is ONE step
 *   - however long it waits, and whatever it calls:  another action it calls joins its step
 *   - undo and redo put the changes back at once:  nothing runs again, nothing's waited on
 * - It keeps the least it needs:
 *   - for each thing and property:  its value before the step's first change, and after its last
 *   - for each list:  its items before the step and after it -- the same things, not copies
 * - Left out (Q10):
 *   - a prop declared `undoable: false`, e.g. a selection
 *   - what an action declared `cantBeUndone` changes, a saved thing it adds or removes too
 *     - but a step of its own inside it is still one (`separateStep()`):  a draft's save, `Edit`
 *     - with `"clears history"`, it also forgets every step once it's done, e.g. a new game
 *   - what a creation hook changes while no action runs (`runCreate()`):  the program's opening
 * - Every change is noted in one place, which this history hears from:
 *   - each property write, in `noteSetting()` (`core.ts`):
 *     a `while` handler's put-back hears of those too (`recordingSettings()`)
 *   - each list change, in `noteItems()`
 * - The Edit menu's titles are in the program's language:  the core's messages `undo`, `undo-step` ...
 * - Built on the kit's generic `UndoStack`.
 * - Imports only `spell/util` and the core's own `core.ts`:  `Thing.ts` and `List.ts` import it, under the model too.
 * - Compiled spell declares one through `core.describeAction()`:  `undoable as "Turn Card"` (`described.ts`).
 *   - A top-level action, which has no class, runs its body through `core.asAction()` (`acting.ts`, epic `language` J149).
 * - Python's core has the same history, `undoing.py`:  both play `undoing.expected.json5` (epic `language` P54).
 */
import { CanceledError, schemaOf, UndoStack, type UndoRecord } from "spell/util"

import { core, recordingChanges } from "./core"

/** What an action that can't be undone does to the history:  `ActionInfo.cantBeUndone`. */
export const CantBeUndoneModes = ["keeps history", "clears history"] as const
/** One of `CantBeUndoneModes`. */
export type CantBeUndone = (typeof CantBeUndoneModes)[number]

/** How an action meets undo:  `Thing.declareAction()`'s options.  It says one of the two. */
export type ActionInfo = {
  /** It's ONE undo step, under this title for the Edit menu:  `"Turn Card"` shows as `Undo Turn Card`. */
  undoneAs?: string
  /**
   * It can't be undone:  what it changes is left out of every step, and this is what it does to the history.
   * - `"keeps history"`:  the steps before it can still be undone, e.g. showing a hint
   * - `"clears history"`:  every step is forgotten once it's done, e.g. a new game
   */
  cantBeUndone?: CantBeUndone
  /**
   * It may `cancel` (epic `language` P56):  called off, every change it made is put back, it leaves no undo step,
   * its after hooks don't run, and it answers no;  done, it answers yes, unless it gives back something else.
   * - See `runActing()`.
   */
  cancels?: boolean
}

/**
 * What `cancel` throws, in an action (epic `language` P56):  the action stops, and is called off -- see `runActing()`.
 * - A `CanceledError`, so if one ever escapes an action nothing reports it.
 */
export class ActionCanceled extends CanceledError {}

/**
 * What the Edit menu shows of an undo history:  what `App`'s `canUndo`, `undoTitle` ... read.
 * - A running program's own `UndoHistory`;  or, on a page drawing a program that runs elsewhere (Python's),
 *   what that program last said of its own (`core.remote.history`, `page.ts`).
 */
export type ShownHistory = {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly undoTitle: string
  readonly redoTitle: string
}

/** The most steps a run keeps:  the oldest go past it. */
const STEPS_KEPT = 100

/****************
 * ### `UndoHistory`
 * A running program's undo history:  `core.RUNTIME.history`.
 * - An `UndoStack` that records what the program's things and lists change, while an undoable action runs.
 * - `run()` runs an action as `declareAction()` declared it.
 * - `App` shows it to people:  `undo()`, `redo()`, `undoTitle` ...;  ⌘Z and ⇧⌘Z call it (`listenForUndoKeys()`).
 ****************/
export class UndoHistory extends UndoStack {
  constructor() {
    super({
      limit: STEPS_KEPT,
      titleFor: (action, step) => (step ? core.message(`${action}-step`, { step }) : core.message(action))
    })
  }

  /**
   * Is a change made now recorded:  an undoable action running, nothing being undone, no `cantBeUndone` one?
   * - A step of its own (`separateStep()`) records, whatever runs around it.
   */
  get isRecording(): boolean {
    return this.isInTransaction && !this.isApplying && !this.isLeavingOut
  }

  /** Is what changes now left out:  a `cantBeUndone` action running, with no step of its own open inside it? */
  private get isLeavingOut(): boolean {
    return this.cantBeUndoneRunning > 0 && !this.separateStepOpen
  }

  /** Is an action declared with `declareAction()` running, of either kind? */
  get isActing(): boolean {
    return this.isInTransaction || this.cantBeUndoneRunning > 0
  }

  /** Run `callback` once no declared action is running:  at once, if none is. */
  afterAction(callback: () => void): void {
    if (!this.isActing) return callback()
    if (this.isInTransaction) return this.afterTransaction(() => this.afterAction(callback))
    this.afterCantBeUndone.push(() => this.afterAction(callback))
  }

  /**
   * Run `act`, an action, as `info` declares it -- see `ActionInfo`.  Returns what `act` returns.
   * - `undoneAs`:  ONE step, open until `act` returns, or until its promise settles (`transaction()`).
   * - `cantBeUndone`:  nothing it changes is recorded until it's done.
   *   Then `"clears history"` forgets every step, even if it threw.
   * - Both kinds count work begun while they wait as theirs:  what isn't queued (`ActionQueue`), e.g. a drag's move
   *   while a deal waits, joins the deal.  A click isn't:  it waits its turn, a step of its own.
   */
  run<T>(info: ActionInfo, act: () => T): T {
    if (info.undoneAs !== undefined) return this.transaction(info.undoneAs, act)
    this.cantBeUndoneRunning++
    const done = () => {
      this.cantBeUndoneRunning--
      if (info.cantBeUndone === "clears history") this.clear()
      if (!this.cantBeUndoneRunning) this.afterCantBeUndone.splice(0).forEach((callback) => callback())
    }
    let result: T
    try {
      result = act()
    } catch (error) {
      done()
      throw error
    }
    if (isPromise(result)) return result.finally(done) as T
    done()
    return result
  }

  /**
   * A transaction, as `UndoStack.transaction()`;  a NEW step starts its own notes of what changed (`noteSetting()`).
   * - So each thing and property, and each list, is one record in its step, however often it changes.
   */
  override transaction<T>(title: string, run: () => T, target?: unknown): T {
    if (this.isInTransaction || this.isApplying) return super.transaction(title, run, target)
    const notes: StepNotes = { settings: new Map(), lists: new Map(), kept: new Map() }
    this.notes = notes
    const done = () => {
      if (this.notes === notes) this.notes = undefined
    }
    let result: T
    try {
      result = super.transaction(title, run, target)
    } catch (error) {
      done()
      throw error
    }
    if (isPromise(result)) return result.finally(done) as T
    done()
    return result
  }

  /**
   * `run` is ONE step of its own, `title`, even inside an action that can't be undone:  e.g. a draft's save, `Edit`.
   * - Such an action leaves out only what it changes itself:  Recipe Box's Save only says which screen shows,
   *   while the draft it saves is the person's change (epic `language` I88).
   * - Inside an undoable action:  joins that one's step, as `transaction()`.
   * - `run` MUST NOT wait:  a step that waited would take in what the action does meanwhile.
   */
  separateStep<T>(title: string, run: () => T): T {
    if (!this.cantBeUndoneRunning || this.isInTransaction || this.isApplying) return this.transaction(title, run)
    this.separateStepOpen = true
    try {
      return this.transaction(title, run)
    } finally {
      this.separateStepOpen = false
    }
  }

  /**
   * Record one change, as `UndoStack.record()` -- but not while an action that can't be undone runs:  left out then.
   * - e.g. a saved thing added on a program's opening (`core.saveThing()`), which records itself.
   */
  override record(record: UndoRecord, options: { title: string; target?: unknown }): void {
    if (!this.isLeavingOut) super.record(record, options)
  }

  /**
   * Undo the newest step, as `UndoStack.undo()` -- but not while an undoable action is still running:  false then.
   * - e.g. ⌘Z while a deal still waits between cards:  putting the step before it back mid-deal would tangle them.
   */
  override undo(): boolean {
    return !this.isInTransaction && super.undo()
  }

  /** Redo the step undone last, as `UndoStack.redo()` -- but not while an undoable action is still running. */
  override redo(): boolean {
    return !this.isInTransaction && super.redo()
  }

  /**
   * `target`'s prop `property` is being set from `was` to `value`:  recorded into the open step, unless it's left out.
   * - Its first change in the step keeps `was`;  each later one only moves its value now.
   * - `noteSetting()` (`core.ts`) calls it, for every property write.
   */
  noteSetting(target: object, property: string, was: unknown, value: unknown): void {
    const { notes } = this
    if (!notes || !this.isRecording) return
    if (schemaOf(target.constructor).info(property)?.undoable === false) return
    let byProperty = notes.settings.get(target)
    if (!byProperty) notes.settings.set(target, (byProperty = new Map()))
    let setting = byProperty.get(property)
    if (!setting) {
      byProperty.set(property, (setting = new SettingRecord(target, property, was)))
      // inside a transaction:  it joins the open step, whose title it has
      this.record(setting, { title: "" })
    }
    setting.value = value
  }

  /**
   * `list`'s items are changing from `before` to `after`:  recorded into the open step.
   * - Its first change in the step keeps `before`;  each later one only moves `after`.
   * - `noteItems()` (`core.ts`) calls it, from `List.writeItems()`:  every list change.
   */
  noteItems(list: object, before: readonly unknown[], after: readonly unknown[]): void {
    const { notes } = this
    if (!notes || !this.isRecording) return
    let change = notes.lists.get(list)
    if (!change) {
      notes.lists.set(list, (change = new ItemsRecord(list, before)))
      this.record(change, { title: "" })
    }
    change.after = after
  }

  /**
   * A value the core keeps for `target` itself (`key`) is changing from `was` to `value`, e.g. a card's last pile:
   * recorded into the open step, unless it's left out -- as `noteSetting()`, but put back through `put`.
   * - `noteKept()` (`core.ts`) calls it.
   */
  noteKept(target: object, key: string, was: unknown, value: unknown, put: (value: unknown) => void): void {
    const { notes } = this
    if (!notes || !this.isRecording) return
    let byKey = notes.kept.get(target)
    if (!byKey) notes.kept.set(target, (byKey = new Map()))
    let kept = byKey.get(key)
    if (!kept) {
      byKey.set(key, (kept = new KeptRecord(put, was)))
      this.record(kept, { title: "" })
    }
    kept.value = value
  }

  /**
   * Drop the open step's records whose changes were all put back, e.g. by an action that canceled (`runActing()`):
   * so a step that's left with none is no step, and Undo isn't lit for nothing.
   * - Its notes forget them too:  a later change in the step is a record of its own again.
   */
  dropUnchangedRecords(): void {
    const { notes } = this
    this.dropUnchanged((record) => {
      if (!isUnchanged(record)) return false
      if (record instanceof SettingRecord) notes?.settings.get(record.target)?.delete(record.property)
      else if (record instanceof ItemsRecord) notes?.lists.delete(record.list)
      else if (record instanceof KeptRecord) for (const byKey of notes?.kept.values() ?? []) forgetRecord(byKey, record)
      return true
    })
  }

  /** What the open step has changed so far:  `undefined` between steps. */
  private notes: StepNotes | undefined

  /** How many `cantBeUndone` actions are running now:  nothing records while one is. */
  private cantBeUndoneRunning = 0

  /** Is a step of its own open (`separateStep()`), inside an action that can't be undone? */
  private separateStepOpen = false

  /** What's waiting for the `cantBeUndone` actions to end:  `afterAction()`. */
  private afterCantBeUndone: (() => void)[] = []
}

////////////////
// ## Declaring actions
////////////////

/**
 * Make `Class`'s method `name` an action:  ONE undo step, or one that can't be undone -- see `ActionInfo`.
 * - What `Thing.declareAction()` and `List.declareAction()` do.
 *   - In a static block AFTER the method:  `static { this.declareAction("turnOver", { undoneAs: "Turn Card" }) }`.
 * - SIDE EFFECT:  replaces the method on `Class.prototype`
 *   with one that runs it through the history (`UndoHistory.run()`).
 *   - A subclass that overrides it declares it again;  its `super.turnOver()` joins its step.
 * - `info.cancels`:  it may `cancel`;  `after`:  the members of `Class` that run after it, its after hooks, in order --
 *   a live list, so a hook added later runs too (`core.addAfterHook()`).  See `runActing()`.
 * - No program running:  the method just runs.
 * - throws `TypeError` if `name` isn't a method of `Class`, or `info` says neither kind, or both
 */
export function declareAction(Class: Function, name: string, info: ActionInfo, after: readonly string[] = []): void {
  const method = (Class.prototype as Record<string, unknown>)[name]
  if (typeof method !== "function") {
    throw new TypeError(
      `${Class.name}.declareAction():  \`${name}\` isn't one of its methods;  declare it after the method, in a static block`
    )
  }
  const { undoneAs, cantBeUndone } = info
  if ((undoneAs === undefined) === (cantBeUndone === undefined)) {
    throw new TypeError(
      `${Class.name}.declareAction("${name}"):  say \`undoneAs\` (its step's title) or \`cantBeUndone\`, not ` +
        (undoneAs === undefined ? "neither" : "both")
    )
  }
  if (cantBeUndone !== undefined && !CantBeUndoneModes.includes(cantBeUndone)) {
    throw new TypeError(
      `${Class.name}.declareAction("${name}"):  \`cantBeUndone\` is one of ${CantBeUndoneModes.join(", ")};  ` +
        `not \`${cantBeUndone}\``
    )
  }
  // named for the method, so a stack trace still says `turnOver`
  const action = {
    [name](this: object, ...args: unknown[]): unknown {
      const hooks = after.map((member) => () => (this as Record<string, Function>)[member]!(...args))
      const act = () => runActing(() => method.apply(this, args), { cancels: info.cancels, after: hooks })
      const history = core.RUNTIME?.history
      return history ? history.run(info, act) : act()
    }
  }[name]!
  // and as many arguments as the method's:  what reads it (the editor's Code card) knows `put it on a pile` takes one
  // (epic `editor` I62)
  Object.defineProperty(action, "length", { value: method.length })
  Object.defineProperty(Class.prototype, name, { value: action, writable: true, configurable: true })
}

/**
 * Run `act`, an action's steps, then its after hooks (`after`), in order, as ONE action that may be called off
 * (epic `language` P56).  Returns what `act` gives back.
 * - `cancel` in its steps or a hook (`ActionCanceled`) calls it off:
 *   - every change it made so far is put back as it was:  props, lists, kept values (`recordingChanges()`)
 *   - so it leaves no undo step:  what it recorded is dropped from the open one (`dropUnchangedRecords()`)
 *   - its after hooks don't run, or stop where they are
 *   - it answers no:  `if put the card on the pile` reads false
 * - Done, an action that may cancel (`cancels`) answers yes, unless it gave back something else.
 * - Run inside its undo step (`UndoHistory.run()`):  what its hooks change is the same step.
 * - Waits:  a hook runs once the steps before it have ended;  the action ends when the last hook has.
 * - Neither to do:  `act` just runs, and costs nothing more.
 * - Any other failure goes on to the caller as it was, nothing put back.
 */
export function runActing(
  act: () => unknown,
  { cancels, after }: { cancels?: boolean; after: (() => unknown)[] }
): unknown {
  if (!cancels && !after.length) return act()
  const changes = recordingChanges()
  const done = (value: unknown) => {
    changes.close()
    return cancels && value === undefined ? true : value
  }
  const calledOff = (error: unknown) => {
    if (!(error instanceof ActionCanceled)) {
      changes.close()
      throw error
    }
    changes.putBack()
    core.RUNTIME?.history.dropUnchangedRecords()
    return false
  }
  try {
    const result = thenEach(act(), after)
    return isPromise(result) ? result.then(done, calledOff) : done(result)
  } catch (error) {
    return calledOff(error)
  }
}

/** `value`, once each of `next` has run in turn, each waited on if it waits:  a promise if any of it waits. */
function thenEach(value: unknown, next: readonly (() => unknown)[]): unknown {
  if (isPromise(value)) return value.then((settled) => thenEach(settled, next))
  for (let at = 0; at < next.length; at++) {
    const ran = next[at]!()
    if (isPromise(ran)) return ran.then(() => thenEach(value, next.slice(at + 1)))
  }
  return value
}

/**
 * Run `thing`'s creation hook, `create(props)`:  what `Thing`'s and `List`'s constructors call.
 * - Made inside an action:  what it changes joins that action's step.
 * - Made while no action runs (the program's opening, a one of a kind's `when creating it`):  no undo step, as
 *   `core.holdWhile()`'s opening steps aren't -- however long it waits (epic `language` I88).
 *   - e.g. Recipe Box's three recipes to start from:  Undo at once took the last one away.
 */
export function runCreate(
  thing: { create(props?: Record<string, unknown>): unknown },
  props?: Record<string, unknown>
): void {
  const history = core.RUNTIME?.history
  if (!history || history.isActing || history.isApplying) {
    thing.create(props)
    return
  }
  const result = history.run({ cantBeUndone: "keeps history" }, () => thing.create(props))
  // only the wait's copy:  an `async create()` that fails still fails as it did unwrapped
  if (isPromise(result)) result.catch(() => {})
}

////////////////
// ## Records
////////////////

/** What one step has changed so far, by thing and property, and by list:  one record each. */
type StepNotes = {
  /** Each thing's changed props' records. */
  settings: Map<object, Map<string, SettingRecord>>
  /** Each changed list's record. */
  lists: Map<object, ItemsRecord>
  /** Each thing's changed kept values' records (`noteKept()`), by key. */
  kept: Map<object, Map<string, KeptRecord>>
}

/** One prop of one thing, changed in a step:  its value before, and after. */
class SettingRecord implements UndoRecord {
  /** Its value after the step's last change. */
  value: unknown

  constructor(
    readonly target: object,
    readonly property: string,
    /** Its value before the step's first change:  `undefined` if it was unset. */
    readonly was: unknown
  ) {}

  /** Through its setter, as the program sets it:  so what draws it redraws, and a page's mirror hears of it. */
  undo(): void {
    Reflect.set(this.target, this.property, this.was)
  }

  redo(): void {
    Reflect.set(this.target, this.property, this.value)
  }
}

/**
 * One list, changed in a step:  its items before, and after.
 * - Whole lists, not one splice:  putting one list of an exclusive family back moves its items out of the others,
 *   so a splice's place would be wrong by then.  Whole lists end right in any order.
 */
class ItemsRecord implements UndoRecord {
  /** Its items after the step's last change. */
  after: readonly unknown[] = []

  constructor(
    readonly list: object,
    /** Its items before the step's first change. */
    readonly before: readonly unknown[]
  ) {}

  /** Through its `items` setter (`List.writeItems()`):  so an exclusive list's owners stay right. */
  undo(): void {
    Reflect.set(this.list, "items", [...this.before])
  }

  redo(): void {
    Reflect.set(this.list, "items", [...this.after])
  }
}

/**
 * One value the core keeps for a thing itself, changed in a step (`noteKept()`):  its value before, and after,
 * put back through `put`, e.g. a card's last pile.
 */
class KeptRecord implements UndoRecord {
  /** Its value after the step's last change. */
  value: unknown

  constructor(
    readonly put: (value: unknown) => void,
    /** Its value before the step's first change. */
    readonly was: unknown
  ) {}

  undo(): void {
    this.put(this.was)
  }

  redo(): void {
    this.put(this.value)
  }
}

/** Does `record`, one of this history's, change nothing in the end:  its value, or its items, as they were? */
function isUnchanged(record: UndoRecord): boolean {
  if (record instanceof SettingRecord || record instanceof KeptRecord) return record.value === record.was
  if (record instanceof ItemsRecord) {
    const { before, after } = record
    return before.length === after.length && before.every((item, at) => item === after[at])
  }
  return false
}

/** SIDE EFFECT:  `byKey` forgets `record`, if it holds it. */
function forgetRecord(byKey: Map<string, KeptRecord>, record: KeptRecord): void {
  for (const [key, kept] of byKey) if (kept === record) byKey.delete(key)
}

/** Is `value` a promise (anything with a `then()`)? */
function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | undefined)?.then === "function"
}
