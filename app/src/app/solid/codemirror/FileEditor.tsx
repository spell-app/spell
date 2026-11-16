import { createEffect, untrack } from "solid-js"
import type { EditorView } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellCodeMirror, type SpellCodeMirrorOptions } from "spell/app/app/ui/codemirror"
import { CodeMirrorEditor } from "./CodeMirrorEditor"

/****************
 * ### `<FileEditor>`
 * `<CodeMirrorEditor>` showing `file`'s state, from the page's `FileStates`, which keeps it and the file in step:
 * the twin of Monaco's `<FileEditor>`.
 * - A new `file` is shown in the SAME view:  the last one's state is kept, its undo, folds, selection and scroll,
 *   so switching back finds it as it was left.  No remount per file.
 * - No `file` yet:  a placeholder saying the editor's loading.
 * - `onMount` hands out the editor, `SpellCodeMirror`, once it shows a file.
 ****************/
export function FileEditor(props: FileEditorProps) {
  /** The view, once made. */
  let view: EditorView | undefined
  /** The editor of the view, once it shows a file. */
  let editor: SpellCodeMirror | undefined

  // Show a new `file` in the same view.
  createEffect(
    () => props.file,
    (file) => {
      showFile(file)
    }
  )

  return (
    <CodeMirrorEditor
      value={placeholder()}
      onMount={(made) => {
        view = made
        showFile(untrack(() => props.file))
      }}
      onUnmount={() => {
        editor?.release()
        if (editor) props.onUnmount?.(editor)
        editor = undefined
        view = undefined
      }}
    />
  )

  /**
   * What the view says till it has a file.
   * - A function, not a ternary in the JSX:  the compiler makes a conditional prop a memo on its first read, which
   *   `<CodeMirrorEditor>` does as it settles, where no memo may be made (`PRIMITIVE_IN_FORBIDDEN_SCOPE`).
   */
  function placeholder(): string | undefined {
    return props.file ? undefined : appTexts.text("loadingEditor")
  }

  /** Show `file` in the view, making its editor the first time.  SIDE EFFECT:  calls `onMount` once. */
  function showFile(file: SP.AnySpellFile | undefined) {
    if (!view || !file) return
    if (editor) {
      editor.show(file)
      return
    }
    editor = SpellCodeMirror.edit(view, {
      file,
      // read now:  always the latest
      onOpen: (location) => props.onOpen?.(location) ?? false,
      onContextMenu: (shown, at) => props.onContextMenu?.(shown, at)
    })
    props.onMount?.(editor)
  }
}

/** Props for `<FileEditor>`. */
export type FileEditorProps = Pick<SpellCodeMirrorOptions, "onOpen" | "onContextMenu"> & {
  /** File to edit, if we have one yet. */
  file: SP.AnySpellFile | undefined
  /** Called with the editor once it first shows a file. */
  onMount?: (editor: SpellCodeMirror) => void
  /** Called with the editor just before its view is destroyed. */
  onUnmount?: (editor: SpellCodeMirror) => void
}
