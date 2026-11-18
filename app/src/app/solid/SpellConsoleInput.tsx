import { Loading } from "solid-js"

import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ErrorBoundary } from "./ErrorBoundary"
import { LazyCodeMirror } from "./LazyCodeMirror"

import "./SpellConsoleInput.css"

/****************
 * ### `<SpellConsoleInput>`
 * The Spell Console's line, under the console's lines (epic `editor` P32):  type a line of Spell, press Return,
 * and it runs on the running app, as the browser's console runs a line on its page (`editor.runInConsole()`).
 * - The line as typed, then its answer or why not, show among the console's lines.
 * - The line itself is CodeMirror, loaded with the code editor (`<ConsoleLineEditor>`):  Spell's colours and the
 *   bubbly look, the project's names suggested, Up and Down for earlier lines.
 * - Then the console's lines scroll to the bottom, where the answer is.
 * - Earlier lines are this page's, kept while it's open (`TYPED`).
 * - An error drawing it shows in its place, and goes to `editor.showError()`.
 ****************/
export function SpellConsoleInput() {
  let element!: HTMLDivElement
  return (
    <div class="SpellConsoleInput" ref={(div: HTMLDivElement) => (element = div)}>
      <span class="prompt" aria-hidden="true">
        ›
      </span>
      <ErrorBoundary onError={(error) => editor.showError(error)}>
        <Loading fallback={<div class="loading">{appTexts.text("loadingEditor")}</div>}>
          <LazyCodeMirror.ConsoleLineEditor
            onRun={run}
            earlier={() => TYPED}
            project={() => editor.project}
            placeholder={appTexts.text("consolePlaceholder")}
            label={appTexts.text("consoleInputLabel")}
          />
        </Loading>
      </ErrorBoundary>
    </div>
  )

  /** Return:  keep the line for Up, run it on the running app, then show its answer, at the bottom of the lines. */
  function run(text: string) {
    if (TYPED.at(-1) !== text) TYPED.push(text)
    void editor
      .runInConsole(text)
      .then(showLatest)
      .catch((error: unknown) => editor.showError(error))
  }

  /** Scroll the console's lines to the bottom, once the answer is drawn:  where it is. */
  function showLatest() {
    requestAnimationFrame(() => {
      const lines = element.closest(".ConsoleRoot")?.querySelector<HTMLElement>(".ConsoleViewer.scrolling")
      if (lines) lines.scrollTop = lines.scrollHeight
    })
  }
}

/** The lines typed into the console, oldest first, while the page is open:  what Up brings back. */
const TYPED: string[] = []
