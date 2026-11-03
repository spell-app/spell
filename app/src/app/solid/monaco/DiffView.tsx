import { onCleanup } from "solid-js"

import { monaco } from "spell/app/app/ui/monaco"

/****************
 * ### `<DiffView>`
 * Two texts side by side, read only, their differences marked:  Monaco's diff editor (epic `editor` P24).
 * - What Publish shows when the published file changed since your draft began (Q25):  theirs left, yours right.
 * - Its own models, made for it and disposed with it:  never a file's, so nothing here is an edit.
 ****************/
export function DiffView(props: DiffViewProps) {
  const language = props.language ?? "spell"
  const original = monaco.editor.createModel(props.theirs, language)
  const modified = monaco.editor.createModel(props.mine, language)
  let diff: monaco.editor.IStandaloneDiffEditor | undefined
  onCleanup(() => {
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
          diff = monaco.editor.createDiffEditor(element, DIFF_OPTIONS)
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
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  // only what changed, and a few lines round it:  the rest folds away
  hideUnchangedRegions: { enabled: true }
}

/** Props for `<DiffView>`. */
export type DiffViewProps = {
  /** the published text, shown left */
  theirs: string
  /** your draft, shown right */
  mine: string
  /** Monaco's language for both, default `spell` */
  language?: string
}
