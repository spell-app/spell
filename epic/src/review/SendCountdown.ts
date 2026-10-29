// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { StoragePlace } from "spell/util/persist/StoragePlace"
import { every, soon } from "spell/util/timing"
import {
  ACTIVITY_EVENTS,
  AUTO_SEND_CHOICES,
  AUTO_SEND_KEY,
  AUTO_SEND_MS,
  COUNTDOWN_TICK_MS,
  DEFAULT_AUTO_SEND,
  storageNow,
  type AutoSend,
  type StorageFinder
} from "./review.types"
import { PageStore } from "./PageStore"

/****************
 * ### `SendCountdown`
 * A page's COUNTDOWN to Send:  with Auto Send on and something waiting to be sent,
 * it sends by itself once Owen has left the page alone for the time he chose (epic `epic-engine` P20, P53).
 * - Owen, 2026-10-29:  "Send works on a 2-minute no interaction timer ... Pressing it sends immediately.  Turning it
 *   off could be from a gear menu in the epic page header"
 * - ONE per page (`forPage()`, a `PageStore`), shared by the page's Send (`<epic-send-buttons countdown>`) and the
 *   page header's gear:  a Send drawn again finds the countdown where it was
 * - the CHOICE (`choice`, `AUTO_SEND_CHOICES`):  Immediately, 2 minutes (the default), 5 minutes or Off,
 *   remembered per viewer for every page (`AUTO_SEND_KEY`;  decision Q6)
 * - it RUNS while Auto Send is on and something waits (`pending`, which the Send sets)
 *   - every key, click, wheel, scroll or input on the page starts it again (`activity()`, from `watch()`);
 *     a pointer just moving doesn't (J141)
 *   - a note box with the focus and words in it HOLDS it full (`isHeld`, J144):  leaving the box starts the wait
 *   - it ticks every second (`COUNTDOWN_TICK_MS`), so the Send's ring drains, and fires on the tick past the end
 *   - the time is read off the clock, never counted in ticks:  a hidden page, whose timers the browser slows, sends on
 *     its next tick or as it shows again, never minutes late (J141)
 *   - Immediately:  it fires on the next turn of the page's work, or as soon as the note box lets go
 * - at the end:  `onFire()`'s listeners, once;  the Send asks its owner to send, as a press would, waking the epic
 *   when nobody listens (Q59, B)
 *   - it stops, and starts again only once the Send says something waits again (`setPending()`):
 *     a send that failed tries again after another wait, never in a loop
 * - Node-safe at import:  nothing touches `window` until `forPage()` or `watch()`;
 *   its clock, timers, storage and note-box check come in through `SendCountdownOptions`, so tests run it on fake
 *   timers
 * - Position in the import graph:  `spell/util`'s timing and persist files, its peers `review.types` and
 *   `PageStore`.  NEVER imports Solid, Spell UI or the `spell-epic` barrel:  the elements follow it through
 *   `subscribe()`.
 ****************/
export class SendCountdown extends PageStore {
  constructor(private readonly options: SendCountdownOptions = {}) {
    super()
  }

  ////////////////
  // ## The page's countdown
  ////////////////

  /**
   * The page's countdown, made on the first call (browser only), on the page's own clock and storage;
   * its `version` bumped on every change:  the choice, a start, a tick, a stop.
   * - SIDE EFFECT:  the first call watches the page for Owen at work (`watch()`)
   * - a test hands it its own, on fake timers (`adopt()`)
   */
  static forPage(): SendCountdown {
    return SendCountdown.onePerPage(() => {
      // a browser that blocks it throws here:  `StoragePlace` keeps the choice in memory then
      const countdown = new SendCountdown({
        storage: () => window.localStorage,
        isHeld: () => SendCountdown.isTypingIn(window.document)
      })
      countdown.watch(window)
      return countdown
    })
  }

  /**
   * Does `document`'s focus sit in a text box with words in it (a note box, a comment, a field)?
   * Through shadow roots, to the box itself.  NEVER throws.
   * - STATIC:  it reads the page, not a countdown
   */
  static isTypingIn(document: Document): boolean {
    let active: Element | null = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    if (!active) return false
    const box = active as HTMLInputElement
    if (active.localName === "textarea" || (active.localName === "input" && TEXT_INPUTS.test(box.type)))
      return box.value.trim() !== ""
    return !!(active as HTMLElement).isContentEditable && !!active.textContent?.trim()
  }

  ////////////////
  // ## The choice
  ////////////////

  /** Auto Send as chosen:  as set on this page, else as remembered in this browser, else 2 minutes.  NEVER throws. */
  get choice(): AutoSend {
    if (this.choiceHere) return this.choiceHere
    const kept = PrefStore.getAt(AUTO_SEND_KEY, this.choices)
    return AUTO_SEND_CHOICES.includes(kept as AutoSend) ? (kept as AutoSend) : DEFAULT_AUTO_SEND
  }

  /** Where the choice is kept:  `options.storage`, through `PrefStore`;  none:  this page's memory. */
  private choices = new StoragePlace({ storage: () => storageNow(this.options.storage), description: "this browser" })

  /** The choice as last made on this page:  it holds when storage refuses to keep it. */
  private choiceHere: AutoSend | undefined

  /**
   * Choose Auto Send's `choice`, and remember it for every page in this browser.
   * - on, with something waiting:  a fresh wait of the new length;  off:  it stops
   * - a storage that refuses (blocked site data):  the choice holds for this page only
   */
  choose(choice: AutoSend) {
    PrefStore.setAt(AUTO_SEND_KEY, choice, this.choices)
    this.choiceHere = choice
    if (this.isOn && this.isPending) this.start()
    else this.stop()
    this.changed()
  }

