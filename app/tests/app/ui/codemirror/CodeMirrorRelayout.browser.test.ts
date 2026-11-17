import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorRelayout } from "spell/app/app/ui/codemirror/CodeMirrorRelayout"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"
import "spell/app/app/ui/codemirror/codemirror.css"

/**
 * A file's lines wait, hidden, for its project's parse, so their first drawing is the parse's (epic `language` I148).
 * - Owen:  "Feet come back properly on the same line, but they show in the old weird for about 1-2 seconds":
 *   the editor opened Solitaire from the compile cache, drew it from a parse of the file alone, then again from the
 *   project's a second or two later.
 */
describe("the first drawing of a file whose project's parse is on its way", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** Owen's toolbar, its end tags and the segment's on one line. */
  const TOOLBAR = `a "game" is a view
\tto draw it
\t\t<segment inverted>
\t\t\t<toolbar class="x">
\t\t\t\t<text "" />
 \t\t\t</></>
\t\t<container>
\t\t\t<column "C1"/>
\t\t</container>
`

  /** A stand-in for a project's file:  no parse till `parse()`, as one opened from the compile cache. */
  function unparsedFile(text: string) {
    const file = { path: "/Game.spell", match: undefined as unknown, inputLines: undefined as string[] | undefined }
    return {
      file: file as unknown as SP.SpellFile,
      parse() {
        file.match = SP.spellParser.parse(text, "block")
        file.inputLines = text.split("\n")
      }
    }
  }

  /** An editor of `text` in the bubbly look, laid out from `file`'s parse. */
  function bubblyEditorOf(text: string, file: SP.SpellFile): EditorView {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 600px"
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => file)]
    })
    return new EditorView({ parent: host, state })
  }

  /** Two frames:  CodeMirror measures, then draws. */
  function frames(): Promise<void> {
    return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  }

  /** What a frame shows:  the lines or not, and the row of feet's feet. */
  function drawn(view: EditorView) {
    const row = view.contentDOM.querySelector(".cmb-feet-row")
    return {
      isShown: getComputedStyle(view.scrollDOM).visibility === "visible",
      feet: row ? row.querySelectorAll(".cmb-tag-foot").length : 0
    }
  }

  test("hidden till the parse comes, then shown in the same update as its layout:  the first frame shown is final", async () => {
    const { file, parse } = unparsedFile(TOOLBAR)
    view = bubblyEditorOf(TOOLBAR, file)
    await frames()
    expect(view.dom.classList).toContain("cm-awaiting-parse")
    expect(drawn(view).isShown).toBe(false)

    // the parse comes, as `FileStates.parseChanged()` brings it
    parse()
    view.dispatch({ effects: CodeMirrorSetup.PARSED.of(null) })
    // CodeMirror draws in the dispatch:  shown, laid out from the project's parse, before any frame
    expect(view.dom.classList).not.toContain("cm-awaiting-parse")
    expect(drawn(view)).toEqual({ isShown: true, feet: 2 })
    await frames()
    expect(drawn(view)).toEqual({ isShown: true, feet: 2 })
  })

  test("a parse that never comes:  shown after `AWAIT_PARSE_MSEC`", async () => {
    const was = CodeMirrorRelayout.AWAIT_PARSE_MSEC
    CodeMirrorRelayout.AWAIT_PARSE_MSEC = 50
    try {
      view = bubblyEditorOf(TOOLBAR, unparsedFile(TOOLBAR).file)
      await frames()
      expect(drawn(view).isShown).toBe(false)
      await new Promise((done) => setTimeout(done, 100))
      expect(view.dom.classList).not.toContain("cm-awaiting-parse")
      expect(drawn(view)).toEqual({ isShown: true, feet: 2 })
    } finally {
      CodeMirrorRelayout.AWAIT_PARSE_MSEC = was
    }
  })

  test("a file already parsed, or none:  shown from the first frame", async () => {
    const { file, parse } = unparsedFile(TOOLBAR)
    parse()
    view = bubblyEditorOf(TOOLBAR, file)
    expect(view.dom.classList).not.toContain("cm-awaiting-parse")
    await frames()
    expect(drawn(view)).toEqual({ isShown: true, feet: 2 })
  })
})
