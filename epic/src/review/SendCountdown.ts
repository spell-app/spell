import { ACTIVITY_EVENTS, COUNTDOWN_KEY, COUNTDOWN_MS, COUNTDOWN_TICK_MS } from "./review.types"

/****************
 * ### `SendCountdown`
 * A page's COUNTDOWN to Send (epic `epic-engine` P20):  with countdown mode on and something waiting to be sent,
 * it sends by itself once Owen has left the page alone for 2 minutes (`COUNTDOWN_MS`).
 * - Owen, 2026-10-22:  "when it is on, you wait for 2 minutes of inactivity from me (I haven't typed / clicked /
 *   scrolled) and when that is reached you submit the answers.  When it's off, I have to press the plane."
 * - ONE per page (`forPage()`), shared by the page's Send (`<epic-send-buttons>`):
 *   a Send drawn again (a guide's, at every redraw of its comments) finds the countdown where it was
 * - the MODE:  on by default, remembered per viewer for every page (`COUNTDOWN_KEY`;  decision Q6)
 * - it RUNS only while the mode is on and something waits (`pending`, which the Send sets)
 *   - every key, click, wheel, scroll or input on the page starts it again (`activity()`, from `watch()`)
 *   - it ticks every second (`COUNTDOWN_TICK_MS`), so the Send's ring drains, and fires on the tick that reaches 0
 * - at 0:  `onFire()`'s listeners, once;  the Send sends, as Review Now did (decision Q7)
 *   - it stops, and starts again only once the Send says something waits again (`setPending()`):
 *     a send that failed tries again 2 minutes later, never in a loop
 * - Node-safe at import:  nothing touches `window` until `forPage()` or `watch()`;
 *   its clock, timers and storage come in through `SendCountdownOptions`, so tests run it on fake timers
 * - Position in the import graph:  its peer `review.types` only.
 *   NEVER imports Solid, Spell UI or the `spell-epic` barrel:  the element follows it through `subscribe()`.
 ****************/
export class SendCountdown {
  /** Bumped on every change:  the mode, a start, a tick, a stop. */
  version = 0

  /** How long a quiet page waits before it sends, ms. */
  readonly delay: number

  constructor(private readonly options: SendCountdownOptions = {}) {
    this.delay = options.delay ?? COUNTDOWN_MS
  }

  ////////////////
  // ## The page's countdown
  ////////////////

  /** The page's countdown, once made. */
  private static current: SendCountdown | undefined

  /**
   * The page's countdown, made on the first call (browser only), on the page's own clock and storage.
   * - SIDE EFFECT:  the first call watches the page for Owen at work (`watch()`)
   */
  static forPage(): SendCountdown {
    if (SendCountdown.current) return SendCountdown.current
    const countdown = new SendCountdown({ storage: storageOf(window) })
    SendCountdown.current = countdown
    countdown.watch(window)
    return countdown
  }

  /** Make `countdown` the page's from now on (`undefined`:  the next `forPage()` makes one):  tests. */
  static adopt(countdown: SendCountdown | undefined) {
    SendCountdown.current = countdown
  }

  ////////////////
  // ## The mode
  ////////////////

  /** Countdown mode:  on unless this browser was told off (`COUNTDOWN_KEY`).  NEVER throws. */
  get isOn(): boolean {
    try {
      return this.options.storage?.getItem(COUNTDOWN_KEY) !== "off"
    } catch {
      return true
    }
  }

  /**
   * Turn countdown mode on or off, and remember it for every page in this browser.
   * - on, with something waiting:  it starts;  off:  it stops
   * - a storage that refuses (blocked site data):  the mode holds for this page only (`modeHere`)
   */
  toggle(on = !this.isOn) {
    try {
      this.options.storage?.setItem(COUNTDOWN_KEY, on ? "on" : "off")
    } catch {
      // blocked site data:  this page only
    }
    this.modeHere = on
    if (on && this.isPending) this.start()
    else this.stop()
    this.changed()
  }

  /** The mode as last set on this page, when storage didn't keep it. */
  private modeHere: boolean | undefined

  /** The mode in force:  as set on this page, else as remembered. */
  get isOnHere(): boolean {
    return this.modeHere ?? this.isOn
  }

  ////////////////
  // ## Running
  ////////////////

  /** Something waits to be sent:  the Send says so (`setPending()`). */
  isPending = false

  /** When the countdown last started, by `now()`;  `undefined` while it isn't running. */
  startedAt: number | undefined

  /** Is it counting down? */
  get isRunning(): boolean {
    return this.startedAt !== undefined
  }

