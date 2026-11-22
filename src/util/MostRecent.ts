/**
 * The most recent `size` things used, newest first:  using one more lets go of the oldest, with a callback saying so.
 * - e.g. the editor keeps the last 3 projects shown whole, and the oldest drops its parse (epic `solid-2-final` P10);
 *   the last pages drawn, kept drawn (P13).
 * - By identity:  the same thing used again moves to the front, never twice in the list.
 * - `onDropped` runs as a thing leaves the list by being pushed out, or by `drop()`;  never for `forget()` or `clear()`.
 *   - It runs after the thing has left, so it may use the list again.
 *   - It throws:  that's the caller's bug, so it isn't caught.
 * - Generic, imports nothing:  plain `node` loads it too, as `spell/util/MostRecent.ts`.
 */
export class MostRecent<T> {
  constructor(size: number, { onDropped }: MostRecentOptions<T> = {}) {
    if (!(size >= 1)) throw new TypeError(`new MostRecent(${size}):  keep at least 1`)
    this.size = size
    this.onDropped = onDropped
  }

  /** how many are kept */
  readonly size: number

  /** what's told of each thing pushed out or dropped */
  readonly onDropped: ((item: T) => void) | undefined

  /** The things kept, newest first. */
  get items(): T[] {
    return [...this.order].reverse()
  }

  /** Is `item` among the most recent? */
  has(item: T): boolean {
    return this.order.has(item)
  }

  /**
   * `item` is the newest now;  answers what that pushed out, oldest first (`[]` most of the time).
   * - SIDE EFFECT:  `onDropped` for each one pushed out.
   */
  use(item: T): T[] {
    this.order.delete(item)
    this.order.add(item)
    const dropped: T[] = []
    for (const oldest of this.order) {
      if (this.order.size <= this.size) break
      this.order.delete(oldest)
      dropped.push(oldest)
    }
    for (const it of dropped) this.onDropped?.(it)
    return dropped
  }

  /**
   * Let go of `item` now, telling `onDropped`;  `false` when it wasn't kept.
   */
  drop(item: T): boolean {
    if (!this.order.delete(item)) return false
    this.onDropped?.(item)
    return true
  }

  /** Forget `item` without telling anyone, e.g. it's gone for good;  `false` when it wasn't kept. */
  forget(item: T): boolean {
    return this.order.delete(item)
  }

  /** Forget them all, telling nobody. */
  clear(): void {
    this.order.clear()
  }

  /** what's kept, oldest first:  a `Set` keeps the order things were added in */
  private order = new Set<T>()
}

/** Options for `new MostRecent()`. */
export type MostRecentOptions<T> = {
  /** told of each thing pushed out of the list, or dropped -- see `MostRecent` */
  onDropped?: (item: T) => void
}
