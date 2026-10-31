import { every } from "./timing"

/**
 * Run `fn` every `seconds`, on `every()`, while the page shows, and once when the page shows again:  the ONE way to poll.
 * - Why:  a tab nobody's looking at asks a server for nothing, and what it missed is read as soon as it's back.
 * - A look still waiting (`fn` answered a promise) skips the next, so a slow server never piles up looks.
 * - A look that fails is logged, and the next one still comes:  a poll is best-effort.
 * - With no page (`document`), as on a server:  every look runs.
 * - Returns a function that stops it.
 * - In a file of its own, not `timing.ts`:  Spell UI's `E` holds everything of that file, and every page would pay for this.
 * - SIDE EFFECT:  listens to the document's `visibilitychange`, until stopped.
 */
export function pollWhileVisible(seconds: number, fn: () => unknown): () => void {
  const page = typeof document === "undefined" ? undefined : document
  let isLooking = false
  const look = () => {
    if (isLooking || page?.visibilityState === "hidden") return
    isLooking = true
    void new Promise((done) => done(fn()))
      .catch((error: unknown) => console.error("pollWhileVisible():  a look failed;  the next one still comes", error))
      .finally(() => (isLooking = false))
  }
  const stopLooking = every(seconds, look)
  page?.addEventListener("visibilitychange", look)
  return () => {
    stopLooking()
    page?.removeEventListener("visibilitychange", look)
  }
}
