import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippet,
  startCompletion
} from "@codemirror/autocomplete"
import { foldService } from "@codemirror/language"
import { type Diagnostic as LintDiagnostic, linter } from "@codemirror/lint"
import type { EditorState, Extension, Text } from "@codemirror/state"
import { EditorView, hoverTooltip, type Tooltip } from "@codemirror/view"
import type {
  CodeAction,
  CompletionItem,
  Hover,
  MarkedString,
  MarkupContent,
  Position,
  Range,
  TextEdit
} from "vscode-languageserver"

import { observe } from "spell/util"
import { after, type CancelablePromise } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { HOVER_DELAY, suggestsByItself } from "spell/app/app/ui/codePopups"

/****************
 * ### `CodeMirrorLanguage`
 * Spell's language service in a CodeMirror editor (epic `editor` P30, the CodeMirror test), answered IN-PROCESS by
 * `LSP.SpellLanguageService`, as Monaco's `SpellLanguageFeatures` and VS Code's language server are.
 * - Suggestions, hover, problems, folding, go to definition and code actions, each a CodeMirror extension or method.
 * - Follows ONE project file both ways (`follow()`):  what's typed goes into the file and is parsed once the typing
 *   pauses;  the file's text changed from elsewhere (another editor showing it) comes into the editor.
 * - Asks nothing of a file whose text isn't the editor's:  `fileReady()` parses what's waiting first.
 * - What a hover says and which code actions show are the app's, as Monaco's are (`CodeEditorFeatures`);
 *   where suggestions show by themselves and how long a hover waits, Settings…' table (`codePopups`).
 * - Its position in the import graph:  the parser, the language service, the app's editor-neutral `ui` files,
 *   CodeMirror;  never Monaco.
 * - NEVER saves:  the test page has no Save.
 ****************/
export class CodeMirrorLanguage {
  constructor(
    readonly service: LSP.SpellLanguageService,
    /** the file the editor shows */
    readonly file: SP.SpellFile
  ) {}

  /** Every extension:  following the file, suggestions, hover, problems, folding. */
  extensions(): Extension {
    return [this.follow(), this.hover(), this.problems(), this.folding()]
  }

  ////////////////
  // ## Following the file
  ////////////////

  /**
   * Keep the editor and the file the same:
   * - typed:  the text goes into the file at once (`project.takeText()`), its parse waits till the typing pauses
   * - the file changed from elsewhere:  only what differs is replaced, so the caret stays put
   */
  private follow(): Extension {
    let stop: (() => void) | undefined
    return [
      EditorView.updateListener.of((update) => {
        if (!stop) stop = this.followFile(update.view)
        if (!update.docChanged) return
        const text = update.state.doc.toString()
        if (text === this.file.contents) return
        this.file.isDirty = true
        this.file.project.takeText(this.file, text)
        this.parseSoon()
      }),
      EditorView.domEventHandlers({
        // a click, before anything asks:  parsed now, as Monaco's `SpellModels` does
        pointerdown: () => {
          void this.parseNow()
          return false
        }
      })
    ]
  }

  /** Follow the file's text into `view`;  returns what stops it. */
  private followFile(view: EditorView): () => void {
    return observe(() => {
      const contents = this.file.contents
      if (contents === undefined) return
      // outside the reaction:  a dispatch reads spell state, which the reaction would follow too
      queueMicrotask(() => {
        const now = view.state.doc.toString()
        if (contents !== now && contents === this.file.contents) view.dispatch({ changes: differenceOf(now, contents) })
      })
    })
  }

  /** Parse the file's waiting text once the typing pauses for `PARSE_WAIT` msec. */
  private parseSoon() {
    this.parseTimer?.cancel()
    this.parseTimer = after(CodeMirrorLanguage.PARSE_WAIT / 1000, () => void this.parseNow())
  }

