import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete"
import { foldService } from "@codemirror/language"
import type { Extension, Text } from "@codemirror/state"
import { type EditorView, hoverTooltip, type Tooltip } from "@codemirror/view"
import type { CodeAction } from "vscode-languageserver"

import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { HOVER_DELAY, suggestsByItself } from "spell/app/app/ui/codePopups"
import { LspToCodeMirror, type CodeMirrorLocation } from "./LspToCodeMirror"

/****************
 * ### `CodeMirrorLanguage`
 * Spell's language service for one file's CodeMirror state, answered IN-PROCESS by `LSP.SpellLanguageService`,
 * as Monaco's `SpellLanguageFeatures` and VS Code's language server are.
 * - Suggestions, hover, folding, go to definition and code actions, each a CodeMirror extension or method.
 * - Made by `FileStates`, one per spell file's state, which also follows the file both ways and shows its problems.
 * - Asks nothing of a file whose text isn't the editor's:  `fileReady()` parses what's waiting first.
 * - What a hover says and which code actions show are the app's, as Monaco's are (`CodeEditorFeatures`);
 *   where suggestions show by themselves and how long a hover waits, Settings…' table (`codePopups`).
 * - The service's shapes become CodeMirror's through ONE converter, `LspToCodeMirror`.
 * - Its position in the import graph:  the parser, the language service, the app's editor-neutral `ui` files,
 *   CodeMirror;  never Monaco.
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

  /** Every extension:  hover and folding (suggestions go through `completions`, problems through `FileStates`). */
  extensions(): Extension {
    return [this.hover(), this.folding()]
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

  /** Suggestions at the caret, for `autocompletion({ override })`:  the service's, each written as it says. */
  completions = async (context: CompletionContext): Promise<CompletionResult | null> => {
    const word = context.matchBefore(/[\p{L}\p{M}\d_-]*/u)
    const line = context.state.doc.lineAt(context.pos)
    const before = context.state.sliceDoc(line.from, word?.from ?? context.pos)
    if (!context.explicit && !suggestsByItself(before)) return null
    const file = await this.fileReady(context.state.doc)
    if (!file || context.aborted) return null
    const { doc } = context.state
    const { items } = this.service.completion(file, LspToCodeMirror.lspPosition(doc, context.pos))
    if (!items.length) return null
    return {
      from: word?.from ?? context.pos,
      options: items.map((item) => LspToCodeMirror.completion(doc, item)),
      validFor: /^[\p{L}\p{M}\d_-]*$/u
    }
  }

  ////////////////
  // ## Hover, folding
  ////////////////

  /** What a word is, and its docstring, on a hover that rests `HOVER_DELAY`, saying as much as Monaco's does. */
  private hover(): Extension {
    return hoverTooltip(
      async (view, pos): Promise<Tooltip | null> => {
        const { doc } = view.state
        const file = await this.fileReady(doc)
        const hover = file && CodeEditorFeatures.hover(this.service, file, LspToCodeMirror.lspPosition(doc, pos))
        if (!hover) return null
        const { from, to, text } = LspToCodeMirror.hover(doc, hover, pos)
        return { pos: from, end: to, above: true, create: () => ({ dom: hoverDom(text) }) }
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

  /** Where the thing at `pos` is declared:  its file's path and range, if the service knows. */
  async definitionAt(view: EditorView, pos: number): Promise<CodeMirrorLocation | undefined> {
    const { doc } = view.state
    const file = await this.fileReady(doc)
    const [location] = file ? this.service.definition(file, LspToCodeMirror.lspPosition(doc, pos)) : []
    return location && LspToCodeMirror.location(location)
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
// ## Hover's words
////////////////

/** A hover's words as elements:  `text`, its markdown, a paragraph each, its code blocks `<pre>`. */
function hoverDom(text: string): HTMLElement {
  const dom = document.createElement("div")
  dom.className = "cmb-hover"
  for (const [index, chunk] of text.split(/```[a-z]*\n?/).entries()) {
    if (!chunk.trim()) continue
    if (index % 2) {
      const pre = document.createElement("pre")
      pre.textContent = chunk.replace(/\n$/, "")
      dom.append(pre)
    } else {
      for (const paragraph of chunk.split(/\n{2,}/)) {
        if (!paragraph.trim()) continue
        if (/^-{3,}$/.test(paragraph.trim())) {
          dom.append(document.createElement("hr"))
          continue
        }
        const p = document.createElement("p")
        // its words alone:  no backticks, bold marks or a link's address
        p.textContent = paragraph
          .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/[`*]/g, "")
          .trim()
        dom.append(p)
      }
    }
  }
  return dom
}
