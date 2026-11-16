import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { EditorView } from "@codemirror/view"

import { declareProp, Observable } from "spell/util"
import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeMirrorPeek } from "spell/app/app/ui/codemirror/CodeMirrorPeek"
import { FileStates } from "spell/app/app/ui/codemirror/FileStates"
import type { CodeMirrorLocation } from "spell/app/app/ui/codemirror/LspToCodeMirror"

/**
 * `CodeMirrorPeek`, the box under the caret's line showing another file's lines (epic `codemirror` I5),
 * on a real view in the browser:  the place shown read only and marked, the uses listed, Esc closes, Enter goes.
 * - The files are stand-ins, not Spell:  no parse, no language service reached.
 */
describe("CodeMirrorPeek", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
  })

  test("Peek Definition:  a box under the caret's line, the place's file read only, its words marked", async () => {
    const { states, files, project } = setUp()
    view = viewOf()
    states.show(view, files.game, CodeMirrorPeek.extension())
    view.dispatch({ selection: { anchor: 3 } })
    const go = vi.fn()
    CodeMirrorPeek.open({ view, states, project, locations: [PILE_AT], kind: "definition", go })
    const box = await boxIn(view)

    expect(box.querySelector(".cm-peek-title")!.textContent).toBe("Pile.spell:2")
    expect(box.querySelector(".cm-peek-list")).toBeNull()
    expect(box.querySelector(".cm-peek-marked")!.textContent).toBe("pile")
    // under the first line, before the second
    const lines = view.contentDOM.querySelectorAll(":scope > .cm-line")
    expect(box.getBoundingClientRect().top).toBeGreaterThanOrEqual(lines[0]!.getBoundingClientRect().bottom)
    expect(box.getBoundingClientRect().bottom).toBeLessThanOrEqual(lines[1]!.getBoundingClientRect().top)
    // read only:  its file's text can't be typed in from there
    const slice = EditorView.findFromDOM(box.querySelector<HTMLElement>(".cm-editor")!)!
    expect(slice.state.readOnly).toBe(true)
    expect(document.activeElement?.className).toBe("cm-peek")

    press(box, "Enter")
    expect(go).toHaveBeenCalledWith(PILE_AT)
    expect(CodeMirrorPeek.isOpen(view)).toBe(false)
  })

  test("Peek References:  every use listed, ↓ shows the next, Esc closes with the caret back in the code", async () => {
    const { states, files, project } = setUp()
    view = viewOf()
    states.show(view, files.game, CodeMirrorPeek.extension())
    const go = vi.fn()
    CodeMirrorPeek.open({ view, states, project, locations: [PILE_AT, GAME_AT], kind: "references", go })
    const box = await boxIn(view)

    const rows = [...box.querySelectorAll(".cm-peek-row")].map((row) => row.textContent)
    expect(rows).toEqual(["Pile.spell:2  a pile is a list", "Game.spell:2  deal a pile"])
    press(box, "ArrowDown")
    expect(box.querySelector(".cm-peek-title")!.textContent).toBe("Game.spell:2")
    expect(box.querySelector('[aria-selected="true"]')!.textContent).toBe(rows[1])

    press(box, "Escape")
    expect(CodeMirrorPeek.isOpen(view)).toBe(false)
    expect(view.hasFocus).toBe(true)
    expect(go).not.toHaveBeenCalled()
  })

  test("Esc in the code closes the box too", async () => {
    const { states, files, project } = setUp()
    view = viewOf()
    states.show(view, files.game, CodeMirrorPeek.extension())
    CodeMirrorPeek.open({ view, states, project, locations: [PILE_AT], kind: "definition", go: () => {} })
    await boxIn(view)
    view.focus()
    press(view.contentDOM, "Escape")
    expect(CodeMirrorPeek.isOpen(view)).toBe(false)
  })
})

/** A game file's text. */
const GAME = "to play it:\n\tdeal a pile\n\tshuffle"

/** A pile file's text. */
const PILE = "// piles\na pile is a list"

/** Where `pile` is declared:  line 2 of the pile file. */
const PILE_AT: CodeMirrorLocation = {
  path: "@spell/test/standin/Pile.spell",
  range: { start: { line: 1, character: 2 }, end: { line: 1, character: 6 } }
}

/** A use of it, in the game file. */
const GAME_AT: CodeMirrorLocation = {
  path: "@spell/test/standin/Game.spell",
  range: { start: { line: 1, character: 8 }, end: { line: 1, character: 12 } }
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
function setUp() {
  const project = { spellFiles: [], files: [], updatedContentsFor: vi.fn() } as unknown as SP.SpellProject & {
    files: StandInFile[]
  }
  const files = {
    game: new StandInFile(GAME_AT.path, project),
    pile: new StandInFile(PILE_AT.path, project)
  }
  files.game.contents = GAME
  files.pile.contents = PILE
  project.files.push(files.game, files.pile)
  const states = new FileStates({ service: new LSP.SpellLanguageService(new LSP.AppAddresses()) })
  return { states, project, files: files as unknown as Record<keyof typeof files, StandInFile & SP.AnySpellFile> }
}

/** A view in the page, showing nothing yet. */
function viewOf(): EditorView {
  const parent = document.createElement("div")
  parent.style.cssText = "width: 800px; height: 500px"
  document.body.append(parent)
  return new EditorView({ parent })
}

/** The box drawn in `view`, once it's had its frames:  CodeMirror's drawing, then the box's own scroll and focus. */
async function boxIn(view: EditorView): Promise<HTMLElement> {
  for (let frame = 0; frame < 3; frame++) await new Promise((resolve) => requestAnimationFrame(resolve))
  const box = view.dom.querySelector<HTMLElement>(".cm-peek")
  expect(box).not.toBeNull()
  return box!
}

/** Press `key` on `target`, as the keyboard does. */
function press(target: HTMLElement, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
}
