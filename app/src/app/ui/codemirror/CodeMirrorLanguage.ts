import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete"
import { foldService } from "@codemirror/language"
import {
  type ChangeSet,
  type EditorState,
  type Extension,
  StateEffect,
  StateField,
  type Text,
  Transaction
} from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  hoverTooltip,
  keymap,
  showTooltip,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate
} from "@codemirror/view"
import type { CodeAction, CompletionItem, DocumentSymbol, SignatureHelp, WorkspaceEdit } from "vscode-languageserver"

import { after, type CancelablePromise } from "spell/util/timing"
import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { HOVER_DELAY, suggestsByItself, type SuggestMode } from "spell/app/app/ui/codePopups"
import { RenameRefusedError } from "spell/app/app/ui/ui.types"
import { CodeMirrorHovers } from "./CodeMirrorHovers"
import { CodeMirrorPopups } from "./CodeMirrorPopups"
import { CodeMirrorValues } from "./CodeMirrorValues"
import { LspToCodeMirror, type CodeMirrorLocation } from "./LspToCodeMirror"

/****************
 * ### `CodeMirrorLanguage`
 * Spell's language service for one file's CodeMirror state, answered IN-PROCESS by `LSP.SpellLanguageService`,
 * as VS Code's language server is.
 * - Suggestions, hover, folding, signature help, accent fixes as you type, each a CodeMirror extension;
 *   go to definition and type definition, references, rename, code actions and highlights, each a method
 *   or an extension its editor asks for (`SpellCodeMirror`).
 * - Made by `FileStates`, one per spell file's state, which also follows the file both ways and shows its problems.
 * - Asks nothing of a file whose text isn't the editor's:  `fileReady()` parses what's waiting first.
 * - What a hover says, which code actions show and what a rename says are the app's
 *   (`CodeEditorFeatures`);  where suggestions show by themselves, when the hover's info shows and whether signature
 *   help shows as you type, Settings…' choices (`CodeMirrorPopups`).
 * - The service's shapes become CodeMirror's through ONE converter, `LspToCodeMirror`.
 * - Its position in the import graph:  the parser, the language service, the app's editor-neutral `ui` files,
 *   CodeMirror.
 ****************/
export class CodeMirrorLanguage {
  constructor({ service, file, parseNow }: CodeMirrorLanguageProps) {
    this.service = service
    this.file = file
    this.parseNow = parseNow
  }

  /** the language service */
  readonly service: LSP.SpellLanguageService

  /** the file whose state this is */
  readonly file: SP.SpellFile

  /** parse what's typed and not parsed yet, now:  the file states' (`FileStates.parseNow()`) */
  private readonly parseNow: () => void

  /**
   * Every extension:  hover, folding, signature help and accent fixes;  a Spell UI tag's help, Format Document and
   * expand selection
   * (suggestions go through `completions`, problems through `FileStates`).
   */
  extensions(): Extension {
    return [this.hover(), this.folding(), this.signatureHelp(), this.accentFixes(), this.helpShown(), this.moreKeys()]
  }

  /**
   * The file, parsed and holding `doc`'s text, or `undefined` while it isn't.
   * - Parses what's waiting first:  the incremental parse is done by the time `parseNow()` returns.
   */
  async fileReady(doc: Text): Promise<SP.SpellFile | undefined> {
    this.parseNow()
    const { file } = this
    return file.match && file.contents === doc.toString() ? file : undefined
  }

  ////////////////
  // ## Suggestions
  ////////////////

  /**
   * Suggestions at the caret, for `autocompletion({ override })`:  the service's, each written as it says.
   * - By themselves only as Settings… says (`CodeMirrorPopups`):  where they help, everywhere, or only on Ctrl+Space.
   * - "Pick a color…" (`LSP.PICK_VALUE_COMMAND`) opens the palette or the icon picker at the caret once it's written
   *   (`CodeMirrorValues.pick()`).
   */
  completions = async (context: CompletionContext): Promise<CompletionResult | null> => {
    const word = context.matchBefore(/[\p{L}\p{M}\d_-]*/u)
    const line = context.state.doc.lineAt(context.pos)
    const before = context.state.sliceDoc(line.from, word?.from ?? context.pos)
    if (!context.explicit && !suggestsBySelf(CodeMirrorPopups.of(context.state).suggest, before)) return null
    const file = await this.fileReady(context.state.doc)
    if (!file || context.aborted) return null
    const { doc } = context.state
    const { items } = this.service.completion(file, LspToCodeMirror.lspPosition(doc, context.pos))
    if (!items.length) return null
    return {
      from: word?.from ?? context.pos,
      options: inServiceOrder(items).map((item, rank) => ({
        ...picking(item, LspToCodeMirror.completion(doc, item)),
        // the service's order (`sortText`):  CodeMirror's own is alphabetical where nothing's typed
        boost: Math.max(-99, 99 - rank)
      })),
      validFor: /^[\p{L}\p{M}\d_-]*$/u
    }
  }

