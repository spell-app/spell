import { parentOf } from "./drawnWindow"

/**
 * Printing the running app ALONE, not the page around it:  what `open printing` does (epic `mockup` P21).
 * - A runner draws the app inside a page of its own:  the editor, with its toolbars and side bars around it,
 *   or "Run App in a New Tab", with the runner's own bar.
 * - So while the Print dialog is open, everything on the way from the page down to the app is marked,
 *   and a print style sheet hides whatever is beside it, and lets it run on over as many pages as it takes.
 * - What the app itself prints is the program's:  its own CSS, `@media print`.
 * - Plain DOM, across shadow roots:  nothing of the runner's is named here,
 *   so every runner (the editor, a new tab, VS Code's) prints the same way.
 */

/** On each element from the page down to the app:  shown, everything beside it hidden. */
const PRINTING_PATH = "spell-printing-path"
/** On the app's own element, where the program draws (`core.appRoot`). */
const PRINTING_APP = "spell-printing-app"

/**
 * What a printed page shows:  only the path down to the app, each step of it laid out plainly, so the app flows on.
 * - Plainly:  no backgrounds or decorations of the page's own, so the app prints on white paper.
 * - Everything else in the same tree is hidden:  a shadow root's top elements have no parent to select them by.
 */
const PRINT_CSS = `@media print {
  :not([${PRINTING_PATH}], [${PRINTING_APP}], [${PRINTING_APP}] *) { display: none !important; }
  [${PRINTING_PATH}]:not(slot) {
    display: block !important; position: static !important; inset: auto !important; transform: none !important;
    overflow: visible !important; contain: none !important;
    width: auto !important; height: auto !important; min-height: 0 !important; max-height: none !important;
    margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important;
  }
  [${PRINTING_PATH}]::before, [${PRINTING_PATH}]::after { display: none !important; }
  [${PRINTING_APP}] {
    position: static !important; overflow: visible !important; height: auto !important; max-height: none !important;
  }
}`

/** The print style sheet, made once, adopted by the page and each shadow root on the way to the app. */
let printSheet: CSSStyleSheet | undefined

/** What takes back the last marks, until the Print dialog closes. */
let unmarkLast: (() => void) | undefined

/**
 * Open the browser's Print dialog for `appRoot` alone:  what `core.openPrinting()` does.
 * - Marks the page for it first (`markForPrinting()`), and takes the marks back once the dialog closes (`afterprint`).
 * - No `appRoot` (a page that's only the app):  the whole page.
 * - Under node:  nothing.
 * - NEVER throws.
 */
export function printAlone(appRoot: Element | undefined): void {
  if (typeof globalThis.print !== "function") return
  try {
    const unmark = markForPrinting(appRoot)
    addEventListener("afterprint", unmark, { once: true })
    globalThis.print()
  } catch (error) {
    console.error("open printing:  can't print", error)
  }
}

/**
 * Mark the page so that printing shows `appRoot` alone, and give back what takes the marks away.
 * - Each element from `appRoot` up to `<html>`, across shadow roots and through slots, is marked `spell-printing-path`;
 *   the document and each shadow root on the way adopt the print style sheet.
 * - Only `@media print` reads the marks:  the page on the screen doesn't change.
 * - The last marks, if still there, go first.
 * - Exported for tests, which emulate print media rather than open a dialog.
 */
export function markForPrinting(appRoot: Element | undefined): () => void {
  unmarkLast?.()
  if (!appRoot) return () => {}
  const sheet = (printSheet ??= sheetOf(PRINT_CSS))
  const marked: Element[] = []
  const roots = new Set<Document | ShadowRoot>()

  appRoot.setAttribute(PRINTING_APP, "")
  roots.add(appRoot.getRootNode() as Document | ShadowRoot)
  for (let element = parentOf(appRoot); element; element = parentOf(element)) {
    element.setAttribute(PRINTING_PATH, "")
    marked.push(element)
    roots.add(element.getRootNode() as Document | ShadowRoot)
  }
  for (const root of roots) {
    if (root.adoptedStyleSheets && !root.adoptedStyleSheets.includes(sheet))
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
  }

  const unmark = () => {
    if (unmarkLast !== unmark) return
    unmarkLast = undefined
    appRoot.removeAttribute(PRINTING_APP)
    for (const element of marked) element.removeAttribute(PRINTING_PATH)
    for (const root of roots) root.adoptedStyleSheets = root.adoptedStyleSheets.filter((it) => it !== sheet)
  }
  return (unmarkLast = unmark)
}

/** A style sheet holding `css`. */
function sheetOf(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  return sheet
}
