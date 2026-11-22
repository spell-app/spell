import { cssSecondsFor } from "./dom"

/****************
 * ### `LoadOnce`
 * Loads each key once per page, and hands every caller the same promise:
 * a family's import, a component pack's script, a language's dictionary, an icon's SVG, a source file.
 * - `get(key, load)` calls `load()` the first time, and returns the one in flight (or done) after that:
 *   `packs.get(url, () => ComponentPacks.inject(url))`.
 * - What a FAILED load does, `failures` (`LoadFailures`):
 *   - `"kept"`, the default:  the rejection is the answer for good (a family that can't be imported)
 *   - `"forgotten"`:  the next `get()` tries again (a file that may be there next time)
 *   - `"forgotten offline"`:  forgotten only while the browser says it's offline (`navigator.onLine`):
 *     then the failure may be the connection, not the file (an icon's SVG)
 * - A caller that mustn't see a rejection catches it itself:  `loads.get(key).catch(() => undefined)`.
 * - Plain promises, no Solid;  imports only `./dom`'s CSS time:  the runtime's lazy chunk uses it too,
 *   and so do the places' shared reads (`PlaceReads`).
 * - `LoadOnce.abortable()`:  one caller's wait ends early, while the shared load runs on for the others.
 * - Loading AHEAD of use, the ONE way (epic `solid-2-final` P6;  the editor's modes, later its routes and pages):
 *   - `LoadOnce.ahead(element, start)`:  `start()` once the pointer rests on `element` (the page's hover delay),
 *     or it takes focus, or it's pressed
 *   - `LoadOnce.atIdle(start)`:  `start()` once the browser is idle (2s at the most)
 *   - both skip the hover, focus and idle under Save-Data (`LoadOnce.isSavingData()`):
 *     then the load waits for its first use
 *   - `valueOf(key)`:  a load's value once it's in, read synchronously:  what's loaded draws at once, with no wait
 ****************/
export class LoadOnce<K, V> {
  /** What a failed load does. */
  private readonly failures: LoadFailures

  /** Key => its load, in flight or done. */
  private readonly loads = new Map<K, Promise<V>>()

  /** Key => its value, once its load resolved:  `valueOf()`. */
  private readonly values = new Map<K, V>()

  constructor({ failures = "kept" }: LoadOnceOptions = {}) {
    this.failures = failures
  }

  /**
   * `key`'s load:  `load()` now the first time, else the one already under way (or done).
   * - `fresh`:  start a new one even so, and keep it in place of the old.
   * - A `load()` that throws instead of rejecting is a rejection too.
   */
  get(key: K, load: () => Promise<V>, { fresh = false }: { fresh?: boolean } = {}): Promise<V> {
    const known = fresh ? undefined : this.loads.get(key)
    if (known) return known
    const started = LoadOnce.start(load)
    this.loads.set(key, started)
    this.values.delete(key)
    started.then(
      (value) => {
        if (this.loads.get(key) === started) this.values.set(key, value)
      },
      () => undefined
    )
    if (this.failures !== "kept") {
      started.catch(() => {
        if (this.loads.get(key) !== started || !this.forgetsNow()) return
        this.loads.delete(key)
      })
    }
    return started
  }

  /**
   * `key`'s value, once its load has resolved;  `undefined` while it's on its way, after a failure, or with no load.
   * - Synchronous:  what's loaded already is used at once, e.g. a mode's view drawn with no loader shown.
   */
  valueOf(key: K): V | undefined {
    return this.values.get(key)
  }

  /** Has `key` a load, in flight or done? */
  has(key: K): boolean {
    return this.loads.has(key)
  }

  /** Every key with a load, in the order they started. */
  keys(): IterableIterator<K> {
    return this.loads.keys()
  }

  /** Make `value` `key`'s answer, as if it had loaded (a file just saved). */
  set(key: K, value: V) {
    this.loads.set(key, Promise.resolve(value))
    this.values.set(key, value)
  }

  /** Drop `key`'s load, or every load:  the next `get()` starts again. */
  forget(key?: K) {
    if (key === undefined) {
      this.loads.clear()
      this.values.clear()
    } else {
      this.loads.delete(key)
      this.values.delete(key)
    }
  }

