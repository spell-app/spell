/**
 * The editor's language worker:  the parser and the language service, off the page's thread (epic `solid-2-final` P18).
 * - A `LSP.LanguageHost`, fed the page's `LanguageClient.inWorker()` messages:
 *   files opened, their edits as changes, requests from the ONE table (`LSP.LANGUAGE_REQUESTS`).
 * - It loads each project itself, through the page server, as the page does.
 * - Spaces' models register spell's project groups and Spell UI's names for a drawing's tags, as on the page.
 * - Its position in the import graph:  an entry of its own, made by `new Worker(new URL(...))`:
 *   the parser, spaces' models and the language service;  NEVER the editor, Solid or CodeMirror.
 */
import "spell/parser/parser"
import "spell/app/spaces"
import { LSP } from "spell/app/lsp"
import { plainError, type LanguageWorkerMessage, type LanguageWorkerReply } from "./LanguageClient"

const host = new LSP.LanguageHost()
// its value's words list a Pick row first, which the editor opens the picker for (epic `editor` T61)
host.service.picksValues = true

addEventListener("message", (event: MessageEvent<LanguageWorkerMessage>) => {
  const message = event.data
  if (message.kind === "open") host.open(message)
  else if (message.kind === "change") host.change(message)
  else if (message.kind === "close") host.close(message)
  else /* if (message.kind === "request") */ {
    const { id, method, params } = message
    host.request(method, params as never).then(
      (answer) => reply({ id, answer }),
      (error: unknown) => reply({ id, error: plainError(error) })
    )
  }
})

/** Send `message` back to the page:  an answer a message can't carry is an error saying so.  NEVER throws. */
function reply(message: LanguageWorkerReply): void {
  try {
    postMessage(message)
  } catch (error) {
    postMessage({ id: message.id, error: plainError(error) })
  }
}
