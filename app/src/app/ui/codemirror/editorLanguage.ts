import { LSP } from "spell/app/lsp"
import { LanguageClient } from "./LanguageClient"
import { startLanguageWorker } from "./startLanguageWorker"

/**
 * The editor app's ONE language client, made on first use:  its language worker, and the page's own service it falls
 * back on (epic `solid-2-final` P20).
 * - Made as the editor starts, before CodeMirror loads:  so a project's first compile is the worker's, even in Run,
 *   where no code editor ever loads, and the page downloads no grammar for it (I59).
 * - CodeMirror's editors ask the same one, once they load (`SpellCodeMirror.useLanguage()`, `LazyCodeMirror`).
 * - Its position in the import graph:  the language service and its client, the worker's starter;
 *   NEVER CodeMirror, Solid or the editor.  Only the editor app imports it, so `<spell-editor>`'s build has no worker.
 */
export function editorLanguage(): EditorLanguage {
  if (!made) {
    const service = new LSP.SpellLanguageService(new LSP.AppAddresses())
    // its value's words list a Pick row first, which opens the picker at the caret (epic `editor` T61)
    service.picksValues = true
    made = { service, client: LanguageClient.inWorker(service, startLanguageWorker()) }
  }
  return made
}

/** The page's language service and the client that asks the worker first -- see `editorLanguage()`. */
export type EditorLanguage = {
  /** the page's own service:  answers when the worker can't */
  service: LSP.SpellLanguageService
  /** what asks the worker */
  client: LanguageClient
}

/** The one made, once asked for. */
let made: EditorLanguage | undefined