  /** How long the typing must pause before what's typed is parsed, in msec:  as Monaco's `SpellModels.PARSE_WAIT`. */
  static PARSE_WAIT = 200

  /** Timer of a pending `parseSoon()`. */
  private parseTimer: CancelablePromise<void> | undefined

  /** Parse what's typed and not parsed yet, now.  NEVER throws. */
  parseNow(): Promise<unknown> {
    this.parseTimer?.cancel()
    this.parseTimer = undefined
    return this.file.project.parseWaitingText().catch((error: unknown) => {
      console.error("CodeMirrorLanguage:  couldn't parse", error)
    })
  }

  /** The file, parsed and holding `doc`'s text, or `undefined` while it isn't. */
  async fileReady(doc: Text): Promise<SP.SpellFile | undefined> {
    await this.parseNow()
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
    const { items } = this.service.completion(file, positionOf(context.state.doc, context.pos))
    if (!items.length) return null
    const from = word?.from ?? context.pos
    return {
      from,
      options: items.map((item) => this.completionOf(item, context.state)),
      validFor: /^[\p{L}\p{M}\d_-]*$/u
    }
  }

  /** One suggestion, as CodeMirror shows and writes it. */
  private completionOf(item: CompletionItem, state: EditorState): Completion {
    const edit = item.textEdit && "range" in item.textEdit ? item.textEdit : undefined
    const text = edit?.newText ?? item.insertText ?? item.label
    const isSnippet = item.insertTextFormat === 2
    const range = edit && rangeOf(state.doc, edit.range)
    const listsNext = item.command?.command === LSP_SHOW_SUGGESTIONS
    const write = isSnippet ? snippet(snippetOf(text)) : undefined
    return {
      label: item.label,
      ...(item.detail ? { detail: item.detail } : {}),
      ...(item.documentation ? { info: markdownText(item.documentation) } : {}),
      apply: (view, completion, from, to) => {
        const [start, end] = range ? [range.from, Math.max(range.to, to)] : [from, to]
        if (write) write(view, completion, start, end)
        else
          view.dispatch({ changes: { from: start, to: end, insert: text }, selection: { anchor: start + text.length } })
        if (listsNext) queueMicrotask(() => startCompletion(view))
      }
    }
  }

  ////////////////
  // ## Hover, problems, folding
  ////////////////

  /** What a word is, and its docstring, on a hover that rests `HOVER_DELAY`, saying as much as Monaco's does. */
  private hover(): Extension {
    return hoverTooltip(
      async (view, pos): Promise<Tooltip | null> => {
        const file = await this.fileReady(view.state.doc)
        const hover = file && CodeEditorFeatures.hover(this.service, file, positionOf(view.state.doc, pos))
        if (!hover) return null
        const range = hover.range ? rangeOf(view.state.doc, hover.range) : { from: pos, to: pos }
        return { pos: range.from, end: range.to, above: true, create: () => ({ dom: hoverDom(hover) }) }
      },
      // CodeMirror's own wait, in msec
      { hoverTime: HOVER_DELAY * 1000 }
    )
  }

