import { CanceledError } from "spell/util"

import { core } from "./core"

/** An action a person started, as `ActionQueue.enter()` takes it. */
export type QueuedAction = {
  /** The thing it's on:  a repeat is the same `name` on the same thing. */
  thing: unknown
  /** What it's called, as a repeat is told apart:  a method's name, an event's, a handler's text. */
  name: string
  /** As people read it, for the console when it fails. */
  title: string
  /** Do it:  a promise, while it waits. */
  run: () => unknown
  /** May it still run, when its turn comes?  e.g. an action's `enabled when`. */
  canRun?: () => boolean
  /** It has started:  who listens is told. */
  onStart?: (signal: AbortSignal) => void
  /** The newest wins:  `- a new one replaces the last one`, so a repeat cancels the running one and takes its place. */
  replacesLast?: boolean
}

/** A `QueuedAction` that has its place in the queue. */
type Entry = QueuedAction & {
  /** Told when it's canceled;  `aborted` from then on. */
  controller: AbortController
  /** Ended, or dropped. */
  finished: Promise<void>
  finish: () => void
}

/**
 * ### `ActionQueue`
 * What a person starts runs one at a time:  ONE per running program, `core.RUNTIME.actions` (epic `language`, Q6).
 *
 * ```ts
 * queue.enter(deal)     // runs at once
 * queue.enter(deal)     // the same again, on the same thing:  ignored
 * queue.enter(flip)     // another:  waits for the deal
 * queue.enter(hint)     // takes flip's place:  only the latest waits
 * ```
 *
 * - The queue is where a person's action ENTERS the program:  `core.runAction()`, `core.runPressed()`.
 *   - What the program itself calls never comes here, so a deal can't wait for itself.
 *   - Nor does what only reads:  a waiting getter, a drawing's read, so a click never waits behind a slow load.
 * - An action that doesn't wait starts and ends right there, with nothing to wait for:  no turn goes by.
 * - One that fails is said on the program's console, and the next one runs.
 * - Canceling (`cancel()`) stops an action at its next wait, with a `CanceledError`, which nothing reports:
 *   - what it wrote to properties stays;  its `signal` tells who started it, to drop what's theirs
 *   - the next action waits until it has really ended, so two never overlap:
 *     a wait outside `core` (a fetch) should pass `core.runningAction()?.signal` along, to end sooner
 * - NOTE:  javascript can't say whose wait is whose, so a `core` wait made while an action is being canceled counts
 *   as that action's, even from a `meanwhile`.
 * - Imports only `spell/util` and the core's own `core.ts`:  `runtime.ts` makes one, under the model too.
 */
export class ActionQueue {
  /** The action running now. */
  private running: Entry | undefined

  /** The one waiting its turn:  only the latest is kept. */
  private waiting: Entry | undefined

  /** How many of the program's own steps hold people's actions back -- see `holdFor()`. */
  private holds = 0

  /** Is anything running, so an action would have to wait? */
  get isBusy(): boolean {
    return !!this.running || this.holds > 0
  }

  /** The action running now:  what it's on, its name and its `signal`, told if it's canceled. */
  get current(): { thing: unknown; name: string; signal: AbortSignal } | undefined {
    const { running } = this
    return running && { thing: running.thing, name: running.name, signal: running.controller.signal }
  }

  /**
   * Run `action`, or give it its turn -- see the class's docs.
   * - NEVER throws:  one that fails is said on the console.
   */
  enter(action: QueuedAction): void {
    const { running } = this
    if (running && !running.controller.signal.aborted && isSame(running, action)) {
      if (!action.replacesLast) return
      running.controller.abort()
    }
    this.waiting?.finish()
    this.waiting = entryFor(action)
    if (!this.isBusy) this.startNext()
  }

  /** SIDE EFFECT:  people's actions wait until `step`, one of the program's own, ends:  an opening deal. */
  holdFor(step: Promise<unknown>): void {
    this.holds++
    void step.finally(() => {
      this.holds--
      if (!this.isBusy) this.startNext()
    })
  }

  /**
   * Cancel what's running and what's waiting;  with `thing`, or its `name` too, only theirs.
   * - True if anything was.
   */
  cancel(thing?: unknown, name?: string): boolean {
    const matches = (entry: Entry) => (thing === undefined || entry.thing === thing) && (!name || entry.name === name)
    let any = false
    if (this.waiting && matches(this.waiting)) {
      this.waiting.controller.abort()
      this.waiting.finish()
      this.waiting = undefined
      any = true
    }
    if (this.running && matches(this.running) && !this.running.controller.signal.aborted) {
      this.running.controller.abort()
      any = true
    }
    return any
  }

  /** Is the running action canceled?  Then its next wait stops it:  throws `CanceledError`. */
  throwIfCanceled(): void {
    if (this.running?.controller.signal.aborted) throw new CanceledError(`${this.running.title}:  canceled`)
  }

  /** A pause of `milliseconds`, which canceling the running action ends at once. */
  pause(milliseconds: number): Promise<void> {
    const signal = this.running?.controller.signal
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new CanceledError("pause:  canceled"))
      const stop = () => {
        clearTimeout(timer)
        reject(new CanceledError("pause:  canceled"))
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", stop)
        resolve()
      }, milliseconds)
      signal?.addEventListener("abort", stop, { once: true })
    })
  }

  /** When action `name` on `thing`, running or waiting its turn, ends or is dropped;  `undefined` if neither. */
  finishing(thing: unknown, name: string): Promise<void> | undefined {
    for (const entry of [this.running, this.waiting]) {
      if (entry && entry.thing === thing && entry.name === name) return entry.finished
    }
    return undefined
  }

  /** The waiting action's turn, if there is one. */
  private startNext(): void {
    const entry = this.waiting
    this.waiting = undefined
    if (entry) this.start(entry)
  }

  /** Run `entry`, then whatever waits after it. */
  private start(entry: Entry): void {
    if (entry.canRun?.() === false) {
      entry.finish()
      return this.startNext()
    }
    this.running = entry
    const end = () => {
      this.running = undefined
      entry.finish()
      if (!this.isBusy) this.startNext()
    }
    const fail = (error: unknown) => {
      if (!(error instanceof CanceledError)) core.console.error(`${entry.title} failed`, error)
      end()
    }
    let result: unknown
    try {
      result = entry.run()
      entry.onStart?.(entry.controller.signal)
    } catch (error) {
      return fail(error)
    }
    if (result instanceof Promise) result.then(end, fail)
    else end()
  }
}

/** Is `action` the same as `entry`:  the same name, on the same thing? */
function isSame(entry: Entry, action: QueuedAction): boolean {
  return entry.thing === action.thing && entry.name === action.name
}

/** `action`, given its place. */
function entryFor(action: QueuedAction): Entry {
  let finish = () => {}
  const finished = new Promise<void>((resolve) => (finish = resolve))
  return { ...action, controller: new AbortController(), finished, finish }
}
