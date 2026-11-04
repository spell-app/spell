/**
 * Waiting in code that must stay SYNCHRONOUS:  `waitUntilSync()`, the blocking twin of `waitUntil()`.
 * - For a sync script that can't `await`:  the file lock's `run()`, a checkout's servers stopped on the way out.
 *   Everything else waits with `waitUntil()` (`spell/util/timing`), which lets the program carry on meanwhile.
 * - NODE ONLY:  it blocks the thread with `Atomics.wait()`, which throws on a browser page's main thread.
 *   So it's here, never beside `waitUntil()`:  `spell/util/timing` is in the browser bundles.
 * - `spell/util/node/timing`;  plain `node` loads it too, as `spell/util/node/timing.ts`:  it imports nothing of ours
 *   but `timing.ts`'s types
 */
import type { Truthy, WaitOptions } from "spell/util/timing"

/**
 * Wait until `read()` gives something truthy:  that value;  `undefined` once `timeout` seconds pass without one.
 * - BLOCKS the thread while it waits:  no timer, event or promise runs meanwhile
 * - looks at once, then every `every` seconds (default 0.1), and once more at the deadline, as `waitUntil()` does
 * - what `read` throws, this throws
 */
export function waitUntilSync<T>(read: () => T, { timeout, every = 0.1 }: WaitOptions): Truthy<T> | undefined {
  const deadline = Date.now() + timeout * 1000
  for (;;) {
    const value = read()
    if (value) return value as Truthy<T>
    const left = deadline - Date.now()
    if (left <= 0) return undefined
    Atomics.wait(SLEEPER, 0, 0, Math.min(every * 1000, left))
  }
}

/** What `Atomics.wait()` sleeps on:  nobody ever wakes it, so each wait runs its full time. */
const SLEEPER = new Int32Array(new SharedArrayBuffer(4))
