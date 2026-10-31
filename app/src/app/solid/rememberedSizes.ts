import { createMemo, createSignal } from "solid-js"

import { editorPrefs } from "spell/app/app/editorPrefs"

import "./spell.css"
import "./SplitPane.css"

/**
 * The sizes of a `<ui-split-panel>` in the editor, remembered as the editor's preference `spellEditor:<id>`:
 * what it was last dragged to, else the sizes `layout()` starts with.
 * - `layout()`:  may change as panes come and go, each set of panes with its own `id` and sizes.
 * - Call in a component body;  hand `sizes()` to `columns` or `rows`, and `keep` to `on-ui-changed`;
 *   or `save()` the `sizes` of a `ui-changed` heard further up.
 * - Its pane's look is `SplitPane.css`, which comes with this.
 */
export function rememberedSizes(layout: () => { id: string; sizes: string }) {
  const [version, setVersion] = createSignal(0)
  const sizes = createMemo(() => {
    version()
    const { id, sizes: start } = layout()
    return editorPrefs.get<string>(id) || start
  })
  const save = (sizes: string) => {
    editorPrefs.set(layout().id, sizes)
    setVersion(version() + 1)
  }
  return {
    sizes,
    /** A `ui-changed`:  remember the sizes, if it's the panel's own, not a control's in one of its panes. */
    keep: (event: Event) => {
      if (event.target === event.currentTarget) save((event as CustomEvent<{ sizes: string }>).detail.sizes)
    },
    /** Remember `sizes`, as a `ui-changed` says them. */
    save,
    /** Forget what it was dragged to:  back to the sizes it starts with. */
    forget: () => {
      editorPrefs.forget(layout().id)
      setVersion(version() + 1)
    }
  }
}
