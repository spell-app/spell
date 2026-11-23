import type {
  CodeActionParams,
  CompletionParams,
  DefinitionParams,
  DocumentFormattingParams,
  DocumentHighlightParams,
  DocumentOnTypeFormattingParams,
  DocumentRangeFormattingParams,
  DocumentSymbolParams,
  FoldingRangeParams,
  HoverParams,
  PrepareRenameParams,
  ReferenceParams,
  RenameParams,
  SelectionRangeParams,
  SemanticTokensDeltaParams,
  SemanticTokensParams,
  SemanticTokensRangeParams,
  SignatureHelpParams,
  TextDocumentPositionParams,
  TypeDefinitionParams
} from "vscode-languageserver"

import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"

/****************
 * ### `LanguageRequests`
 * The ONE table of what the language service answers about a file, by the request's name:
 * the language-server protocol's own (`textDocument/hover` ...) and Spell's (`spell/bubbly` ...).
 * - Each entry:  what it answers when there's no parsed file (`fallback`), and how the service answers it (`answer`).
 * - Every editor answers from it, so VS Code and the app's editor say the same:
 *   - VS Code's language server, a node process (`SpellLanguageServer`)
 *   - the app's language worker, and the same client in the page's own thread where no worker runs
 *     (the app's `LanguageClient`;  epic `solid-2-final` P18)
 * - Every params shape names its file as the protocol does, `textDocument.uri`.
 * - Plain data in, plain data out:  what an answer holds crosses a worker's messages as it is.
 * - Its position in the import graph:  types only, of the parser and the service:
 *   `SpellLanguageService` is handed in, so this file loads nothing.
 ****************/
