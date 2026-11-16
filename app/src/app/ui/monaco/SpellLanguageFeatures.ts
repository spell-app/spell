import type { Position, WorkspaceEdit } from "vscode-languageserver"

import { after } from "spell/util/timing"
import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { RenameRefusedError, type EditorSelection } from "spell/app/app/ui/ui.types"
import { monaco } from "./monaco"
import { LspToMonaco } from "./LspToMonaco"
import type { SpellModels } from "./SpellModels"

/**
 * Monaco's language features for spell, answered IN-PROCESS by `LSP.SpellLanguageService` --
 * the same service the VS Code extension talks to over the Language Server Protocol.
 * - Hover, completion, signature help, quick fixes, definition / type definition,
 *   references, highlights, rename, outline,
 *   folding, expand selection, formatting, accent fixes as you type, and semantic colouring.
 * - Answers from each file's current parse, kept up to date by `SpellModels` + `project.takeText()`.
 *   Asks nothing of a model whose file hasn't parsed, or whose text isn't its file's.
 * - A rename saves every file it touched -- see `SpellModels.saveAfterEdit()`.
 * - An action renames as the Inspector renames it, refused in its words (`CodeEditorFeatures.rename()`);
 *   the right-click menu shows Rename Symbol only where something can be renamed (`followRenameRow()`, I147).
 * - Going to a declaration in another file asks `open` to show it, as do links in hovers.
 */
export class SpellLanguageFeatures {
  declare service: LSP.SpellLanguageService
  declare addresses: LSP.AppAddresses
  declare models: SpellModels
  /** Show the file at `path`, selecting `selection` -- asked by editor `source`, if we know it.  `true` if shown. */
  declare open: (path: string, selection?: EditorSelection, source?: monaco.editor.ICodeEditor) => boolean

  constructor(props: SpellLanguageFeaturesProps) {
    Object.assign(this, props)
  }

  /**
   * Register everything with Monaco for `language`, e.g. both of spell's, `["spell", "spell-page"]`.
   * - Once:  the editor and link openers aren't a language's, so a second call would open each file twice.
   * - Returns what unregisters it all.
   */
  register(language: string[]): monaco.IDisposable[] {
    const { languages, editor } = monaco
    this.languages = language
    return [
      languages.registerDocumentSemanticTokensProvider(language, {
        onDidChange: this.models.onDidParse,
        getLegend: () => LSP.SpellLanguageService.TOKEN_LEGEND,
        provideDocumentSemanticTokens: (model, lastResultId, token) => this.semanticTokens(model, lastResultId, token),
        releaseDocumentSemanticTokens: () => {}
      }),
      languages.registerHoverProvider(language, {
        provideHover: (model, position) => this.hover(model, position)
      }),
      languages.registerCompletionItemProvider(language, {
        triggerCharacters: [" "],
        provideCompletionItems: (model, position) => this.completion(model, position)
      }),
      languages.registerSignatureHelpProvider(language, {
        signatureHelpTriggerCharacters: [" "],
        signatureHelpRetriggerCharacters: [" "],
        provideSignatureHelp: (model, position) => this.signatureHelp(model, position)
      }),
      languages.registerCodeActionProvider(
        language,
        { provideCodeActions: (model, range) => this.codeActions(model, range) },
        { providedCodeActionKinds: ["quickfix", "refactor.rewrite"] }
      ),
      languages.registerDefinitionProvider(language, {
        provideDefinition: (model, position) => this.locations(model, position, "definition")
      }),
      languages.registerTypeDefinitionProvider(language, {
        provideTypeDefinition: (model, position) => this.locations(model, position, "typeDefinition")
      }),
      languages.registerReferenceProvider(language, {
        provideReferences: (model, position, context) =>
          this.locations(model, position, "references", context.includeDeclaration)
      }),
      languages.registerDocumentHighlightProvider(language, {
        provideDocumentHighlights: (model, position) => this.documentHighlights(model, position)
      }),
      languages.registerRenameProvider(language, {
        resolveRenameLocation: (model, position) => this.renameLocation(model, position),
        provideRenameEdits: (model, position, newName) => this.rename(model, position, newName)
      }),
      languages.registerDocumentSymbolProvider(language, {
        provideDocumentSymbols: (model) => this.documentSymbols(model)
      }),
      languages.registerFoldingRangeProvider(language, {
        provideFoldingRanges: (model) => this.foldingRanges(model)
      }),
      languages.registerSelectionRangeProvider(language, {
        provideSelectionRanges: (model, positions) => this.selectionRanges(model, positions)
      }),
      languages.registerDocumentFormattingEditProvider(language, {
        provideDocumentFormattingEdits: (model, options) => this.formatting(model, options)
      }),
      languages.registerDocumentRangeFormattingEditProvider(language, {
        provideDocumentRangeFormattingEdits: (model, range, options) => this.formatting(model, options, range)
      }),
      languages.registerOnTypeFormattingEditProvider(language, {
        autoFormatTriggerCharacters: LSP.SpellLanguageService.ON_TYPE_TRIGGERS,
        provideOnTypeFormattingEdits: (model, position, typed) => this.onTypeFormatting(model, position, typed)
      }),
      editor.registerEditorOpener({
        openCodeEditor: (source, resource, selectionOrPosition) => this.openAt(resource, selectionOrPosition, source)
      }),
      editor.registerLinkOpener({ open: (resource) => this.openLink(resource) })
    ]
  }

