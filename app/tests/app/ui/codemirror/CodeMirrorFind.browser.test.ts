import { afterEach, describe, expect, test } from "vite-plus/test"
import { getSearchQuery, openSearchPanel, searchPanelOpen } from "@codemirror/search"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorFind } from "spell/app/app/ui/codemirror/CodeMirrorFind"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * The find bar, `CodeMirrorFind`, on a real CodeMirror editor, in the browser (epic `codemirror` I8):
 * it opens, counts, switches, replaces and closes.
 * - Typing is the field's own `input` event, as a person's typing makes it.
 */
describe("the find bar", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** An editor holding `text`, with every editor's setup, the caret at its start. */
  function editorOf(text: string, { editable = true } = {}): EditorView {
    const parent = document.body.appendChild(document.createElement("div"))
    view = new EditorView({
      parent,
      state: EditorState.create({ doc: text, extensions: CodeMirrorSetup.extensions({ editable }) })
    })
    return view
  }

  /** The bar in `view`, opened as ⌘F does. */
  function open(view: EditorView): HTMLElement {
    openSearchPanel(view)
    return view.dom.querySelector<HTMLElement>(".CodeMirrorFind")!
  }

  /** Type `text` into `field`, all of it at once. */
  function typeInto(field: HTMLInputElement, text: string): void {
    field.value = text
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  /** A key pressed in `target`. */
  function press(target: Element, key: string, init: KeyboardEventInit = {}): void {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }))
  }

  const TEXT = "a card, a Card, a cardboard box, a card"

  test("opens in one row, the find field in focus, the replace row hidden", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    expect(searchPanelOpen(view.state)).toBe(true)
    const find = bar.querySelector<HTMLInputElement>("[main-field]")!
    expect(document.activeElement).toBe(find)
    expect(find.placeholder).toBe("Find")
    expect(bar.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(true)
    // the switches are inside the find field
    expect(bar.querySelectorAll(".field .toggle")).toHaveLength(3)
  })

  test("typing selects the first match, and counts them;  Enter and ⇧Enter step through", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    const find = bar.querySelector<HTMLInputElement>("[main-field]")!
    const count = bar.querySelector(".count")!
    typeInto(find, "card")
    expect(count.textContent).toBe("1 of 4")
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe("card")
    press(find, "Enter")
    expect(count.textContent).toBe("2 of 4")
    press(find, "Enter", { shiftKey: true })
    expect(count.textContent).toBe("1 of 4")
    typeInto(find, "chair")
    expect(count.textContent).toBe("No results")
    expect(bar.classList.contains("none")).toBe(true)
  })

  test("each switch changes the search, and shows it's on", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    typeInto(bar.querySelector<HTMLInputElement>("[main-field]")!, "card")
    const count = () => bar.querySelector(".count")!.textContent
    const matchCase = bar.querySelector<HTMLButtonElement>(".toggle.caseSensitive")!
    matchCase.click()
    expect(getSearchQuery(view.state).caseSensitive).toBe(true)
    expect(matchCase.getAttribute("aria-pressed")).toBe("true")
    expect(count()).toMatch(/ of 3$/)
    bar.querySelector<HTMLButtonElement>(".toggle.wholeWord")!.click()
    expect(count()).toMatch(/ of 2$/)
    // the key does it too, as VS Code's ⌥⌘W
    CodeMirrorFind.toggle(view, "wholeWord")
    expect(getSearchQuery(view.state).wholeWord).toBe(false)
    bar.querySelector<HTMLButtonElement>(".toggle.regexp")!.click()
    typeInto(bar.querySelector<HTMLInputElement>("[main-field]")!, "c.rd")
    expect(count()).toMatch(/ of 3$/)
  })

  test("the chevron shows the replace row;  Replace and Replace All change the text", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    typeInto(bar.querySelector<HTMLInputElement>("[main-field]")!, "card")
    bar.querySelector<HTMLButtonElement>(".expander")!.click()
    const row = bar.querySelector<HTMLElement>(".row.replace")!
    expect(row.hidden).toBe(false)
    const replace = row.querySelector<HTMLInputElement>("input")!
    expect(document.activeElement).toBe(replace)
    typeInto(replace, "deck")
    press(replace, "Enter")
    expect(view.state.doc.toString()).toBe("a deck, a Card, a cardboard box, a card")
    row.querySelector<HTMLButtonElement>(".replaceAll")!.click()
    expect(view.state.doc.toString()).toBe("a deck, a deck, a deckboard box, a deck")
  })

  test("⌥⌘F opens it with the replace row;  the row stays open the next time", () => {
    const view = editorOf(TEXT)
    CodeMirrorFind.openToReplace(view)
    const bar = view.dom.querySelector<HTMLElement>(".CodeMirrorFind")!
    expect(bar.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(false)
    press(bar.querySelector("[main-field]")!, "Escape")
    expect(view.dom.querySelector<HTMLElement>(".CodeMirrorFind .row.replace")?.hidden ?? true).toBe(true)
    expect(open(view).querySelector<HTMLElement>(".row.replace")!.hidden).toBe(false)
  })

  test("Esc closes it, and the focus goes back to the code", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    press(bar.querySelector("[main-field]")!, "Escape")
    expect(searchPanelOpen(view.state)).toBe(false)
    expect(view.dom.querySelector(".CodeMirrorFind")).toBeNull()
    expect(view.hasFocus).toBe(true)
  })

  test("an editor that only shows code has no replace row", () => {
    const view = editorOf(TEXT, { editable: false })
    const bar = open(view)
    expect(bar.querySelector(".expander")).toBeNull()
    expect(bar.querySelector(".row.replace")).toBeNull()
  })
})
