import { createEffect, onSettled, untrack } from "solid-js"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror"

import "./CodeMirrorEditor.css"

/****************
 * ### `<CodeMirrorEditor>`
 * A CodeMirror editor showing `state`, or else `value` with `extensions`, filling its parent:
 * the twin of `<MonacoEditor>`.
 * - Made once, when it's settled into the page:  remount it for a fresh editor.
 * - `state` is someone else's, e.g. a file's from `FileStates`:  a new one is shown in the same view.
 *   - A file's editor switches states itself (`<FileEditor>`, `SpellCodeMirror.show()`), so it passes none.
 * - Without one, the editor makes its own, from `value` and `extensions` (default:  the base setup alone).
 *   A new `value` is a new starting point, e.g. the compiled code made again:  undo can't go back past it,
 *   and it does NOT call `onChange`, which is only for edits typed.
 * - `onMount` / `onUnmount` hand out the view itself, e.g. to show a file in it, or follow the caret.
 * - Works in a shadow root too:  the view's root is the element's.
 * - NOTE: the view is a plain variable, not a signal:  the effects below only follow PROPS, and making the view
 *   reads the props as they are then, so a prop changed before it's made is still taken.
 ****************/
export function CodeMirrorEditor(props: CodeMirrorEditorProps) {
  let element!: HTMLDivElement
  /** The view, once made. */
  let instance: EditorView | undefined

  // Make the view once it's in the page, and destroy it on unmount.
  onSettled(() => {
    const view = untrack(create)
    return () => {
      props.onUnmount?.(view)
      instance = undefined
      view.destroy()
    }
  })

  // Show a new `state`.
  createEffect(
    () => props.state,
    (state) => {
      if (instance && state && instance.state !== state) instance.setState(state)
    }
  )

  // Take on a new `value`, as a new starting point for undo.
  createEffect(
    () => props.value,
    (value) => {
      if (!instance || props.state || value === undefined || value === instance.state.doc.toString()) return
      instance.setState(ownState(value))
    }
  )

  return <div ref={(div: HTMLDivElement) => (element = div)} class="CodeMirrorEditor" />

  /** Make the view in `element`, from the props as they are now.  SIDE EFFECT:  sets `instance`, calls `onMount`. */
  function create() {
    const view = new EditorView({
      parent: element,
      root: element.getRootNode() as Document | ShadowRoot,
      state: props.state ?? ownState(props.value ?? "")
    })
    instance = view
    props.onMount?.(view)
    return view
  }

  /** A state of our own, holding `value`:  `extensions`, and `onChange` told of each edit typed. */
  function ownState(value: string): EditorState {
    return EditorState.create({
      doc: value,
      extensions: [
        EditorView.updateListener.of((update) => {
          // `props.onChange` read now:  always the latest
          if (update.docChanged) props.onChange?.(update.state.doc.toString())
        }),
        untrack(() => props.extensions) ?? CodeMirrorSetup.extensions()
      ]
    })
  }
}

/** Props for `<CodeMirrorEditor>`. */
export type CodeMirrorEditorProps = {
  /** State to show, e.g. a file's from `FileStates`.  Wins over `value` + `extensions`. */
  state?: EditorState
  /** Text to show, if no `state`.  Omit to leave the editor's text alone. */
  value?: string
  /** What the editor's own state takes, if no `state`:  read when it's made.  Default:  `CodeMirrorSetup.extensions()`. */
  extensions?: Extension
  /** Called with the editor's whole text after each edit typed into its own state. */
  onChange?: (value: string) => void
  /** Called with the view once it's made. */
  onMount?: (view: EditorView) => void
  /** Called with the view just before it's destroyed. */
  onUnmount?: (view: EditorView) => void
}
