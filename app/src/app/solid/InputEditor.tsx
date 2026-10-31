import { Loading, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"

import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import type { monaco } from "spell/app/app/solid/monaco"
import { ErrorBoundary, tracked } from "spell/app/app/solid"
import { addCodeEditorKeys } from "spell/app/app/pages/editorHotkeys"
import { CodeSettings, CodeSettingsPanel } from "./CodeSettings"
import { FileTabs } from "./FileTabs"
import { LazyMonaco } from "./LazyMonaco"
import { PageLoading } from "./PageLoading"

import "./InputEditor.css"

/****************
 * ### `<InputRoot>`
 * The code column of `SpellEditor`:  the project's files as tabs (`<FileTabs>`), over the code (`<InputEditor>`).
 * - Its actions (Save, Revert File, New File, the line numbers, the code editor's settings) are the top bar's menus
 *   (epic `debut` P32).
 ****************/
export function InputRoot(props: InputRootProps) {
  return (
    <div class="InputRoot">
      <Show when={props.showToolbar ?? true}>
        <FileTabs />
      </Show>
      <InputEditor showError={editor.showError} />
    </div>
  )
}

/** Props for `<InputRoot>`. */
export type InputRootProps = {
  /** Show the file tabs (`<FileTabs>`) above the code.  Default:  `true`. */
  showToolbar?: boolean
}

/****************
 * ### `LineNumbers`
 * Does the code editor show line numbers?
 * - Off at first;  the top bar's View › Line Numbers turns them on, and the browser remembers
 *   (`spellEditor:lineNumbers`).
 ****************/
export class LineNumbers {
  /** Are they showing (reactive)? */
  static get isShowing(): boolean {
    return areShowing()
  }

  /** Show them if hidden, else hide them;  remember which. */
  static toggle(): void {
    // the new value in a local:  a signal reads its old value until Solid flushes the write
    const isShowing = !areShowing()
    setShowing(isShowing)
    editorPrefs.set(LINE_NUMBERS_PREF, isShowing)
    LineNumbers.applyTo(editor.getInputEditor(), isShowing)
  }

  /** Show or hide them in `inputEditor`:  as chosen, unless `isShowing` says. */
  static applyTo(inputEditor: monaco.editor.IStandaloneCodeEditor | undefined, isShowing = areShowing()): void {
    inputEditor?.updateOptions({ lineNumbers: isShowing ? "on" : "off" })
  }
}

/** The preference that remembers whether the code editor shows line numbers. */
const LINE_NUMBERS_PREF = "lineNumbers"
// TODO:  drop the rename once every browser has opened the editor since epic `prefs-and-undo` P1
editorPrefs.declare(LINE_NUMBERS_PREF, { type: "choice" }).rename("spellEditor.lineNumbers", LINE_NUMBERS_PREF)
const [areShowing, setShowing] = createSignal(editorPrefs.get(LINE_NUMBERS_PREF) as boolean)

/****************
 * ### `<InputEditor>`
 * The Monaco source editor on `editor.file`, guarded by an `<ErrorBoundary>`.
 * - `<FileEditor>` -- Monaco, loaded on first use (see `LazyMonaco`) -- remade per file:  keyed by its path.
 * - The page's keys (save, revert, compile) are made its own commands (`addCodeEditorKeys()`);
 *   `editor.onInputDidMount()` wires its cursor and scroll events back into `editor`.
 * - `editor.onInputEffect()` (scroll to and select `file.initialSelection`) runs once the editor's made,
 *   and again whenever `editor.file`, its `isLoaded` or its `initialSelection` change.
 * - Over it, while showing, the code editor's settings (`<CodeSettingsPanel>`, from the top bar's Edit menu).
 * - On an error:  `showError()` is told, and a plain-text `<FallbackEditor>` takes over.
 *   It heals by itself when what threw changes (see `<ErrorBoundary>`).
 * - NOTE: React's `match` prop (never passed, it reset the error on change) is gone:  the boundary heals itself.
 * - SEE:  its App UI components page, `app/docs/InputEditor.html` (`/components/app/InputEditor.html`).
 ****************/
export function InputEditor(props: InputEditorProps) {
  return (
    <div class="InputEditor">
      <ErrorBoundary onError={(error) => props.showError?.(error)} fallback={() => <FallbackEditor />}>
        <FileInputEditor />
      </ErrorBoundary>
      <Show when={CodeSettings.isShowing}>
        <CodeSettingsPanel />
      </Show>
    </div>
  )
}

/** Props for `<InputEditor>`. */
export type InputEditorProps = {
  /** Called with each error caught. */
  showError?: (error: unknown) => void
}

/****************
 * ### `<FileInputEditor>`
 * `<InputEditor>`'s normal editor:  `<FileEditor>` on `editor.file`, a fresh one per file.
 ****************/
function FileInputEditor() {
  const file = tracked(() => editor.file)
  /** Remakes the editor when it changes:  the file's path, or `"loading"` before there's a file. */
  const key = createMemo(() => file()?.path || "loading")
  const release = PageLoading.hold()
  onCleanup(release)
  const mounted: typeof didMount = (inputEditor, api) => {
    didMount(inputEditor, api)
    release()
  }
  followInitialSelection()
  return (
    <Loading fallback={<LazyMonaco.Loading />}>
      <Show when={key()} keyed>
        {(_key) => <LazyMonaco.FileEditor file={file()} onMount={mounted} onUnmount={editor.onInputWillUnmount} />}
      </Show>
    </Loading>
  )
}

/****************
 * ### `<FallbackEditor>`
 * `<InputEditor>`'s editor after a caught error:  plain text, NO spell colouring.
 * - In case colouring is what threw:  re-attaching it would just throw again.
 * - It has no model, so edits go in through `editor.onInputChanged()`.
 ****************/
function FallbackEditor() {
  const contents = tracked(() => editor.file?.contents ?? "Loading")
  followInitialSelection()
  return (
    <Loading fallback={<LazyMonaco.Loading />}>
      <LazyMonaco.MonacoEditor
        value={contents()}
        language="plaintext"
        onMount={didMount}
        onUnmount={editor.onInputWillUnmount}
        onChange={editor.onInputChanged}
      />
    </Loading>
  )
}

/**
 * The input editor is made:  show its line numbers or not, give it the page's keys, hand it to `editor`,
 * then select `file.initialSelection`, if any.
 * - Why the second step:  the editor arrives after the file did (Monaco loads lazily, and makes its editor once
 *   settled), so the `followInitialSelection()` run for that file came too early.
 */
function didMount(inputEditor: monaco.editor.IStandaloneCodeEditor, api: typeof monaco) {
  LineNumbers.applyTo(inputEditor)
  addCodeEditorKeys(inputEditor, api)
  editor.onInputDidMount(inputEditor, api)
  editor.onInputEffect()
}

/**
 * Scroll to and select `file.initialSelection` (`editor.onInputEffect()`)
 * whenever `editor.file`, its `isLoaded` or its `initialSelection` change.
 * - Call in a component body:  the effect and its `tracked()` go with the component.
 * - React ran it after every render, i.e. when `editor.file` changed;  this also catches the file loading later.
 */
function followInitialSelection() {
  const wanted = tracked(() => {
    const { file } = editor
    return [file, file?.isLoaded, file?.initialSelection] as const
  })
  createEffect(wanted, () => {
    editor.onInputEffect()
  })
}