  /** Auto Send is on:  any choice but Off. */
  get isOn(): boolean {
    return this.choice !== "off"
  }

  /** How long a quiet page waits before it sends, ms:  `0` for Immediately (and Off, which never runs). */
  get delay(): number {
    const choice = this.choice
    return choice === "off" ? 0 : AUTO_SEND_MS[choice]
  }

  ////////////////
  // ## Running
  ////////////////

  /** Something waits to be sent:  the Send says so (`setPending()`). */
  isPending = false

  /** When the wait last started, by `now()`;  `undefined` while it isn't running. */
  startedAt: number | undefined

  /** Is it counting down? */
  get isRunning(): boolean {
    return this.startedAt !== undefined
  }

  /** Is it counting down with a RING to draw:  running, and not Immediately. */
  get hasRing(): boolean {
    return this.isRunning && this.delay > 0
  }

  /** How much of the wait is left, `1` (just started, or held) to `0`;  `0` while it isn't running, or Immediately. */
  get fractionLeft(): number {
    if (this.startedAt === undefined || this.delay <= 0) return 0
    return Math.max(0, 1 - (this.now() - this.startedAt) / this.delay)
  }

  /** How long until it sends, ms;  `0` while it isn't running. */
  get msLeft(): number {
    return Math.round(this.fractionLeft * this.delay)
  }

  /** A note box holds it:  the focus in a text box with words (`options.isHeld`;  none:  never). */
  get isHeld(): boolean {
    try {
      return this.options.isHeld?.() ?? false
    } catch {
      return false
    }
  }

  /**
   * Whether something waits to be sent, from the page's Send.
   * - waiting, Auto Send on, not running yet:  it starts
   * - nothing waiting:  it stops
   */
  setPending(pending: boolean) {
    this.isPending = pending
    if (pending && this.isOn && !this.isRunning) this.start()
    else if (!pending && this.isRunning) this.stop()
  }

  /** Owen did something on the page:  a running countdown starts again from the top. */
  activity() {
    if (!this.isRunning) return
    this.startedAt = this.now()
    this.changed()
  }

  /**
   * Check the clock now, as a tick does:  the page shown again (a hidden page's timers are slowed), or a note box let
   * go (Immediately sends then).
   */
  check() {
    if (this.isRunning) this.tick()
  }

  /** Start counting from the top, ticking until it fires or stops;  Immediately, a check right after this turn. */
  private start() {
    this.startedAt = this.now()
    this.timer ??= every(COUNTDOWN_TICK_MS / 1000, () => this.tick())
    this.changed()
    if (this.delay <= 0) {
      this.unsoon?.()
      this.unsoon = soon(() => this.check())
    }
  }

  /** Stop counting;  nothing fires. */
  private stop() {
    this.startedAt = undefined
    this.timer?.()
    this.timer = undefined
    this.unsoon?.()
    this.unsoon = undefined
    this.changed()
  }

  /** A second gone:  held, the wait starts again;  else the ring drains;  past the end, it stops and fires. */
  private tick() {
    if (!this.isRunning) return
    if (this.isHeld) {
      this.startedAt = this.now()
      return this.changed()
    }
    if (this.fractionLeft > 0) return this.changed()
    this.stop()
    for (const listener of [...this.fireListeners]) listener()
  }

  /** The running ticker's undo. */
  private timer: (() => void) | undefined

  /** Immediately's pending check's undo. */
  private unsoon: (() => void) | undefined

  ////////////////
  // ## Firing
  ////////////////

  /** Called when the countdown reaches 0. */
  private readonly fireListeners = new Set<() => void>()

  /** Call `listener` when the countdown reaches 0:  the Send sends;  returns the undo. */
  onFire(listener: () => void): () => void {
    this.fireListeners.add(listener)
    return () => this.fireListeners.delete(listener)
  }

  ////////////////
  // ## Watching the page
  ////////////////

  /**
   * Hear Owen at work in `window` (`ACTIVITY_EVENTS`), and in each same-origin frame as it loads;  returns the undo.
   * - the page shown again, and the focus leaving a box:  a check of the clock (`check()`), never activity
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
    // the page shown again, or a box let go (after the focus has moved):  read the clock now (J141, J144)
    const onCheck = () => {
      soon(() => this.check())
    }
    window.document.addEventListener("visibilitychange", onCheck)
    window.addEventListener("focusout", onCheck, true)
    undos.push(() => {
      window.document.removeEventListener("visibilitychange", onCheck)
      window.removeEventListener("focusout", onCheck, true)
    })
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
}

/** What a `SendCountdown` runs on;  the page's own by default. */
export type SendCountdownOptions = {
  /**
   * where the choice is remembered (`localStorage`, or what finds it);  `null` / none:  nowhere, so 2 minutes
   * - a finder that throws (blocked site data):  this page's memory (`StoragePlace`)
   */
  storage?: StorageFinder
  /** the clock, ms.  Default:  `Date.now` (which fake timers move) */
  now?: () => number
  /** is a note box being typed in (the focus in a text box with words)?  Default:  never */
  isHeld?: () => boolean
}

/** The `<input type>`s that take typed words:  a box with words in it holds the countdown. */
const TEXT_INPUTS = /^(text|search|url|email|tel|)$/