  /** How much of the wait is left, `1` (just started) to `0`;  `0` while it isn't running. */
  get fractionLeft(): number {
    if (this.startedAt === undefined) return 0
    return Math.max(0, 1 - (this.now() - this.startedAt) / this.delay)
  }

  /** How long until it sends, ms;  `0` while it isn't running. */
  get msLeft(): number {
    return Math.round(this.fractionLeft * this.delay)
  }

  /**
   * Whether something waits to be sent, from the page's Send.
   * - waiting, the mode on, not running yet:  it starts
   * - nothing waiting:  it stops
   */
  setPending(pending: boolean) {
    this.isPending = pending
    if (pending && this.isOnHere && !this.isRunning) this.start()
    else if (!pending && this.isRunning) this.stop()
  }

  /** Owen did something on the page:  a running countdown starts again from the top. */
  activity() {
    if (!this.isRunning) return
    this.startedAt = this.now()
    this.changed()
  }

  /** Start counting from the top, ticking until it fires or stops. */
  private start() {
    this.startedAt = this.now()
    this.timer ??= this.every(() => this.tick(), COUNTDOWN_TICK_MS)
    this.changed()
  }

  /** Stop counting;  nothing fires. */
  private stop() {
    this.startedAt = undefined
    this.timer?.()
    this.timer = undefined
    this.changed()
  }

  /** A second gone:  the ring drains;  at 0, it stops and fires. */
  private tick() {
    if (this.fractionLeft > 0) return this.changed()
    this.stop()
    for (const listener of [...this.fireListeners]) listener()
  }

  /** The running ticker's undo. */
  private timer: (() => void) | undefined

  ////////////////
  // ## Listeners
  ////////////////

  private readonly listeners = new Set<() => void>()
  private readonly fireListeners = new Set<() => void>()

  /** Call `listener` on every change;  returns the undo. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Call `listener` when the countdown reaches 0:  the Send sends;  returns the undo. */
  onFire(listener: () => void): () => void {
    this.fireListeners.add(listener)
    return () => this.fireListeners.delete(listener)
  }

  /** Everyone told something changed. */
  private changed() {
    this.version++
    for (const listener of this.listeners) listener()
  }

  ////////////////
  // ## Watching the page
  ////////////////

  /**
   * Hear Owen at work in `window` (`ACTIVITY_EVENTS`), and in each same-origin frame as it loads;  returns the undo.
   * - capture listeners on the window:  they hear events inside shadow roots too (a key in a note box)
   *   - a scroll never bubbles:  the capture hears every scrolling box's
   * - a frame from another origin can't be heard:  only what's typed or clicked around it
   */
  watch(window: Window): () => void {
    const undos: (() => void)[] = []
    const watched = new WeakSet<Window>()
    const onActivity = () => this.activity()
    const listen = (target: Window) => {
      if (watched.has(target)) return
      watched.add(target)
      for (const type of ACTIVITY_EVENTS) target.addEventListener(type, onActivity, { capture: true, passive: true })
      undos.push(() => {
        for (const type of ACTIVITY_EVENTS) target.removeEventListener(type, onActivity, { capture: true })
      })
    }
    const frameOf = (target: EventTarget | null) => {
      if ((target as Element | null)?.localName !== "iframe") return
      const frame = (target as HTMLIFrameElement).contentWindow
      try {
        if (frame?.document) listen(frame)
      } catch {
        // another origin:  not ours to hear
      }
    }
    // a frame's load never bubbles:  the capture hears it
    const onLoad = (event: Event) => frameOf(event.target)
    listen(window)
    for (const frame of window.document.querySelectorAll("iframe")) frameOf(frame)
    window.document.addEventListener("load", onLoad, true)
    undos.push(() => window.document.removeEventListener("load", onLoad, true))
    return () => {
      for (const undo of undos) undo()
    }
  }

  ////////////////
  // ## Clock
  ////////////////

  /** The time now, ms. */
  private now(): number {
    return (this.options.now ?? Date.now)()
  }

  /** Call `fn` every `ms`;  returns the undo. */
  private every(fn: () => void, ms: number): () => void {
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  }
}

/** What a `SendCountdown` runs on;  the page's own by default. */
export type SendCountdownOptions = {
  /** where the mode is remembered (`localStorage`);  `null` / none:  nowhere, so it's on */
  storage?: Storage | null
  /** the clock, ms.  Default:  `Date.now` (which fake timers move) */
  now?: () => number
  /** how long a quiet page waits, ms.  Default:  `COUNTDOWN_MS`, 2 minutes */
  delay?: number
}

/** `window`'s localStorage, or `null` where reading it throws (blocked site data). */
function storageOf(window: Window): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