  /**
   * Call `start()` ONCE, ahead of `element`'s use:  as soon as the pointer rests on it for the page's hover delay,
   * or it takes focus, or it's pressed.  Returns what stops it waiting.
   * - The hover delay is `--ui-hover-delay` on `element` (800ms by default), read as the pointer arrives;
   *   the pointer leaving first cancels it.
   * - A press always starts it:  the element is being used.
   *   Hover and focus don't under Save-Data (`isSavingData()`):  the load waits for its use.
   * - It stops listening after `start()`, and once undone.
   * - `start()` is the caller's, e.g. `() => void piece.load()`:  it MUST NOT throw;  its own failures are its own.
   * - STATIC:  no cache;  a `LoadOnce`'s `get()` inside `start()` keeps it to one load.
   */
  static ahead(element: Element, start: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    const savingData = LoadOnce.isSavingData()
    const stop = () => {
      clearTimeout(timer)
      element.removeEventListener("pointerenter", onEnter)
      element.removeEventListener("pointerleave", onLeave)
      element.removeEventListener("focusin", onUse)
      element.removeEventListener("pointerdown", onUse)
    }
    const onUse = () => {
      stop()
      start()
    }
    const onEnter = () => {
      clearTimeout(timer)
      timer = setTimeout(onUse, (cssSecondsFor(element, "--ui-hover-delay") ?? HOVER_SECONDS) * 1000)
    }
    const onLeave = () => clearTimeout(timer)
    if (!savingData) {
      element.addEventListener("pointerenter", onEnter)
      element.addEventListener("pointerleave", onLeave)
      element.addEventListener("focusin", onUse)
    }
    element.addEventListener("pointerdown", onUse)
    return stop
  }

  /**
   * Call `start()` once the browser is idle, or after `timeout` ms at the most;  returns what cancels it.
   * - `ahead`, the default:  a load ahead of use, so skipped under Save-Data (`isSavingData()`).
   *   `ahead: false`, a load that must happen, only later (a `load="idle"` source):  it runs under Save-Data too.
   * - No `requestIdleCallback()` (Safari before 18.2, node):  on the next turn instead.
   * - The timeout:  a busy page (or a slow machine running tests) may never be idle.
   * - STATIC:  no cache, as `ahead()`.
   */
  static atIdle(start: () => void, { timeout = IDLE_LIMIT_MS, ahead = true }: AtIdleOptions = {}): () => void {
    if (ahead && LoadOnce.isSavingData()) return () => undefined
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(start, { timeout })
      return () => cancelIdleCallback(id)
    }
    const timer = setTimeout(start, 0)
    return () => clearTimeout(timer)
  }

  /**
   * Has the browser asked for less data (Save-Data, `navigator.connection.saveData`)?
   * - Then nothing loads AHEAD of use:  `ahead()` waits for a press, `atIdle()` skips.
   * - `false` where the browser doesn't say (Safari, Firefox, node).
   */
  static isSavingData(): boolean {
    if (typeof navigator === "undefined") return false
    return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  }

  /**
   * `promise`, or the reason `signal` gives as soon as it aborts:  an `AbortError`, unless it was given another.
   * - Ends only THIS wait:  `promise` carries on for whoever else holds it.
   * - STATIC:  pure, no cache of its own.
   */
  static abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) return Promise.reject(signal.reason)
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(signal.reason)
      signal.addEventListener("abort", onAbort, { once: true })
      promise.then(
        (value) => {
          signal.removeEventListener("abort", onAbort)
          resolve(value)
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort)
          reject(error)
        }
      )
    })
  }

  /**
   * `load()`'s promise;  a throw becomes a rejection.
   * - STATIC:  pure, needs no instance.
   */
  private static start<V>(load: () => Promise<V>): Promise<V> {
    try {
      return load()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /** Is a failure forgotten now, as `failures` says? */
  private forgetsNow(): boolean {
    if (this.failures === "forgotten") return true
    return typeof navigator !== "undefined" && navigator.onLine === false
  }
}

/** `LoadOnce.ahead()`'s hover delay, in seconds, on a page that sets no `--ui-hover-delay`:  Spell UI's default. */
const HOVER_SECONDS = 0.8

/** `LoadOnce.atIdle()`'s longest wait for an idle moment, in ms, before it starts anyway. */
const IDLE_LIMIT_MS = 2_000

/** What a `LoadOnce` does with a failed load:  see the class. */
export type LoadFailures = "kept" | "forgotten" | "forgotten offline"

/** `LoadOnce.atIdle(start, options)`. */
export type AtIdleOptions = {
  /** the longest wait for an idle moment, in ms;  default 2s */
  timeout?: number
  /** a load ahead of use, skipped under Save-Data;  default `true` */
  ahead?: boolean
}

/** `new LoadOnce(options)`. */
export type LoadOnceOptions = {
  /** what a failed load does;  default `"kept"` */
  failures?: LoadFailures
}
