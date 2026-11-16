import { For, Show, createComponent, omit } from "solid-js"

import { SP } from "spell/parser/spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
// types only:  CodeMirror loads lazily
import type { SpellCodeMirror } from "spell/app/app/solid/codemirror"

import "./SpellEditorPane.css"

/****************
 * ### `<SpellEditorPane>`
 * What a `<spell-editor>` draws:  a tab per spell file, if it has more than one, the CodeMirror editor showing `file`,
 * and a status line.
 * - Holds NO state:  `SpellEditor` has it all, in signals it hands us as props.
 * - CodeMirror comes in `codeMirror` once it's loaded -- till then, a placeholder.
 * - Its `<FileEditor>` is drawn straight from that module:
 *   never imported here, so CodeMirror stays a lazy chunk.
 * - ONE editor for its life, whatever the file:
 *   it shows each file's state in turn, its undo and selection kept -- see `FileStates`.
 ****************/
export function SpellEditorPane(props: SpellEditorPaneProps) {
  return (
    <div class="SpellEditor">
      <Show when={props.files.length > 1}>
        <div class="SpellEditorTabs" role="tablist">
          <For each={props.files}>
            {(it) => (
              <button
                role="tab"
                aria-selected={it === props.file ? "true" : "false"}
                class={{ active: it === props.file }}
                onClick={() => props.onSelect(it)}
              >
                {SP.SpellProject.sourceNameOf(it.path)}
                <Show when={props.isDirty(it)}>
                  <span class="dirty" title={appTexts.text("editedSinceSaved")}></span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
      <div class="SpellEditorBody">
        <Show
          when={props.codeMirror && props.file}
          fallback={<div class="SpellEditorLoading">{appTexts.text("loadingEditor")}</div>}
        >
          <LazyEditor
            module={props.codeMirror!}
            file={props.file}
            hotkeys={props.hotkeys}
            onOpen={(location) => props.onOpen(location)}
            onMount={(editor) => props.onMount(editor)}
            onUnmount={(editor) => props.onUnmount(editor)}
          />
        </Show>
      </div>
      <div class={["SpellEditorStatus", props.status.state]}>
        <span class="message">{statusText(props.status)}</span>
        <span class="keys">{appTexts.text(props.saves === false ? "editorKeysNoSave" : "editorKeys")}</span>
      </div>
    </div>
  )
}

/** Props for `<SpellEditorPane>`. */
export type SpellEditorPaneProps = {
  /** Spell files to show a tab for. */
  files: SP.SpellFile[]
  /** File to show. */
  file: SP.SpellFile | undefined
  /** What the editor's doing. */
  status: SpellEditorStatus
  /** CodeMirror and our spell features, once loaded. */
  codeMirror: CodeMirrorModule | undefined
  /** Is `file` edited since it was saved?  Read in JSX:  the caller makes it reactive. */
  isDirty: (file: SP.SpellFile) => boolean
  /**
   * Do its edits save anywhere?  Default `true`.
   * - `false`:  the status line offers no Cmd+S (`<spell-editor static>`).
   */
  saves?: boolean
  /** A tab was clicked. */
  onSelect: (file: SP.SpellFile) => void
  /** The editor's keys:  see `FileEditor`'s `hotkeys`.  Read once, as the editor's made. */
  hotkeys: FileEditorProps["hotkeys"]
  /** Show `location`, in another of the project's files:  `true` if it did.  See `FileEditor`'s `onOpen`. */
  onOpen: NonNullable<FileEditorProps["onOpen"]>
  /** The editor shows its first file. */
  onMount: (editor: SpellCodeMirror) => void
  /** The editor is going. */
  onUnmount: (editor: SpellCodeMirror) => void
}

/****************
 * ### `<LazyEditor>`
 * `module`'s `<FileEditor>`, with the rest of our props.
 * - `module` is read once:  it's loaded once, and never changes.
 * - NOTE: `createComponent`, not JSX:  a component picked at run time.
 ****************/
function LazyEditor(props: LazyEditorProps) {
  return createComponent(props.module.FileEditor, omit(props, "module"))
}

/** Props for `<LazyEditor>`:  the loaded module, and its `<FileEditor>`'s. */
type LazyEditorProps = FileEditorProps & {
  /** The loaded `spell/app/app/solid/codemirror`. */
  module: CodeMirrorModule
}

/**
 * `spell/app/app/solid/codemirror`:  CodeMirror, Spell in it, and its Solid `<FileEditor>` --
 * loaded lazily, see `SpellEditor`.
 */
export type CodeMirrorModule = typeof import("spell/app/app/solid/codemirror")

/** Props of `<FileEditor>`, the editor we draw. */
type FileEditorProps = Parameters<CodeMirrorModule["FileEditor"]>[0]

/**
 * What a `<spell-editor>` is doing, for its status line.
 * - `loading`:  the project, or CodeMirror
 * - `compiling`:  saving what's edited, then compiling
 * - `compiled`:  compiled with no parse errors, and handed on
 * - `errors`:  compiled, but with `errors` parse errors -- so NOT handed on
 * - `saved`:  saved, e.g. on Cmd+S
 * - `failed`:  couldn't, with `message` saying why
 */
export type SpellEditorStatus =
  | { state: "loading" | "compiling" | "compiled" | "saved" }
  | { state: "errors"; errors: number }
  | { state: "failed"; message: string }

/** What the status line says for `status`, in the page's language. */
function statusText(status: SpellEditorStatus): string {
  switch (status.state) {
    case "loading":
      return appTexts.text("loading")
    case "compiling":
      return appTexts.text("compiling")
    case "compiled":
      return appTexts.text("compiled")
    case "saved":
      return appTexts.text("saved")
    case "errors":
      return appTexts.text(status.errors === 1 ? "parseError" : "parseErrors", { count: status.errors })
    case "failed":
      return status.message
  }
}
