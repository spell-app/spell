// Import directly:  the persist barrel would bring the database and server places too
import type { StorageLike } from "spell/util/persist/persist.types"
import { PrefStore } from "spell/util/persist/PrefStore"
import { StoragePlace } from "spell/util/persist/StoragePlace"
import { clockTime } from "spell/util/time"

/** How long after a failed save it tries again, ms, unless it's told otherwise. */
export const SAVE_RETRY_MS = 3000

/**
 * Where a `SaveQueue` stands:
 * - `"idle"`:  nothing to say
 * - `"unsaved"`:  something changed, and its save is waiting
 * - `"saving"`:  a save is on its way
 * - `"saved"`:  the last save went through, `at` then
 * - `"told"`:  what the page said to show, `tell()`
 * - `"failed"`:  the last save failed, `why`, and it's trying again
 * - `"off server"`:  it can't save from this page at all (`isOffServer`)
 */
export type SaveState =
  | { kind: "idle" }
  | { kind: "unsaved" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "told"; text: string; isError?: boolean }
  | { kind: "failed"; why: string }
  | { kind: "off server" }

/****************
 * ### `BrowserCopy`
 * One value kept in the browser, under one key:  what's typed or pending, there for the next visit.
 * - Through `StoragePlace`, so a browser that blocks storage keeps it in memory for the visit, logged,
 *   and nothing throws.
 * - No key:  nothing is kept.
 ****************/
export class BrowserCopy {
  constructor(private readonly props: BrowserCopyProps) {}

  /** Keep `value`, at once. */
  keep(value: unknown): void {
    if (this.props.key) PrefStore.setAt(this.props.key, value, this.place)
  }

  /** What's kept, or `undefined` (none, no key). */
  kept<T>(): T | undefined {
    return this.props.key ? (PrefStore.getAt(this.props.key, this.place) as T | undefined) : undefined
  }

  /** Forget what's kept. */
  drop(): void {
    if (this.props.key) PrefStore.setAt(this.props.key, undefined, this.place)
  }

  /** Where it's kept:  `props.storage`, or the browser's `localStorage`. */
  private place = new StoragePlace({
    storage: () => (this.props.storage ? this.props.storage() : globalThis.localStorage),
    description: "this browser"
  })
}

/** What a `BrowserCopy` is handed. */
export type BrowserCopyProps = {
  /** Its key, `<store>:<key>`, e.g. `spell-details-draft:/epics/x/details/q.html`.  None:  nothing is kept. */
  key?: string
  /** Finds where it's kept;  default `localStorage`;  answering nothing:  memory only (tests, a private window). */
  storage?: () => StorageLike | undefined
}

/****************
 * ### `SaveQueue`
 * The ONE way to save something in the background, in order, until it goes through (epic `data` P3).
 * - Its two users hand it what differs, the save call above all:
 *   - `DraftSaver` (`spell/epic/answers/DraftSaver`):  sends a draft's latest whole text
 *   - `PendingChanges`:  sends every change, each with an id that must resend until its outcome is known
 * - What it does for them:
 *   - saves `wait` ms after the last change (`changed()`), or at once (`changed({ now: true })`);
 *     one save at a time, in order:  a later save never lands before an earlier one
 *   - a save that fails says so (`state`), and tries again every `retry` ms (3s) until one goes through
 *   - as the page goes away (`watch()`:  `pagehide`, the page hidden), sends at once, a request that outlives the page
 *   - off the page server (`isOffServer`):  saves nothing, says so;  the browser's copy is all there is
 *   - the browser's copy (`keep()`, `kept()`, `drop()`):  `BrowserCopy`
 *   - ONE wording of where it stands (`text`):  "not saved yet", "saving…", "saved 14:04",
 *     "kept in this browser only:  <why>"
 * - Plain timers, not `spell/util/timing`:  it goes in the docs bundles, whose every leaf is counted.
 * - Node-safe at import;  `window` only in `watch()`.
 * - Imports only preferences' files and `spell/util/time`, by file:  never this folder's barrel, so a page that only
 *   types pays for no place.
 ****************/
export class SaveQueue {
  /** Where it stands (`SaveState`). */
  state: SaveState = { kind: "idle" }

