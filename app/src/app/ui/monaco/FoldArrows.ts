import { monaco } from "./monaco"

/****************
 * ### `FoldArrows`
 * A press on a fold arrow folds or unfolds its block, wherever the arrow is drawn (epic `editor` I154).
 * - Drawn bubbly, the code starts closer to the pane's edge, and each arrow is drawn half over the code
 *   (`MonacoEditor.css`;  Owen:  "the vscode fold icons can overlap the pills").
 *   Monaco places a press by where it is, not what's under it, so it would take a press on that half as one on the code.
 * - So this takes every press on an arrow before Monaco does (a capturing listener), and folds through Monaco's own
 *   commands, `editor.fold` / `editor.unfold`:  no caret moves.
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
 ****************/
export class FoldArrows {
  constructor(private readonly editor: monaco.editor.ICodeEditor) {
    const container = editor.getContainerDomNode()
    container.addEventListener("pointerdown", this.pressed, { capture: true })
    container.addEventListener("mousedown", this.swallowed, { capture: true })
  }

  /** A press on a fold arrow:  fold or unfold its block, and Monaco hears nothing of it. */
  private readonly pressed = (event: PointerEvent) => {
    const arrow = arrowOf(event)
    if (!arrow || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const line = this.editor.getTargetAtClientPoint(event.clientX, event.clientY)?.position?.lineNumber
    if (!line) return
    const isFolded = arrow.classList.contains(FOLDED_CLASS)
    this.editor.trigger(FoldArrows.name, isFolded ? "editor.unfold" : "editor.fold", {
      levels: 1,
      selectionLines: [line - 1]
    })
  }

  /** The same press, as the mouse's. */
  private readonly swallowed = (event: MouseEvent) => {
    if (!arrowOf(event) || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
  }
}

/** The fold arrow `event` is on, if any. */
function arrowOf(event: Event): Element | undefined {
  return (event.target as Element | null)?.closest?.(ARROW_SELECTOR) ?? undefined
}

/** A fold arrow, in the margin before the code. */
const ARROW_SELECTOR = ".margin .cldr[class*='codicon-folding']"

/** The arrow of a folded block. */
const FOLDED_CLASS = "codicon-folding-collapsed"
