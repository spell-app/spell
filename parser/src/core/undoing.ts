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

import { core, recordingChanges, type ChangesMade } from "./core"

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
  /** It's a server's action (epic `data` P50):  when it fails, the app's steps for every server call run last. */
  callsServer?: boolean
}

/**
 * What `cancel` throws, in an action (epic `language` P56):  the action stops, and is called off -- see `runActing()`.
 * - A `CanceledError`, so if one ever escapes an action nothing reports it.
 */
export class ActionCanceled extends CanceledError {}

/** When a hook runs in its action (epic `data` P50):  see `runActing()`. */
export type HookMoment = "before" | "while" | "after" | "failed" | "around"

/** Which file a hook comes from:  a `.api.spell` file, the app's, or a page's (epic `data` Q84, Q96). */
export type HookLevel = "api" | "app" | "page"

/**
 * One hook of an action:  the member it runs, its file's level, and its page's class for a page's.
 * - A page's is the PAGE's member, given the thing first:  `jobsPage.whileComplete(job)`, so its steps read the page's
 *   own fields, `set the busy note to ...` (epic `data` I112).
 */
export type ActionHook = { hook: string; level: HookLevel; page?: () => Function }

/** An action's hooks, by moment:  `core.addAfterHook()`, `core.addActionHook()`. */
export type ActionHooks = Record<HookMoment, ActionHook[]>

/** What runs around an action's own steps:  see `runActing()`. */
export type ActingSteps = {
  /** It may `cancel`. */
  cancels?: boolean
  /** It's a server's:  `core.addServerFailureStep()`'s steps run last, when it fails. */
  callsServer?: boolean
  /** Why the thing it's on isn't there:  only the failure steps run. */
  missing?: Error
  before?: (() => unknown)[]
  during?: (() => unknown)[]
  after: (() => unknown)[]
  /** Each given the error:  gives back `PASSED` to send it on. */
  failed?: ((error: unknown) => unknown)[]
  /** Each given what it wraps, to run when it says. */
  around?: ((inner: () => unknown) => unknown)[]
}

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
 * - `info.cancels`:  it may `cancel`;  `hooks`:  the members of `Class` that run around it, by moment and level --
 *   live lists, so a hook added later runs too (`core.addAfterHook()`, `core.addActionHook()`).  See `runActing()`.
 *   - Called on a stand-in for a thing that isn't there (`core.savedThingOrMissing()`):  its failure steps alone run,
 *     with the place's "not found" (epic `data` P50).
 * - No program running:  the method just runs.
 * - throws `TypeError` if `name` isn't a method of `Class`, or `info` says neither kind, or both
 */
export function declareAction(Class: Function, name: string, info: ActionInfo, hooks?: ActionHooks): void {
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
      const steps = hooks ? stepsOf(this, hooks, args) : { after: [] }
      const missing = missingThings.get(this)
      const act = () =>
        runActing(() => method.apply(this, args), {
          cancels: info.cancels,
          callsServer: info.callsServer,
          missing,
          ...steps
        })
      const history = core.RUNTIME?.history
      return history ? history.run(info, act) : act()
    }
  }[name]!
  // and as many arguments as the method's:  what reads it (the editor's Code card) knows `put it on a pile` takes one
  // (epic `editor` I62)
  Object.defineProperty(action, "length", { value: method.length })
  // and reads as the method's code:  what an edit changed shows on it, not this wrapper (epic `editor` I182)
  Object.defineProperty(action, "toString", { value: () => method.toString(), configurable: true })
  Object.defineProperty(Class.prototype, name, { value: action, writable: true, configurable: true })
}

/**
 * Run `act`, an action's steps, with the steps around it, as ONE action that may be called off
 * (epic `language` P56;  epic `data` P50).  Returns what `act` gives back.
 * - In order:
 *   1. `during`, the while steps:  what they change is put back when the action ends, worked or failed
 *   2. `before`, the before steps
 *   3. `act`, inside each of `around`, the first outermost:  each runs what's inside it when it says (`call the server`)
 *   4. `after`, the after steps
 * - `cancel` in any of them (`ActionCanceled`) calls it off:
 *   - every change it made so far is put back as it was:  props, lists, kept values (`recordingChanges()`)
 *   - so it leaves no undo step:  what it recorded is dropped from the open one (`dropUnchangedRecords()`)
 *   - the steps after it don't run, or stop where they are
 *   - it answers no:  `if put the card on the pile` reads false
 * - Done, an action that may cancel (`cancels`) answers yes, unless it gave back something else.
 * - Any other failure goes through `failed`, the failure steps, in order, then, for a server's action (`callsServer`),
 *   each of `core.addServerFailureStep()`'s:
 *   - a step that catches it (it ends without `pass the error`) ends the action:  it answers no if it may cancel
 *   - nobody catches it:  the notice it held shows (`holdNotice()`), and it goes on to the caller as it was
 *   - nothing is put back but what a while step changed
 * - `missing`:  the action is on a thing that isn't there:  nothing runs but the failure steps, with this error.
 * - Run inside its undo step (`UndoHistory.run()`):  what its hooks change is the same step.
 * - Waits:  a step runs once the steps before it have ended;  the action ends when the last has.
 * - Nothing around it:  `act` just runs, and costs nothing more.
 */
