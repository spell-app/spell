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
 * - Plain promises, no Solid, imports nothing:  the runtime's lazy chunk uses it too, and so do the places' shared
 *   reads (`PlaceReads`).
 * - `LoadOnce.abortable()`:  one caller's wait ends early, while the shared load runs on for the others.
 ****************/
export class LoadOnce<K, V> {
  /** What a failed load does. */
  private readonly failures: LoadFailures

  /** Key => its load, in flight or done. */
  private readonly loads = new Map<K, Promise<V>>()

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
    if (this.failures !== "kept") {
      started.catch(() => {
        if (this.loads.get(key) !== started || !this.forgetsNow()) return
        this.loads.delete(key)
      })
    }
    return started
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
  }

  /** Drop `key`'s load, or every load:  the next `get()` starts again. */
  forget(key?: K) {
    if (key === undefined) this.loads.clear()
    else this.loads.delete(key)
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

/** What a `LoadOnce` does with a failed load:  see the class. */
export type LoadFailures = "kept" | "forgotten" | "forgotten offline"

/** `new LoadOnce(options)`. */
export type LoadOnceOptions = {
  /** what a failed load does;  default `"kept"` */
  failures?: LoadFailures
}