export const LANGUAGE_REQUESTS = {
  "textDocument/documentSymbol": request(
    (service, file, _params: DocumentSymbolParams) => service.documentSymbols(file),
    []
  ),
  "textDocument/foldingRange": request((service, file, _params: FoldingRangeParams) => service.foldingRanges(file), []),
  "textDocument/selectionRange": request(
    (service, file, { positions }: SelectionRangeParams) => service.selectionRanges(file, positions),
    []
  ),
  "textDocument/semanticTokens/full": request(
    (service, file, _params: SemanticTokensParams) => service.semanticTokens(file),
    { data: [] }
  ),
  "textDocument/semanticTokens/full/delta": request(
    (service, file, { previousResultId }: SemanticTokensDeltaParams) =>
      service.semanticTokensDelta(file, previousResultId),
    { data: [] }
  ),
  "textDocument/semanticTokens/range": request(
    (service, file, { range }: SemanticTokensRangeParams) => service.semanticTokens(file, range),
    { data: [] }
  ),
  "textDocument/hover": request(
    (service, file, { position, detail }: HoverParams & { detail?: LSP.HoverDetail }) =>
      service.hover(file, position, detail),
    null
  ),
  "textDocument/definition": request(
    (service, file, { position }: DefinitionParams) => service.definition(file, position),
    []
  ),
  "textDocument/typeDefinition": request(
    (service, file, { position }: TypeDefinitionParams) => service.typeDefinition(file, position),
    []
  ),
  "textDocument/references": request(
    (service, file, { position, context }: ReferenceParams) =>
      service.references(file, position, context.includeDeclaration),
    []
  ),
  "textDocument/documentHighlight": request(
    (service, file, { position }: DocumentHighlightParams) => service.documentHighlights(file, position),
    []
  ),
  "textDocument/prepareRename": request(
    (service, file, { position }: PrepareRenameParams) => service.prepareRename(file, position),
    null
  ),
  "textDocument/rename": request(
    (service, file, { position, newName }: RenameParams) => service.rename(file, position, newName),
    null
  ),
  "textDocument/formatting": request(
    (service, file, { options }: DocumentFormattingParams) => service.formatting(file, options),
    []
  ),
  "textDocument/rangeFormatting": request(
    (service, file, { range, options }: DocumentRangeFormattingParams) => service.formatting(file, options, range),
    []
  ),
  "textDocument/onTypeFormatting": request(
    (service, file, { position, ch }: DocumentOnTypeFormattingParams) => service.onTypeFormatting(file, position, ch),
    []
  ),
  "textDocument/completion": request(
    (service, file, { position }: CompletionParams) => service.completion(file, position),
    { isIncomplete: false, items: [] }
  ),
  "textDocument/signatureHelp": request(
    (service, file, { position }: SignatureHelpParams) => service.signatureHelp(file, position),
    null
  ),
  "textDocument/codeAction": request(
    (service, file, { range }: CodeActionParams) => service.codeActions(file, range),
    []
  ),

  ////////////////
  // ## Spell's own
  ////////////////

  "spell/compiled": request(
    (service, file, { target }: FileParams & { target?: LSP.CompiledTarget }) => service.compiled(file, target),
    null
  ),
  "spell/bubbly": request((service, file, _params: FileParams) => service.bubbly(file), []),
  "spell/lineTree": request(
    (service, file, { line }: FileParams & { line: number }) => service.lineTree(file, line),
    null
  ),
  "spell/project": request((service, file, _params: FileParams) => service.projectInfo(file), null),
  /**
   * The names the file's project declares with `query`'s letters in order, as Go to Symbol lists them:
   * the app's Spell Console line suggests them (epic `solid-2-final` T36)
   */
  "spell/projectSymbols": request(
    (service, file, { query }: FileParams & { query: string }) =>
      service
        .workspaceSymbols(query)
        .filter((symbol) => service.addresses.fileFor(symbol.location.uri)?.project === file.project),
    []
  ),
  /** a Spell UI tag's or attribute's help, what Go to Definition shows on one (epic `editor` I148) */
  "spell/componentHover": request(
    (service, file, { position }: TextDocumentPositionParams) => service.componentHover(file, position),
    null
  ),
  /** the words an attribute's quoted value takes, for the app's choices strip (epic `editor` T70) */
  "spell/attributeValues": request(
    (service, file, { position }: TextDocumentPositionParams) => service.attributeValuesAt(file, position) ?? null,
    null
  ),
  /**
   * Where the thing the word at a position names was declared, its file by path and its line from 0:
   * the app inspects it as the code's cursor rests there (epic `solid-2-final` T36)
   */
  "spell/declaredThing": request((service, file, { position }: TextDocumentPositionParams) => {
    const declared = service.declaredThingAt(file, position)
    return declared ? { path: declared.file.path, line: declared.line } : null
  }, null),
  /** `rename`, an action renamed as the Inspector renames it:  throws `LSP.RenameError` saying why it can't */
  "spell/renameSaying": request(
    (service, file, { position, newName }: RenameParams) => service.renameSaying(file, position, newName),
    null
  ),
  /** does the file's project declare a page or a view in these words:  the site editor makes one's file if not */
  "spell/hasPageOrView": request(
    (_service, file, { words }: FileParams & { words: string }) => file.project.hasPageOrView(words),
    true
  ),
  /** Where the innermost tag around a position is written, as its drawn elements are stamped (epic `solid-2-final` T36) */
  "spell/partPlace": request(
    (service, file, { position }: TextDocumentPositionParams) => service.partPlaceAt(file, position) ?? null,
    null
  ),
  /**
   * An action renamed wherever it's named, as the Inspector renames it, its action's only (epic `solid-2-final` T36):
   * throws `LSP.RenameError` saying why it can't
   */
  "spell/renameAction": request(
    (service, file, { position, newName }: RenameParams) => service.renameActionAt(file, position, newName),
    null
  ),
  /** the fix of one of Spell's old forms at a position, for a hover's or a problem's "Fix it" (epic `language` P68) */
  "spell/oldFormFix": request(
    (service, file, { position }: TextDocumentPositionParams) => service.oldFormFixAt(file, position),
    null
  ),
  /** the code the file's project compiles to for `target`, with its source map:  the compiled-code pane's (epic `solid-2-final` T36) */
  "spell/codeWithMap": request(
    (service, file, { target }: FileParams & { target: string }) => service.codeWithMap(file, target),
    null
  ),
  /** the scope tree the file's project parses in:  the Types tab's, as VS Code's `spell/scopes` (epic `solid-2-final` T36) */
  "spell/scopes": request(
    (service, file, _params: FileParams): Promise<LSP.ScopeNode | null> => service.scopeTree(file),
    null
  ),
  /** what the Types tab shows of the node at `path` in the last tree:  `null` if it isn't there */
  "spell/scopeDetails": request(
    (service, file, { path }: FileParams & { path: string }) => service.scopes.details(file.project, path),
    null
  ),
  /**
   * The old forms of Spell written in the file, as one list of edits rewriting them all the new way, with how many
   * there are:  the editor's offer to upgrade a project, and its Upgrade (epic `solid-2-final` T36)
   */
  "spell/oldForms": request((service, file, _params: FileParams) => service.oldForms(file), { count: 0, edits: [] }),
  /** the file's problems, as `textDocument/publishDiagnostics` sends them */
  "spell/diagnostics": request((service, file, _params: FileParams) => service.diagnostics(file), []),
  /** a `<css>` block in the file:  is there one (the CSS service loads only for a file with one) */
  "spell/hasCss": request(
    (service, file, _params: FileParams) => service.css.regionsIn(file.contents ?? "").length > 0,
    false
  )
} satisfies Record<string, LanguageRequest<never, unknown>>

