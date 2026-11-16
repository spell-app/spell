import { Loading, Show, createEffect, createSignal, onCleanup } from "solid-js"
import type { EditorView } from "@codemirror/view"

import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import type { SpellCodeMirror } from "spell/app/app/solid/codemirror"
import { ErrorBoundary, tracked } from "spell/app/app/solid"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { CodeSettings, CodeSettingsPanel } from "./CodeSettings"
import { FileTabs } from "./FileTabs"
import { LazyCodeMirror } from "./LazyCodeMirror"
import { PageLoading } from "./PageLoading"

import "./InputEditor.css"

/****************
 * ### `<InputRoot>`
 * The code column of `SpellEditor`:  the project's files as tabs (`<FileTabs>`), over the code (`<InputEditor>`).
 * - Its actions (Save, Revert Changes, New File, the line numbers, the code editor's settings)
 *   are the top bar's menus (epic `debut` P32).
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
    LineNumbers.applyTo(editor.getInputEditor()?.view, isShowing)
  }

  /**
   * Show or hide them in `view`:  as chosen, unless `isShowing` says.
   * - The view's state, the file it shows now:  each file's state keeps its own, so it's applied as each is shown.
   * - Loads CodeMirror's setup, which the view has loaded already.
   */
  static applyTo(view: EditorView | undefined, isShowing = areShowing()): void {
    if (!view) return
    void LazyCodeMirror.load().then(({ CodeMirrorSetup }) => {
      if (!view.dom.isConnected) return
      CodeMirrorSetup.showLineNumbers(view, isShowing)
    })
  }
}

/** The preference that remembers whether the code editor shows line numbers. */
const LINE_NUMBERS_PREF = "lineNumbers"
// TODO:  drop the rename once every browser has opened the editor since epic `prefs-and-undo` P1
editorPrefs.declare(LINE_NUMBERS_PREF, { type: "choice" }).rename("spellEditor.lineNumbers", LINE_NUMBERS_PREF)
const [areShowing, setShowing] = createSignal(editorPrefs.get(LINE_NUMBERS_PREF) as boolean)

/****************
 * ### `<InputEditor>`
 * The code editor on `editor.file`, guarded by an `<ErrorBoundary>`.
 * - `<FileEditor>` -- CodeMirror, loaded on first use (see `LazyCodeMirror`) -- made once:  each new file is shown in
 *   the same view, its own state kept with its undo, folds and selection (`FileStates`).
 * - The page's keys (save, revert, compile) are its own (`EDITOR_HOTKEYS`);  a right click shows the page's menu
 *   (`CodeMirrorMenu`), and Find All References lists the uses there too.
 * - `editor.onInputDidMount()` wires its caret and scroll back into `editor`.
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
 * `<InputEditor>`'s normal editor:  `<FileEditor>` on `editor.file`, ONE view, showing each file in turn.
 ****************/
function FileInputEditor() {
  const file = tracked(() => editor.file)
  const release = PageLoading.hold()
  onCleanup(release)
  followInitialSelection()
  return (
    <Loading fallback={<LazyCodeMirror.Loading />}>
      <LazyCodeMirror.FileEditor
        file={file()}
        hotkeys={EDITOR_HOTKEYS}
        onOpen={(location) => {
          const { start, end } = location.range
          void editor.showFileAt(location.path, {
            anchor: { line: start.line, ch: start.character },
            head: { line: end.line, ch: end.character }
          })
          return true
        }}
        onContextMenu={(shown, at) => void codeMirrorMenu().then((menu) => menu.open(shown, at))}
        onReferences={(shown, at, locations) =>
          void codeMirrorMenu().then((menu) => menu.openReferences(shown, at, locations))
        }
        onMount={(made) => {
          didMount(made)
          release()
        }}
        onUpdate={editor.onInputUpdate}
        onUnmount={editor.onInputWillUnmount}
      />
    </Loading>
  )
}

/** The code's right-click menu, loaded with CodeMirror:  the app's own menu, not in CodeMirror's barrel. */
async function codeMirrorMenu() {
  return (await import("spell/app/app/ui/codemirror/CodeMirrorMenu")).CodeMirrorMenu
}

/****************
 * ### `<FallbackEditor>`
 * `<InputEditor>`'s editor after a caught error:  plain text, NO spell colouring.
 * - In case colouring is what threw:  re-attaching it would just throw again.
 * - It has no file state, so edits go in through `editor.onInputChanged()`.
 ****************/
function FallbackEditor() {
  const contents = tracked(() => editor.file?.contents ?? "Loading")
  return (
    <Loading fallback={<LazyCodeMirror.Loading />}>
      <LazyCodeMirror.CodeMirrorEditor value={contents()} onChange={editor.onInputChanged} />
    </Loading>
  )
}

/**
 * The input editor is made:  show its line numbers or not, hand it to `editor`,
 * then select `file.initialSelection`, if any.
 * - Why the last step:  the editor arrives after the file did (CodeMirror loads lazily, and makes its view once
 *   settled), so the `followInitialSelection()` run for that file came too early.
 */
function didMount(inputEditor: SpellCodeMirror) {
  LineNumbers.applyTo(inputEditor.view)
  editor.onInputDidMount(inputEditor)
  editor.onInputEffect()
}

/**
 * Scroll to and select `file.initialSelection` (`editor.onInputEffect()`)
 * whenever `editor.file`, its `isLoaded` or its `initialSelection` change;  and show its line numbers or not,
 * as its state keeps its own.
 * - Call in a component body:  the effect and its `tracked()` go with the component.
 * - In a microtask:  after `<FileEditor>` shows the new file in its view.
 */
function followInitialSelection() {
  const wanted = tracked(() => {
    const { file } = editor
    return [file, file?.isLoaded, file?.initialSelection] as const
  })
  createEffect(wanted, () => {
    queueMicrotask(() => {
      LineNumbers.applyTo(editor.getInputEditor()?.view)
      editor.onInputEffect()
    })
  })
}
