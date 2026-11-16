import { type Diagnostic, forEachDiagnostic, linter } from "@codemirror/lint"
import type { Extension } from "@codemirror/state"
import { type EditorView, hoverTooltip, type Tooltip, ViewPlugin } from "@codemirror/view"

import { HOVER_DELAY } from "spell/app/app/ui/codePopups"
import { CodeMirrorPopups } from "./CodeMirrorPopups"

/****************
 * ### `CodeMirrorHovers`
 * The hover's ⌥ rule in a CodeMirror editor, and an error's message on a plain hover over its squiggle
 * (epic `codemirror` P5):
 * - ⌥ (Alt) followed:  `isAltHeld(view)`, as of the mouse's last move or the last key;
 *   the hover's info shows by `CodeEditorFeatures.showsHoverInfo()` with it (`CodeMirrorLanguage`)
 * - ⌥ pressed while the mouse rests on a word:  the info hover comes up without moving the mouse
 *   (a mouse move replayed where it rests);  it waits `HOVER_DELAY` as any hover does
 * - errors, warnings and notes under the mouse:  each its own row, once the mouse rests `HOVER_DELAY`
 *   - in EVERY hover mode:  where the hover shows them alone (`CodeEditorFeatures.showsErrorsAlone()`) or in its own
 *     hover with the info, CodeMirror's hovers show together in one popup, the errors a section of it
 *   - so the rule needs no asking here:  the info's section comes and goes by it, the errors' stays
 * - CodeMirror's own problems popup (`@codemirror/lint`'s, which waits 300 ms whatever's asked) is left empty and
 *   hidden (`codemirror.css`):  these rows replace it
 * - The problems themselves are each file's state's, `setDiagnostics()` (`FileStates`).
 * - Its position in the import graph:  CodeMirror, the app's code settings.
 ****************/
export class CodeMirrorHovers {
  /** ⌥ followed, and the errors' hover, for an editor of a Spell file. */
  static extension(): Extension {
    return [
      ALT,
      // CodeMirror's own problems popup, empty:  its rows are `errorsAt()`'s
      linter(null, { tooltipFilter: () => [] }),
      hoverTooltip((view, pos, side) => errorsAt(view, pos, side), { hoverTime: HOVER_DELAY * 1000 })
    ]
  }

  /** Is ⌥ (Alt) held in `view`, as of the mouse's last move over it or the last key? */
  static isAltHeld(view: EditorView): boolean {
    return view.plugin(ALT)?.isAltHeld ?? false
  }
}

////////////////
// ## ⌥
////////////////

/**
 * Follows ⌥ for its editor:  from the mouse over it, and from the keys, the window's, so the focus can be anywhere.
 * - ⌥ pressed with the mouse resting on the editor, in hover "Only with ⌥ held":  a mouse move replayed where it
 *   rests, so the hover looks again.
 */
const ALT = ViewPlugin.fromClass(
  class {
    /** ⌥ held, as of the mouse's last move or the last key. */
    isAltHeld = false
    /** Where the mouse last moved over the editor;  none once it left. */
    private rest: { x: number; y: number } | undefined

    constructor(readonly view: EditorView) {
      window.addEventListener("keydown", this.keyChanged, true)
      window.addEventListener("keyup", this.keyChanged, true)
      window.addEventListener("blur", this.blurred)
    }

    destroy(): void {
      window.removeEventListener("keydown", this.keyChanged, true)
      window.removeEventListener("keyup", this.keyChanged, true)
      window.removeEventListener("blur", this.blurred)
    }

    /** The mouse moved over the editor:  ⌥ as it says, and where it rests. */
    moved(event: MouseEvent): void {
      this.isAltHeld = event.altKey
      this.rest = { x: event.clientX, y: event.clientY }
    }

    /** The mouse left the editor. */
    left(): void {
      this.rest = undefined
    }

    /** A key went down or up:  ⌥ as it says;  ⌥ pressed over a word asks the hover to look again. */
    private readonly keyChanged = (event: KeyboardEvent) => {
      const wasHeld = this.isAltHeld
      this.isAltHeld = event.altKey
      if (event.type !== "keydown" || event.key !== "Alt" || event.repeat || wasHeld || !this.rest) return
      if (CodeMirrorPopups.of(this.view.state).hoverInfo !== "withAlt") return
      this.replayMove(this.rest)
    }

    /** The window lost the focus:  no key is held any more, as far as we'll hear. */
    private readonly blurred = () => {
      this.isAltHeld = false
    }

    /**
     * A mouse move where the mouse rests, ⌥ held:  the hover looks again, as if the mouse had moved there.
     * - HACK:  CodeMirror's hover listens for the mouse only;  this is the one way to ask it.
     */
    private replayMove({ x, y }: { x: number; y: number }): void {
      const root = this.view.root as Document | ShadowRoot
      const move = new MouseEvent("mousemove", { bubbles: true, composed: true, clientX: x, clientY: y, altKey: true })
      root.elementFromPoint(x, y)?.dispatchEvent(move)
    }
  },
  {
    eventHandlers: {
      mousemove(event) {
        this.moved(event)
      },
      mouseleave() {
        this.left()
      }
    }
  }
)

////////////////
// ## Errors
////////////////

/**
 * The errors, warnings and notes whose squiggle is under `pos`:  one row each, a section of the hover.
 * - Not hints, which draw no squiggle.
 * - `side`:  which side of `pos` the mouse is, as CodeMirror's hovers say:
 *   a squiggle ending at `pos` counts only from its left.
 */
function errorsAt(view: EditorView, pos: number, side: -1 | 1): Tooltip | null {
  const under: { diagnostic: Diagnostic; from: number; to: number }[] = []
  forEachDiagnostic(view.state, (diagnostic, from, to) => {
    if (diagnostic.severity === "hint") return
    const isUnder = from === to ? pos === from : (pos > from || side > 0) && (pos < to || side < 0)
    if (pos >= from && pos <= to && isUnder) under.push({ diagnostic, from, to })
  })
  if (!under.length) return null
  return {
    pos: Math.min(...under.map(({ from }) => from)),
    end: Math.max(...under.map(({ to }) => to)),
    above: true,
    create: () => {
      const dom = document.createElement("div")
      dom.className = "cmb-errors"
      for (const { diagnostic } of under) {
        const row = document.createElement("div")
        row.className = `cmb-error-row is-${diagnostic.severity}`
        row.textContent = diagnostic.message
        dom.append(row)
      }
      return { dom }
    }
  }
}