  ////////////////
  // ## Hover, folding
  ////////////////

  /**
   * What a word is, and its docstring, on a hover that rests `HOVER_DELAY`, saying as much as the settings ask.
   * - Only when Settings… says:  with ⌥ held (`CodeMirrorHovers.isAltHeld()`), always, or never
   *   (`CodeEditorFeatures.showsHoverInfo()`);  an error's message shows on a plain hover all the same
   *   (`CodeMirrorHovers`).
   * - Its markdown drawn by Spell UI's `<ui-markdown>`.
   */
  private hover(): Extension {
    return hoverTooltip(
      async (view, pos): Promise<Tooltip | null> => {
        const { hoverInfo } = CodeMirrorPopups.of(view.state)
        if (!CodeEditorFeatures.showsHoverInfo(hoverInfo, CodeMirrorHovers.isAltHeld(view))) return null
        const { doc } = view.state
        const file = await this.fileReady(doc)
        const hover = file && CodeEditorFeatures.hover(this.service, file, LspToCodeMirror.lspPosition(doc, pos))
        if (!hover) return null
        const { from, to, text } = LspToCodeMirror.hover(doc, hover, pos)
        return { pos: from, end: to, above: true, create: () => ({ dom: markdownDom(text, HOVER_CLASS) }) }
      },
      // CodeMirror's own wait, in msec
      { hoverTime: HOVER_DELAY * 1000 }
    )
  }

  /** What folds:  each block the service says, from its head line to its last. */
  private folding(): Extension {
    return foldService.of((state, lineStart) => {
      const { file } = this
      if (!file.match || file.contents !== state.doc.toString()) return null
      const line = state.doc.lineAt(lineStart).number - 1
      const range = this.service.foldingRanges(file).find((each) => each.startLine === line)
      if (!range) return null
      return { from: state.doc.line(line + 1).to, to: state.doc.line(range.endLine + 1).to }
    })
  }

  ////////////////
  // ## Go to definition, code actions
  ////////////////

