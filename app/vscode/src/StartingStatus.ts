import * as vscode from "vscode"

/****************
 * ### `StartingStatus`
 * What VS Code's status bar says while Spell's language server starts, and reads the project the first file is in
 * (epic `editor` T181, from Q92's F):  a spinner and a few words, gone once the file's colours and errors can come.
 * - "Spell:  starting…", from the moment the server is asked to start (`show()`)
 * - "Spell:  reading your project…", once it's running (`reading()`), until the first file's problems come back
 *   (`ready()`):  by then it has read and checked what the file imports, so hover and errors answer
 * - never stuck:  it goes by itself after `LONGEST_WAIT_MSEC`, and when the server fails to start (`ready()` too)
 * - its words are English, inline, as all of the extension's are
 * - Why:  opening a Spell file, its colours, hover and errors came only once the server had read the project,
 *   seconds later, and nothing said why they weren't there yet.
 ****************/
export class StartingStatus {
  /** The status bar item, left of the language's own items;  gone (`undefined`) once ready. */
  private item: vscode.StatusBarItem | undefined
  /** What hides it after `LONGEST_WAIT_MSEC`. */
  private timer: ReturnType<typeof setTimeout> | undefined

  /**
   * Show "Spell:  starting…" in the status bar, now.
   * - SIDE EFFECT:  the item is in `context.subscriptions`, so it goes with the extension.
   */
  static show(context: vscode.ExtensionContext): StartingStatus {
    const status = new StartingStatus()
    const item = vscode.window.createStatusBarItem("spell.starting", vscode.StatusBarAlignment.Left)
    item.name = "Spell"
    item.tooltip = STARTING_TOOLTIP
    context.subscriptions.push(item, { dispose: () => status.ready() })
    status.item = item
    status.say(STARTING)
    status.timer = setTimeout(() => status.ready(), LONGEST_WAIT_MSEC)
    return status
  }

  /** The server is running:  "Spell:  reading your project…", until `ready()`. */
  reading(): void {
    this.say(READING)
  }

  /**
   * The first file's problems came back, or the server didn't start:  the item goes, for good.
   * - NEVER throws;  a second call does nothing.
   */
  ready(): void {
    clearTimeout(this.timer)
    this.item?.dispose()
    this.item = undefined
  }

  /** Is it still showing? */
  get isShowing(): boolean {
    return !!this.item
  }

  /** Show `words` beside the spinner. */
  private say(words: string) {
    if (!this.item) return
    this.item.text = `$(loading~spin) ${words}`
    this.item.show()
  }
}

/** What the item says while the server starts. */
export const STARTING = "Spell:  starting…"
/** What the item says while the server reads the project the first file is in. */
export const READING = "Spell:  reading your project…"
/** The item's tooltip, while it shows. */
const STARTING_TOOLTIP = "Colors, hover and errors show up once Spell has read your project."
/** The most the item shows, whatever happens:  a server that never answers can't leave it spinning. */
export const LONGEST_WAIT_MSEC = 120_000
