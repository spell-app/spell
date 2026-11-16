import { type Completion, snippet, startCompletion } from "@codemirror/autocomplete"
import type { Diagnostic as LintDiagnostic } from "@codemirror/lint"
import type { ChangeSpec, Text } from "@codemirror/state"
import {
  DiagnosticSeverity,
  InsertTextFormat,
  type CompletionItem,
  type Diagnostic,
  type Hover,
  type Location,
  type MarkedString,
  type MarkupContent,
  type Position,
  type Range,
  type TextEdit,
  type WorkspaceEdit
} from "vscode-languageserver"

import { LSP } from "spell/app/lsp"

/****************
 * ### `LspToCodeMirror`
 * Converts what `LSP.SpellLanguageService` answers, in Language Server Protocol shapes, to CodeMirror's.
 * - Positions:  LSP counts lines and characters from 0;  CodeMirror counts OFFSETS into its text, `doc`.
 *   - So every position or range needs the text it's in.
 *   - Both count UTF-16 units, so a character is an offset's step.
 *   - A position past a line's end, or past the last line, lands at that end:  never outside `doc`.
 * - Suggestions become CodeMirror's completions;  hovers a range and its words;  problems its lint diagnostics;
 *   edits its changes;  locations a file's path and range.
 * - STATIC and instance-free on purpose:  nothing to keep between calls.
 * - Its position in the import graph:  CodeMirror's types, the language service;
 *   no DOM, no view, so it unit-tests in node.
 ****************/
export class LspToCodeMirror {
  ////////////////
  // ## Positions
  ////////////////

  /** LSP position of `offset` in `doc`. */
  static lspPosition(doc: Text, offset: number): Position {
    const line = doc.lineAt(offset)
    return { line: line.number - 1, character: offset - line.from }
  }

  /** LSP range of `from` ... `to` in `doc`. */
  static lspRange(doc: Text, { from, to }: CodeMirrorRange): Range {
    return { start: LspToCodeMirror.lspPosition(doc, from), end: LspToCodeMirror.lspPosition(doc, to) }
  }

  /** Offset in `doc` of LSP `position`, kept inside `doc`. */
  static offset(doc: Text, { line, character }: Position): number {
    const number = Math.min(Math.max(line + 1, 1), doc.lines)
    const { from, to } = doc.line(number)
    return Math.min(from + character, to)
  }

  /** Offsets in `doc` of LSP `range`. */
  static range(doc: Text, { start, end }: Range): CodeMirrorRange {
    return { from: LspToCodeMirror.offset(doc, start), to: LspToCodeMirror.offset(doc, end) }
  }

  /**
   * The file's path and range of LSP `location`:  `undefined` for one outside the project's files.
   * - The path is the app's (`LSP.AppAddresses.pathOf()`):  the range stays the service's, as the file it's in may not
   *   be the one shown.
   */
  static location({ uri, range }: Location): CodeMirrorLocation | undefined {
    const path = LSP.AppAddresses.pathOf(uri)
    return path === undefined ? undefined : { path, range }
  }

  ////////////////
  // ## Answers
  ////////////////

  /** CodeMirror's lint diagnostic for LSP `diagnostic`:  a squiggle and its message. */
  static diagnostic(doc: Text, diagnostic: Diagnostic): LintDiagnostic {
    const { range, message, source, severity = DiagnosticSeverity.Error } = diagnostic
    return {
      ...LspToCodeMirror.range(doc, range),
      severity: LspToCodeMirror.SEVERITIES[severity] ?? "error",
      message: typeof message === "string" ? message : message.value,
      ...(source ? { source } : {})
    }
  }

