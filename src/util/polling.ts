import { every, letNodeEnd } from "./timing"

/**
 * Run `fn` every `seconds`, on `every()`, while the page shows, and once when the page shows again:  the ONE way to poll.
 * - Why:  a tab nobody's looking at asks a server for nothing, and what it missed is read as soon as it's back.
 * - A look still waiting (`fn` answered a promise) skips the next, so a slow server never piles up looks.
 * - A look that fails is logged, and the next one still comes:  a poll is best-effort.
 * - With no page (`document`), as on a server:  every look runs.
 * - NEVER keeps node running by itself:  with nothing else to do, a program ends, whatever it was to check next.
 *   - `check it once a day at 5am` left a headless run waiting for 16 hours (epic `data` I37).
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
  const stopLooking = every(seconds, look, { inBackground: true })
  page?.addEventListener("visibilitychange", look)
  return () => {
    stopLooking()
    page?.removeEventListener("visibilitychange", look)
  }
}

/**
 * Keep a page fresh on `window`:  `refresh()` when the page server says a file it cares about changed, when the page
 * becomes visible, and every `every` ms while visible:  the ONE watch of every page (epic `coherence` C9;
 * moved down from spell-epic's `ServerLink.watch()`, which wraps it, by epic `from-console` P17).
 * - Changes come from the page's live client (spell/server's `liveClient()`, or `joinLiveChannel()` for a page the
 *   server didn't serve):  `spell-server:changed`, never a connection of our own, each holds one of Chrome's 6 per host
 * - `files`:  a test of each changed file's URL path, decoded (`/spaces/@spell/examples/Solitaire/Card.spell`);
 *   `undefined`:  none, only the poll and the page coming back into view
 * - `every`:  ms;  `0` (the default) for no poll;  `polls`:  poll only while it answers true
 *   - e.g. the editor polls slowly only while its live channel isn't open (`isLiveChannelOpen()`)
 * - the server down (`spell-server:down`, the live client's word):  no poll and no look on the page coming into view
 *   until it's back (`spell-server:up`), then one look at once;  so a restart leaves no failed requests on the
 *   console (epic `epic-engine` I294)
 * - `every` in ms, not seconds as `pollWhileVisible()`:  its callers' periods are (`REVIEW_POLL_MS`)
 * - NOT on `pollWhileVisible()`:  it takes the page's `window`, so a test hands it one of its own
 * - Returns the undo.
 * - SIDE EFFECT:  listens to `window`'s live client's events and its document's `visibilitychange`, until undone.
 */
export function watchServerFiles(
  window: Window,
  files: ((path: string) => boolean) | undefined,
  refresh: () => void,
  { every = 0, polls }: { every?: number; polls?: () => boolean } = {}
): () => void {
  const { document } = window
  // the server down (restarting:  every merge into main does it), as the page's live client hears it:  no poll asks
  // until it's back, then one does at once (epic `epic-engine` I294)
  let down = false
  const timer = every
    ? window.setInterval(() => {
        if (!down && document.visibilityState === "visible" && (polls?.() ?? true)) refresh()
      }, every)
    : undefined
  const onVisible = () => {
    if (!down && document.visibilityState === "visible") refresh()
  }
  const onDown = () => (down = true)
  const onUp = () => {
    down = false
    if (document.visibilityState === "visible") refresh()
  }
  const onFile = (event: Event) => {
    const path = (event as CustomEvent<{ path?: string }>).detail?.path
    if (path && files?.(decodeURIComponent(path))) refresh()
  }
  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("spell-server:changed", onFile)
  window.addEventListener("spell-server:down", onDown)
  window.addEventListener("spell-server:up", onUp)
  return () => {
    if (timer !== undefined) window.clearInterval(timer)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("spell-server:changed", onFile)
    window.removeEventListener("spell-server:down", onDown)
    window.removeEventListener("spell-server:up", onUp)
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
    letNodeEnd(timer)
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
