import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * The selection in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I115):
 * drawn over the text, so it must be see-through, focused or not.
 * - CodeMirror's own rule for a focused editor's selection is more specific than a plain
 *   `.cm-focused .cm-selectionBackground`:  it painted the selection solid lavender over the words, which vanished.
 * - A quoted value's `"` is shown as its curly mark, never kept see-through under one:
 *   the browser's selection drew the straight `"` again beside it, as it did a tag's `<`, `>` and `/`.
 */
describe("the selection in the bubbly look", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor in the bubbly look's box, holding `text`. */
  function editorOf(text: string): EditorView {
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), EditorView.editorAttributes.of({ class: "bubbly cmb-editor" })]
    })
    const host = document.body.appendChild(document.createElement("div"))
    view = new EditorView({ parent: host, state })
    return view
  }

  /** The alpha of each drawn piece of the selection's background. */
  function selectionAlphas(view: EditorView): number[] {
    return [...view.dom.querySelectorAll(".cm-selectionBackground")].map((piece) => {
      const colour = getComputedStyle(piece).backgroundColor
      const alpha = /rgba?\([^)]*,\s*([\d.]+)\)/.exec(colour)?.[1]
      return alpha === undefined ? 1 : Number(alpha)
    })
  }

  /** A Spell file with quoted values, Spell's and a drawing's tag's. */
  const QUOTED = `solitaire is an app
\tgroup "Dealing & the Stock Pile"
\tto draw it
\t\t<action "auto play" />
`

  /** An editor of `text` in the bubbly look, drawn, the caret at its end (or `selected`, and focused). */
  async function bubblyEditorOf(text: string, { selected, focused }: { selected?: boolean; focused?: boolean } = {}) {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 300px"
    const state = EditorState.create({
      doc: text,
      selection: selected ? { anchor: 0, head: text.length } : { anchor: text.length },
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    if (focused) view.focus()
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    return view
  }

  test('a quoted value\'s marks are curly marks in place of its `"`:  no straight `"` left on the page', async () => {
    const view = await bubblyEditorOf(QUOTED)
    // the file keeps its `"`, a copy copies it
    expect(view.state.doc.toString()).toBe(QUOTED)
    const shown = view.contentDOM.textContent ?? ""
    expect(shown).not.toContain('"')
    expect(shown).toContain("“Dealing & the Stock Pile”")
    expect(shown).toContain("“auto play”")
    // a Spell value's marks inside its white, so they're placed from it
    const pill = [...view.contentDOM.querySelectorAll(".bubbly-quoted")].find((each) =>
      each.textContent?.includes("Dealing")
    )
    expect([...pill!.querySelectorAll(":scope > .cmb-quote")].map((quote) => quote.textContent)).toEqual(["“", "”"])
  })

  for (const focused of [true, false]) {
    test(`selected, ${focused ? "focused" : "not focused"}:  a character drawn over stays see-through`, async () => {
      const view = await bubblyEditorOf(QUOTED, { selected: true, focused })
      expect(view.hasFocus).toBe(focused)
      const drawnOver = view.contentDOM.querySelectorAll(".bubbly-angle, .bubbly-closing-slash, .bubbly-end-slash")
      expect(drawnOver.length).toBeGreaterThan(0)
      for (const each of drawnOver) {
        expect(getComputedStyle(each).color).toBe("rgba(0, 0, 0, 0)")
        expect(getComputedStyle(each, "::selection").color).toBe("rgba(0, 0, 0, 0)")
      }
      // the curly marks are what's shown, selected or not
      expect(view.contentDOM.textContent).not.toContain('"')
    })
  }

  for (const focused of [true, false]) {
    test(`see-through over the words, ${focused ? "focused" : "not focused"}`, async () => {
      const view = editorOf('group "Dealing & the Stock Pile"')
      if (focused) view.focus()
      view.dispatch({ selection: { anchor: 9, head: 25 } })
      // the selection layer draws on the editor's next measure
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      expect(view.hasFocus).toBe(focused)
      const alphas = selectionAlphas(view)
      expect(alphas.length).toBeGreaterThan(0)
      for (const alpha of alphas) expect(alpha).toBeLessThan(0.5)
    })
  }
})
