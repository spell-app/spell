import { state } from "spell/util/reactive"
import type { UndoAction, UndoRecord, UndoStep } from "./persist.types"

/****************
 * ### `UndoStack`
 * An app's undo history:  the steps people undo and redo, each a title and the changes it made.
 * - Two stacks:  `undo()` moves the newest step onto the redo stack, then undoes it;  `redo()` the reverse.
 *   A new step empties the redo stack:  what was undone can't be redone once something else happens.
 * - A TRANSACTION (`transaction()`) is ONE step, however many changes it records:
 *   - open until its function returns, or, for an async one, until its promise settles, chains included
 *   - undoable work started meanwhile, nested or begun while it waits, joins it:  never a step of its own
 * - FOLDING:  a step with the same title AND target as the newest joins it (`fold()`),
 *   so typing "hello" into one field is one step;  a step with no target never folds.
 * - Undo and redo put the recorded changes back at once:  nothing is run again, nothing waited on,
 *   so an async action's redo is instant.
 * - While it undoes or redoes it records nothing (`isApplying`):  the changes it puts back aren't new steps.
 * - Live:  `canUndo`, `undoTitle` ... read spell cells, so a menu that reads them redraws by itself
 *   (`observe()`, or Solid through the cells bridge).
 * - Generic, on util's reactive engine:
 *   a step's records say how to undo and redo themselves, and what they hold is the recorder's.
 *   Spell's runtime records the properties an action set;  an app may record its own.
 ****************/
export class UndoStack {
  /** The most steps it keeps:  the oldest are dropped past it;  `undefined`:  no limit. */
  readonly limit: number | undefined

  /**
   * An empty history, keeping at most `limit` steps, its menu titles worded by `titleFor`.
   * - throws `TypeError` for a limit under 1
   */
  constructor({ limit, titleFor = englishTitle }: UndoStackProps = {}) {
    if (limit !== undefined && !(limit >= 1)) {
      throw new TypeError(`new UndoStack():  a limit of \`${limit}\` keeps no step;  give one of 1 or more`)
    }
    this.limit = limit
    this.titleFor = titleFor
  }

  ////////////////
  // ## The history
  ////////////////

  /** Is there a step to undo? */
  get canUndo(): boolean {
    return this.undoSteps.length > 0
  }

  /** Is there a step to redo? */
  get canRedo(): boolean {
    return this.redoSteps.length > 0
  }

  /** The Edit menu's undo item:  `Undo Change Margin`, or `Undo` with nothing to undo. */
  get undoTitle(): string {
    return this.titleFor("undo", this.undoSteps.at(-1)?.title)
  }

  /** The Edit menu's redo item:  `Redo Change Margin`, or `Redo` with nothing to redo. */
  get redoTitle(): string {
    return this.titleFor("redo", this.redoSteps.at(-1)?.title)
  }

  /** The steps it can undo, oldest first. */
  get steps(): readonly UndoStep[] {
    return this.undoSteps
  }

  /** Is it undoing or redoing now?  Then nothing records. */
  get isApplying(): boolean {
    return this.applying
  }

  /** Is a transaction open:  will what's recorded now join it? */
  get isInTransaction(): boolean {
    return this.open !== undefined
  }

  ////////////////
  // ## Recording
  ////////////////

  /**
   * Record one change:  into the open transaction, else as a step of its own, titled `title`.
   * - `target`:  what it changed, so a run of changes to the same target under the same title folds into one step.
   * - While undoing or redoing:  nothing is recorded.
   */
  record(record: UndoRecord, { title, target }: { title: string; target?: unknown }): void {
    if (this.applying) return
    if (this.open) this.open.records.push(record)
    else this.push({ title, target, records: [record] })
  }

  /**
   * Run `run` as ONE step, titled `title`:  everything recorded until it's done joins it.  Returns what `run` returns.
   * - `run` returns a promise:  the step stays open until it settles, so what the action does after a wait joins too.
   * - A transaction already open (nested, or one waiting):  `run` joins it, and opens no step of its own.
   * - `run` throws, or its promise rejects:
   *   what it recorded is still a step (its changes happened), and the error is passed on.
   * - Nothing recorded:  no step.
   */
  transaction<T>(title: string, run: () => T, target?: unknown): T {
    if (this.open || this.applying) return run()
    const step: UndoStep = { title, target, records: [] }
    this.open = step
    let result: T
    try {
      result = run()
    } catch (error) {
      this.close(step)
      throw error
    }
    if (isPromise(result)) return result.finally(() => this.close(step)) as T
    this.close(step)
    return result
  }

