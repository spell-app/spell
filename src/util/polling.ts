import { every } from "./timing"

/**
 * Run `fn` every `seconds`, on `every()`, while the page shows, and once when the page shows again:  the ONE way to poll.
 * - Why:  a tab nobody's looking at asks a server for nothing, and what it missed is read as soon as it's back.
 * - A look still waiting (`fn` answered a promise) skips the next, so a slow server never piles up looks.
 * - A look that fails is logged, and the next one still comes:  a poll is best-effort.
 * - With no page (`document`), as on a server:  every look runs.
 * - Returns a function that stops it.
 * - In a file of its own, not `timing.ts`:  Spell UI's `E` holds everything of that file, and every page would pay for this.
 * - `at`:  instead, once a day at that time (`check it once a day at 5am`), see `lookDailyAt()`.
 * - SIDE EFFECT:  listens to the document's `visibilitychange`, until stopped.
 */
export function pollWhileVisible(seconds: number, fn: () => unknown, { at }: { at?: ClockTime } = {}): () => void {
  const page = typeof document === "undefined" ? undefined : document
  let isLooking = false
  const look = () => {
    if (isLooking || page?.visibilityState === "hidden") return
    isLooking = true
    void new Promise((done) => done(fn()))
      .catch((error: unknown) => console.error("pollWhileVisible():  a look failed;  the next one still comes", error))
      .finally(() => (isLooking = false))
  }
  if (at) return lookDailyAt(at, look, page)
  const stopLooking = every(seconds, look)
  page?.addEventListener("visibilitychange", look)
  return () => {
    stopLooking()
    page?.removeEventListener("visibilitychange", look)
  }
}

/**
 * A time of day:  `check it once a day at 5am` is `{ hour: 5, minute: 0 }`.
 * - The person's own clock, unless `utc`:  a server that changes on its own clock says `at 5am UTC`.
 */
export type ClockTime = {
  /** 0 to 23. */
  hour: number
  /** 0 to 59. */
  minute: number
  /** On UTC's clock, not the person's. */
  utc?: boolean
}

/**
 * How long from `now` until `at` next comes round, in milliseconds:  never 0, so a look AT that moment waits a day.
 * - By the clock, not by adding a day's milliseconds:  a day with a clock change still looks at 5am.
 */
export function msUntil(at: ClockTime, now = Date.now()): number {
  const next = new Date(now)
  if (at.utc) next.setUTCHours(at.hour, at.minute, 0, 0)
  else next.setHours(at.hour, at.minute, 0, 0)
  if (next.getTime() <= now) {
    if (at.utc) next.setUTCDate(next.getUTCDate() + 1)
    else next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now
}

/**
 * `look` each day at `at`, while the page shows:  one that came round while it was hidden runs as soon as it shows again.
 * - What's read counts as fresh until the next `at`:  nothing looks in between, nor when the page shows again before it.
 * - Returns a function that stops it.
 */
function lookDailyAt(at: ClockTime, look: () => void, page: Document | undefined): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let isMissed = false
  const wait = () => {
    timer = setTimeout(() => {
      if (page?.visibilityState === "hidden") isMissed = true
      else look()
      wait()
    }, msUntil(at))
  }
  const shown = () => {
    if (!isMissed || page?.visibilityState === "hidden") return
    isMissed = false
    look()
  }
  wait()
  page?.addEventListener("visibilitychange", shown)
  return () => {
    clearTimeout(timer)
    page?.removeEventListener("visibilitychange", shown)
  }
}