  /**
   * Where the thing at `pos` is declared (`definition`), or its type is (`typeDefinition`):
   * its file's path and range, if the service knows.
   */
  async definitionAt(
    view: EditorView,
    pos: number,
    method: "definition" | "typeDefinition" = "definition"
  ): Promise<CodeMirrorLocation | undefined> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    const [location] = file ? this.service[method](file, LspToCodeMirror.lspPosition(doc, pos)) : []
    return location && LspToCodeMirror.location(location)
  }

  /** Every use of the thing at `pos`, its declaration too:  each file's path and range. */
  async referencesAt(view: EditorView, pos: number): Promise<CodeMirrorLocation[]> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    const locations = file ? this.service.references(file, LspToCodeMirror.lspPosition(doc, pos), true) : []
    return locations.flatMap((location) => LspToCodeMirror.location(location) ?? [])
  }

  /** The service's code actions for the selection:  "Make it code", "Define `to <phrase>`" ... */
  async codeActionsAt(view: EditorView): Promise<CodeAction[]> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    if (!file) return []
    const range = LspToCodeMirror.lspRange(doc, view.state.selection.main)
    return CodeEditorFeatures.codeActions(this.service, file, range)
  }

  /** Make `action`'s edits to this file in `view`, one undo step. */
  applyCodeAction(view: EditorView, action: CodeAction): void {
    const edits = LspToCodeMirror.editsFor(action.edit, this.file.path)
    view.dispatch({ changes: LspToCodeMirror.changes(view.state.doc, edits), userEvent: "input.codeAction" })
  }

  ////////////////
  // ## Rename Symbol
  ////////////////

  /** What renaming at `pos` would rename:  its range and its name as written;  none where nothing can be. */
  async renameRangeAt(view: EditorView, pos: number): Promise<{ from: number; to: number; name: string } | undefined> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    const prepared = file && this.service.prepareRename(file, LspToCodeMirror.lspPosition(doc, pos))
    return prepared ? { ...LspToCodeMirror.range(doc, prepared.range), name: prepared.placeholder } : undefined
  }

  /**
   * Edits renaming the thing at `pos` from `oldName` to `newName`, in every file
   * (`CodeEditorFeatures.rename()`).
   * - throws `RenameRefusedError`, saying why in the app's words, where it can't
   */
  async renameAt(view: EditorView, pos: number, names: { newName: string; oldName: string }): Promise<WorkspaceEdit> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    if (!file) throw new RenameRefusedError(CodeEditorFeatures.renameNothingHere())
    return CodeEditorFeatures.rename(this.service, file, LspToCodeMirror.lspPosition(doc, pos), names)
  }

  ////////////////
  // ## Highlights
  ////////////////

  /**
   * The other uses of the word at the caret, marked as reads or writes, once the caret rests `HIGHLIGHT_WAIT`.
   * - Not in an editor by default (Owen:  "distracting, turn it
   *   off"):  an editor asks for it (`SpellCodeMirror`'s `highlights`).
   */
  highlights(): Extension {
    return [
      highlighted,
      ViewPlugin.define((view) => {
        /** The wait before asking. */
        let wait: CancelablePromise<unknown> | undefined
        return {
          update: (update: ViewUpdate) => {
            if (!update.selectionSet && !update.docChanged) return
            wait?.cancel()
            wait = after(HIGHLIGHT_WAIT, () => this.highlight(view))
          },
          destroy: () => wait?.cancel()
        }
      })
    ]
  }

  /** Mark the uses of the word at `view`'s caret.  NEVER throws. */
  private async highlight(view: EditorView): Promise<void> {
    const { doc, selection } = view.state
    const file = await this.fileReady(doc)
    if (!file || view.state.doc !== doc || !selection.main.empty) return
    const marks = this.service
      .documentHighlights(file, LspToCodeMirror.lspPosition(doc, selection.main.head))
      .map(({ range, kind }) => {
        const { from, to } = LspToCodeMirror.range(doc, range)
        return (kind === WRITE_HIGHLIGHT ? HIGHLIGHT_WRITE : HIGHLIGHT_READ).range(from, to)
      })
      .filter((mark) => mark.from < mark.to)
    view.dispatch({ effects: SET_HIGHLIGHTS.of(Decoration.set(marks, true)) })
  }

  /**
   * Show the help of the Spell UI tag or attribute at `pos`, where it's written, as its hover would say it
   * (epic `editor` I148):  what Go to Definition does on one, which no file declares.
   * - `false` where there's no help:  nothing shown.
   * - It goes as the caret moves or the text changes, or at Esc.
   */
  async showHelp(view: EditorView, pos: number): Promise<boolean> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    const help = file && this.service.componentHover(file, LspToCodeMirror.lspPosition(doc, pos))
    if (!help || view.state.doc !== doc) return false
    const { from, text } = LspToCodeMirror.hover(doc, help, pos)
    const tooltip: Tooltip = { pos: from, above: true, create: () => ({ dom: markdownDom(text, HOVER_CLASS) }) }
    view.dispatch({ effects: SET_HELP.of(tooltip) })
    return true
  }

  /** A tag's help, while it shows (`showHelp()`), and Esc to close it. */
  private helpShown(): Extension {
    return [
      helpShown,
      keymap.of([
        {
          key: "Escape",
          run: (view) => {
            if (!view.state.field(helpShown)) return false
            view.dispatch({ effects: SET_HELP.of(null) })
            return true
          }
        }
      ])
    ]
  }

  ////////////////
  // ## Format Document, expand selection
  ////////////////

  /**
   * Keys of VS Code's the editor has, beyond the page's list (`EDITOR_HOTKEYS`):
   * - ⇧⌥F (Shift+Alt+F):  Format Document (`format()`)
   * - ⌃⇧⌘→ / ⌃⇧⌘← (Shift+Alt+→ / ← off a Mac):  expand and shrink the selection (`expandSelection()`)
   */
  private moreKeys(): Extension {
    return keymap.of([
      { key: "Shift-Alt-f", run: (view) => (void this.format(view), true), preventDefault: true },
      {
        key: "Shift-Alt-ArrowRight",
        mac: "Ctrl-Shift-Mod-ArrowRight",
        run: (view) => (void this.expandSelection(view, "expand"), true)
      },
      {
        key: "Shift-Alt-ArrowLeft",
        mac: "Ctrl-Shift-Mod-ArrowLeft",
        run: (view) => (void this.expandSelection(view, "shrink"), true)
      }
    ])
  }

  /**
   * Format Document:  the file's whitespace as the language service lays it out, tabs for its indent,
   * as VS Code's Format Document does (`LSP.SpellLanguageService.formatting()`).
   * - ONE undo step.  Nothing to do, nothing changes.
   */
  async format(view: EditorView): Promise<void> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    if (!file || view.state.doc !== doc) return
    const edits = this.service.formatting(file, { tabSize: 4, insertSpaces: false })
    if (!edits.length) return
    view.dispatch({ changes: LspToCodeMirror.changes(doc, edits), userEvent: "input.format" })
  }

  /**
   * Expand the selection to the next bigger piece of Spell round it, or shrink it back, as VS Code's
   * Expand / Shrink Selection do:  the parse's own pieces (`LSP.SpellLanguageService.selectionRanges()`),
   * from a word out to the whole file.
   * - Shrinking goes back through the selections expanding made, while the selection is still one of them.
   */
  async expandSelection(view: EditorView, way: "expand" | "shrink"): Promise<void> {
    const { doc, selection } = view.state
    const { from, to } = selection.main
    const kept = this.expanded.get(view)
    const isOurs = kept?.doc === doc && kept.steps.at(-1)?.from === from && kept.steps.at(-1)?.to === to
    if (way === "shrink") {
      if (!isOurs || kept.steps.length < 2) return
      kept.steps.pop()
      const back = kept.steps.at(-1)!
      view.dispatch({ selection: { anchor: back.from, head: back.to }, userEvent: "select" })
      return
    }
    const file = await this.fileReady(doc)
    if (!file || view.state.doc !== doc) return
    const [nested] = this.service.selectionRanges(file, [LspToCodeMirror.lspPosition(doc, selection.main.head)])
    let wider: { from: number; to: number } | undefined
    for (let range: typeof nested | undefined = nested; range && !wider; range = range.parent) {
      const each = LspToCodeMirror.range(doc, range.range)
      if (each.from <= from && each.to >= to && each.to - each.from > to - from) wider = each
    }
    if (!wider) return
    const steps = isOurs ? kept.steps : [{ from, to }]
    steps.push(wider)
    this.expanded.set(view, { doc, steps })
    view.dispatch({ selection: { anchor: wider.from, head: wider.to }, userEvent: "select" })
  }

  /** Each view's selections expanding made, innermost first, while its text is `doc`:  what shrinking goes back to. */
  private expanded = new WeakMap<EditorView, { doc: Text; steps: { from: number; to: number }[] }>()

  /** What the file declares, in order, each with how deep it's nested:  the outline, Go to Symbol's list. */
  async symbolsOf(view: EditorView): Promise<{ name: string; depth: number; location: CodeMirrorLocation }[]> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    if (!file) return []
    const found: { name: string; depth: number; location: CodeMirrorLocation }[] = []
    const walk = (symbols: DocumentSymbol[], depth: number) => {
      for (const symbol of symbols) {
        found.push({ name: symbol.name, depth, location: { path: file.path, range: symbol.selectionRange } })
        walk(symbol.children ?? [], depth + 1)
      }
    }
    walk(this.service.documentSymbols(file), 0)
    return found
  }

  ////////////////
  // ## Signature help
  ////////////////

  /**
   * The words of the call being typed, the argument at the caret in bold, over the line (`<ui-markdown>`):
   * VS Code's parameter hints.
   * - As a space is typed, while Settings… › "Show parameter hints" is on (`CodeMirrorPopups`);
   *   ⇧⌘Space (Ctrl+Shift+Space off a Mac) shows it in every mode.
   * - Asked again as the text or caret changes while it shows;  it goes where there's no call, or at Esc.
   */
  private signatureHelp(): Extension {
    return [
      signatureShown,
      keymap.of([
        { key: "Mod-Shift-Space", run: (view) => (void this.showSignature(view), true) },
        {
          key: "Escape",
          run: (view) => {
            if (!view.state.field(signatureShown)) return false
            view.dispatch({ effects: SET_SIGNATURE.of(null) })
            return true
          }
        }
      ]),
      ViewPlugin.define((view) => ({
        update: (update: ViewUpdate) => {
          const isShowing = !!update.state.field(signatureShown)
          const typedSpace = update.transactions.some(
            (transaction) => transaction.isUserEvent("input.type") && typedText(transaction.changes) === " "
          )
          const asked = isShowing
            ? update.docChanged || update.selectionSet
            : typedSpace && CodeMirrorPopups.of(update.state).signatureHelp
          if (asked) queueMicrotask(() => void this.showSignature(view))
        }
      }))
    ]
  }

  /** Show the signature of the call at `view`'s caret, or none.  NEVER throws. */
  private async showSignature(view: EditorView): Promise<void> {
    const { doc, selection } = view.state
    const file = await this.fileReady(doc)
    if (view.state.doc !== doc) return
    const pos = selection.main.head
    const help = file && this.service.signatureHelp(file, LspToCodeMirror.lspPosition(doc, pos))
    const text = help && signatureMarkdown(help)
    const tooltip: Tooltip | null = text
      ? { pos, above: true, create: () => ({ dom: markdownDom(text, SIGNATURE_CLASS) }) }
      : null
    if (tooltip || view.state.field(signatureShown)) view.dispatch({ effects: SET_SIGNATURE.of(tooltip) })
  }

  ////////////////
  // ## Accent fixes
  ////////////////

  /**
   * A Spanish keyword typed without its accent gets it back as the space or new line after it is typed,
   * `numero` => `número`, as VS Code's format-on-type does (`LSP.SpellLanguageService.onTypeFormatting()`).
   * - Only in a language with accent fixes:  no parse to wait for on every English space.
   * - The fix joins the typing's undo step.
   */
  private accentFixes(): Extension {
    return ViewPlugin.define((view) => ({
      update: (update: ViewUpdate) => {
        if (!LSP.SpellKeywords.of(this.file.language).hasAccentFixes) return
        for (const transaction of update.transactions) {
          // a key typed, or Enter (CodeMirror's new line is a plain `input`)
          if (!transaction.isUserEvent("input.type") && transaction.annotation(Transaction.userEvent) !== "input")
            continue
          const typed = typedText(transaction.changes)
          const trigger = typed && LSP.SpellLanguageService.ON_TYPE_TRIGGERS.find((it) => typed.startsWith(it))
          if (!trigger) continue
          const doc = update.state.doc
          const pos = update.state.selection.main.head
          queueMicrotask(() => void this.fixAccents(view, doc, pos, trigger))
        }
      }
    }))
  }

  /** Put back the accents of what `trigger`, typed at `pos` of `doc`, finished.  NEVER throws. */
  private async fixAccents(view: EditorView, doc: Text, pos: number, trigger: string): Promise<void> {
    const file = await this.fileReady(doc)
    if (!file || view.state.doc !== doc) return
    const edits = this.service.onTypeFormatting(file, LspToCodeMirror.lspPosition(doc, pos), trigger)
    if (!edits.length) return
    view.dispatch({ changes: LspToCodeMirror.changes(doc, edits), userEvent: "input.type.accent" })
  }

  ////////////////
  // ## Value choices
  ////////////////

  /**
   * The words the attribute whose quoted value is at `pos` takes, as the suggestion list's are:
   * for `CodeMirrorValues`' choices strip (epic `editor` T70).
   */
  attributeValuesAt = async (state: EditorState, pos: number): Promise<LSP.AttributeValues | undefined> => {
    const file = await this.fileReady(state.doc)
    return file && this.service.attributeValuesAt(file, LspToCodeMirror.lspPosition(state.doc, pos))
  }
}