  /** Something changed since the last save went through. */
  isUnsaved = false

  /** The save waiting for typing to stop. */
  private timer: ReturnType<typeof setTimeout> | undefined

  /** The next try after a save failed (`retry`). */
  private retryTimer: ReturnType<typeof setTimeout> | undefined

  /** The saves queued, one at a time. */
  private saving: Promise<boolean> = Promise.resolve(true)

  /** How many saves are queued or on their way. */
  private inFlight = 0

  /** Bumped by `done()`:  a save that was on its way says nothing after it. */
  private round = 0

  /** The browser's copy. */
  private readonly copy: BrowserCopy

  constructor(private readonly props: SaveQueueProps) {
    this.copy = new BrowserCopy({
      ...(props.key !== undefined && { key: props.key }),
      ...(props.storage && { storage: props.storage })
    })
  }

  ////////////////
  // ## Saving
  ////////////////

  /**
   * Something changed:  save `wait` ms after the last change;  `now`:  at once (a pick, a tick).
   * - a failure keeps showing until a save goes through
   */
  changed({ now = false }: { now?: boolean } = {}): void {
    this.isUnsaved = true
    this.cancelTimer()
    if (now) {
      void this.save()
      return
    }
    this.timer = setTimeout(() => void this.save(), this.props.wait)
    if (this.state.kind !== "failed" && this.state.kind !== "off server") this.setState({ kind: "unsaved" })
  }

  /**
   * Save now, if anything changed since the last save;  after any save on its way.
   * - `keepalive`:  the page is going away;  the request outlives it
   * - resolves to whether nothing is left unsaved
   * - NEVER throws:  a failure is `state`, and it tries again in `retry` ms
   */
  save({ keepalive = false }: { keepalive?: boolean } = {}): Promise<boolean> {
    this.cancelTimer()
    const run = () => this.saveQueued(keepalive)
    // none on its way:  it starts NOW, in this task (a click right after a key keeps its order);  else after it
    const saving = this.inFlight ? this.saving.then(run) : run()
    this.inFlight++
    void saving.finally(() => this.inFlight--)
    this.saving = saving
    return saving
  }

  /** Once the saves queued now have landed (or failed):  whether nothing is left unsaved.  NEVER rejects. */
  get settled(): Promise<boolean> {
    return this.saving
  }

  /** Is a save waiting for typing to stop, or on its way? */
  get isPending(): boolean {
    return !!this.timer || this.state.kind === "saving"
  }

  /**
   * Done with this (sent, or what it saved is gone):  nothing left to save, no timer, the browser's copy
   * dropped, and nothing said.
   * - a save on its way says nothing when it lands
   */
  done(): void {
    this.round++
    this.stop()
    this.isUnsaved = false
    this.drop()
    this.setState({ kind: "idle" })
  }

  /** Stop its timers:  the page or element is going (no save is lost:  `watch()` sent it). */
  stop(): void {
    this.cancelTimer()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = undefined
  }

  /**
   * Say `text` where it stands (`state`), e.g. "draft from 14:02 put back";  until the next change or save.
   * - `isError`:  in red, as a failed save ("can't load what you typed:  ...")
   */
  tell(text: string, { isError = false }: { isError?: boolean } = {}): void {
    this.setState({ kind: "told", text, ...(isError && { isError }) })
  }

  ////////////////
  // ## Leaving
  ////////////////

  /**
   * Save at once as `window`'s page goes away (`pagehide`, or the page hidden), a request that outlives it;
   * returns the undo, which also stops the timers.
   * - SIDE EFFECT:  listens on `window` and its document until undone
   */
  watch(window: Window): () => void {
    const leaving = () => void this.save({ keepalive: true })
    const hidden = () => {
      if (window.document.visibilityState === "hidden") leaving()
    }
    window.addEventListener("pagehide", leaving)
    window.document.addEventListener("visibilitychange", hidden)
    return () => {
      window.removeEventListener("pagehide", leaving)
      window.document.removeEventListener("visibilitychange", hidden)
      this.stop()
    }
  }

  ////////////////
  // ## The browser's copy
  ////////////////

