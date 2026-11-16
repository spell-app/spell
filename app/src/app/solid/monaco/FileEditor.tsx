import { createMemo } from "solid-js"

import type { SP } from "spell/parser/spell"

import { SpellMonaco } from "spell/app/app/ui/monaco"
import { MonacoEditor, type MonacoEditorProps } from "./MonacoEditor"

/****************
 * ### `<FileEditor>`
 * `<MonacoEditor>` showing `file`'s model -- see `SpellModels`, which keeps it and the file in step.
 * - No `file` yet => a placeholder saying so.
 * - Remount it per file for a fresh editor each, e.g. `<Show when={path()} keyed>`.
 * - The model is a memo:  `modelFor()` has side effects (it may dispose of another project's models), so it runs
 *   once per `file`, not once per read of `model`.
 * - Room above the first line (`FILE_OPTIONS`), so its band stands clear of the file tabs above the pane.
 * - SEE:  its App UI components page, `app/docs/FileEditor.html` (`/components/app/FileEditor.html`).
 ****************/
export function FileEditor(props: FileEditorProps) {
  const model = createMemo(() => (props.file ? SpellMonaco.models.modelFor(props.file) : undefined))
  return (
    <MonacoEditor
      model={model()}
      value={props.file ? undefined : "Loading"}
      options={FILE_OPTIONS}
      onMount={props.onMount}
      onUnmount={props.onUnmount}
    />
  )
}

/**
 * The code pane's options, over `SpellMonaco.OPTIONS`.
 * - 9px of room above the first line, so its band's top is 12px under the file tabs,
 *   as far as every band is from the pane's left edge (`MonacoEditor.css`;  Owen, epic `editor` I187:
 *   "12px padding around").
 *   - The band starts ~2.7px into its line:  9px + 2.7px ~== 12px (11.7px).
 *   - Whole pixels:  Monaco rounds `padding.top` down (9.5 => 9).
 *   The bubbly shapes follow, since Monaco counts it in every line's top (`getTopForLineNumber()`).
 *   - Was 5px (I179), the band 7.7px down.
 * - Here, not in `SpellMonaco.OPTIONS`:  the Inspector's code boxes (`CodeSlice`) and the diff keep their own room.
 */
const FILE_OPTIONS: MonacoEditorProps["options"] = { padding: { top: 9 } }

/** Props for `<FileEditor>`. */
export type FileEditorProps = Pick<MonacoEditorProps, "onMount" | "onUnmount"> & {
  /** File to edit, if we have one yet. */
  file: SP.AnySpellFile | undefined
}