  ////////////////
  // ## Answers
  ////////////////

  /**
   * `model`'s spell file, if we can answer about it:  parsed, and its text is `model`'s.
   * - Always true straight after an edit:  what's typed and not parsed yet is parsed first (`SpellModels.parseNow()`)
   *   -- but NOT while a full parse is under way, e.g. after the incremental parse couldn't cope.
   */
  private fileOf(model: monaco.editor.ITextModel): SP.SpellFile | undefined {
    this.models.parseNow()
    const file = this.addresses.fileFor(model.uri.toString())
    return file?.match && file.contents === model.getValue() ? file : undefined
  }

  /**
   * Semantic colouring of `model`, from its parse -- as edits to `lastResultId`, what we sent last, if we can.
   * - Waits for the typing to pause (`SpellModels.parsed()`):  Monaco keeps the last colours, moved with the text, till then.
   * - `null` once Monaco has cancelled it, e.g. for a later keystroke:  it asks again.
   */
  private async semanticTokens(
    model: monaco.editor.ITextModel,
    lastResultId: string | null,
    cancel: monaco.CancellationToken
  ): Promise<monaco.languages.SemanticTokens | monaco.languages.SemanticTokensEdits | null> {
    // the colours can wait till the typing pauses:  no parse on every keystroke for them
    await this.models.parsed()
    if (cancel.isCancellationRequested) return null
    const file = this.fileOf(model)
    if (!file) return null
    const tokens = lastResultId
      ? this.service.semanticTokensDelta(file, lastResultId)
      : this.service.semanticTokens(file)
    return LspToMonaco.semanticTokens(tokens)
  }

