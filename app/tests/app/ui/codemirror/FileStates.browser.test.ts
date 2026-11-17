import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { undo } from "@codemirror/commands"
import { foldEffect, foldedRanges } from "@codemirror/language"
import { EditorView } from "@codemirror/view"

import { declareProp, Observable } from "spell/util"
import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { codeLook, showBubbly } from "spell/app/app/ui/codePopups"
import { FileStates, type EditWay } from "spell/app/app/ui/codemirror/FileStates"

/**
 * `FileStates`, one CodeMirror state per file, on a real view in the browser (epic `codemirror` P2):
 * switching files and back keeps each one's text, undo, folds and selection;  an edit from outside the code is one
 * undo step and carries its `EditWay`.
 * - The files are stand-ins:  their `contents` a spell cell, as a project file's is, their project a recorder.
 *   They're not Spell, so no parse is asked for;  the language service is never reached.
 */
describe("FileStates", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
  })

  test("switching to another file and back keeps the first one's text, undo, folds and selection", () => {
    const { states, files } = setUp()
    view = viewOf()
    states.show(view, files.game)
    type(view, 0, "// ")
    view.dispatch({ effects: foldEffect.of({ from: 14, to: GAME.length + 3 }), selection: { anchor: 5 } })

    states.show(view, files.card)
    expect(view.state.doc.toString()).toBe(CARD)
    type(view, 0, "x")

    states.show(view, files.game)
    expect(view.state.doc.toString()).toBe("// " + GAME)
    expect(foldedRanges(view.state).size).toBe(1)
    expect(view.state.selection.main.head).toBe(5)
    undo(view)
    expect(view.state.doc.toString()).toBe(GAME)
    // the other file kept its own edit
    expect(files.card.contents).toBe("x" + CARD)
  })

  test("every edit goes into its file at once, marked unsaved, and `onEdit` hears it", () => {
    const onEdit = vi.fn()
    const { states, files } = setUp({ onEdit })
    view = viewOf()
    states.show(view, files.game)
    type(view, 0, "a")
    expect(files.game).toMatchObject({ contents: "a" + GAME, isDirty: true })
    expect(onEdit).toHaveBeenCalledWith(files.game)
  })

  test("an edit from outside the code is ONE undo step, and carries its `EditWay`", () => {
    const { states, files } = setUp()
    const ways: (EditWay | undefined)[] = []
    view = viewOf()
    states.show(
      view,
      files.game,
      EditorView.updateListener.of((update) => {
        for (const transaction of update.transactions) {
          if (transaction.docChanged) ways.push(transaction.annotation(FileStates.EDIT_WAY))
        }
      })
    )
    type(view, GAME.length, "!")
    expect(states.applyEdits(files.game, [replacing(0, 2, "To"), replacing(3, 7, "play")])).toBe(true)
    expect(view.state.doc.toString()).toBe("To play it:\n\tdeal cards\n\tshuffle!")
    expect(ways).toEqual([undefined, "step"])
    undo(view)
    expect(view.state.doc.toString()).toBe(GAME + "!")
  })

  test("a `typing` edit joins the run of typing before it:  one undo takes both", () => {
    const { states, files } = setUp()
    view = viewOf()
    states.show(view, files.game)
    type(view, GAME.length, "!")
    states.applyEdits(files.game, [replacing(9, 9, "?", 2)], "typing")
    expect(view.state.doc.toString()).toBe(GAME + "!?")
    undo(view)
    expect(view.state.doc.toString()).toBe(GAME)
  })

  test("a file shown nowhere still takes an edit from outside, kept for when it's shown, one undo step", () => {
    const { states, files } = setUp()
    view = viewOf()
    states.show(view, files.game)
    states.stateFor(files.card)
    expect(states.applyEdits(files.card, [replacing(0, 1, "C")])).toBe(true)
    expect(files.card.contents).toBe("C" + CARD.slice(1))
    states.show(view, files.card)
    expect(view.state.doc.toString()).toBe("C" + CARD.slice(1))
    undo(view)
    expect(view.state.doc.toString()).toBe(CARD)
  })

  test("a file with no state:  `applyEdits()` says so", () => {
    const { states, files } = setUp()
    expect(states.applyEdits(files.card, [replacing(0, 1, "C")])).toBe(false)
  })

  test("the file's text changed from outside comes into its state, kept OUT of undo", async () => {
    const { states, files } = setUp()
    view = viewOf()
    states.show(view, files.game)
    type(view, 0, "a")
    files.game.contents = "a" + GAME + "\n\tdeal again"
    await Promise.resolve()
    expect(view.state.doc.toString()).toBe("a" + GAME + "\n\tdeal again")
    undo(view)
    expect(view.state.doc.toString()).toBe(GAME + "\n\tdeal again")
  })

  test("a slice of a file in another view holds its text, never a copy;  an edit in either is the other's at once (P3)", () => {
    const { states, files } = setUp()
    view = viewOf()
    const slice = viewOf()
    try {
      states.show(view, files.game)
      states.showSlice(slice, files.game, { first: 2, last: 3 })
      // the same text, not a copy
      expect(slice.state.doc).toBe(view.state.doc)
      // the file's edit, in the slice
      type(view, 0, "// ")
      expect(slice.state.doc.toString()).toBe("// " + GAME)
      // the slice's edit, in the file and its editor:  one change, once
      type(slice, slice.state.doc.toString().indexOf("deal"), "now ")
      expect(files.game.contents).toBe("// to play it:\n\tnow deal cards\n\tshuffle")
      expect(view.state.doc.toString()).toBe(files.game.contents)
      // the slice's undo is its own edit's
      undo(slice)
      expect(view.state.doc.toString()).toBe("// " + GAME)
    } finally {
      states.releaseSlice(slice)
      slice.destroy()
    }
  })

  test("a slice shows only its lines:  the others hidden, out of the caret's way, moved with an edit above them", () => {
    const { states, files } = setUp()
    view = viewOf()
    states.showSlice(view, files.game, { first: 2, last: 2 })
    expect(view.dom.querySelector(".cm-content")?.textContent).toBe("\tdeal cards")
    states.applyEdits(files.game, [replacing(0, 0, "// first\n")])
    expect(view.dom.querySelector(".cm-content")?.textContent).toBe("\tdeal cards")
    states.releaseSlice(view)
  })

  test("a property editors file, `Card.editor.spell`:  drawn as Spell, bubbly or coloured, never parsed (epic `codemirror` I18)", async () => {
    const { states, project } = setUp()
    const file = new StandInFile("@spell/test/standin/Card.editor.spell", project) as StandInFile & SP.AnySpellFile
    file.contents = PROPERTY_EDITORS
    const wasBubbly = codeLook.isBubbly
    try {
      showBubbly(true)
      view = viewOf()
      states.show(view, file)
      expect(view.dom.classList.contains("bubbly")).toBe(true)
      expect(textsOf(view, ".bubbly-heading")).toEqual([" A card's property editor"])
      expect(textsOf(view, ".bubbly-tag-name")).toEqual(["property-editor", "ui-property", "property-editor"])
      expect(textsOf(view, ".bubbly-input")).toContain("rank")
      // the look off:  coloured by its tokens, its heading bold (was plain black text, I18)
      showBubbly(false)
      await Promise.resolve()
      expect(view.dom.classList.contains("bubbly")).toBe(false)
      expect(textsOf(view, ".cmt-heading")).toEqual(["# A card's property editor"])
      expect(textsOf(view, ".cmt-string")).toEqual(['"rank"'])
    } finally {
      showBubbly(wasBubbly)
    }
  })

  test("its waits:  a parse once the typing pauses 200 msec, a rename's save within 2 s (epic `codemirror` J4)", () => {
    expect([FileStates.PARSE_WAIT, FileStates.SAVE_WAIT]).toEqual([200, 2000])
  })
})