  /** Forget every step, to undo and to redo, e.g. when the app opens another document. */
  clear(): void {
    this.undoSteps = []
    this.redoSteps = []
  }

  ////////////////
  // ## Undo and redo
  ////////////////

  /**
   * Undo the newest step:  onto the redo stack first, then its records undone, last first.  False with none.
   * - The stacks have moved before the records run:  what their changes set off already sees the new history.
   */
  undo(): boolean {
    const step = this.undoSteps.at(-1)
    if (!step) return false
    this.undoSteps = this.undoSteps.slice(0, -1)
    this.redoSteps = [...this.redoSteps, step]
    this.applying = true
    try {
      for (const record of [...step.records].reverse()) record.undo()
    } finally {
      this.applying = false
    }
    return true
  }

  /** Redo the step undone last:  back onto the undo stack first, then its records redone, in order.  False with none. */
  redo(): boolean {
    const step = this.redoSteps.at(-1)
    if (!step) return false
    this.redoSteps = this.redoSteps.slice(0, -1)
    this.undoSteps = [...this.undoSteps, step]
    this.applying = true
    try {
      for (const record of step.records) record.redo()
    } finally {
      this.applying = false
    }
    return true
  }

  ////////////////
  // ## For a recorder
  ////////////////

  /**
   * Fold `step` into `newest`, the step on top:  they have the same title and target.
   * - Here:  its records are added after `newest`'s.
   * - A recorder that can merge (the first value and the last of each property) overrides it, to keep the minimum.
   */
  protected fold(newest: UndoStep, step: UndoStep): void {
    newest.records.push(...step.records)
  }

  ////////////////
  // ## The stacks
  ////////////////

  /** Steps to undo, oldest first:  replaced, never changed in place, so readers hear of each change. */
  @state
  private accessor undoSteps: readonly UndoStep[] = []

  /** Steps to redo, the next one last. */
  @state
  private accessor redoSteps: readonly UndoStep[] = []

  /** The transaction open now:  `transaction()`'s step. */
  private open: UndoStep | undefined

  /** True while `undo()` or `redo()` runs records. */
  private applying = false

  /** Each menu item's title:  `UndoStackProps.titleFor`. */
  private titleFor: (action: UndoAction, title: string | undefined) => string

  /** Close `step`, the open transaction's:  a step, unless it recorded nothing. */
  private close(step: UndoStep): void {
    if (this.open === step) this.open = undefined
    if (step.records.length) this.push(step)
  }

  /** Put `step` on top, folding it into the newest when it can (`fold()`);  the redo stack is emptied. */
  private push(step: UndoStep): void {
    const newest = this.undoSteps.at(-1)
    const folds = newest && step.target !== undefined && newest.target === step.target && newest.title === step.title
    if (folds) this.fold(newest, step)
    else {
      const steps = [...this.undoSteps, step]
      this.undoSteps = this.limit === undefined ? steps : steps.slice(-this.limit)
    }
    if (this.redoSteps.length) this.redoSteps = []
  }
}

/** Props for an `UndoStack`. */
export type UndoStackProps = {
  /** The most steps it keeps:  `UndoStack.limit`. */
  limit?: number
  /**
   * The Edit menu's title for undoing or redoing a step titled `title` (`undefined`:  nothing to undo or redo).
   * - Default:  English, `Undo Change Margin`, or `Undo` alone.
   * - An app in another language words its own, the whole title at once:  `Deshacer el cambio de margen`.
   */
  titleFor?: (action: UndoAction, title: string | undefined) => string
}

/** The menu titles in English:  `Undo Change Margin`, `Redo`. */
function englishTitle(action: UndoAction, title: string | undefined): string {
  const verb = action === "undo" ? "Undo" : "Redo"
  return title ? `${verb} ${title}` : verb
}

/** Is `value` a promise (anything with a `then()`)? */
function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | undefined)?.then === "function"
}
