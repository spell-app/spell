import { createEffect, onSettled, untrack } from "solid-js"
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, type ViewUpdate } from "@codemirror/view"

import { CodeMirrorSetup, SpellCodeMirror, type CompiledLanguage } from "spell/app/app/ui/codemirror"

import "./CodeMirrorEditor.css"

/****************
 * ### `<CodeMirrorEditor>`
 * A CodeMirror editor showing `state`, or else `value` with `extensions`, filling its parent.
 * - Made once, when it's settled into the page:  remount it for a fresh editor.
 * - `state` is someone else's, e.g. a file's from `FileStates`:  a new one is shown in the same view.
 *   - A file's editor switches states itself (`<FileEditor>`, `SpellCodeMirror.show()`), so it passes none.
 * - Without one, the editor makes its own, from `value` and `extensions` (default:  the base setup alone);
 *   or as its `language` says:  compiled code, read only;  a snippet of Spell.
 *   - A new `value` is a new starting point, e.g. the compiled code made again:  undo can't go back past it.
 *   - Nor does it call `onChange`, which is only for edits typed.
 * - `onMount` / `onUnmount` hand out the view itself, e.g. to show a file in it, or follow the caret.
 * - Works in a shadow root too:  the view's root is the element's.
 * - NOTE: the view is a plain variable, not a signal:  the effects below only follow PROPS, and making the view
 *   reads the props as they are then, so a prop changed before it's made is still taken.
 * - SEE:  its page in App UI's guide, `/components/app/code-mirror-editor`.
 ****************/
export function CodeMirrorEditor(props: CodeMirrorEditorProps) {
  let element!: HTMLDivElement
  /** The view, once made. */
  let instance: EditorView | undefined
  /** The `language` its own state was made for. */
  let madeFor: CodeMirrorEditorProps["language"]

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

  // Take on a new `language`:  its code read as that, in a state of its own
  createEffect(
    () => props.language,
    (language) => {
      if (!instance || props.state || language === madeFor) return
      instance.setState(ownState(instance.state.doc.toString()))
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
          props.onUpdate?.(update)
        }),
        untrack(() => {
          const { extensions, language } = props
          madeFor = language
          if (extensions) return extensions
          if (language === "spell") return SpellCodeMirror.snippetExtensions()
          return language ? SpellCodeMirror.codeExtensions(language) : CodeMirrorSetup.extensions()
        })
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
  /**
   * What its own state's text is, if no `extensions`:
   * - compiled code's language:  read only, coloured, its lines numbered (`SpellCodeMirror.codeExtensions()`)
   * - `spell`:  a snippet of Spell to edit, coloured by its tokens (`SpellCodeMirror.snippetExtensions()`)
   */
  language?: CompiledLanguage | "spell"
  /** Called with each change to its own state:  its text, its caret. */
  onUpdate?: (update: ViewUpdate) => void
  /** Called with the editor's whole text after each edit typed into its own state. */
  onChange?: (value: string) => void
  /** Called with the view once it's made. */
  onMount?: (view: EditorView) => void
  /** Called with the view just before it's destroyed. */
  onUnmount?: (view: EditorView) => void
}
