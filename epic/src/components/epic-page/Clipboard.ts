/****************
 * ### `Clipboard`
 * Putting text on the clipboard from an epic element, in a browser tab or VS Code's side bar.
 * - Used by `<epic-page>` (a heading's name, a meta line's code, the review line) and `<epic-choices-bar>`
 *   (Copy my answers, epic `epic-engine` P15).
 * - Browser only.
 ****************/
export class Clipboard {
  /**
   * Put `value` on the clipboard;  true when it got there.
   * - the async Clipboard API first
   * - where it's refused (a webview without the permission):  the old `execCommand("copy")` from a hidden textarea,
   *   as the old page runtime's `copyText()`
   * - NEVER throws
   */
  static async copy(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      try {
        const area = document.createElement("textarea")
        area.value = value
        area.setAttribute("readonly", "")
        area.style.cssText = "position: fixed; opacity: 0; pointer-events: none"
        document.body.append(area)
        area.select()
        const copied = document.execCommand("copy")
        area.remove()
        return copied
      } catch {
        return false
      }
    }
  }
}