  /**
   * CodeMirror suggestion for LSP `item`, written as the service says.
   * - Its row says what it is:  its description (`labelDetails.description`, "Whose turn it is"), as Monaco's did;
   *   else its `detail` ("property of TicTacToe"), which then heads its info instead.
   * - Its own range, when it names one (`textEdit`), stretched to whatever's typed since;  else the word being typed.
   * - A snippet stays a snippet:  `move ${1:card} to ${2:pile}`, each field a stop for Tab.
   * - So does its command, run once it's written:
   *   `editor.action.triggerSuggest` lists what goes in its quotes (epic `editor` I70).
   */
  static completion(doc: Text, item: CompletionItem): Completion {
    const edit = item.textEdit && "range" in item.textEdit ? item.textEdit : undefined
    const text = edit?.newText ?? item.insertText ?? item.label
    const range = edit && LspToCodeMirror.range(doc, edit.range)
    const listsNext = item.command?.command === LSP_SHOW_SUGGESTIONS
    const write =
      item.insertTextFormat === InsertTextFormat.Snippet ? snippet(LspToCodeMirror.snippet(text)) : undefined
    const description = item.labelDetails?.description
    const detail = description || item.detail
    const words = item.documentation ? LspToCodeMirror.markdown(item.documentation) : undefined
    const info = [description && item.detail, words].filter(Boolean).join("\n\n")
    return {
      label: item.label,
      ...(detail ? { detail } : {}),
      ...(info ? { info } : {}),
      apply: (view, completion, from, to) => {
        const [start, end] = range ? [range.from, Math.max(range.to, to)] : [from, to]
        if (write) write(view, completion, start, end)
        else
          view.dispatch({ changes: { from: start, to: end, insert: text }, selection: { anchor: start + text.length } })
        if (listsNext) queueMicrotask(() => startCompletion(view))
      }
    }
  }

  /** Where LSP `hover` is in `doc`, and its words as markdown;  at `at` when it names no range. */
  static hover(doc: Text, hover: Hover, at: number): CodeMirrorRange & { text: string } {
    const range = hover.range ? LspToCodeMirror.range(doc, hover.range) : { from: at, to: at }
    return { ...range, text: LspToCodeMirror.markdown(hover.contents) }
  }

  /** CodeMirror change for LSP `edit`. */
  static change(doc: Text, { range, newText }: TextEdit): ChangeSpec & CodeMirrorRange {
    return { ...LspToCodeMirror.range(doc, range), insert: newText }
  }

  /** CodeMirror changes for LSP `edits`, all against the same `doc`, as CodeMirror takes a list of them. */
  static changes(doc: Text, edits: readonly TextEdit[]): (ChangeSpec & CodeMirrorRange)[] {
    return edits.map((edit) => LspToCodeMirror.change(doc, edit))
  }

  /**
   * The edits LSP workspace `edit` makes to the file at `path`:  `[]` when it makes none there.
   * - For one editor's file at a time:  a rename's other files are other file states.
   */
  static editsFor(edit: WorkspaceEdit | undefined, path: string): TextEdit[] {
    return edit?.changes?.[LSP.AppAddresses.uriOf(path)] ?? []
  }

  /**
   * The service's snippet (`"$1" />`, `${1:name}`) in CodeMirror's spelling (`"${1}" />`, `${1:name}`).
   * - `$0`, where the caret ends, is CodeMirror's last field:  it puts fields in their numbers' order.
   */
  static snippet(text: string): string {
    return text
      .replace(/\$\{0(:[^}]*)?\}|\$0/g, (_match, words: string | undefined) => `\${99${words ?? ""}}`)
      .replace(/\$(\d+)/g, (_match, number: string) => `\${${number}}`)
  }

  /** A hover's or a suggestion's markdown as one text:  a code block fenced with its language. */
  static markdown(contents: MarkupContent | MarkedString | MarkedString[] | string): string {
    if (typeof contents === "string") return contents
    if (Array.isArray(contents)) return contents.map((each) => LspToCodeMirror.markdown(each)).join("\n\n")
    if ("kind" in contents) return contents.value
    return "```" + contents.language + "\n" + contents.value + "\n```"
  }

  ////////////////
  // ## Kinds
  ////////////////

  /** CodeMirror's severity for each LSP diagnostic severity:  a hint is CodeMirror's quietest, `hint`. */
  static SEVERITIES: Record<number, LintDiagnostic["severity"]> = {
    [DiagnosticSeverity.Error]: "error",
    [DiagnosticSeverity.Warning]: "warning",
    [DiagnosticSeverity.Information]: "info",
    [DiagnosticSeverity.Hint]: "hint"
  }
}

/** The command a suggestion asks for to list the next ones at once:  VS Code's, which the service names. */
const LSP_SHOW_SUGGESTIONS = "editor.action.triggerSuggest"

/** A stretch of a CodeMirror text, by offsets. */
export type CodeMirrorRange = { from: number; to: number }

/** A place in a project file:  its path, and the service's range there. */
export type CodeMirrorLocation = { path: string; range: Range }
