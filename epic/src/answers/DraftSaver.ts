// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { StoragePlace } from "spell/util/persist/StoragePlace"
import { clockOf, storageNow, type ServerLink, type StorageFinder } from "spell/epic/review"

import { ANSWER_RETRY_MS, type DraftState } from "./answers.types"

/****************
 * ### `DraftSaver`
 * A DRAFT THAT SAVES ITSELF as Owen types (epic `coherence` C10):  the one way every page he types into keeps what's
 * typed and not sent, so nothing lives only in the open page.
 * - Its users:  the answer pages' forms (`AnswerForm`, `ChoicesForm`, `RunForm`), the review note (`<epic-review>`),
 *   a test's comment (`<epic-test-run>`), the docs pages' comments (`spell-doc-comments.js`), the syntax page.
 * - Each hands it what differs:  the save call (`save`), the wait after the last change (`wait`), and the key of the
 *   browser's own copy (`key`, optional).
 * - What it does for all of them:
 *   - saves `wait` ms after the last change (`changed()`), or at once (`changed({ now: true })`);
 *     one save at a time, in order:  a later save never lands before an earlier one
 *   - a save that fails says so (`state`), and tries again every `retry` ms (3s) until one goes through:
 *     a page server back on its address takes it, its new token too (`ServerLink`), no keystroke, no reload
 *   - as the page goes away (`watch()`:  `pagehide`, the page hidden), sends at once, a request that outlives the page
 *   - off the page server (`link.isServed`):  saves nothing, says so;  the browser's copy is all there is
 *   - the browser's copy (`keep()`, `kept()`, `drop()`):  through the kit's `StoragePlace`, so a browser that blocks
 *     storage keeps it in memory for the visit, logged, and nothing throws
 *   - ONE wording of where it stands (`text`):  "not saved yet", "saving…", "saved 14:04",
 *     "kept in this browser only:  <why>"
 * - NOT on the kit's `after()` (the plan's wish):  `spell/element`'s leaves are neither shared with a pack nor allowed
 *   in the docs bundles (`bundle-spell-ui.js`), and this goes in both;  plain timers, cancelled the same way.
 * - Node-safe at import;  `window` only in `watch()`.
 * - Position in the import graph:  `spell/epic/review` (the link's type, `storageNow()`), its peer types, the kit's
 *   util.  NEVER imports Solid or Spell UI:  callers bridge `onChange` into their own state.
 ****************/
export class DraftSaver {
  /** Where the draft stands (`DraftState`). */
  state: DraftState = { kind: "idle" }

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

  constructor(private readonly props: DraftSaverProps) {}

  ////////////////
  // ## Saving
  ////////////////

  /**
   * Something Owen typed changed:  save `wait` ms after the last change;  `now`:  at once (a pick, a tick).
   * - a failure keeps showing until a save goes through
   */
  changed({ now = false }: { now?: boolean } = {}) {
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
   * Done with this draft (sent, or what it saved is gone):  nothing left to save, no timer, the browser's copy
   * dropped, and nothing said.
   * - a save on its way says nothing when it lands
   */
  done() {
    this.round++
    this.stop()
    this.isUnsaved = false
    this.drop()
    this.setState({ kind: "idle" })
  }

  /** Stop its timers:  the page or element is going (no save is lost:  `watch()` sent it). */
  stop() {
    this.cancelTimer()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = undefined
  }

  /**
   * Say `text` where the draft stands (`state`), e.g. "draft from 14:02 put back";  until the next change or save.
   * - `isError`:  in red, as a failed save ("can't load what you typed:  ...")
   */
  tell(text: string, { isError = false }: { isError?: boolean } = {}) {
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
  keep(value: unknown) {
    if (this.props.key) PrefStore.setAt(this.props.key, value, this.copies)
  }

  /** The browser's copy, or `undefined` (none, no `key`). */
  kept<T>(): T | undefined {
    return this.props.key ? (PrefStore.getAt(this.props.key, this.copies) as T | undefined) : undefined
  }

  /** Drop the browser's copy. */
  drop() {
    if (this.props.key) PrefStore.setAt(this.props.key, undefined, this.copies)
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
        return `saved ${clockOf(state.at)}`
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
    if (this.props.link && !this.props.link.isServed) {
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
    return this.props.retry ?? ANSWER_RETRY_MS
  }

  /** Stop the save waiting for typing to stop. */
  private cancelTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
  }

  /** `state` now `state`;  the caller hears it. */
  private setState(state: DraftState) {
    this.state = state
    this.props.onChange?.()
  }

  /**
   * Where the browser's copy is kept:  `props.storage` (default `localStorage`), through `PrefStore`.
   * - None, or storage that throws (blocked, full):  this page's memory, logged.
   */
  private copies = new StoragePlace({
    storage: () => ("storage" in this.props ? storageNow(this.props.storage) : globalThis.localStorage),
    description: "this browser"
  })
}

/** What a `DraftSaver` is handed:  what differs from one page to the next. */
export type DraftSaverProps = {
  /**
   * Save what's typed to the page server;  resolves to when it was saved (ISO, the server's stamp), or nothing
   * (now);  throws why not, in words (`ServerLink.post()`'s `ServerWriteError`).
   * - `keepalive`:  the page is going away:  `fetch`'s `keepalive`
   */
  save: (options: { keepalive: boolean }) => Promise<string | undefined | void>
  /** How long after the last change it saves, ms:  500 for a form, 10 000 for a review note. */
  wait: number
  /** How long after a failed save it tries again, ms;  default `ANSWER_RETRY_MS` (3s). */
  retry?: number
  /** The browser's copy's key, `<store>:<key>` (`spell-details-draft:/epics/x/details/q.html`);  none:  no copy. */
  key?: string
  /** Where the browser's copy is kept;  default `localStorage`;  `null`:  memory only (tests, a private window). */
  storage?: StorageFinder
  /** The page server:  off it (`isServed`), nothing is saved;  none:  `save` decides. */
  link?: ServerLink
  /** Called whenever `state` changes. */
  onChange?: () => void
}
