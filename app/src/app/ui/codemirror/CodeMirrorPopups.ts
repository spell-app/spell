import { Compartment, type EditorState, type Extension, Facet } from "@codemirror/state"
import { EditorView, ViewPlugin } from "@codemirror/view"

import {
  codeChoices,
  codeMirrorOptionsFor,
  SUGGEST_DETAILS_HIDDEN,
  type CodeMirrorPopupOptions
} from "spell/app/app/ui/codePopups"
import { CodeMirrorPinned } from "./CodeMirrorPinned"

/****************
 * ### `CodeMirrorPopups`
 * The code editor's settings on a CodeMirror editor:  Settings…' choices (`codeChoices`), as `codeMirrorOptionsFor()`
 * says they're meant, in a compartment of each state's own, changed live (epic `codemirror` P5).
 * - Each feature reads the options where it decides, `CodeMirrorPopups.of(state)`:  the hover's ⌥ rule,
 *   where suggestions show by themselves, signature help;  what CodeMirror does itself (wrapping, the suggestions'
 *   details) is in the compartment too.
 * - The view showing a state follows the choices as they change;  a state shown again takes the ones it missed,
 *   as `CodeMirrorLook` does with the look.
 * - Its position in the import graph:  CodeMirror, and the page's code settings.
 ****************/
export class CodeMirrorPopups {
  /** The extension following the page's choices. */
  static extension(): Extension {
    const popups = new Compartment()
    /** Take the choices now, if the view has others. */
    const follow = (view: EditorView) => {
      const wanted = codeMirrorOptionsFor(codeChoices.now)
      if (sameOptions(CodeMirrorPopups.of(view.state), wanted)) return
      view.dispatch({ effects: popups.reconfigure(CodeMirrorPopups.extensionFor(wanted)) })
    }
    const follower = ViewPlugin.define((view) => {
      let isDestroyed = false
      const now = () => {
        if (!isDestroyed) follow(view)
      }
      codeChoices.followers.add(now)
      // shown again after the choices changed:  in a microtask, never inside the view's own update
      queueMicrotask(now)
      return {
        destroy: () => {
          isDestroyed = true
          codeChoices.followers.delete(now)
        }
      }
    })
    return [popups.of(CodeMirrorPopups.extensionFor(codeMirrorOptionsFor(codeChoices.now))), follower]
  }

  /** The options `state` follows now:  the defaults' until its compartment says. */
  static of(state: EditorState): CodeMirrorPopupOptions {
    return state.facet(OPTIONS)
  }

  /**
   * What `options` make of an editor:  the options themselves, for the features to read;  long lines wrapped;
   * the suggestions' details hidden, by its class (`SUGGEST_DETAILS_HIDDEN`, `codemirror.css`).
   */
  private static extensionFor(options: CodeMirrorPopupOptions): Extension {
    return [
      OPTIONS.of(options),
      options.lineWrapping ? EditorView.lineWrapping : [],
      options.pinnedLines ? CodeMirrorPinned.extension() : [],
      options.suggestDetails ? [] : EditorView.editorAttributes.of({ class: SUGGEST_DETAILS_HIDDEN })
    ]
  }
}

/** Each state's options:  the last one given, else the page's choices as the page starts. */
const OPTIONS = Facet.define<CodeMirrorPopupOptions, CodeMirrorPopupOptions>({
  combine: (values) => values.at(-1) ?? codeMirrorOptionsFor(codeChoices.now)
})

/** Do `a` and `b` say the same? */
function sameOptions(a: CodeMirrorPopupOptions, b: CodeMirrorPopupOptions): boolean {
  return (Object.keys(b) as (keyof CodeMirrorPopupOptions)[]).every((key) => a[key] === b[key])
}
