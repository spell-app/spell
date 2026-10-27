/**
 * Run a function later, at the moment you name.
 * - From soonest to latest:
 *   - `afterSolidUpdate(fn)` -- as soon as the current code finishes
 *   - `beforeNextPaint(fn)` -- just before the browser next draws the page
 *   - `soon(fn)` -- in the next task, once the browser has had a turn
 *   - `after(seconds, fn)` -- once, `seconds` from now:  a promise to await, or cancel
 *   - `every(seconds, fn)` -- every `seconds`, until you stop it
 * - Why not the platform's calls (`queueMicrotask()`, `setTimeout()` ...):
 *   - the name says WHEN `fn` runs, so a reader needn't know the event loop
 *   - `after()` and `every()` take SECONDS (`after(0.25, ...)`), not milliseconds
 *   - each returns a way to cancel, where one makes sense
 * - And waiting:  `waitUntil(read, { timeout, every })` looks until something is true, `within(promise, seconds)` waits
 *   for a promise at most so long
 * - And work asked for often, run once at one of those moments:  `new Queued({ when, run })`, then `ask()`
 * - Plain JS, importing nothing:  safe to import anywhere, on a server too, and plain `node` loads it with its
 *   extension (`spell/util/timing.ts`).  Only `beforeNextPaint()` needs a browser to CALL.
 * - Its place:  util's generic files, so the kit's server and command line, the parser's core and every node tool may
 *   use it;  `spell/element` re-exports it, as Spell UI's util barrel does (it was `spell/element`'s until epic
 *   `coherence` P19)
 */

////////////////
// ## Right away
////////////////

/**
 * Run `fn` as soon as the code running now finishes:  a microtask, over `queueMicrotask()`.
 * - Before any timer, event or paint.
 * - After the Solid update the code is in:
 *   Solid applies a write in a microtask queued AT the write, so `fn`, queued after it, runs after it.
 * - Use it to write state from code that may run while Solid is drawing (a hook Solid calls),
 *   where writes aren't allowed.
 * - An error `fn` throws is reported as uncaught:  the code that queued it has moved on.
 */
export function afterSolidUpdate(fn: () => void): void {
  queueMicrotask(fn)
}

/**
 * Run `fn` just before the browser next draws the page:  an animation frame, over `requestAnimationFrame()`.
 * - Use it to read layout once styles have applied, or to start a CSS change the browser should see as a change.
 * - Twice (`beforeNextPaint(() => beforeNextPaint(fn))`) waits until one paint has HAPPENED.
 * - `fn` gets the frame's timestamp, as `requestAnimationFrame()` gives it.
 * - Returns a function that cancels it, if it hasn't run yet.
 * - NOTE: needs a browser:  throws on a server, where there's no `requestAnimationFrame()`.
 */
export function beforeNextPaint(fn: (time: number) => void): () => void {
  const frame = requestAnimationFrame(fn)
  return () => cancelAnimationFrame(frame)
}

/**
 * Run `fn` in the next task:  a zero-delay timer, over `setTimeout(fn, 0)`.
 * - After everything already queued:  microtasks, Solid's update, the event being handled
 *   (a `click` that follows this `pointerup` ...).
 * - Returns a function that cancels it, if it hasn't run yet.
 */
export function soon(fn: () => void): () => void {
  const timer = setTimeout(fn, 0)
  return () => clearTimeout(timer)
}

////////////////
// ## Later
////////////////

/**
 * Run `fn` once, `seconds` from now (`after(0.25, ...)`), over `setTimeout()`.
 * - Returns a promise of `fn`'s result, so `await after(1)` waits a second.
 *   It rejects with what `fn` throws.
 * - `cancel()` stops it, if it hasn't run yet:
 *   - the promise REJECTS with an `AbortError` (`DOMException`), so an `await` never hangs
 *   - nobody awaiting is fine:  that rejection is never reported as unhandled
 *   - after `fn` has started, `cancel()` does nothing:  `fn` may cancel its own timer
 */
export function after<T = undefined>(seconds: number, fn?: () => T): CancelablePromise<T> {
  let cancel = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      cancel = () => {}
      try {
        resolve(fn?.() as T)
      } catch (error) {
        reject(error)
      }
    }, seconds * 1000)
    cancel = () => {
      cancel = () => {}
      clearTimeout(timer)
      // Marks the rejection as handled:  an `await` on the promise still sees it
      promise.catch(() => {})
      reject(new DOMException("after():  canceled", "AbortError"))
    }
  })
  return Object.assign(promise, { cancel: () => cancel() })
}

/**
 * Run `fn` every `seconds` (`every(5, ...)`), over `setInterval()`, until stopped.
 * - The first run is `seconds` from now, not at once.
 * - Returns a function that stops it.
 */
