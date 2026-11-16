import { Compartment, type Extension } from "@codemirror/state"
import { ViewPlugin, type EditorView } from "@codemirror/view"

import { codeLook } from "spell/app/app/ui/codePopups"

/****************
 * ### `CodeMirrorLook`
 * The page's look on a CodeMirror editor:  bubbly, or not, as the code pane's "..." menu, "Settings…",
 * "Bubbly look" says (`codeLook`, one for the page, which Monaco's `SpellBubbly` follows too).
 * - Each state holds the look in a compartment of its own:  `drawn(true)` while it's on, `drawn(false)` while it's off,
 *   e.g. a Spell file bubbly (`CodeMirrorBubbly`) or coloured by its tokens (`CodeMirrorTokens`).
 * - The view showing a state follows the setting as it changes;  a state shown again takes the setting it missed.
 * - Its position in the import graph:  CodeMirror, and the page's code settings;  never Monaco.
 ****************/
export class CodeMirrorLook {
  /**
   * The extension switching a state's look with the page's setting.
   * - `drawn(isBubbly)`:  what the state takes with the look on, and off;  each asked for once
   */
  static extension(drawn: (isBubbly: boolean) => Extension): Extension {
    const look = new Compartment()
    const looks = new Map<boolean, Extension>()
    const lookFor = (isBubbly: boolean) => {
      if (!looks.has(isBubbly)) looks.set(isBubbly, drawn(isBubbly))
      return looks.get(isBubbly)!
    }
    /** Take the page's look now, if the view shows the other. */
    const follow = (view: EditorView) => {
      const wanted = lookFor(codeLook.isBubbly)
      if (look.get(view.state) !== wanted) view.dispatch({ effects: look.reconfigure(wanted) })
    }
    const follower = ViewPlugin.define((view) => {
      let isDestroyed = false
      const now = () => {
        if (!isDestroyed) follow(view)
      }
      codeLook.followers.add(now)
      // shown again after the setting changed:  in a microtask, never inside the view's own update
      queueMicrotask(now)
      return {
        destroy: () => {
          isDestroyed = true
          codeLook.followers.delete(now)
        }
      }
    })
    return [look.of(lookFor(codeLook.isBubbly)), follower]
  }
}