/** How a `CodeMirrorLanguage` is made. */
export type CodeMirrorLanguageProps = {
  /** the language service */
  service: LSP.SpellLanguageService
  /** the file whose state it's for */
  file: SP.SpellFile
  /** parse what's typed and not parsed yet, now */
  parseNow: () => void
}

////////////////
// ## Helpers
////////////////

/** The class of a hover's words. */
const HOVER_CLASS = "cmb-hover"

/** The class of signature help's words. */
const SIGNATURE_CLASS = "cmb-signature"

/** How long the caret rests before the uses of its word are marked, in seconds. */
const HIGHLIGHT_WAIT = 0.25

/** The service's kind of a highlight that writes the thing:  LSP's `DocumentHighlightKind.Write`. */
const WRITE_HIGHLIGHT = 3

/** A use that reads the thing, and one that writes it. */
const HIGHLIGHT_READ = Decoration.mark({ class: "cmb-highlight" })
const HIGHLIGHT_WRITE = Decoration.mark({ class: "cmb-highlight cmb-highlight-write" })

/** The marks of the word at the caret's uses, set as they're found. */
const SET_HIGHLIGHTS = StateEffect.define<DecorationSet>()

/** The uses marked now:  gone as the caret moves or the text changes, till they're found again. */
const highlighted = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (marks, transaction) => {
    for (const effect of transaction.effects) if (effect.is(SET_HIGHLIGHTS)) return effect.value
    return transaction.docChanged || transaction.selection ? Decoration.none : marks
  },
  provide: (field) => EditorView.decorations.from(field)
})

