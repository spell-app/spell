import { afterEach, describe, expect, test } from "vite-plus/test"
import { getSearchQuery, openSearchPanel, searchPanelOpen } from "@codemirror/search"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { editorPrefs } from "spell/app/app/editorPrefs"
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
    // the replace row's fold is kept for every editor:  each test starts with it showing
    editorPrefs.forget("findShowsReplace")
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

  test("opens with the replace row showing, the find field in focus", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    expect(searchPanelOpen(view.state)).toBe(true)
    const find = bar.querySelector<HTMLInputElement>("[main-field]")!
    expect(document.activeElement).toBe(find)
    expect(find.placeholder).toBe("Find")
    expect(bar.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(false)
    expect(bar.querySelector(".expander")!.getAttribute("aria-expanded")).toBe("true")
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

  test("Replace and Replace All change the text", () => {
    const view = editorOf(TEXT)
    const bar = open(view)
    typeInto(bar.querySelector<HTMLInputElement>("[main-field]")!, "card")
    const row = bar.querySelector<HTMLElement>(".row.replace")!
    const replace = row.querySelector<HTMLInputElement>("input")!
    typeInto(replace, "deck")
    press(replace, "Enter")
    expect(view.state.doc.toString()).toBe("a deck, a Card, a cardboard box, a card")
    row.querySelector<HTMLButtonElement>(".replaceAll")!.click()
    expect(view.state.doc.toString()).toBe("a deck, a deck, a deckboard box, a deck")
  })

  test("the chevron folds the replace row away, and it stays folded, in another editor too", () => {
    const first = editorOf(TEXT)
    const bar = open(first)
    bar.querySelector<HTMLButtonElement>(".expander")!.click()
    expect(bar.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(true)
    expect(document.activeElement).toBe(bar.querySelector("[main-field]"))
    press(bar.querySelector("[main-field]")!, "Escape")
    expect(open(first).querySelector<HTMLElement>(".row.replace")!.hidden).toBe(true)
    first.dom.parentElement?.remove()
    first.destroy()
    // a new editor, as another file or a reload makes:  folded still
    const second = editorOf(TEXT)
    const again = open(second)
    expect(again.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(true)
    // the chevron shows it again, the replace field in focus
    again.querySelector<HTMLButtonElement>(".expander")!.click()
    expect(again.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(false)
    expect(document.activeElement).toBe(again.querySelector(".row.replace input"))
  })

  test("⌥⌘F opens it with the replace row, even folded before", () => {
    editorPrefs.set("findShowsReplace", false)
    const view = editorOf(TEXT)
    CodeMirrorFind.openToReplace(view)
    const bar = view.dom.querySelector<HTMLElement>(".CodeMirrorFind")!
    expect(bar.querySelector<HTMLElement>(".row.replace")!.hidden).toBe(false)
    press(bar.querySelector("[main-field]")!, "Escape")
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
