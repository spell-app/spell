import { onSettled, untrack } from "solid-js"
import type { MergeView } from "@codemirror/merge"

import { SpellCodeMirror } from "spell/app/app/ui/codemirror"

/****************
 * ### `<DiffView>`
 * Two texts side by side, their differences marked:  CodeMirror's merge view (`SpellCodeMirror.merge()`).
 * - What Publish shows when the published file changed since your draft began (epic `editor` Q25):
 *   theirs left, read only;  yours right, the result, to edit (epic `editor` T75).
 *   - an arrow on each change takes that block from theirs into yours
 *   - ⌘Z in your side puts it back, a block at a time
 *   - each change hands your side's whole text to `onChange`
 * - Its own texts, never a file's state:  nothing here is an edit to a file.
 * - Unchanged stretches fold away, a few lines kept round each change.
 * - Spell is drawn bubbly on both sides, as the code pane is, while the look is on (`codeLook`).
 * - Its texts are read once, as it's made.
 ****************/
export function DiffView(props: DiffViewProps) {
  let element!: HTMLDivElement
  onSettled(() => {
    const merge: MergeView = untrack(() =>
      SpellCodeMirror.merge(element, {
        theirs: props.theirs,
        mine: props.mine,
        // read now:  always the latest
        onChange: (mine) => props.onChange?.(mine)
      })
    )
    return () => merge.destroy()
  })
  return <div class="DiffView" ref={(div: HTMLDivElement) => (element = div)} />
}

/** Props for `<DiffView>`. */
export type DiffViewProps = {
  /** the published text, shown left */
  theirs: string
  /** your draft, shown right */
  mine: string
  /** your side's text after each change */
  onChange?: (mine: string) => void
}
