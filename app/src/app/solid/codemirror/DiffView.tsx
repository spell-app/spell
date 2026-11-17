import { onSettled, untrack } from "solid-js"

import { CodeMirrorMerge } from "spell/app/app/ui/codemirror"

/****************
 * ### `<DiffView>`
 * Two texts side by side, their differences marked:  CodeMirror's merge view (`CodeMirrorMerge`).
 * - What Publish shows when the published file changed since your draft began (epic `editor` Q25):
 *   yours left, the result, to edit;  theirs right, read only (epic `editor` T101).
 *   - an arrow on each change, in the centre column, takes that block from theirs into yours
 *   - taken, it turns into an undo icon in the same place:  a click puts yours back
 *   - each change hands your side's whole text to `onChange`
 * - Its own texts, never a file's state:  nothing here is an edit to a file.
 * - Unchanged stretches fold away, a few lines kept round each change.
 * - Spell is drawn bubbly on both sides, as the code pane is, while the look is on (`codeLook`).
 * - Its texts are read once, as it's made.
 ****************/
export function DiffView(props: DiffViewProps) {
  let element!: HTMLDivElement
  onSettled(() => {
    const merge = untrack(
      () =>
        new CodeMirrorMerge(element, {
          theirs: props.theirs,
          mine: props.mine,
          words: props.words,
          // read now:  always the latest
          onChange: (mine) => props.onChange?.(mine)
        })
    )
    untrack(() => props.onMerge?.(merge))
    return () => merge.destroy()
  })
  return <div class="DiffView" ref={(div: HTMLDivElement) => (element = div)} />
}

/** Props for `<DiffView>`. */
export type DiffViewProps = {
  /** the published text, shown right */
  theirs: string
  /** your draft, shown left */
  mine: string
  /** the centre column's tooltips, in the page's language */
  words: { take: string; putBack: string }
  /** your side's text after each change */
  onChange?: (mine: string) => void
  /** the merge view, once it's made:  its undo and redo, for the dialog's keys */
  onMerge?: (merge: CodeMirrorMerge) => void
}
