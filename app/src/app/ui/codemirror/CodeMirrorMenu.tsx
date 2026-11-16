import { For, Show } from "solid-js"
import { render, type JSX } from "@solidjs/web"
import type { CodeAction } from "vscode-languageserver"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { cutCopyOrPaste, EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { Action, MenuPopup } from "spell/app/app/solid"
import type { CodeMirrorLocation } from "./LspToCodeMirror"
import type { SpellCodeMirror } from "./SpellCodeMirror"

// the editor's menu look:  the top bar's and the part menu's
import "spell/app/app/solid/MenuBar.css"

/****************
 * ### `<CodeMirrorMenu>`
 * A CodeMirror editor's right-click menu (epic `editor` P30;  epic `codemirror` P5):  the app's one right-click menu,
 * the part menu's popup (`<MenuPopup>`), never the browser's.
 * - Go to Definition, Go to Type Definition, Find All References;  Rename Symbol, only where something can be renamed
 *   (epic `editor` I147);  the language service's code actions for the selection ("Make it code" ...);
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
              title={referenceWords(editor, location)}
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
      <Action menu icon="sitemap" title={appTexts.text("cmGoToTypeDefinition")} onClick={run("goToTypeDefinition")} />
      <Action
        menu
        icon="list"
        title={appTexts.text("cmFindReferences")}
        shortcut={EDITOR_HOTKEYS.findReferences.shortcut}
        onClick={run("findReferences")}
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

/** Props for `<CodeRows>`. */
type CodeRowsProps = {
  /** the editor right-clicked */
  editor: SpellCodeMirror
  /** the language service's code actions for its selection */
  actions: CodeAction[]
  /** can the thing at the caret be renamed?  Rename Symbol shows only then */
  canRename: boolean
}

/** A use's row:  its file's name and line, then the line's words, `Card.spell:12  its value is 12`. */
function referenceWords(editor: SpellCodeMirror, { path, range }: CodeMirrorLocation): string {
  const file = editor.file.project.files.find((each) => each.path === path)
  const name = path.slice(path.lastIndexOf("/") + 1)
  const where = appTexts.text("cmReferenceAt", { file: name, line: range.start.line + 1 })
  const lines = (file?.contents ?? "").split("\n")
  const words = lines[range.start.line]?.trim() ?? ""
  return words ? `${where}  ${words}` : where
}
