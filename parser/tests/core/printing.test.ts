import { parseHTML } from "linkedom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { markForPrinting, printAlone } from "spell/parser/core/printing"

/**
 * Printing the app alone (`open printing`, epic `mockup` P21), on a fake page (linkedom).
 * - What prints shows only in a real browser, with print media:  checked by hand with Playwright
 *   (`page.emulateMedia({ media: "print" })`), in the editor and in "Run App in a New Tab".
 * - Here:  which elements are marked, which roots get the style sheet, and that it's all taken back.
 */

/** A style sheet that holds its text:  linkedom has none. */
class FakeSheet {
  css = ""
  replaceSync(css: string) {
    this.css = css
  }
}

/** The page:  an editor's chrome around a runner, whose shadow root holds a toolbar and the app. */
function aPage() {
  const { document, window } = parseHTML(
    `<html><body><nav id="chrome">Editor</nav><main id="editor"><spell-viewer id="viewer"></spell-viewer></main></body></html>`
  )
  const viewer = document.getElementById("viewer")!
  const shadow = viewer.attachShadow({ mode: "open" })
  shadow.innerHTML = `<div id="bar">Run</div><div id="pane"><div id="app"><p>Milk</p></div></div>`
  for (const root of [document, shadow] as Array<{ adoptedStyleSheets?: unknown[] }>) root.adoptedStyleSheets = []
  const app = shadow.querySelector("#app")!
  return { document, window, shadow, viewer, app }
}

describe("printing the app alone", () => {
  beforeEach(() => vi.stubGlobal("CSSStyleSheet", FakeSheet))
  afterEach(() => vi.unstubAllGlobals())

  test("marks the way from the page down to the app, and the roots on it take the print sheet", () => {
    const { document, shadow, app } = aPage()
    const unmark = markForPrinting(app)
    const marked = (root: { querySelectorAll(s: string): ArrayLike<Element> }) =>
      Array.from(root.querySelectorAll("[spell-printing-path]")).map((element) => element.id || element.localName)

    expect(app.hasAttribute("spell-printing-app")).toBe(true)
    expect(marked(shadow)).toEqual(["pane"])
    expect(marked(document)).toEqual(["html", "body", "editor", "viewer"])
    const [sheet] = shadow.adoptedStyleSheets as unknown as FakeSheet[]
    expect(sheet!.css).toContain("@media print")
    expect(document.adoptedStyleSheets).toEqual([sheet])

    unmark()
    expect(app.hasAttribute("spell-printing-app")).toBe(false)
    expect(marked(shadow)).toEqual([])
    expect(marked(document)).toEqual([])
    expect(shadow.adoptedStyleSheets).toEqual([])
    expect(document.adoptedStyleSheets).toEqual([])
  })

  test("marking again takes the last marks back first", () => {
    const { document, app } = aPage()
    markForPrinting(app)
    const other = document.getElementById("chrome")!
    markForPrinting(other)
    expect(app.hasAttribute("spell-printing-app")).toBe(false)
    expect(other.hasAttribute("spell-printing-app")).toBe(true)
    expect(document.adoptedStyleSheets).toHaveLength(1)
  })

  test("opens the Print dialog with the page marked, and takes the marks back after it", () => {
    const { app, shadow } = aPage()
    const listeners = new Map<string, () => void>()
    vi.stubGlobal("addEventListener", (type: string, listener: () => void) => listeners.set(type, listener))
    const print = vi.fn(() => expect(app.hasAttribute("spell-printing-app")).toBe(true))
    vi.stubGlobal("print", print)

    printAlone(app)
    expect(print).toHaveBeenCalledOnce()
    expect(app.hasAttribute("spell-printing-app")).toBe(true)
    listeners.get("afterprint")!()
    expect(app.hasAttribute("spell-printing-app")).toBe(false)
    expect(shadow.adoptedStyleSheets).toEqual([])
  })

  test("with no Print dialog (node):  nothing", () => {
    const { app } = aPage()
    vi.stubGlobal("print", undefined)
    printAlone(app)
    expect(app.hasAttribute("spell-printing-app")).toBe(false)
  })
})
