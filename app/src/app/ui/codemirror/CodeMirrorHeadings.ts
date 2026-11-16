import { type Extension, RangeSetBuilder } from "@codemirror/state"
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"

/****************
 * ### `CodeMirrorHeadings`
 * Heading comments -- `#`, `##` ... at the start of a line, after any indent -- in bold, in a CodeMirror editor of
 * Spell (epic `codemirror` P5), as Monaco's `SpellHeadings` does.
 * - A mark from the first `#` to the line's end, classes `spell-heading spell-heading-<level>`, styled in
 *   `codemirror.css`:  so any look works, and each level can be styled on its own.
 * - Found by `CodeEditorFeatures.headingIn()`, straight from the text:  no waiting for a parse.
 * - Only the lines shown, worked out again as the text changes or scrolls:  one regex a line.
 * - Bold only with the bubbly look off:  the look draws a heading itself (`bubbly.css`, `.bubbly-heading`), its `#`s
 *   regular, so the marks here only name it there.
 * - Its position in the import graph:  CodeMirror and `CodeEditorFeatures`;  never Monaco.
 ****************/
export class CodeMirrorHeadings {
  /** The headings' marks, for an editor of a Spell file. */
  static extension(): Extension {
    return HEADINGS
  }
}

/** The marks on the headings shown, kept up to date. */
const HEADINGS = ViewPlugin.fromClass(
  class {
    /** A mark on each heading in the lines shown. */
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = headingsIn(view)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) this.decorations = headingsIn(update.view)
    }
  },
  { decorations: (plugin) => plugin.decorations }
)

/** A mark on each heading in the lines `view` shows. */
function headingsIn(view: EditorView): DecorationSet {
  const marks = new RangeSetBuilder<Decoration>()
  const { doc } = view.state
  for (const { from, to } of view.visibleRanges) {
    for (let at = from; at <= to;) {
      const line = doc.lineAt(at)
      const heading = CodeEditorFeatures.headingIn(line.text)
      if (heading && heading.end > heading.start)
        marks.add(line.from + heading.start, line.from + heading.end, MARKS[heading.level - 1]!)
      at = line.to + 1
    }
  }
  return marks.finish()
}

/** Each level's mark, from 1 to `CodeEditorFeatures.MAX_HEADING_LEVEL`. */
const MARKS = Array.from({ length: CodeEditorFeatures.MAX_HEADING_LEVEL }, (_, index) =>
  Decoration.mark({ class: `spell-heading spell-heading-${index + 1}` })
)
