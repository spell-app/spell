import { For, Show } from "solid-js"
import { render, type JSX } from "@solidjs/web"
import { SymbolKind, type CodeAction, type DocumentSymbol } from "vscode-languageserver"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { wordsForLine, type ExplainedLine } from "spell/app/app/ui/ExplainedLines"
import { cutCopyOrPaste, EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { Action, MenuPopup } from "spell/app/app/solid"
// By file:  not in the barrel, so it's this menu's chunk alone that loads it
import { ExplainThis } from "spell/app/app/solid/ExplainThis"
import type { CodeMirrorLocation } from "./LspToCodeMirror"
import { CodeMirrorPeek } from "./CodeMirrorPeek"
import type { SpellCodeMirror } from "./SpellCodeMirror"

// the editor's menu look:  the top bar's and the part menu's
import "spell/app/app/solid/MenuBar.css"

/****************
 * ### `<CodeMirrorMenu>`
 * A CodeMirror editor's right-click menu (epic `editor` P30;  epic `codemirror` P5):  the app's one right-click menu,
 * the part menu's popup (`<MenuPopup>`), never the browser's.
 * - Go to Definition, Peek Definition, Go to Type Definition, Find All References, Peek References;  Rename Symbol, only where something can be renamed
 *   (epic `editor` I147);  the language service's code actions for the selection ("Make it code" ...);
 *   Explain This, what the code does in plain words (`<ExplainThis>`, epic `editor` P32:  the selection, a whole action
 *   from its head line, else the line;  `explainedLines()`);
 *   Cut, Copy and Paste, as the Edit menu does them (`cutCopyOrPaste()`);  Find.
 * - Each row's shortcut is the editor's one list's (`EDITOR_HOTKEYS`);  each runs the editor's own command
 *   (`SpellCodeMirror.run()`), as its key does.
 * - Find All References lists the uses in the same popup, each a row going there (`openReferences()`).
 * - `CodeMirrorMenu.open()` shows one;  it goes once a row is chosen, or the popup closes.
 ****************/
export class CodeMirrorMenu {
  /** Show the menu for `editor` at `at`, its rows in the app's language. */
  static async open(editor: SpellCodeMirror, at: { x: number; y: number }): Promise<void> {
    const { view } = editor
    const head = view.state.selection.main.head
    const [actions, canRename] = await Promise.all([editor.language?.codeActionsAt(view) ?? [], editor.canRename(head)])
    CodeMirrorMenu.show(at, appTexts.text("menuEdit"), () => (
      <CodeRows editor={editor} actions={actions} canRename={canRename} />
    ))
  }

  /** List `locations`, every use of a thing, at `at`:  a row each, going there in `editor` (or the page). */
  static openReferences(editor: SpellCodeMirror, at: { x: number; y: number }, locations: CodeMirrorLocation[]) {
    CodeMirrorMenu.show(at, appTexts.text("cmReferences"), () => (
      <Show
        when={locations.length}
        fallback={<Action menu disabled title={appTexts.text("cmNoReferences")} onClick={() => {}} />}
      >
        <For each={locations}>
          {(location) => (
            <Action
              menu
              icon="arrow right"
              title={CodeMirrorPeek.placeWords(editor.file.project, location)}
              onClick={() => editor.open(location)}
            />
          )}
        </For>
      </Show>
    ))
  }

  /** Close the menu that's open, if one is. */
  static close: (() => void) | undefined

  /** Show a menu of `rows` at `at`, in place of any other. */
  private static show(at: { x: number; y: number }, label: string, rows: () => JSX.Element): void {
    CodeMirrorMenu.close?.()
    const root = document.createElement("div")
    root.className = "CodeMirrorMenuRoot"
    document.body.append(root)
    const close = () => CodeMirrorMenu.close?.()
    const dispose = render(
      () => (
        <MenuPopup at={at} label={label} class="CodeMirrorMenu" onClose={close}>
          {rows()}
        </MenuPopup>
      ),
      root
    )
    CodeMirrorMenu.close = () => {
      CodeMirrorMenu.close = undefined
      // after the click that chose a row is done with it
      queueMicrotask(() => {
        dispose()
        root.remove()
      })
    }
  }
}

/** The code menu's rows. */
function CodeRows(props: CodeRowsProps) {
  const view = () => props.editor.view
  const hasSelection = () => !view().state.selection.main.empty
  const run = (command: Parameters<SpellCodeMirror["run"]>[0]) => () => props.editor.run(command)
  return (
    <>
      <Action
        menu
        icon="arrow right"
        title={appTexts.text("cmGoToDefinition")}
        shortcut={EDITOR_HOTKEYS.goToDefinition.shortcut}
        onClick={run("goToDefinition")}
      />
      <Action
        menu
        icon="eye"
        title={appTexts.text("cmPeekDefinition")}
        shortcut={EDITOR_HOTKEYS.peekDefinition.shortcut}
        onClick={run("peekDefinition")}
      />
      <Action menu icon="sitemap" title={appTexts.text("cmGoToTypeDefinition")} onClick={run("goToTypeDefinition")} />
      <Action
        menu
        icon="list"
        title={appTexts.text("cmFindReferences")}
        shortcut={EDITOR_HOTKEYS.findReferences.shortcut}
        onClick={run("findReferences")}
      />
      <Action
        menu
        icon="list ul"
        title={appTexts.text("cmPeekReferences")}
        shortcut={EDITOR_HOTKEYS.peekReferences.shortcut}
        onClick={run("peekReferences")}
      />
      <Show when={props.canRename}>
        <Action
          menu
          icon="i cursor"
          title={appTexts.text("cmRenameSymbol")}
          shortcut={EDITOR_HOTKEYS.rename.shortcut}
          onClick={run("rename")}
        />
      </Show>
      <Show when={props.actions.length}>
        <ui-action kind="divider" />
        <For each={props.actions}>
          {(action) => (
            <Action
              menu
              icon="magic"
              title={action.title}
              onClick={() => {
                view().focus()
                props.editor.language?.applyCodeAction(view(), action)
              }}
            />
          )}
        </For>
      </Show>
      <Show when={ExplainThis.isAvailable()}>
        <ui-action kind="divider" />
        <Action
          menu
          icon="question circle outline"
          title={appTexts.text("explainThis")}
          onClick={() => void explain(props.editor)}
        />
      </Show>
      <ui-action kind="divider" />
      <Action
        menu
        icon="cut"
        title={appTexts.text("menuCut")}
        shortcut={EDITOR_HOTKEYS.cutParts.shortcut}
        disabled={!hasSelection()}
        onClick={() => cutCopyOrPaste("cut")}
      />
      <Action
        menu
        icon="copy outline"
        title={appTexts.text("menuCopy")}
        shortcut={EDITOR_HOTKEYS.copyParts.shortcut}
        disabled={!hasSelection()}
        onClick={() => cutCopyOrPaste("copy")}
      />
      <Action
        menu
        icon="paste"
        title={appTexts.text("menuPaste")}
        shortcut={EDITOR_HOTKEYS.pasteParts.shortcut}
        onClick={() => cutCopyOrPaste("paste")}
      />
      <ui-action kind="divider" />
      <Action
        menu
        icon="search"
        title={appTexts.text("cmFindMenu")}
        shortcut={EDITOR_HOTKEYS.find.shortcut}
        onClick={run("find")}
      />
    </>
  )
}

/**
 * Explain This:  `editor`'s code that was right-clicked, in a modal beside what it does (`ExplainThis`).
 * - NEVER throws:  a failure goes to the console, as the menu has closed.
 */
async function explain(editor: SpellCodeMirror): Promise<void> {
  try {
    await ExplainThis.open(await explainedLines(editor), editor.file.project?.projectId)
  } catch (error) {
    console.error("Explain This:", error)
  }
}

/**
 * The lines Explain This explains in `editor`, each with the editor's own words for it (`wordsForLine()`):
 * - the selection's lines, when there is one
 * - right-clicked on an action's head line (`to turn over the next card`), or a handler's:
 *   the whole of it, as the language service's outline says where it ends (`documentSymbols()`)
 * - else the line the caret is on
 * - Their shared indent taken off (`sharedIndent()`):  they show from the margin.
 * - Each line's words:  the plain hovers over its words (`hover(..., "plain")`), as the code shows them.
 */
export async function explainedLines(editor: SpellCodeMirror): Promise<ExplainedLine[]> {
  const { state } = editor.view
  const { doc, selection } = state
  const { main } = selection
  const language = editor.language
  const file = await language?.fileReady(doc)
  const first = doc.lineAt(main.from).number
  let last = doc.lineAt(main.to).number
  if (main.empty) {
    const action = file && actionHeadedAt(language!.service.documentSymbols(file), first - 1)
    if (action) last = Math.min(doc.lines, action.range.end.line + 1)
  }
  const written: string[] = []
  for (let number = first; number <= last; number++) written.push(doc.line(number).text)
  // the blank lines an outline's range may end with
  while (written.length > 1 && !written.at(-1)!.trim()) written.pop()
  const indent = sharedIndent(written)
  return written.map((text, index) => {
    if (!file || !language || !text.trim()) return { text: text.slice(indent) }
    const line = first - 1 + index
    const hovers = [...text.matchAll(/\S+/g)].map((word) => {
      const hover = language.service.hover(file, { line, character: word.index + 1 }, "plain")
      const contents = hover?.contents
      return contents && typeof contents === "object" && "value" in contents ? contents.value : null
    })
    return { text: text.slice(indent), words: wordsForLine(text, hovers) }
  })
}

/** How many tabs or spaces the non-blank `lines` all start with. */
function sharedIndent(lines: readonly string[]): number {
  const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length)
  return indents.length ? Math.min(...indents) : 0
}

/** The action or handler among `symbols` (and their children) whose head is on line `line`, from 0. */
function actionHeadedAt(symbols: DocumentSymbol[], line: number): DocumentSymbol | undefined {
  for (const symbol of symbols) {
    if (ACTION_KINDS.includes(symbol.kind) && symbol.range.start.line === line) return symbol
    const inside = symbol.children && actionHeadedAt(symbol.children, line)
    if (inside) return inside
  }
  return undefined
}

/** The outline's kinds that are actions, whose head line explains the whole:  a method, a function, an event handler. */
const ACTION_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Function, SymbolKind.Event, SymbolKind.Constructor]

/** Props for `<CodeRows>`. */
type CodeRowsProps = {
  /** the editor right-clicked */
  editor: SpellCodeMirror
  /** the language service's code actions for its selection */
  actions: CodeAction[]
  /** can the thing at the caret be renamed?  Rename Symbol shows only then */
  canRename: boolean
}