  /** Keep `value` as the browser's copy, at once (no `key`:  nothing). */
  keep(value: unknown): void {
    this.copy.keep(value)
  }

  /** The browser's copy, or `undefined` (none, no `key`). */
  kept<T>(): T | undefined {
    return this.copy.kept<T>()
  }

  /** Drop the browser's copy. */
  drop(): void {
    this.copy.drop()
  }

  ////////////////
  // ## Where it stands
  ////////////////

  /**
   * Where it stands, in the one wording every page uses:  "not saved yet", "saving…", "saved 14:04",
   * "kept in this browser only:  <why>;  trying again every 3s";  `""` for nothing to say.
   * - a page that speaks other languages words `state` itself (`<epic-review>`'s vocabulary)
   */
  get text(): string {
    const state = this.state
    switch (state.kind) {
      case "idle":
        return ""
      case "unsaved":
        return "not saved yet"
      case "saving":
        return "saving…"
      case "saved":
        return `saved ${clockOfSave(state.at)}`
      case "told":
        return state.text
      case "off server":
        return "kept in this browser only:  this page isn't on the page server"
      default:
        /* "failed" */ return `kept in this browser only:  ${state.why};  trying again every ${this.retry / 1000}s`
    }
  }

  /** The last save failed, or can't be made (off the page server):  `text` says why. */
  get isError(): boolean {
    const state = this.state
    return state.kind === "failed" || state.kind === "off server" || (state.kind === "told" && !!state.isError)
  }

  ////////////////
  // ## Internal
  ////////////////

  /** `save()`'s work, one at a time. */
  private async saveQueued(keepalive: boolean): Promise<boolean> {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    if (!this.isUnsaved) return true
    if (this.props.isOffServer?.()) {
      this.setState({ kind: "off server" })
      return false
    }
    const round = this.round
    this.isUnsaved = false
    // a failure stays in view while it tries again
    if (this.state.kind !== "failed") this.setState({ kind: "saving" })
    try {
      const at = await this.props.save({ keepalive })
      if (round !== this.round) return true
      this.setState({ kind: "saved", at: at ?? new Date().toISOString() })
      return !this.isUnsaved
    } catch (failure) {
      // done meanwhile (sent):  nothing left to save
      if (round !== this.round) return true
      this.isUnsaved = true
      this.setState({ kind: "failed", why: (failure as Error).message.replace(/[.!]$/, "") })
      this.retryTimer = setTimeout(() => void this.save(), this.retry)
      return false
    }
  }

  /** How long after a failed save it tries again, ms. */
  private get retry(): number {
    return this.props.retry ?? SAVE_RETRY_MS
  }

  /** Stop the save waiting for typing to stop. */
  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
  }

  /** `state` now `state`;  the caller hears it. */
  private setState(state: SaveState): void {
    this.state = state
    this.props.onChange?.()
  }
}

/** What a `SaveQueue` is handed:  what differs from one user to the next. */
export type SaveQueueProps = {
  /**
   * Save what's changed;  resolves to when it was saved (ISO, the server's stamp), or nothing (now);
   * throws why not, in words.
   * - `keepalive`:  the page is going away:  `fetch`'s `keepalive`
   */
  save: (options: { keepalive: boolean }) => Promise<string | undefined | void>
  /** How long after the last change it saves, ms:  500 for a form, 10 000 for a review note. */
  wait: number
  /** How long after a failed save it tries again, ms;  default `SAVE_RETRY_MS` (3s). */
  retry?: number
  /** The browser's copy's key:  `BrowserCopyProps.key`. */
  key?: string
  /** Finds where the browser's copy is kept:  `BrowserCopyProps.storage`. */
  storage?: () => StorageLike | undefined
  /** Is this page off the server it saves to?  Then nothing is saved.  None:  `save` decides. */
  isOffServer?: () => boolean
  /** Called whenever `state` changes. */
  onChange?: () => void
}

/** ISO time `iso` as the viewer's clock time, `14:42`;  `""` for one it can't read. */
function clockOfSave(iso: string): string {
  const date = new Date(iso)
  return isNaN(date.getTime()) ? "" : clockTime(date)
}
