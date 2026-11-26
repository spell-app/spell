/**
 * The editor's language worker:  the parser and the language service, off the page's thread (epic `solid-2-final` P18).
 * - A `LSP.LanguageHost`, fed the page's `LanguageClient.inWorker()` messages:
 *   files opened, their edits as changes, requests from the ONE table (`LSP.LANGUAGE_REQUESTS`), compiles;
 *   it sends each open file's problems back after each parse that changes them.
 * - It loads each project itself, through the page server, as the page does.
 * - With each file's problems, what the editor draws it with, in its look (`lookOf()`).
 * - Spaces' models register spell's project groups and Spell UI's names for a drawing's tags, as on the page;
 *   the page's person and their org's own groups come first, in a `groups` message.
 * - Its position in the import graph:  an entry of its own, made by `new Worker(new URL(...))`:
 *   the parser, spaces' models and the language service;  NEVER the editor, Solid or CodeMirror.
 * - It holds the editor's ONE grammar, up front (`spell/parser/spell/languages/en`):  the page's copy of the language
 *   loads only on first use (epic `solid-2-final` P20).
 * - Not HTML's entity table, which a drawing's text and markdown decode with:  a chunk of its own, loaded as the
 *   worker starts;  the messages wait for it, in order, so the first parse has it (epic `solid-2-final` I64).
 */
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { LSP } from "spell/app/lsp"
import { CodeColours } from "spell/app/app/ui/CodeColours"
import { plainError, type LanguageWorkerMessage, type LanguageWorkerReply } from "./LanguageClient"

// the grammar, with English's pack:  everything here parses
import "spell/parser/spell/languages/en"

// each open file's problems and look, after each parse that changes them
// and each project it can't load, which the page answers for itself
const host = new LSP.LanguageHost({
  onParsed: (parsed) => postMessage({ kind: "parsed", ...parsed }),
  onUnavailable: (projectId) => postMessage({ kind: "unavailable", projectId }),
  lookOf
})
// its value's words list a Pick row first, which the editor opens the picker for (epic `editor` T61)
host.service.picksValues = true

// the messages that come before HTML's entity table:  handled in order once it's in (or once it failed to load:
// the decoder still knows the common names)
let waitingForEntities: Promise<void> | undefined = P.HTMLEntities.load()
  .catch((error: unknown) => console.error("couldn't load HTML's entities", error))
  .finally(() => (waitingForEntities = undefined))

addEventListener("message", (event: MessageEvent<LanguageWorkerMessage>) => {
  if (!waitingForEntities) return handle(event.data)
  waitingForEntities = waitingForEntities
    .then(() => handle(event.data))
    .catch((error: unknown) => console.error("couldn't handle a message", error))
})

/** Do what `message` asks. */
function handle(message: LanguageWorkerMessage): void {
  if (message.kind === "groups") {
    // the page's person and their org's groups, before any project (`LanguageClient`'s `groupsOnPage()`)
    SPACES.setLocalPerson(message.person)
    SPACES.addOrgGroups(message.orgGroups)
  } else if (message.kind === "open") host.open(message)
  else if (message.kind === "change") host.change(message)
  else if (message.kind === "close") host.close(message)
  else if (message.kind === "look") host.look(message)
  else if (message.kind === "compile") {
    const { id, ...compile } = message
    host.compile(compile).then(
      (answer) => reply({ id, answer }),
      (error: unknown) => reply({ id, error: plainError(error) })
    )
  } else /* if (message.kind === "request") */ {
    const { id, method, params } = message
    host.request(method, params as never).then(
      (answer) => reply({ id, answer }),
      (error: unknown) => reply({ id, error: plainError(error) })
    )
  }
}

/** Send `message` back to the page:  an answer a message can't carry is an error saying so.  NEVER throws. */
function reply(message: Extract<LanguageWorkerReply, { id: number }>): void {
  try {
    postMessage(message)
  } catch (error) {
    postMessage({ id: message.id, error: plainError(error) })
  }
}

/**
 * What `file`, holding `text`, looks like in `look`, from its project's parse:  as the page drew it
 * (`CodeMirrorBubbly`, `CodeMirrorTokens`), so the page needn't parse it (epic `solid-2-final` T36).
 * - The drawing without its text:  the page has that.
 */
function lookOf(file: SP.SpellFile, text: string, look: LSP.CodeLook): LSP.LanguageLook {
  const { parser } = SP.Language.forFile(file.path)
  if (look === "bubbly") {
    const { text: _text, ...drawing } = SP.BubblyLayout.of(text, parser, { within: file })
    return { drawing }
  }
  const parsed = SP.BubblyLayout.isParseOf(file, text) ? (file.match as P.Match) : undefined
  return { colours: CodeColours.spansOf(text, parser, parsed) }
}
