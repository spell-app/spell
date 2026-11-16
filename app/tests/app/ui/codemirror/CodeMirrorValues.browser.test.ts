import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"
import { CodeMirrorValues, type ValuesAt } from "spell/app/app/ui/codemirror/CodeMirrorValues"

/**
 * An attribute's words, shown quietly under its value once the caret rests in it (epic `editor` T70), and the picker
 * at the caret (T61), on a real CodeMirror editor (epic `codemirror` P5):
 * a plain state, its words handed in as the language service would.
 */
describe("CodeMirrorValues", () => {
  let view: EditorView | undefined
  /** What the words were asked for:  the attribute's, `spacing`'s. */
  const valuesAt = vi.fn(() => ({ tag: "container", attribute: "spacing", values: ["none", "xs", "lg"] }))

  afterEach(() => {
    view?.destroy()
    view = undefined
    document.querySelectorAll(".ValueChoices, .ValuePicker").forEach((each) => each.remove())
  })

  /** An editor holding `line`, its caret at `column` (0-based), with the keys;  its words from `words`. */
  function editorOf(line: string, column: number, words: ValuesAt = valuesAt) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 200px"
    document.body.append(host)
    const state = EditorState.create({
      doc: line,
      extensions: [CodeMirrorValues.extension(words), CodeMirrorSetup.extensions()]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    view.dispatch({ selection: { anchor: column } })
    return view
  }
  /** The words showing, the ticked one marked `✓`;  `undefined` if none show. */
  const shown = () => {
    const node = document.querySelector(".ValueChoices")
    if (!node) return undefined
    return [...node.querySelectorAll("button")].map(
      (word) => (word.getAttribute("aria-selected") === "true" ? "✓" : "") + word.textContent
    )
  }
  /** Press `key` in the editor's text. */
  const press = (key: string, init: KeyboardEventInit = {}) =>
    view!.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true, ...init })
    )
  const line = `<container spacing="xs">`

  test("after the caret rests in a value for a second, its words, the value ticked", async () => {
    editorOf(line, 21)
    expect(shown()).toBeUndefined()
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    expect(shown()).toEqual(["none", "✓xs", "lg"])
  })

  test("a move hides it at once;  outside a value it never shows", async () => {
    const code = editorOf(line, 21)
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    code.dispatch({ selection: { anchor: 2 } })
    expect(shown()).toBeUndefined()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(shown()).toBeUndefined()
  })

  test("⌥↓ steps in at once, on the value;  → then Enter chooses, one undo", () => {
    const code = editorOf(line, 21)
    press("ArrowDown", { altKey: true })
    expect(shown()).toEqual(["none", "✓xs", "lg"])
    expect(document.activeElement?.textContent).toBe("xs")
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    expect(code.state.doc.toString()).toBe(`<container spacing="lg">`)
    // the caret after the closing quote
    expect(code.state.selection.main.head).toBe(`<container spacing="lg"`.length)
    expect(shown()).toBeUndefined()
    undo(code)
    expect(code.state.doc.toString()).toBe(line)
  })

  test("a click on a word chooses it", async () => {
    const code = editorOf(line, 21)
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    ;[...document.querySelectorAll<HTMLButtonElement>(".ValueChoicesWord")]
      .find((it) => it.textContent === "none")!
      .click()
    expect(code.state.doc.toString()).toBe(`<container spacing="none">`)
  })

  test("words that come later (the language service's are a promise) show too;  ⌥↓ waits for them", async () => {
    editorOf(line, 21, async () => valuesAt())
    press("ArrowDown", { altKey: true })
    await vi.waitUntil(() => shown(), { timeout: 500 })
    expect(shown()).toEqual(["none", "✓xs", "lg"])
    expect(document.activeElement?.textContent).toBe("xs")
  })

  test("⌥↓ outside a value is CodeMirror's own:  the line moves down", () => {
    const code = editorOf(`${line}\n<text />`, 2)
    press("ArrowDown", { altKey: true })
    expect(code.state.doc.toString()).toBe(`<text />\n${line}`)
    expect(shown()).toBeUndefined()
  })

  test("the picker:  a chip picked writes its word, one undo;  Esc writes nothing", () => {
    const picker: SP.ComponentValuePicker = { kind: "color", colors: ["#f00", "#00f"] }
    const code = editorOf(`<text color="red">`, 13)
    CodeMirrorValues.pick(code, picker, ["red", "blue"])
    expect(document.activeElement?.textContent).toBe("red")
    ;[...document.querySelectorAll<HTMLButtonElement>(".ValuePickerChip")].at(-1)!.click()
    expect(code.state.doc.toString()).toBe(`<text color="blue">`)
    expect(document.querySelector(".ValuePicker")).toBeNull()
    undo(code)
    expect(code.state.doc.toString()).toBe(`<text color="red">`)

    CodeMirrorValues.pick(code, picker, ["red", "blue"])
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(document.querySelector(".ValuePicker")).toBeNull()
    expect(code.state.doc.toString()).toBe(`<text color="red">`)
  })
})