  /** The file's problems, as squiggles and in the gutter:  its parse's diagnostics. */
  private problems(): Extension {
    return linter(
      async (view): Promise<LintDiagnostic[]> => {
        const file = await this.fileReady(view.state.doc)
        if (!file) return []
        const { doc } = view.state
        return this.service.diagnostics(file).map((diagnostic) => ({
          ...rangeOf(doc, diagnostic.range),
          severity: diagnostic.severity === 1 ? "error" : diagnostic.severity === 2 ? "warning" : "info",
          message: typeof diagnostic.message === "string" ? diagnostic.message : diagnostic.message.value
        }))
      },
      { delay: 300 }
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

  /** Where the thing at `pos` is declared:  its file's path and offsets, if the service knows. */
  async definitionAt(view: EditorView, pos: number): Promise<CodeMirrorLocation | undefined> {
    const file = await this.fileReady(view.state.doc)
    const [location] = file ? this.service.definition(file, positionOf(view.state.doc, pos)) : []
    const path = location && LSP.AppAddresses.pathOf(location.uri)
    if (!location || path === undefined) return undefined
    return { path, range: location.range }
  }

  /** The service's code actions for the selection:  "Make it code", "Define `to <phrase>`" ... */
  async codeActionsAt(view: EditorView): Promise<CodeAction[]> {
    const file = await this.fileReady(view.state.doc)
    if (!file) return []
    const { from, to } = view.state.selection.main
    const range = { start: positionOf(view.state.doc, from), end: positionOf(view.state.doc, to) }
    return CodeEditorFeatures.codeActions(this.service, file, range)
  }

  /** Make `action`'s edits to this file in `view`, one undo step. */
  applyCodeAction(view: EditorView, action: CodeAction): void {
    const edits = action.edit?.changes?.[LSP.AppAddresses.uriOf(this.file.path)] ?? []
    view.dispatch({ changes: edits.map((edit) => changeOf(view.state.doc, edit)), userEvent: "input.codeAction" })
  }
}

/** A place in a project file:  its path and range. */
export type CodeMirrorLocation = { path: string; range: Range }

/** The command a suggestion asks for to list the next ones at once:  VS Code's, which the service names. */
const LSP_SHOW_SUGGESTIONS = "editor.action.triggerSuggest"

////////////////
// ## Positions and edits
////////////////

/** The service's line and character of `offset` in `doc`:  both count UTF-16 units, as CodeMirror does. */
export function positionOf(doc: Text, offset: number): Position {
  const line = doc.lineAt(offset)
  return { line: line.number - 1, character: offset - line.from }
}

/** `position`'s offset in `doc`, kept inside it. */
export function offsetOf(doc: Text, { line, character }: Position): number {
  const number = Math.min(Math.max(line + 1, 1), doc.lines)
  const { from, to } = doc.line(number)
  return Math.min(from + character, to)
}

/** `range`'s offsets in `doc`. */
export function rangeOf(doc: Text, range: Range): { from: number; to: number } {
  return { from: offsetOf(doc, range.start), to: offsetOf(doc, range.end) }
}

/** `edit` as a CodeMirror change. */
function changeOf(doc: Text, edit: TextEdit) {
  return { ...rangeOf(doc, edit.range), insert: edit.newText }
}

/** The one change taking `before` to `after`:  what's between their common start and end. */
function differenceOf(before: string, after: string) {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  let end = 0
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++
  return { from: start, to: before.length - end, insert: after.slice(start, after.length - end) }
}

/**
 * The service's snippet (`"$1" />`, `${1:name}`) in CodeMirror's spelling (`"${1}" />`, `${1:name}`).
 * - `$0`, where the caret ends, is CodeMirror's last field:  it puts fields in their numbers' order.
 */
export function snippetOf(text: string): string {
  return text
    .replace(/\$\{0(:[^}]*)?\}|\$0/g, (_match, words: string | undefined) => `\${99${words ?? ""}}`)
    .replace(/\$(\d+)/g, (_match, number: string) => `\${${number}}`)
}

////////////////
// ## Hover's words
////////////////

/** A hover's words as elements:  its text a paragraph each, its code blocks `<pre>`. */
function hoverDom(hover: Hover): HTMLElement {
  const dom = document.createElement("div")
  dom.className = "cmb-hover"
  const text = markdownText(hover.contents)
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

/** A hover's or a suggestion's markdown as one text. */
function markdownText(contents: MarkupContent | MarkedString | MarkedString[] | string): string {
  if (typeof contents === "string") return contents
  if (Array.isArray(contents)) return contents.map((each) => markdownText(each)).join("\n\n")
  if ("kind" in contents) return contents.value
  return "```" + contents.language + "\n" + contents.value + "\n```"
}