export function runActing(act: () => unknown, steps: ActingSteps): unknown {
  const { cancels, before = [], during = [], after, failed = [], around = [], callsServer, missing } = steps
  const isPlain = !before.length && !during.length && !failed.length && !around.length && !callsServer && !missing
  if (!cancels && !after.length && isPlain) return act()
  const changes = recordingChanges()
  let duringChanges: ChangesMade | undefined
  const endDuring = () => {
    duringChanges?.putBack()
    duringChanges = undefined
  }
  let value: unknown
  const done = () => {
    endDuring()
    changes.close()
    return cancels && value === undefined ? true : value
  }
  const ended = (error: unknown) => {
    endDuring()
    if (!(error instanceof ActionCanceled)) {
      changes.close()
      return afterFailing(error, failed, { cancels, callsServer })
    }
    changes.putBack()
    core.RUNTIME?.history.dropUnchangedRecords()
    return false
  }
  if (missing) return ended(missing)
  const call = around.reduceRight<() => unknown>((inner, wrap) => () => wrap(inner), act)
  const sequence = [
    ...(during.length
      ? [() => void (duringChanges = recordingChanges()), ...during, () => duringChanges?.close()]
      : []),
    ...before,
    () => thenDo(call(), (settled) => void (value = settled)),
    ...after
  ]
  try {
    const result = thenEach(undefined, sequence)
    return isPromise(result) ? result.then(done, ended) : done()
  } catch (error) {
    return ended(error)
  }
}

/**
 * The failure steps' turn, for `error`, in order:  see `runActing()`.
 * - A step gives back `PASSED` (`core.passTheError()`) to send it on;  anything else, it caught it.
 */
function afterFailing(
  error: unknown,
  failed: readonly ((error: unknown) => unknown)[],
  { cancels, callsServer }: Pick<ActingSteps, "cancels" | "callsServer">
): unknown {
  const steps = [...failed, ...(callsServer ? SERVER_FAILURE_STEPS : [])]
  const caught = () => (cancels ? false : undefined)
  const next = (at: number): unknown => {
    for (; at < steps.length; at++) {
      const answer = steps[at]!(error)
      if (isPromise(answer)) return answer.then((settled) => (settled === PASSED ? next(at + 1) : caught()))
      if (answer !== PASSED) return caught()
    }
    HELD_NOTICES.get(error as object)?.()
    throw error
  }
  return next(0)
}

/** What a failure step gives back to send its error on:  `pass the error`. */
export const PASSED = Symbol("passed")

/** The steps for every server action that fails, the app's own:  `core.addServerFailureStep()`. */
export const SERVER_FAILURE_STEPS: ((error: unknown) => unknown)[] = []

/** A failed call's notice, held until the failure steps say nobody caught it:  `holdNotice()`. */
const HELD_NOTICES = new WeakMap<object, () => void>()

/**
 * SIDE EFFECT:  `show`, the notice for `error`, waits until its action's failure steps have had their turn:
 * shown only if none caught it (`runActing()`).  What a place's call does instead of showing its notice at once.
 */
export function holdNotice(error: object, show: () => void): void {
  HELD_NOTICES.set(error, show)
}

/**
 * SIDE EFFECT:  `thing`, a stand-in for one that isn't there, fails each action called on it with `error`, and runs
 * only its failure steps (`declareAction()`):  `core.savedThingOrMissing()`'s.
 */
export function failsAsMissing(thing: object, error: Error): void {
  missingThings.set(thing, error)
}

/** Each stand-in's error:  `failsAsMissing()`. */
const missingThings = new WeakMap<object, Error>()