/** The name of a request the language service answers (`LANGUAGE_REQUESTS`). */
export type LanguageMethod = keyof typeof LANGUAGE_REQUESTS

/** What request `method` takes. */
export type LanguageParams<M extends LanguageMethod> = Parameters<(typeof LANGUAGE_REQUESTS)[M]["answer"]>[2]

/** What request `method` answers. */
export type LanguageAnswer<M extends LanguageMethod> = (typeof LANGUAGE_REQUESTS)[M]["fallback"]

/** One entry of `LANGUAGE_REQUESTS`:  how the service answers it, and what it answers with no parsed file. */
export type LanguageRequest<Params, Answer> = {
  /** the service's answer about `file`:  may throw, e.g. `LSP.RenameError` */
  answer: (service: LSP.SpellLanguageService, file: SP.SpellFile, params: Params) => Answer
  /** the answer when the file isn't a parsed spell file */
  fallback: Answer
}

/**
 * A request about one file, named as the protocol names it, `textDocument.uri`.
 * - Spell's own requests took a bare `uri` before the table (`spell/bubbly` ...):  VS Code's extension still sends it.
 */
export type FileParams = { textDocument: { uri: string } } | { uri: string; textDocument?: undefined }

/** The file a request is about:  `textDocument.uri`, or Spell's older spelling, `uri`. */
export function uriOf(params: FileParams): string {
  return params.textDocument?.uri ?? (params as { uri: string }).uri
}

/**
 * Answer `method` about the file `params` names:  its fallback where `fileFor()` finds no parsed spell file.
 * - throws what the service throws (`LSP.RenameError` ...):  each caller says what it does with that
 */
export function answerRequest<M extends LanguageMethod>(
  service: LSP.SpellLanguageService,
  file: SP.SpellFile | undefined,
  method: M,
  params: LanguageParams<M>
): LanguageAnswer<M> {
  const entry = LANGUAGE_REQUESTS[method] as unknown as LanguageRequest<LanguageParams<M>, LanguageAnswer<M>>
  if (!file?.match) return entry.fallback
  return entry.answer(service, file, params)
}

/** An entry of the table, its types read off `answer`. */
function request<Params, Answer, Fallback extends Answer | null = Answer>(
  answer: (service: LSP.SpellLanguageService, file: SP.SpellFile, params: Params) => Answer,
  fallback: Fallback
): LanguageRequest<Params, Answer | Fallback> {
  return { answer, fallback }
}