export function every(seconds: number, fn: () => void): () => void {
  const timer = setInterval(fn, seconds * 1000)
  return () => clearInterval(timer)
}

/**
 * What `after()` returns:  a promise of its function's result, plus `cancel()`.
 * - `cancel()` stops the timer if it hasn't fired;  the promise then rejects with an `AbortError`.
 */
export type CancelablePromise<T> = Promise<T> & {
  /** Stop the timer if it hasn't fired;  the promise rejects with an `AbortError`.  Does nothing after. */
  cancel(): void
}

////////////////
// ## Once, however often asked
////////////////

/****************
 * ### `Queued`
 * Work asked for again and again, run ONCE at the next moment you name:  a burst of asks runs it once.
 * - A field, then `ask()` as often as you like:
 *   ```ts
 *   readonly refit = new Queued({ when: beforeNextPaint, run: () => this.measure() })
 *   ```
 *   `this.refit.ask()` from each resize, scroll or change;  `this.refit.cancel()` in a cleanup.
 * - An ask while a run is pending rides it:  the work runs once, at that moment.
 *   An ask once it has run (or from inside the work) queues it again.
 * - `cancel()` drops a pending run;  the next ask queues afresh.
 * - For a measurer, a fitter, a re-reader:  anything several events ask for in one turn.
 ****************/
export class Queued {
  /** When the work runs. */
  private readonly when: QueuedMoment
  /** The work. */
  private readonly run: () => void
  /** Drops the pending run;  `undefined` while none is pending. */
  private dropPending: (() => void) | undefined

  constructor({ when, run }: QueuedProps) {
    this.when = when
    this.run = run
  }

  /** Is a run pending? */
  get isPending(): boolean {
    return this.dropPending !== undefined
  }

  /** Ask for the work:  it runs at the next moment `when` names, once however many asks come before it. */
  ask(): void {
    if (this.dropPending) return
    let isDropped = false
    const cancel = this.when(() => {
      if (isDropped) return
      this.dropPending = undefined
      this.run()
    })
    this.dropPending = () => {
      isDropped = true
      if (cancel) cancel()
    }
  }

  /** Drop a pending run, if there is one. */
  cancel(): void {
    this.dropPending?.()
    this.dropPending = undefined
  }
}

/** What a `Queued` is made from. */
export type QueuedProps = {
  /** when the work runs:  `afterSolidUpdate`, `beforeNextPaint` or `soon` */
  when: QueuedMoment
  /** the work, run once per burst of asks */
  run: () => void
}

/** One of the moments above:  runs `fn` later, maybe returning a way to cancel it. */
export type QueuedMoment = (fn: () => void) => (() => void) | void

////////////////
// ## Waiting
////////////////

/**
 * Wait until `read()` gives something truthy:  that value;  `undefined` once `timeout` seconds pass without one.
 * - looks at once, then every `every` seconds (default 0.1), and once more at the deadline:  the wait between two
 *   looks never runs past it
 * - `read` may be async (`await waitUntil(() => server.status(), { timeout: 15 })`);  what it throws, this throws, so
 *   a look that may fail catches its own error and answers `undefined`
 * - for a server that starts, a process that ends, a lock that's free, a file that's written, an answer Owen gives
 */
export async function waitUntil<T>(
  read: () => T | PromiseLike<T>,
  { timeout, every = 0.1 }: WaitOptions
): Promise<Truthy<T> | undefined> {
  const deadline = Date.now() + timeout * 1000
  for (;;) {
    const value = await read()
    if (value) return value as Truthy<T>
    const left = deadline - Date.now()
    if (left <= 0) return undefined
    await after(Math.min(every, left / 1000))
  }
}

/**
 * Wait at most `seconds` for `promise`:  its value, or `undefined` when time runs out first.
 * - what `promise` rejects with, this rejects with
 * - its timer is cleared as soon as `promise` settles, so a quick answer leaves nothing running
 * - `promise` carries on either way:  this only stops waiting for it
 */
export async function within<T>(promise: PromiseLike<T>, seconds: number): Promise<T | undefined> {
  const timeUp = after(seconds)
  try {
    return await Promise.race([
      promise,
      timeUp.then(
        () => undefined,
        () => undefined
      )
    ])
  } finally {
    timeUp.cancel()
  }
}

/**
 * `waitUntil()`'s options, in seconds.
 * - `timeout`:  how long to wait
 * - `every`:  how long between two looks (default 0.1)
 */
export type WaitOptions = { timeout: number; every?: number }

/** `T` without the values an `if` takes as false:  what `waitUntil()` answers with. */
export type Truthy<T> = Exclude<T, false | 0 | "" | null | undefined>