/**
 * What runs around an action, for `thing`'s call with `args`, from `hooks`:  each hook a call of `thing`'s member,
 * a page's of the page's, given `thing` first (`ActionHook`).
 * - Before and while steps, and wrappers, from the page in to the API file;  after and failure steps, the other way.
 * - A page's before and while steps and its wrappers only while the page is shown (`isShowing()`);  its after and
 *   failure steps even once it's left, on the page that was (`pageFor()`).
 */
function stepsOf(thing: object, hooks: ActionHooks, args: unknown[]): Omit<ActingSteps, "cancels"> {
  const run = ({ hook, level, page }: ActionHook, more: unknown[] = []): unknown => {
    const onPage = level === "page" && page ? pageFor(page) : undefined
    const receiver = (onPage ?? thing) as Record<string, Function>
    return receiver[hook]!.apply(receiver, onPage ? [thing, ...args, ...more] : [...args, ...more])
  }
  // a page's that isn't there:  its page was never made, so it has nobody to run on
  const runs = (each: ActionHook) => each.level !== "page" || !each.page || !!pageFor(each.page)
  const shown = (each: ActionHook) => each.level !== "page" || !each.page || isShowing(each.page)
  const outsideIn = (list: ActionHook[]) => byLevel(list, LEVELS_OUTSIDE_IN).filter(shown)
  const insideOut = (list: ActionHook[]) => byLevel(list, [...LEVELS_OUTSIDE_IN].reverse()).filter(runs)
  return {
    during: outsideIn(hooks.while).map((each) => () => run(each)),
    before: outsideIn(hooks.before).map((each) => () => run(each)),
    around: outsideIn(hooks.around).map((each) => (inner: () => unknown) => run(each, [inner])),
    after: insideOut(hooks.after).map((each) => () => run(each)),
    failed: insideOut(hooks.failed).map((each) => (error: unknown) => run(each, [error]))
  }
}

/** The levels a hook comes from, the page outermost (epic `data` Q84). */
const LEVELS_OUTSIDE_IN: readonly HookLevel[] = ["page", "app", "api"]

/** `list`, by `levels`' order, each level's in the order added. */
function byLevel(list: readonly ActionHook[], levels: readonly HookLevel[]): ActionHook[] {
  return levels.flatMap((level) => list.filter((each) => each.level === level))
}

/**
 * Is a page of class `Page` shown?  One made in this run, so far:  moving from page to page isn't built yet
 * (`Page`), so a page made is a page shown.
 */
function isShowing(pageClass: () => Function): boolean {
  const Page = pageClass()
  return !!core.RUNTIME?.pages.some((page) => page instanceof Page)
}

/**
 * The page of class `Page` a page's hook runs on:  the one shown, else the last one made, once it's left
 * (`Page`'s constructor notes it, `notePageMade()`) -- `undefined` if none was ever made.
 */
function pageFor(pageClass: () => Function): object | undefined {
  const Page = pageClass()
  const shown = core.RUNTIME?.pages.filter((page) => page instanceof Page).at(-1)
  return shown ?? lastPagesMade.get(Page)?.deref()
}

/** SIDE EFFECT:  `page` is the last of its class made, for its after steps once it's left:  see `pageFor()`. */
export function notePageMade(page: object): void {
  lastPagesMade.set(page.constructor, new WeakRef(page))
}

/** The last page of each class made:  `notePageMade()`. */
const lastPagesMade = new WeakMap<Function, WeakRef<object>>()

/** `value`, then `next` given it, waited on if it waits. */
function thenDo(value: unknown, next: (settled: unknown) => unknown): unknown {
  return isPromise(value) ? value.then(next) : next(value)
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
 * - Made inside an undoable action:  what it changes joins that action's step.
 * - Made anywhere else (the program's opening, a one of a kind's `when creating it`, an action that can't be undone):
 *   no undo step, as `core.holdWhile()`'s opening steps aren't -- however long it waits (epic `language` I88).
 *   - e.g. Recipe Box's three recipes to start from:  Undo at once took the last one away.
 *   - Inside a can't-be-undone run too, as the opening is (`core.runOpening()`):  that run ends once the program
 *     has loaded, while a `create()` that waits (Recipe Box's, reading its place) saves after it (epic `epic-engine` I325).
 */
export function runCreate(
  thing: { create(props?: Record<string, unknown>): unknown },
  props?: Record<string, unknown>
): void {
  const history = core.RUNTIME?.history
  if (!history || history.isInTransaction || history.isApplying) {
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
