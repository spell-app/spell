import { type Extension, StateEffect, StateField } from "@codemirror/state"
import { type EditorView, showTooltip, type Tooltip } from "@codemirror/view"
import type { WorkspaceEdit } from "vscode-languageserver"

import { after } from "spell/util/timing"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { RenameRefusedError } from "spell/app/app/ui/ui.types"
import type { CodeMirrorLanguage } from "./CodeMirrorLanguage"

/****************
 * ### `CodeMirrorRename`
 * Rename Symbol (F2) in a CodeMirror editor (epic `editor` I147;  epic `codemirror` P5):
 * a field over the name, its words selected;  Enter renames it everywhere, Esc or a click away leaves it.
 * - The field's words are the name's own:  its font, size and weight, read off the name as drawn (the editor's font
 *   size, whatever it is), its first letter right over the name's (epic `codemirror` T11;  13px before).
 * - What it renames and what it says are the app's:  an action as the Inspector's Code card renames
 *   it, its calls and buttons too, refused in the same words (`CodeEditorFeatures.rename()`).
 * - Where nothing can be renamed, F2 says what can, over the caret (`CodeEditorFeatures.renameNothingHere()`).
 * - A refusal shows over the name once the field has gone;  it goes at the next key, click or edit.
 * - The edits go in through the editor's `apply`, file by file:  `FileStates.applyEdits()`, so each file's is ONE
 *   undo step, and each file touched saves.
 * - One per editor, in what its view adds (`SpellCodeMirror`'s host).
 * - Its position in the import graph:  CodeMirror, the app's code features.
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
    const nameFrom = nameStart(view, range)
    // read off the name as drawn now:  the view can't be measured while it draws the tooltip
    const look = nameLook(view, nameFrom, range.name)
    const tooltip: Tooltip = {
      pos: nameFrom,
      above: true,
      create: () => ({ dom: fieldDom(view, range.name, look, (newName) => void rename(newName)) })
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
        // once the field has gone
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
 * Where the name's own letters start in `range`:  past its opening quote, which a rename's range takes in.
 * - The field's words line up with the name's from there, not with the quote mark drawn before it.
 */
function nameStart(view: EditorView, range: { from: number; to: number; name: string }): number {
  const at = view.state.doc.sliceString(range.from, range.to).indexOf(range.name)
  return at < 0 ? range.from : range.from + at
}

/** What the field copies of the name's font, as drawn. */
const FONT_PROPERTIES = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing"] as const

/** How the name looks where it's drawn:  its font, and how wide its letters are (px);  `undefined`:  not drawn. */
type NameLook = { font?: Record<(typeof FONT_PROPERTIES)[number], string>; width?: number }

/** How the name at `nameFrom` looks in `view`:  read before the field is drawn. */
function nameLook(view: EditorView, nameFrom: number, name: string): NameLook {
  const { node } = view.domAtPos(nameFrom + 1)
  const letters = node instanceof Element ? node : node.parentElement
  const drawn = letters && getComputedStyle(letters)
  const [start, end] = [view.coordsAtPos(nameFrom, 1), view.coordsAtPos(nameFrom + name.length, -1)]
  return {
    font: drawn
      ? (Object.fromEntries(FONT_PROPERTIES.map((property) => [property, drawn[property]])) as NameLook["font"])
      : undefined,
    width: start && end && end.left > start.left ? end.left - start.left : undefined
  }
}

/**
 * The rename field:  `name` in it, selected, focused as it's drawn.
 * - In the name's own font (`look`);  as wide as the name and a little room, at least 220px.
 * - Enter:  `done` with what's typed.
 * - Esc, or the focus going elsewhere:  closed, nothing renamed, the focus back in the code.
 */
function fieldDom(view: EditorView, name: string, look: NameLook, done: (newName: string) => void): HTMLElement {
  const dom = document.createElement("div")
  dom.className = "cmb-rename"
  const field = document.createElement("input")
  field.value = name
  if (look.font) for (const property of FONT_PROPERTIES) field.style[property] = look.font[property]
  if (look.width) field.style.minWidth = `${Math.ceil(look.width) + 48}px`
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
