import { E } from "spell-ui/core"
// Import directly to avoid circular import:  spell-element imports nothing of Spell UI, so it has always loaded first
import { state } from "spell/element"

/****************
 * ### `ClipboardCopy`
 * A copy button's job:  text to the clipboard, then "Copied" for a moment.
 * - The copy itself is the kit's `copyText()` (`E.copyText()`), which works in VS Code's side bar too.
 * - Shared by `<ui-code>`'s copy button and `<ui-theme-editor>`'s Copy CSS.
 * - Reactive (`isCopied`), so a component draws from it:  `this.clipboard.isCopied ? "Copied" : "Copy"`.
 ****************/
export class ClipboardCopy {
  /** Just copied, for `seconds`:  the button says so. */
  @state accessor isCopied = false

  /** How long `isCopied` stays true, in seconds. */
  readonly seconds: number

  /** Pending end of `isCopied`. */
  private copiedTimer?: E.CancelablePromise<unknown>

  constructor({ seconds = DEFAULT_SECONDS }: { seconds?: number } = {}) {
    this.seconds = seconds
  }

  /**
   * Put `text` on the clipboard;  true when it got there, and `isCopied` for `seconds`.
   * - A copy that's refused leaves `isCopied` as it was.
   * - NEVER throws
   */
  async copy(text: string): Promise<boolean> {
    if (!(await E.copyText(text))) return false
    this.isCopied = true
    this.copiedTimer?.cancel()
    this.copiedTimer = E.after(this.seconds, () => (this.isCopied = false))
    return true
  }
}

/** How long a copy button says "Copied" by default, in seconds. */
const DEFAULT_SECONDS = 2