/** Show a Spell UI tag's help, or none (`showHelp()`). */
const SET_HELP = StateEffect.define<Tooltip | null>()

/** A Spell UI tag's help, while it shows:  gone as the caret moves or the text changes. */
const helpShown = StateField.define<Tooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    for (const effect of transaction.effects) if (effect.is(SET_HELP)) return effect.value
    return transaction.docChanged || transaction.selection ? null : tooltip
  },
  provide: (field) => showTooltip.from(field)
})

/** Show signature help's tooltip, or none. */
const SET_SIGNATURE = StateEffect.define<Tooltip | null>()

/** Signature help's tooltip, while it shows. */
const signatureShown = StateField.define<Tooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    for (const effect of transaction.effects) if (effect.is(SET_SIGNATURE)) return effect.value
    return tooltip && transaction.docChanged ? { ...tooltip, pos: transaction.changes.mapPos(tooltip.pos) } : tooltip
  },
  provide: (field) => showTooltip.from(field)
})

/** What `changes` inserted, if they're one insertion:  a key's character, a new line and its indent. */
function typedText(changes: ChangeSet): string | undefined {
  let typed: string | undefined
  let count = 0
  changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    count++
    if (fromA === toA) typed = inserted.toString()
  })
  return count === 1 ? typed : undefined
}

