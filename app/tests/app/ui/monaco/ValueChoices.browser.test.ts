import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { monaco } from "spell/app/app/ui/monaco/monaco"
import { SpellMonaco } from "spell/app/app/ui/monaco/SpellMonaco"
import { ValueChoices } from "spell/app/app/ui/monaco/ValueChoices"

/**
 * An attribute's words, shown quietly under its value once the caret rests in it (epic `editor` T70), on a real
 * Monaco editor:  a plain model, its words handed in, as the language service would.
 */
describe("ValueChoices", () => {
  let editor: monaco.editor.IStandaloneCodeEditor | undefined
  /** What the words were asked for:  the attribute's, `spacing`'s. */
  const valuesAt = vi.fn(() => ({ tag: "container", attribute: "spacing", values: ["none", "xs", "lg"] }))

  beforeAll(() => {
    SpellMonaco.register()
  })

  afterEach(() => {
    const model = editor?.getModel()
    editor?.dispose()
    model?.dispose()
    editor = undefined
    document.querySelectorAll(".ValueChoices").forEach((each) => each.remove())
  })

  /** An editor holding `line`, its caret at `column` (1-based), with the text focused. */
  function editorOf(line: string, column: number) {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 200px"
    document.body.append(host)
    editor = monaco.editor.create(host, { model: monaco.editor.createModel(line, SpellMonaco.LANGUAGE) })
    new ValueChoices(editor, valuesAt)
    editor.focus()
    editor.setPosition({ lineNumber: 1, column })
    return editor
  }
  /** The words showing, the ticked one marked `✓`;  `undefined` if none show. */
  const shown = () => {
    const node = document.querySelector(".ValueChoices")
    if (!node) return undefined
    return [...node.querySelectorAll("button")].map(
      (word) => (word.getAttribute("aria-selected") === "true" ? "✓" : "") + word.textContent
    )
  }
  /** Press `key` in the editor's text area. */
  const press = (key: string, init: KeyboardEventInit = {}) =>
    editor!
      .getDomNode()!
      .querySelector("textarea")!
      .dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true, ...init }))
  const line = `<container spacing="xs">`

  test("after the caret rests in a value for a second, its words, the value ticked", async () => {
    editorOf(line, 22)
    expect(shown()).toBeUndefined()
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    expect(shown()).toEqual(["none", "✓xs", "lg"])
  })

  test("a move hides it at once;  outside a value it never shows", async () => {
    const code = editorOf(line, 22)
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    code.setPosition({ lineNumber: 1, column: 3 })
    expect(shown()).toBeUndefined()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(shown()).toBeUndefined()
  })

  test("⌥↓ steps in at once, on the value;  → then Enter chooses, one undo", async () => {
    const code = editorOf(line, 22)
    press("ArrowDown", { altKey: true })
    expect(shown()).toEqual(["none", "✓xs", "lg"])
    expect(document.activeElement?.textContent).toBe("xs")
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    expect(code.getValue()).toBe(`<container spacing="lg">`)
    expect(shown()).toBeUndefined()
    void code.getModel()!.undo()
    expect(code.getValue()).toBe(line)
  })

  test("a click on a word chooses it", async () => {
    const code = editorOf(line, 22)
    await vi.waitUntil(() => shown(), { timeout: 2000 })
    ;[...document.querySelectorAll<HTMLButtonElement>(".ValueChoicesWord")]
      .find((it) => it.textContent === "none")!
      .click()
    expect(code.getValue()).toBe(`<container spacing="none">`)
  })
})
