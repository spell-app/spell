import { Compartment, type EditorState, type Extension, Facet } from "@codemirror/state"
import { EditorView, ViewPlugin } from "@codemirror/view"

import {
  codeChoices,
  codeMirrorOptionsFor,
  hoverDelay,
  SUGGEST_DETAILS_HIDDEN,
  type CodeMirrorPopupOptions
} from "spell/app/app/ui/codePopups"
import { CodeMirrorPinned } from "./CodeMirrorPinned"

/****************
 * ### `CodeMirrorPopups`
 * The code editor's settings on a CodeMirror editor (epic `codemirror` P5):
 * Settings…' choices (`codeChoices`), as `codeMirrorOptionsFor()` says they're meant,
 * in a compartment of each state's own, changed live.
 * - Each feature reads the options where it decides, `CodeMirrorPopups.of(state)`:
 *   the hover's ⌥ rule, where suggestions show by themselves, signature help.
 * - What CodeMirror does itself (wrapping, the suggestions' details) is in the compartment too.
 * - The view showing a state follows the choices as they change;  a state shown again takes the ones it missed,
 *   as `CodeMirrorLook` does with the look.
 * - CodeMirror's own popup waits (a hover's `hoverTime`, the suggestion list's `activateOnTypingDelay`) are set as an
 *   extension is made:  `waiting()` makes them again, the page's `hoverDelay()`, as the choices change.
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
    return [popups.of(CodeMirrorPopups.extensionFor(codeMirrorOptionsFor(codeChoices.now))), followingChoices(follow)]
  }

  /**
   * What `make` makes for the page's popup wait now, in msec (`hoverDelay()`);  made again as it changes.
   * - For what CodeMirror waits by itself, set as it's made:
   *   `CodeMirrorPopups.waiting((msec) => hoverTooltip(source, { hoverTime: msec }))`.
   * - Followed through Settings… (`codeChoices`), which sets the wait (`--ui-hover-delay`) before it tells them;
   *   a theme changing it otherwise is taken at the next change of the choices.
   * - The code's own timers read `hoverDelay()` as they start instead.
   */
  static waiting(make: (msec: number) => Extension): Extension {
    const wait = new Compartment()
    /** Each extension made, to the wait it was made for. */
    const madeFor = new WeakMap<object, number>()
    const madeNow = () => {
      const msec = hoverDelay() * 1000
      const made = [make(msec)]
      madeFor.set(made, msec)
      return made
    }
    const follow = (view: EditorView) => {
      const made = wait.get(view.state)
      if (made && madeFor.get(made) === hoverDelay() * 1000) return
      view.dispatch({ effects: wait.reconfigure(madeNow()) })
    }
    return [wait.of(madeNow()), followingChoices(follow)]
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

/**
 * A plugin calling `follow` with its view as the page's code choices change (`codeChoices`), and once as it starts.
 * - As it starts:  in a microtask, never inside the view's own update;  a state shown again takes what it missed.
 */
function followingChoices(follow: (view: EditorView) => void): Extension {
  return ViewPlugin.define((view) => {
    let isDestroyed = false
    const now = () => {
      if (!isDestroyed) follow(view)
    }
    codeChoices.followers.add(now)
    queueMicrotask(now)
    return {
      destroy: () => {
        isDestroyed = true
        codeChoices.followers.delete(now)
      }
    }
  })
}

/** Do `a` and `b` say the same? */
function sameOptions(a: CodeMirrorPopupOptions, b: CodeMirrorPopupOptions): boolean {
  return (Object.keys(b) as (keyof CodeMirrorPopupOptions)[]).every((key) => a[key] === b[key])
}
