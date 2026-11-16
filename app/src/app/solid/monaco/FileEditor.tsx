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
 * - 12px of room above the first line:  its band sat right under the file tabs' hairline (Owen, epic `editor` I179:
 *   "Need more padding above the first line of the file").
 *   The bubbly shapes follow, since Monaco counts it in every line's top (`getTopForLineNumber()`).
 * - Here, not in `SpellMonaco.OPTIONS`:  the Inspector's code boxes (`CodeSlice`) and the diff keep their own room.
 */
const FILE_OPTIONS: MonacoEditorProps["options"] = { padding: { top: 12 } }

/** Props for `<FileEditor>`. */
export type FileEditorProps = Pick<MonacoEditorProps, "onMount" | "onUnmount"> & {
  /** File to edit, if we have one yet. */
  file: SP.AnySpellFile | undefined
}
