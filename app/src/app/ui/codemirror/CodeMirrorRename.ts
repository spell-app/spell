import { type Extension, StateEffect, StateField } from "@codemirror/state"
import { type EditorView, showTooltip, type Tooltip } from "@codemirror/view"
import type { WorkspaceEdit } from "vscode-languageserver"

import { after } from "spell/util/timing"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { RenameRefusedError } from "spell/app/app/ui/ui.types"
import type { CodeMirrorLanguage } from "./CodeMirrorLanguage"

/****************
 * ### `CodeMirrorRename`
 * Rename Symbol (F2) in a CodeMirror editor, as Monaco's (epic `editor` I147;  epic `codemirror` P5):
 * a field over the name, its words selected;  Enter renames it everywhere, Esc or a click away leaves it.
 * - What it renames and what it says are the app's, as Monaco's are:  an action as the Inspector's Code card renames
 *   it, its calls and buttons too, refused in the same words (`CodeEditorFeatures.rename()`).
 * - Where nothing can be renamed, F2 says what can, over the caret (`CodeEditorFeatures.renameNothingHere()`).
 * - A refusal shows over the name once the field has gone, as Monaco's message does;  it goes at the next key,
 *   click or edit.
 * - The edits go in through the editor's `apply`, file by file:  `FileStates.applyEdits()`, so each file's is ONE
 *   undo step, and each file touched saves.
 * - One per editor, in what its view adds (`SpellCodeMirror`'s host).
 * - Its position in the import graph:  CodeMirror, the app's code features;  never Monaco.
 ****************/
export class CodeMirrorRename {
  /** The field and the message, for an editor's view. */
  static extension(): Extension {
    return shown
  }

  /**
   * Start renaming the thing at `view`'s caret:  the field over it, or the words saying what can be renamed.
   * - `apply`:  make a rename's edits, in every file
   * - NEVER throws.
   */
  static async start(view: EditorView, language: CodeMirrorLanguage, apply: (edit: WorkspaceEdit) => void) {
    const pos = view.state.selection.main.head
    const range = await language.renameRangeAt(view, pos)
    if (!range) {
      CodeMirrorRename.say(view, pos, CodeEditorFeatures.renameNothingHere())
      return
    }
    const tooltip: Tooltip = {
      pos: range.from,
      above: true,
      create: () => ({ dom: fieldDom(view, range.name, (newName) => void rename(newName)) })
    }
    view.dispatch({ effects: SHOW.of({ tooltip, kind: "field" }) })

    /** Rename it `newName`, or say why it can't be. */
    async function rename(newName: string) {
      close(view)
      if (!newName.trim() || newName === range!.name) return
      try {
        apply(await language.renameAt(view, range!.from, { newName, oldName: range!.name }))
      } catch (error) {
        if (!(error instanceof RenameRefusedError)) {
          console.error("CodeMirrorRename:  the rename failed", error)
          return
        }
        // once the field has gone, as Monaco shows it
        void after(0, () => CodeMirrorRename.say(view, range!.from, error.message))
      }
    }
  }

  /** Show `words` over `pos` in `view`, till the next key, click or edit. */
  static say(view: EditorView, pos: number, words: string): void {
    const tooltip: Tooltip = {
      pos,
      above: true,
      create: () => {
        const dom = document.createElement("div")
        dom.className = "cmb-rename-message"
        dom.textContent = words
        const goes = () => close(view)
        view.dom.addEventListener("keydown", goes, { once: true, capture: true })
        view.dom.addEventListener("mousedown", goes, { once: true, capture: true })
        return { dom, destroy: () => removeListeners(view, goes) }
      }
    }
    view.dispatch({ effects: SHOW.of({ tooltip, kind: "message" }) })
  }

  /** Is the rename field showing in `view`? */
  static isRenaming(view: EditorView): boolean {
    return view.state.field(shown, false)?.kind === "field"
  }
}

/** What shows:  the field, or a message;  none. */
type Shown = { tooltip: Tooltip; kind: "field" | "message" } | null

/** Show the field or a message, or nothing. */
const SHOW = StateEffect.define<Shown>()

/** The field or message showing, moved with edits;  an edit closes a message. */
const shown = StateField.define<Shown>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) if (effect.is(SHOW)) return effect.value
    if (!value || !transaction.docChanged) return value
    if (value.kind === "message") return null
    return { ...value, tooltip: { ...value.tooltip, pos: transaction.changes.mapPos(value.tooltip.pos) } }
  },
  provide: (field) => showTooltip.compute([field], (state) => state.field(field)?.tooltip ?? null)
})

/** Close what shows in `view`. */
function close(view: EditorView) {
  if (view.state.field(shown, false)) view.dispatch({ effects: SHOW.of(null) })
}

/** Stop listening for what closes a message. */
function removeListeners(view: EditorView, goes: () => void) {
  view.dom.removeEventListener("keydown", goes, { capture: true })
  view.dom.removeEventListener("mousedown", goes, { capture: true })
}

/**
 * The rename field:  `name` in it, selected, focused as it's drawn.
 * - Enter:  `done` with what's typed;  Esc, or the focus going elsewhere:  closed, nothing renamed, the focus back in
 *   the code.
 */
function fieldDom(view: EditorView, name: string, done: (newName: string) => void): HTMLElement {
  const dom = document.createElement("div")
  dom.className = "cmb-rename"
  const field = document.createElement("input")
  field.value = name
  field.spellcheck = false
  field.setAttribute("aria-label", name)
  let isDone = false
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      isDone = true
      done(field.value)
      view.focus()
    } else if (event.key === "Escape") {
      isDone = true
      close(view)
      view.focus()
    } else return
    event.preventDefault()
    event.stopPropagation()
  })
  // in a microtask:  a blur can come in the middle of the view's own update, as it takes the field away
  field.addEventListener("blur", () => queueMicrotask(() => isDone || close(view)))
  dom.append(field)
  queueMicrotask(() => {
    field.focus()
    field.select()
  })
  return dom
}
