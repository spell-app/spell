import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * The selection in the bubbly look, on a real CodeMirror editor in the browser (epic `language` I115):
 * drawn over the text, so it must be see-through, focused or not.
 * - CodeMirror's own rule for a focused editor's selection is more specific than a plain
 *   `.cm-focused .cm-selectionBackground`:  it painted the selection solid lavender over the words, which vanished.
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
