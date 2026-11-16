import { onCleanup } from "solid-js"

import { monaco } from "spell/app/app/ui/monaco"

/****************
 * ### `<DiffView>`
 * Two texts side by side, their differences marked:  Monaco's diff editor (epic `editor` P24).
 * - What Publish shows when the published file changed since your draft began (Q25):  theirs left, yours right.
 * - Its own models, made for it and disposed with it:  never a file's, so nothing here is an edit to a file.
 * - `onChange` given, YOUR side is the result, to edit (epic `editor` T75):
 *   - an arrow between the sides, on each change, takes that block from theirs into yours (Monaco's revert icon)
 *   - ⌘Z in your side puts it back, a block at a time
 *   - each change hands your side's whole text to `onChange`
 * - Without it, both sides are read only.
 * - Spell is drawn bubbly on both sides, as the code pane is, when the look is on (`SpellBubbly`, `codeLook`).
 ****************/
export function DiffView(props: DiffViewProps) {
  const language = props.language ?? "spell"
  const original = monaco.editor.createModel(props.theirs, language)
  const modified = monaco.editor.createModel(props.mine, language)
  const { onChange } = props
  const listening = onChange && modified.onDidChangeContent(() => onChange(modified.getValue()))
  let diff: monaco.editor.IStandaloneDiffEditor | undefined
  onCleanup(() => {
    listening?.dispose()
    diff?.dispose()
    original.dispose()
    modified.dispose()
  })
  return (
    <div
      class="DiffView"
      ref={(element: HTMLDivElement) => {
        // once it's in the page, so the editor can measure it
        queueMicrotask(() => {
          diff = monaco.editor.createDiffEditor(element, onChange ? MERGE_OPTIONS : DIFF_OPTIONS)
          diff.setModel({ original, modified })
        })
      }}
    />
  )
}

/** Read only, side by side, no minimap, unchanged lines folded. */
const DIFF_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  readOnly: true,
  originalEditable: false,
  automaticLayout: true,
  renderSideBySide: true,
  // side by side however narrow:  the headers above say which side is which
  useInlineViewWhenSpaceIsLimited: false,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  // only what changed, and a few lines round it:  the rest folds away
  hideUnchangedRegions: { enabled: true }
}

/** As `DIFF_OPTIONS`, your side editable, an arrow on each change to take theirs. */
const MERGE_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  ...DIFF_OPTIONS,
  readOnly: false,
  renderMarginRevertIcon: true,
  // the gutter's own menu repeats the arrow, as "Revert Block":  one way to do it
  renderGutterMenu: false
}

/** Props for `<DiffView>`. */
export type DiffViewProps = {
  /** the published text, shown left */
  theirs: string
  /** your draft, shown right */
  mine: string
  /** Monaco's language for both, default `spell` */
  language?: string
  /** your side's text after each change:  given, your side is editable, the result (see `<DiffView>`) */
  onChange?: (mine: string) => void
}
