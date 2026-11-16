import { after, type CancelablePromise } from "spell/util/timing"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import type { HoverMode } from "spell/app/app/ui/codePopups"
import { monaco } from "./monaco"

/****************
 * ### `ErrorHover`
 * An error's message on a plain hover over its squiggle, while the hover info waits for ⌥ (epic `editor` I97).
 * - Owen:  "Monaco is saying this is an error but I can't bring up the error popup".
 *   Monaco's own hover shows errors and info together, and only while ⌥ is held (`codePopups`, "Only with ⌥ held"):
 *   this shows the errors by themselves, without it.
 * - Errors, warnings and notes:  every squiggle under the mouse, each its own row.
 * - Only while Monaco's own hover doesn't show by itself:  hover "Only with ⌥ held" or "Never".
 *   - With ⌥ held, it gives way to Monaco's, which shows the errors too, with the info.
 *   - "Always":  Monaco's shows them.
 * - Waits as Monaco's hover does (its `hover.delay`);  goes as the mouse leaves the squiggle, or at a key, a scroll
 *   or an edit.
 * - Wears Monaco's hover look, `.monaco-hover`, which the app themes (`MonacoEditor.css`).
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
 * - When it shows is `CodeEditorFeatures.showsErrorsAlone()`, the rule CodeMirror's `CodeMirrorHovers` follows too.
 ****************/
export class ErrorHover implements monaco.editor.IContentWidget {
  /** The popup:  one row per error. */
  private readonly node = document.createElement("div")
  /** The errors shown, or about to be;  none:  hidden. */
  private shown: monaco.editor.IMarker[] = []
  /** Where the popup points:  the first error's start. */
  private position: monaco.IPosition | null = null
  /** Shows it, once the hover's delay has passed. */
  private timer: CancelablePromise<void> | undefined
  /** In the editor's content widgets? */
  private isAdded = false

  constructor(private readonly editor: monaco.editor.ICodeEditor) {
    this.node.className = "monaco-hover ErrorHover"
    editor.onMouseMove((event) => this.moved(event))
    editor.onMouseLeave(() => this.hide())
    editor.onKeyDown(() => this.hide())
    editor.onDidScrollChange(() => this.hide())
    editor.onDidChangeModelContent(() => this.hide())
    editor.onDidChangeModel(() => this.hide())
    editor.onDidDispose(() => this.hide())
  }

  ////////////////
  // ## The mouse
  ////////////////

  /** The mouse moved over the editor:  show the errors under it, after the hover's delay. */
  private moved(event: monaco.editor.IEditorMouseEvent): void {
    const { enabled, delay } = this.editor.getOption(monaco.editor.EditorOption.hover)
    // Monaco's own hover shows them:  always, or now, with ⌥ held
    const mode = HOVER_MODE_OF[String(enabled)] ?? "always"
    const isMonacos = !CodeEditorFeatures.showsErrorsAlone(mode, event.event.altKey)
    const { position } = event.target
    const model = this.editor.getModel()
    const under =
      isMonacos || !model || !position || event.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT
        ? []
        : errorsAt(model, position)
    if (sameErrors(under, this.shown)) return
    this.hide()
    if (!under.length) return
    this.shown = under
    this.timer = after(delay / 1000, () => this.show())
  }

  /** Show `shown`, under or over the first one's start. */
  private show(): void {
    const [first] = this.shown
    if (!first) return
    this.position = { lineNumber: first.startLineNumber, column: first.startColumn }
    this.node.replaceChildren(
      ...this.shown.map((error) => {
        const row = document.createElement("div")
        row.className = `hover-contents ErrorHoverRow ${SEVERITY_CLASS[error.severity] ?? ""}`
        row.textContent = error.message
        return row
      })
    )
    if (this.isAdded) this.editor.layoutContentWidget(this)
    else this.editor.addContentWidget(this)
    this.isAdded = true
  }

  /** Hide it, and forget what was about to show. */
  private hide(): void {
    this.timer?.cancel()
    this.timer = undefined
    this.shown = []
    if (!this.isAdded) return
    this.editor.removeContentWidget(this)
    this.isAdded = false
  }

  ////////////////
  // ## Monaco's content widget
  ////////////////

  /** Draws outside the editor's box, as Monaco's hover does:  near the top or bottom it isn't clipped. */
  readonly allowEditorOverflow = true

  getId(): string {
    return "spell.errorHover"
  }

  getDomNode(): HTMLElement {
    return this.node
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    const { ABOVE, BELOW } = monaco.editor.ContentWidgetPositionPreference
    return this.position && { position: this.position, preference: [ABOVE, BELOW] }
  }
}

/** The hover mode each of Monaco's `hover.enabled` is (`codePopups`' `HOVER_ENABLED`, the other way round). */
const HOVER_MODE_OF: Partial<Record<string, HoverMode>> = {
  onKeyboardModifier: "withAlt",
  on: "always",
  true: "always",
  off: "never",
  false: "never"
}

/** The class of each row, for its kind of error. */
const SEVERITY_CLASS: Partial<Record<monaco.MarkerSeverity, string>> = {
  [monaco.MarkerSeverity.Error]: "is-error",
  [monaco.MarkerSeverity.Warning]: "is-warning",
  [monaco.MarkerSeverity.Info]: "is-info"
}

/** The errors, warnings and notes whose squiggle is under `position` in `model`:  not hints, which draw no squiggle. */
function errorsAt(model: monaco.editor.ITextModel, position: monaco.IPosition): monaco.editor.IMarker[] {
  return monaco.editor
    .getModelMarkers({ resource: model.uri })
    .filter((marker) => marker.severity > monaco.MarkerSeverity.Hint && monaco.Range.containsPosition(marker, position))
}

/** Are `a` and `b` the same errors, in the same order? */
function sameErrors(a: readonly monaco.editor.IMarker[], b: readonly monaco.editor.IMarker[]): boolean {
  return a.length === b.length && a.every((marker, index) => marker === b[index])
}