/** Should the suggestions show by themselves after `before`, the text before the caret, in `mode`? */
function suggestsBySelf(mode: SuggestMode, before: string): boolean {
  if (mode === "everywhere") return true
  return mode === "whereItHelps" && suggestsByItself(before)
}

/**
 * `completion`, made to open the value picker once written, if `item` is "Pick a color…" or "Pick an icon…"
 * (`LSP.PICK_VALUE_COMMAND`):  the picker and the attribute's words are its command's arguments.
 */
function picking(item: CompletionItem, completion: Completion): Completion {
  if (item.command?.command !== LSP.PICK_VALUE_COMMAND || typeof completion.apply !== "function") return completion
  const [picker, values] = (item.command.arguments ?? []) as [SP.ComponentValuePicker, string[]]
  const write = completion.apply
  return {
    ...completion,
    apply: (view, chosen, from, to) => {
      write(view, chosen, from, to)
      CodeMirrorValues.pick(view, picker, values)
    }
  }
}

/** `items` in the service's order:  by `sortText`, else by label. */
function inServiceOrder(items: CompletionItem[]): CompletionItem[] {
  const key = (item: CompletionItem) => item.sortText ?? item.label
  return [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
}

/** `help`'s signature as markdown:  its words, the argument at the caret in bold, then its docs. */
function signatureMarkdown(help: SignatureHelp): string | undefined {
  const signature = help.signatures[help.activeSignature ?? 0]
  if (!signature) return undefined
  const { label } = signature
  const parameter = signature.parameters?.[help.activeParameter ?? 0]?.label
  const [start, end] = Array.isArray(parameter) ? parameter : [-1, -1]
  const words = start >= 0 ? `${label.slice(0, start)}**${label.slice(start, end)}**${label.slice(end)}` : label
  const docs = signature.documentation && LspToCodeMirror.markdown(signature.documentation)
  return docs ? `${words}\n\n${docs}` : words
}

/** `markdown` drawn by Spell UI's `<ui-markdown>`, in a box of class `className`. */
function markdownDom(markdown: string, className: string): HTMLElement {
  const dom = document.createElement("div")
  dom.className = className
  const drawn = document.createElement("ui-markdown")
  drawn.textContent = markdown
  dom.append(drawn)
  return dom
}