////////////////
// ## Stand-ins
////////////////

/** A game file's text:  a head line, and a body of two lines under it. */
const GAME = "to play it:\n\tdeal cards\n\tshuffle"

/** A card file's text. */
const CARD = "a card is a thing"

/** A property editors file's text:  a heading, prose, and a `<property-editor>` of markup. */
const PROPERTY_EDITORS = `# A card's property editor
What the Inspector shows for a card.

<property-editor "card">
\t<ui-property name="rank" />
</property-editor>
`

/** The text of each element matching `selector` in `view`, in order. */
function textsOf(view: EditorView, selector: string): string[] {
  return [...view.dom.querySelectorAll(selector)].map((element) => element.textContent ?? "")
}

/** A project file, standing in:  its `contents` a spell cell, as a real one's. */
class StandInFile extends Observable {
  declare contents: string | undefined
  isDirty = false
  constructor(
    readonly path: string,
    readonly project: SP.SpellProject
  ) {
    super()
  }
  save() {
    return Promise.resolve()
  }
}
declareProp(StandInFile, "contents", { type: "text" })

/** File states over a stand-in project of two files. */
function setUp({ onEdit }: { onEdit?: (file: SP.AnySpellFile) => void } = {}) {
  const project = { spellFiles: [], updatedContentsFor: vi.fn() } as unknown as SP.SpellProject
  const files = {
    game: new StandInFile("@spell/test/standin/Game.spell", project),
    card: new StandInFile("@spell/test/standin/Card.spell", project)
  }
  files.game.contents = GAME
  files.card.contents = CARD
  const states = new FileStates({ service: new LSP.SpellLanguageService(new LSP.AppAddresses()), onEdit })
  return { states, project, files: files as unknown as Record<keyof typeof files, StandInFile & SP.AnySpellFile> }
}

/** A view in the page, showing nothing yet. */
function viewOf(): EditorView {
  const parent = document.createElement("div")
  parent.style.cssText = "width: 600px; height: 200px"
  document.body.append(parent)
  return new EditorView({ parent })
}

/** Type `text` at `at`, as the keys do. */
function type(view: EditorView, at: number, text: string) {
  view.dispatch({ changes: { from: at, insert: text }, userEvent: "input.type" })
}

/** An LSP edit of `start` ... `end` on line `line`, the first by default. */
function replacing(start: number, end: number, newText: string, line = 0) {
  return { range: { start: { line, character: start }, end: { line, character: end } }, newText }
}