  /** Hover at `position`, e.g. what a word is and its docstring, saying as much as Settings… asks (`CodeEditorFeatures.hover()`). */
  private hover(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.Hover | null {
    const file = this.fileOf(model)
    const hover = file && CodeEditorFeatures.hover(this.service, file, LspToMonaco.lspPosition(position))
    return hover ? LspToMonaco.hover(hover) : null
  }

  /** Completions at `position`, replacing the word being typed. */
  private completion(model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionList {
    const file = this.fileOf(model)
    if (!file) return { suggestions: [] }
    const word = model.getWordUntilPosition(position)
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn
    }
    const { items, isIncomplete } = this.service.completion(file, LspToMonaco.lspPosition(position))
    return { suggestions: items.map((item) => LspToMonaco.completion(item, range)), incomplete: isIncomplete }
  }

  /** The method call being typed at `position`, with the argument being typed highlighted. */
  private signatureHelp(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.SignatureHelpResult | null {
    const file = this.fileOf(model)
    const help = file && this.service.signatureHelp(file, LspToMonaco.lspPosition(position))
    return help ? { value: LspToMonaco.signatureHelp(help), dispose() {} } : null
  }

  /** Quick fixes and rewrites for `range`:  "Define `to <phrase>`" on a line that didn't parse, "Make it code" on a value. */
  private codeActions(model: monaco.editor.ITextModel, range: monaco.Range): monaco.languages.CodeActionList {
    const file = this.fileOf(model)
    const actions = file ? CodeEditorFeatures.codeActions(this.service, file, LspToMonaco.lspRange(range)) : []
    return { actions: actions.map((action) => LspToMonaco.codeAction(action)), dispose() {} }
  }

  /** Locations the service's `method` finds for the thing at `position`, e.g. its `definition`. */
  private locations(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    method: "definition" | "typeDefinition" | "references",
    includeDeclaration = true
  ): monaco.languages.Location[] {
    const file = this.fileOf(model)
    if (!file) return []
    const at = LspToMonaco.lspPosition(position)
    const locations =
      method === "references" ? this.service.references(file, at, includeDeclaration) : this.service[method](file, at)
    if (!locations.length && method === "definition") return this.helpLocation(file, at)
    return locations.map((location) => LspToMonaco.location(location))
  }

  /**
   * Go to Definition on a Spell UI tag or attribute (`spacing="xs"`), which no file declares:
   * its help, where it's written, rather than "No definition found" (epic `editor` I148).
   * - A location in no file (`HELP_SCHEME`), at the word:  Monaco goes there, and `openAt()` shows the hover instead.
   *   So F12, the right-click menu and ⌘-click all do it, and ⌘-hover underlines the word as a link.
   * - `[]` where there's no help either.
   */
  private helpLocation(file: SP.SpellFile, position: Position): monaco.languages.Location[] {
    const help = this.service.componentHover(file, position)
    if (!help?.range) return []
    const uri = monaco.Uri.from({ scheme: HELP_SCHEME, path: `/${file.path}` })
    return [{ uri, range: LspToMonaco.range(help.range) }]
  }

  /** Other uses of the thing at `position` in `model`, as reads or writes. */
  private documentHighlights(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.DocumentHighlight[] {
    const file = this.fileOf(model)
    if (!file) return []
    const highlights = this.service.documentHighlights(file, LspToMonaco.lspPosition(position))
    return highlights.map((highlight) => LspToMonaco.documentHighlight(highlight))
  }

  /** What renaming at `position` would rename, or why it can't. */
  private renameLocation(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.RenameLocation & monaco.languages.Rejection {
    const file = this.fileOf(model)
    const prepared = file && this.service.prepareRename(file, LspToMonaco.lspPosition(position))
    if (!prepared)
      return { range: new monaco.Range(1, 1, 1, 1), text: "", rejectReason: CodeEditorFeatures.renameNothingHere() }
    return { range: LspToMonaco.range(prepared.range), text: prepared.placeholder }
  }

  /**
   * Edits renaming the thing at `position` to `newName`, in every file:  an action as the Inspector renames it,
   * its calls and buttons too, refused in its words (`CodeEditorFeatures.rename()`;  I111, I139).
   * - SIDE EFFECT:  each file it touches saves once its model takes the edit.
   */
  private rename(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    newName: string
  ): (monaco.languages.WorkspaceEdit & monaco.languages.Rejection) | null {
    const file = this.fileOf(model)
    const oldName = model.getWordAtPosition(position)?.word ?? ""
    let edit: WorkspaceEdit
    try {
      if (!file) throw new RenameRefusedError(appTexts.text("renameRefused", { oldName, newName }))
      edit = CodeEditorFeatures.rename(this.service, file, LspToMonaco.lspPosition(position), { newName, oldName })
    } catch (error) {
      if (!(error instanceof RenameRefusedError)) throw error
      return this.refuseRename(model, position, error.message)
    }
    const files = Object.keys(edit.changes ?? {}).flatMap((uri) => this.addresses.fileFor(uri) ?? [])
    this.models.saveAfterEdit(files)
    return LspToMonaco.workspaceEdit(edit)
  }

  /**
   * Refuse a rename, saying why over the name, as a place that can't be renamed says it.
   * - HACK: Monaco hands a refused new name to its notifications, which a page of its own never shows:
   *   so the message is shown here, once Monaco has closed its rename field.
   */
  private refuseRename(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    why: string
  ): monaco.languages.WorkspaceEdit & monaco.languages.Rejection {
    const editor = monaco.editor.getEditors().find((each) => each.getModel() === model && each.hasWidgetFocus())
    const messages = editor?.getContribution(MONACO_MESSAGES) as MessageController | null | undefined
    void after(0, () => messages?.showMessage(why, position))
    return { edits: [], rejectReason: why }
  }

  /**
   * Show the right-click menu's Rename Symbol row only where something can be renamed (epic `editor` I147):
   * a right click on an action's name shows it, on `to draw solitaire` it doesn't.
   * - HACK: Monaco shows the row wherever a rename provider is, by its context key `editorHasRenameProvider`, which
   *   it sets as a model comes and has no other way to change.  So a right click sets it to whether this place can be
   *   renamed, and once the menu is drawn it's set back:  F2 still asks, and says what can be renamed where nothing can.
   * - Only in a Spell model:  another's is Monaco's own.
   */
  followRenameRow(editor: monaco.editor.ICodeEditor): void {
    // every editor Monaco makes is a standalone one, though `onDidCreateEditor` types it as any code editor
    if (!("createContextKey" in editor)) return
    const hasRename = (editor as monaco.editor.IStandaloneCodeEditor).createContextKey<boolean>(MONACO_HAS_RENAME, true)
    let isChanged = false
    editor.onMouseDown(({ event, target }) => {
      const model = editor.getModel()
      if (!event.rightButton || !model || !target.position || !this.languages.includes(model.getLanguageId())) return
      const file = this.fileOf(model)
      hasRename.set(!!file && !!this.service.prepareRename(file, LspToMonaco.lspPosition(target.position)))
      isChanged = true
    })
    editor.onContextMenu(() => {
      if (!isChanged) return
      isChanged = false
      // after Monaco's own listener, which drew the menu
      queueMicrotask(() => hasRename.set(true))
    })
  }

  /** The languages `register()` registered for. */
  private languages: string[] = []

  /**
   * The words the attribute whose quoted value `position` is in takes, if it lists them:  `spacing="x|s"` => `none`, `xs` ...
   * - For `ValueChoices`, the words shown beside a value the caret rests in (epic `editor` T70).
   */
  attributeValuesAt = (model: monaco.editor.ITextModel, position: monaco.Position): LSP.AttributeValues | undefined => {
    const file = this.fileOf(model)
    return file && this.service.attributeValuesAt(file, LspToMonaco.lspPosition(position))
  }

  /** Outline of `model`:  what it declares, nested. */
  private documentSymbols(model: monaco.editor.ITextModel): monaco.languages.DocumentSymbol[] {
    const file = this.fileOf(model)
    return file ? this.service.documentSymbols(file).map((symbol) => LspToMonaco.documentSymbol(symbol)) : []
  }

  /** Foldable blocks of `model`. */
  private foldingRanges(model: monaco.editor.ITextModel): monaco.languages.FoldingRange[] {
    const file = this.fileOf(model)
    return file ? this.service.foldingRanges(file).map((range) => LspToMonaco.foldingRange(range)) : []
  }

  /** "Expand selection" steps at each of `positions`. */
  private selectionRanges(
    model: monaco.editor.ITextModel,
    positions: monaco.Position[]
  ): monaco.languages.SelectionRange[][] {
    const file = this.fileOf(model)
    if (!file) return []
    const ranges = this.service.selectionRanges(
      file,
      positions.map((position) => LspToMonaco.lspPosition(position))
    )
    return ranges.map((range) => LspToMonaco.selectionRanges(range))
  }

  /** Whitespace edits formatting `model`, or just `range` of it -- always with tabs. */
  private formatting(
    model: monaco.editor.ITextModel,
    options: monaco.languages.FormattingOptions,
    range?: monaco.IRange
  ): monaco.languages.TextEdit[] {
    const file = this.fileOf(model)
    if (!file) return []
    const { tabSize, insertSpaces } = options
    const edits = this.service.formatting(file, { tabSize, insertSpaces }, range && LspToMonaco.lspRange(range))
    return edits.map((edit) => LspToMonaco.textEdit(edit))
  }

  /** Edits as `typed` goes in at `position`:  a Spanish keyword's accent put back, `numero` => `número`. */
  private onTypeFormatting(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    typed: string
  ): monaco.languages.TextEdit[] {
    // a language with no accent fixes (English):  nothing to ask, so no parse to wait for on every space
    const typedIn = this.addresses.fileFor(model.uri.toString())
    if (typedIn && !LSP.SpellKeywords.of(typedIn.language).hasAccentFixes) return []
    const file = this.fileOf(model)
    if (!file) return []
    const edits = this.service.onTypeFormatting(file, LspToMonaco.lspPosition(position), typed)
    return edits.map((edit) => LspToMonaco.textEdit(edit))
  }

  ////////////////
  // ## Opening other files
  ////////////////

  /**
   * Show `resource`, e.g. a declaration in another file, at `selectionOrPosition` -- asked by editor `source`, or
   * else the one with focus.  `false` if it isn't ours, or nobody showed it.
   */
  private openAt(
    resource: monaco.Uri,
    selectionOrPosition?: monaco.IRange | monaco.IPosition,
    source: monaco.editor.ICodeEditor | undefined = focusedEditor()
  ): boolean {
    if (resource.scheme === HELP_SCHEME) {
      // Go to Definition on a Spell UI tag or attribute:  its help, at the caret -- see `helpLocation()`
      source?.trigger("spell", "editor.action.showHover", { focus: false })
      return !!source
    }
    const path = LSP.AppAddresses.pathOf(resource)
    if (path === undefined) return false
    if (!selectionOrPosition) return this.open(path, undefined, source)
    else {
      const start =
        "startLineNumber" in selectionOrPosition
          ? monaco.Range.getStartPosition(selectionOrPosition)
          : selectionOrPosition
      const end = "startLineNumber" in selectionOrPosition ? monaco.Range.getEndPosition(selectionOrPosition) : start
      return this.open(
        path,
        {
          anchor: { line: start.lineNumber - 1, ch: start.column - 1 },
          head: { line: end.lineNumber - 1, ch: end.column - 1 }
        },
        source
      )
    }
  }

  /** Follow a link in a hover to one of our files, e.g. `spell:/<path>#L12`. */
  private openLink(resource: monaco.Uri): boolean {
    const line = Number(resource.fragment.match(/^L(\d+)/)?.[1] ?? 1)
    return this.openAt(resource.with({ fragment: "" }), { lineNumber: line, column: 1 })
  }
}

/** Where Go to Definition goes for a Spell UI tag or attribute:  its help, shown in place -- see `helpLocation()`. */
const HELP_SCHEME = "spell-help"

/** Monaco's context key for "this editor's model has a rename provider":  its `EditorContextKeys.hasRenameProvider`. */
const MONACO_HAS_RENAME = "editorHasRenameProvider"

/** Monaco's message over the code's contribution id:  its `MessageController.ID`. */
const MONACO_MESSAGES = "editor.contrib.messageController"

/** What Monaco's message over the code does that's used here, left out of its typed API. */
type MessageController = { showMessage(message: string, position: monaco.IPosition): void }

/** Constructor props for `SpellLanguageFeatures`. */
export type SpellLanguageFeaturesProps = {
  /** Answers every question. */
  service: LSP.SpellLanguageService
  /** How our models' URIs map to files. */
  addresses: LSP.AppAddresses
  /** Our models, e.g. to save after a rename. */
  models: SpellModels
  /** Show the file at `path`, selecting `selection` -- asked by editor `source`, if we know it.  `true` if shown. */
  open: (path: string, selection?: EditorSelection, source?: monaco.editor.ICodeEditor) => boolean
}

/** Editor with focus, if any -- where a hover's link was clicked, say. */
function focusedEditor(): monaco.editor.ICodeEditor | undefined {
  return monaco.editor.getEditors().find((editor) => editor.hasTextFocus() || editor.hasWidgetFocus())
}
