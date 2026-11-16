import { afterEach, describe, expect, test } from "vite-plus/test"
import { foldService } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * A Go to … jump shows the whole block it lands in, on a real CodeMirror editor in the browser (epic `codemirror` I11):
 * its head at least a row below the pane's top when there's text above it, its body in view under it.
 * - The pane is `ROWS` rows tall;  the blocks are what folds, as in `CodeMirrorBlockClicks.browser.test.ts`.
 */
describe("a Go to … jump shows the whole block", () => {
  /** How many rows the pane shows. */
  const ROWS = 8

  /** Lines of filler, then a block of `bodyLines` lines under its head, then more filler. */
  function fileWith(bodyLines: number, fillerAbove = 30): string {
    const filler = (count: number, name: string) =>
      Array.from({ length: count }, (_, index) => `// ${name} ${index + 1}`)
    const body = Array.from({ length: bodyLines }, (_, index) => `\tits "part ${index + 1}" is a number`)
    return [...filler(fillerAbove, "above"), 'a "stock pile" is a pile', ...body, ...filler(30, "below")].join("\n")
  }

  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /**
   * An editor with every editor's setup, `ROWS` rows tall, holding `text`, folding as Spell's blocks fold.
   * - Its rows measured as drawn, not CodeMirror's `defaultLineHeight`, which is the font's alone.
   */
  async function editorOf(text: string): Promise<EditorView> {
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), INDENT_FOLDS, FIXED_HEIGHT]
    })
    const host = document.body.appendChild(document.createElement("div"))
    view = new EditorView({ parent: host, state })
    await frames(1)
    const { top, bottom } = view.documentPadding
    view.dom.style.height = `${ROWS * rowHeight(view) + top + bottom}px`
    view.requestMeasure()
    await frames(2)
    return view
  }

  /** Jump to the name in the block's head line, as Go to Definition does, and wait for the scroll. */
  async function jumpTo(view: EditorView, text: string): Promise<void> {
    const from = view.state.doc.toString().indexOf(text)
    view.dispatch({
      selection: { anchor: from, head: from + text.length },
      effects: CodeMirrorSetup.revealBlock(view.state, from)
    })
    await frames(3)
  }

  /** Where the line at `pos` is, in rows from the pane's top:  0, the first row shown. */
  function rowOf(view: EditorView, pos: number): number {
    const top = view.lineBlockAt(pos).top - view.scrollDOM.scrollTop + view.documentPadding.top
    // `|| 0`:  never -0, a hair above the top
    return Math.round(top / rowHeight(view)) || 0
  }

  /** How tall a row is, as drawn. */
  function rowHeight(view: EditorView): number {
    return view.lineBlockAt(0).height
  }

  /** The line holding `text`'s start. */
  function lineOf(view: EditorView, text: string): number {
    return view.state.doc.toString().indexOf(text)
  }

  test("a block below the pane comes wholly into view, its head a row or more below the top", async () => {
    const view = await editorOf(fileWith(4))
    expect(view.scrollDOM.scrollTop).toBe(0)
    await jumpTo(view, "stock pile")
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBeGreaterThanOrEqual(1)
    expect(rowOf(view, lineOf(view, "part 4"))).toBeLessThanOrEqual(ROWS - 1)
  })

  test("a block above the pane:  its head a row below the top, the line before it in view", async () => {
    const view = await editorOf(fileWith(4))
    view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight
    await frames(2)
    await jumpTo(view, "stock pile")
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBe(1)
    expect(rowOf(view, lineOf(view, "part 4"))).toBeLessThanOrEqual(ROWS - 1)
  })

  test("a block at the file's start stays at the top", async () => {
    const view = await editorOf(fileWith(4, 0))
    view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight
    await frames(2)
    await jumpTo(view, "stock pile")
    expect(view.scrollDOM.scrollTop).toBe(0)
    expect(rowOf(view, 0)).toBe(0)
  })

  test("a block taller than the pane:  its head one row below the top", async () => {
    const view = await editorOf(fileWith(ROWS * 2))
    await jumpTo(view, "stock pile")
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBe(1)
  })

  test("a block already in view, with its row above, doesn't move", async () => {
    const view = await editorOf(fileWith(2, 3))
    await jumpTo(view, "stock pile")
    expect(view.scrollDOM.scrollTop).toBe(0)
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBe(3)
  })

  test("a block whose head is on the pane's first row, text above it, moves down a row", async () => {
    const view = await editorOf(fileWith(2, 10))
    view.scrollDOM.scrollTop = view.lineBlockAt(lineOf(view, 'a "stock pile"')).top + view.documentPadding.top
    await frames(2)
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBe(0)
    await jumpTo(view, "stock pile")
    expect(rowOf(view, lineOf(view, 'a "stock pile"'))).toBe(1)
  })
})

/** Wait for `count` animation frames:  CodeMirror measures and scrolls on one. */
async function frames(count: number): Promise<void> {
  for (let index = 0; index < count; index++) await new Promise((done) => requestAnimationFrame(done))
}

/** The editor scrolls inside its own box. */
const FIXED_HEIGHT = EditorView.theme({ "&": { fontSize: "14px" }, ".cm-scroller": { overflow: "auto" } })

/** Folds as the language service makes them:  a line, and the lines after it further in. */
const INDENT_FOLDS = foldService.of((state, lineStart) => {
  const { doc } = state
  const head = doc.lineAt(lineStart)
  const indent = (text: string) => text.length - text.trimStart().length
  let last = head.number
  while (last < doc.lines) {
    const next = doc.line(last + 1)
    if (!next.text.trim() || indent(next.text) <= indent(head.text)) break
    last++
  }
  return last > head.number ? { from: head.to, to: doc.line(last).to } : null
})
