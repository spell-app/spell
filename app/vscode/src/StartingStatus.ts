import * as vscode from "vscode"

/****************
 * ### `StartingStatus`
 * What VS Code's status bar says while Spell's language server starts, and while it reads the project
 * a Spell file is in (epic `editor` T181, from Q92's F):  a spinner and a few words, gone once the file's colours and
 * errors can come.
 * - "Spell:  starting…", from the moment the server is asked to start (`show()`)
 * - "Spell:  reading your project…", once it's running (`started()`), until the problems of every Spell file
 *   waiting have come back (`published()`):  by then it has read and checked what each file imports,
 *   so hover and errors answer
 * - and again for a Spell file opened later whose project hasn't been read yet (`opened()`):
 *   a file the server has already sent problems for is read, so it shows nothing
 *   - it waits `OPEN_DELAY_MSEC` before showing, so a project read at once doesn't flash it
 * - once shown, it stays at least `SHORTEST_SHOW_MSEC`, so a person can read it
 * - near the status bar's left end (`PRIORITY`), before the branch and the problem counts
 * - never stuck:  it goes by itself after `LONGEST_WAIT_MSEC`, and at once when the server fails to start (`stop()`)
 * - its words are English, inline, as all of the extension's are
 * - Why:  opening a Spell file, its colours, hover and errors came only once the server had read the project,
 *   seconds later, and nothing said why they weren't there yet.
 * - Knows nothing of the language server:  `extension.ts` tells it what happens, by each document's address.
 ****************/
export class StartingStatus {
  /** The status bar item:  made once, shown and hidden;  `undefined` once the extension goes. */
  private item: vscode.StatusBarItem | undefined
  /** Has the server started (`started()`)?  Until then the item says "starting". */
  private isStarted = false
  /** Is the item showing? */
  private isShown = false
  /** When it last came up, in msec (`Date.now()`). */
  private shownAt = 0
  /** Open Spell files whose problems haven't come back yet, by address. */
  private waiting = new Set<string>()
  /** Every file the server has sent problems for, by address:  its project is read. */
  private read = new Set<string>()
  /** What shows the item `OPEN_DELAY_MSEC` after a file opens. */
  private openTimer: ReturnType<typeof setTimeout> | undefined
  /** What hides it once it's shown `SHORTEST_SHOW_MSEC`. */
  private hideTimer: ReturnType<typeof setTimeout> | undefined
  /** What hides it after `LONGEST_WAIT_MSEC`. */
  private longestTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Show "Spell:  starting…" in the status bar, now.
   * - SIDE EFFECT:  the item is in `context.subscriptions`, so it goes with the extension.
   */
  static show(context: vscode.ExtensionContext): StartingStatus {
    const status = new StartingStatus()
    const item = vscode.window.createStatusBarItem("spell.starting", vscode.StatusBarAlignment.Left, PRIORITY)
    item.name = "Spell"
    item.tooltip = STARTING_TOOLTIP
    context.subscriptions.push(item, { dispose: () => status.dispose() })
    status.item = item
    status.say(STARTING)
    return status
  }

  /** A Spell file opened, or was open when the server was asked to start. */
  opened(uri: string): void {
    if (this.read.has(uri) || !this.item) return
    this.waiting.add(uri)
    if (!this.isStarted || this.isShown) return this.keepShowing()
    this.openTimer ??= setTimeout(() => {
      this.openTimer = undefined
      if (this.waiting.size) this.say(READING)
    }, OPEN_DELAY_MSEC)
  }

  /** A Spell file closed:  it waits no more. */
  closed(uri: string): void {
    if (this.waiting.delete(uri)) this.hideIfDone()
  }

  /** The server sent a file's problems:  its project is read. */
  published(uri: string): void {
    this.read.add(uri)
    if (this.waiting.delete(uri)) this.hideIfDone()
  }

  /** The server is running:  "Spell:  reading your project…" while a file waits;  else it goes. */
  started(): void {
    this.isStarted = true
    if (this.waiting.size) this.say(READING)
    else this.hideIfDone()
  }

  /**
   * The server didn't start:  the item goes at once, and nothing more is coming.
   * - NEVER throws.
   */
  stop(): void {
    this.waiting.clear()
    this.hide()
  }

  /** Is it showing? */
  get isShowing(): boolean {
    return this.isShown
  }

  ////////////////
  // ## Showing and hiding
  ////////////////

  /** Show `words` beside the spinner;  from hidden, it's shown now, and the longest wait starts. */
  private say(words: string) {
    if (!this.item) return
    this.keepShowing()
    this.item.text = `$(loading~spin) ${words}`
    if (this.isShown) return
    this.isShown = true
    this.shownAt = Date.now()
    this.item.show()
    this.longestTimer = setTimeout(() => this.stop(), LONGEST_WAIT_MSEC)
  }

  /** Something waits again:  a hide that's due is off. */
  private keepShowing() {
    clearTimeout(this.hideTimer)
    this.hideTimer = undefined
  }

  /** Nothing waits, and the server is running:  hide, once it's been shown `SHORTEST_SHOW_MSEC`. */
  private hideIfDone() {
    if (this.waiting.size || !this.isStarted) return
    clearTimeout(this.openTimer)
    this.openTimer = undefined
    if (!this.isShown) return
    const left = this.shownAt + SHORTEST_SHOW_MSEC - Date.now()
    if (left <= 0) return this.hide()
    this.hideTimer ??= setTimeout(() => this.hide(), left)
  }

  /** Hide it now, every timer off. */
  private hide() {
    for (const timer of [this.openTimer, this.hideTimer, this.longestTimer]) clearTimeout(timer)
    this.openTimer = this.hideTimer = this.longestTimer = undefined
    this.isShown = false
    this.item?.hide()
  }

  /** The extension goes:  so does the item. */
  private dispose() {
    this.stop()
    this.item = undefined
  }
}

/** What the item says while the server starts. */
export const STARTING = "Spell:  starting…"
/** What the item says while the server reads the project a file is in. */
export const READING = "Spell:  reading your project…"
/** The item's tooltip, while it shows. */
const STARTING_TOOLTIP = "Colors, hover and errors show up once Spell has read your project."
/**
 * Where it sits among the status bar's left items:  higher is further left.
 * - High, so it's near the left end, where it's seen, not past the branch, the problem counts and the rest.
 */
export const PRIORITY = 100_000
/** The least it shows, once shown:  long enough to read. */
export const SHORTEST_SHOW_MSEC = 1_500
/** How long a file opened later waits for its problems before the item shows:  a read project answers sooner. */
export const OPEN_DELAY_MSEC = 300
/** The most the item shows, whatever happens:  a server that never answers can't leave it spinning. */
export const LONGEST_WAIT_MSEC = 120_000
