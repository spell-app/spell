import { createSignal, untrack, type Accessor } from "solid-js"

import type { UIHost } from "./UIHost"

/**
 * One auto-controlled property (`value`, `open`, `active`):  the host's property / attribute is authoritative
 * when set;  until then an internal starting value stands in (e.g. a dropdown's `selected` items).
 * - `request(next, announce)` is every USER transition:  it dispatches the event first (`announce()`), then
 *   - a vetoed (cancelable) event changes nothing
 *   - if the host set the property DURING the event -- e.g. re-set the old value in a `ui-change` handler --
 *     the host's value stands and the UI "reverts" (it never showed the new one:  Solid batches to a microtask)
 *   - otherwise the new value is written to the host PROPERTY (and reflects), so `el.value` is always current,
 *     like a native `<input>`
 * - Why watch the property instead of comparing values:  a host re-setting the SAME value it already had is
 *   still a decision.
 */
export class Controlled<T> {
  /** Current value:  host's when set, else internal. */
  readonly get: Accessor<T>

  /** The host. */
  private readonly host: UIHost

  /** Property key on the host. */
  private readonly key: string

  /** Raw host value (undefined => uncontrolled). */
  private readonly raw: Accessor<unknown>

  /** Host writes to `key` so far;  compared around `announce()`. */
  private writes = 0

  constructor({ host, key, raw, value, initial }: ControlledProps<T>) {
    this.host = host
    this.key = key
    this.raw = raw
    const [internal] = createSignal<T>(initial as Exclude<T, Function>)
    this.get = () => (raw() === undefined ? internal() : value())
    host.addPropertyChangedCallback((changed: string) => {
      if (changed === key) this.writes++
    })
  }

  /** Is the host controlling it right now? */
  get isControlled(): boolean {
    return untrack(this.raw) !== undefined
  }

  /**
   * A user transition to `next`:  `announce()` dispatches the event and returns false when vetoed.
   * - Returns true when `next` was applied.
   */
  request(next: T, announce: () => boolean): boolean {
    const before = this.writes
    if (!announce() || this.writes !== before) return false
    this.set(next)
    return true
  }

  /**
   * Write the host property without an event, e.g. form reset.
   * - `undefined` removes the host's value, so the internal starting value shows again.
   */
  set(next: T | undefined) {
    ;(this.host as unknown as Record<string, unknown>)[this.key] = next
  }
}

/** Constructor props for `Controlled`. */
export type ControlledProps<T> = {
  host: UIHost
  /** Property key on the host. */
  key: string
  /** Raw host value, `undefined` when not set. */
  raw: Accessor<unknown>
  /** Converted host value. */
  value: Accessor<T>
  /** Internal starting value. */
  initial: T
}
