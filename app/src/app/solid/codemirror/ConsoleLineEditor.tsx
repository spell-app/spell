import { untrack } from "solid-js"
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { EditorSelection, Prec, type Extension } from "@codemirror/state"
import { EditorView, keymap, placeholder } from "@codemirror/view"
import { SymbolKind } from "vscode-languageserver-types"

import type { SP } from "spell/parser/spell"

import { CodeMirrorPopups, LanguageClient, SpellCodeMirror } from "spell/app/app/ui/codemirror"
import { CodeMirrorEditor } from "./CodeMirrorEditor"

/****************
 * ### `<ConsoleLineEditor>`
 * The Spell Console's line (epic `editor` P32):  one line of Spell in CodeMirror, under the console's lines,
 * drawn as the code is, in the bubbly look.
 * - Return runs it (`onRun`), and empties it;  Up and Down bring back earlier lines (`earlier`), as a terminal does.
 * - Suggestions:  the names the open project declares (`project`), its things, templates, actions and properties, as Go to Symbol
 *   lists them (the language service's `workspaceSymbols()`, asked as `spell/projectSymbols`, the language worker's where
 *   it parses the project).
 *   NOT the code editor's own list, which answers for a place in a file:  a typed line is in no file.
 * - With the suggestion list open, Return, Up and Down are the list's.
 * - Its props are read once, as it's made.
 ****************/
export function ConsoleLineEditor(props: ConsoleLineEditorProps) {
  const { onRun, earlier, placeholder: hint, label } = untrack(() => ({ ...props }))
  /** How far back Up has gone:  `earlier().length` is "not at all";  what was being typed, kept while it's away. */
  let back = 0
  let draft = ""
  const extensions: Extension = [
    SpellCodeMirror.snippetExtensions(),
    placeholder(hint),
    EditorView.contentAttributes.of({ "aria-label": label }),
    autocompletion({ override: [(context) => suggestions(context, props.project())] }),
    // the list, shown by itself, waits the page's popup delay:  CodeMirror merges it with the line above
    CodeMirrorPopups.waiting((msec) => autocompletion({ activateOnTypingDelay: msec })),
    // over the base setup's keys, under the suggestion list's (`Prec.highest`), which take them while it's open
    Prec.high(
      keymap.of([
        { key: "Enter", run },
        { key: "ArrowUp", run: (view) => recall(view, -1) },
        { key: "ArrowDown", run: (view) => recall(view, 1) }
      ])
    )
  ]
  return (
    <div class="ConsoleLineEditor">
      <CodeMirrorEditor extensions={extensions} value="" onMount={props.onMount} />
    </div>
  )

  /** Return:  run the line, and start a new one. */
  function run(view: EditorView): boolean {
    const text = view.state.doc.toString()
    if (!text.trim()) return true
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } })
    back = earlier().length + 1
    draft = ""
    onRun(text)
    return true
  }

  /** Up (`-1`) or Down (`1`):  the line before or after the one shown, back to what was being typed. */
  function recall(view: EditorView, step: -1 | 1): boolean {
    const lines = earlier()
    if (back > lines.length) back = lines.length
    if (back === lines.length) draft = view.state.doc.toString()
    const next = Math.min(lines.length, Math.max(0, back + step))
    if (next === back) return true
    back = next
    const text = back === lines.length ? draft : lines[back]!
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: EditorSelection.cursor(text.length)
    })
    return true
  }
}

/** Props for `<ConsoleLineEditor>`. */
export type ConsoleLineEditorProps = {
  /** a line typed, then Return:  run it */
  onRun: (text: string) => void
  /** the lines run before, oldest first:  what Up brings back */
  earlier: () => readonly string[]
  /** shown while it's empty */
  placeholder: string
  /** what a screen reader says it is */
  label: string
  /** the open project, whose names are suggested */
  project: () => SP.SpellProject | undefined
  /** called with the view once it's made, e.g. to focus it */
  onMount?: (view: EditorView) => void
}

/**
 * `project`'s names with the word at the caret's letters in order, for the suggestion list:
 * asked of the language service through the code's client, the editor's language worker where it parses the project
 * (epic `solid-2-final` T36).
 */
async function suggestions(
  context: CompletionContext,
  project: SP.SpellProject | undefined
): Promise<CompletionResult | null> {
  const word = context.matchBefore(/[\p{L}\p{M}\d_-]*/u)
  const [file] = project?.spellFiles ?? []
  if (!word || !file || (word.from === word.to && !context.explicit)) return null
  const textDocument = { uri: LanguageClient.uriOf(file) }
  const symbols = await SpellCodeMirror.states.client.request("spell/projectSymbols", {
    textDocument,
    query: word.text
  })
  if (context.aborted) return null
  const seen = new Set<string>()
  const options = symbols
    .filter((symbol) => !seen.has(symbol.name) && seen.add(symbol.name))
    .map((symbol) => ({ label: symbol.name, type: SYMBOL_TYPES[symbol.kind] ?? "variable" }))
  return options.length ? { from: word.from, options, validFor: /^[\p{L}\p{M}\d_-]*$/u } : null
}

/** How the suggestion list marks each kind of name the language service lists, by its `SymbolKind`. */
const SYMBOL_TYPES: Partial<Record<SymbolKind, string>> = {
  [SymbolKind.Class]: "class",
  [SymbolKind.Method]: "method",
  [SymbolKind.Property]: "property",
  [SymbolKind.Function]: "function",
  [SymbolKind.Variable]: "variable",
  [SymbolKind.Constant]: "constant"
}
