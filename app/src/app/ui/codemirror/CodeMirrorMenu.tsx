import { openSearchPanel } from "@codemirror/search"
import { For, Show, createSignal } from "solid-js"
import { render } from "@solidjs/web"
import type { CodeAction } from "vscode-languageserver"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { CodeMirrorTexts } from "./CodeMirrorTexts"
import type { SpellCodeMirror } from "./SpellCodeMirror"

// the editor's menu look:  the top bar's and the part menu's
import "spell/app/app/solid/MenuBar.css"

/****************
 * ### `<CodeMirrorMenu>`
 * The CodeMirror test's right-click menu (epic `editor` P30):  Spell UI's, as the editor's part menu is
 * (`<PartMenu>`), never the browser's.
 * - Cut, Copy and Paste;  Go to Definition;  the language service's code actions for the selection
 *   ("Make it code", "Make it text" ...);  Find.
 * - A `<ui-popup>` at the click, holding a `<ui-menu>`:  it stays inside the window, with arrow keys, Enter and Esc.
 * - Its shortcuts are the editor's one list's (`EDITOR_HOTKEYS`);  Go to Definition's F12 is CodeMirror's own key,
 *   which the list doesn't hold.
 * - `CodeMirrorMenu.open()` shows one;  it goes once a row is chosen, or the popup closes.
 ****************/
export class CodeMirrorMenu {
  /** Show the menu for `editor` at `at`, its rows in `lang`. */
  static async open(editor: SpellCodeMirror, at: { x: number; y: number }, lang: string): Promise<void> {
    CodeMirrorMenu.close?.()
    const actions = await editor.language.codeActionsAt(editor.view)
    const root = document.createElement("div")
    root.className = "CodeMirrorMenuRoot"
    document.body.append(root)
    const dispose = render(
      () => (
        <MenuPopup editor={editor} at={at} actions={actions} lang={lang} onClose={() => CodeMirrorMenu.close?.()} />
      ),
      root
    )
    CodeMirrorMenu.close = () => {
      CodeMirrorMenu.close = undefined
      dispose()
      root.remove()
    }
  }

  /** Close the menu that's open, if one is. */
  static close: (() => void) | undefined
}

/** The popup and its rows. */
function MenuPopup(props: MenuPopupProps) {
  const [isOpen, setOpen] = createSignal(true)
  const text = (key: Parameters<typeof CodeMirrorTexts.text>[0]) => CodeMirrorTexts.text(key, props.lang)
  const view = () => props.editor.view
  const hasSelection = () => !view().state.selection.main.empty

  /** Do `work`, then close:  focus back in the code first, so a paste or a find lands there. */
  const choose = (work: () => unknown) => () => {
    view().focus()
    void Promise.resolve(work()).catch((error: unknown) => console.error("CodeMirrorMenu:  that row failed", error))
    setOpen(false)
    props.onClose()
  }
  const cut = async () => {
    const { from, to } = view().state.selection.main
    await navigator.clipboard.writeText(view().state.sliceDoc(from, to))
    view().dispatch({ changes: { from, to }, userEvent: "delete.cut" })
  }
  const copy = () => {
    const { from, to } = view().state.selection.main
    return navigator.clipboard.writeText(view().state.sliceDoc(from, to))
  }
  const paste = async () => {
    const text = await navigator.clipboard.readText()
    view().dispatch(view().state.replaceSelection(text), { userEvent: "input.paste" })
  }
  return (
    <Show when={isOpen()}>
      <ui-popup
        at={props.at}
        open-on="manual"
        visible=""
        class="BarMenuPopup CodeMirrorMenu"
        ref={(popup: HTMLElement) => popup.addEventListener("ui-closing", () => props.onClose())}
        onContextMenu={(event: MouseEvent) => event.preventDefault()}
      >
        <div class="BarMenuPanel">
          <ui-menu direction="vertical" size="small" interactive="" icon-column="" class="BarMenuItems">
            <ui-action
              icon="cut"
              shortcut={EDITOR_HOTKEYS.cutParts.shortcut}
              disabled={!hasSelection()}
              onClick={choose(cut)}
            >
              {appTexts.text("menuCut")}
            </ui-action>
            <ui-action
              icon="copy"
              shortcut={EDITOR_HOTKEYS.copyParts.shortcut}
              disabled={!hasSelection()}
              onClick={choose(copy)}
            >
              {appTexts.text("menuCopy")}
            </ui-action>
            <ui-action icon="paste" shortcut={EDITOR_HOTKEYS.pasteParts.shortcut} onClick={choose(paste)}>
              {appTexts.text("menuPaste")}
            </ui-action>
            <ui-action kind="divider" />
            <ui-action
              icon="arrow right"
              shortcut="F12"
              onClick={choose(() => props.editor.goToDefinition(view().state.selection.main.head))}
            >
              {text("goToDefinition")}
            </ui-action>
            <Show when={props.actions.length}>
              <ui-action kind="divider" />
              <For each={props.actions}>
                {(action) => (
                  <ui-action icon="magic" onClick={choose(() => props.editor.language.applyCodeAction(view(), action))}>
                    {action.title}
                  </ui-action>
                )}
              </For>
            </Show>
            <ui-action kind="divider" />
            <ui-action
              icon="search"
              shortcut={EDITOR_HOTKEYS.find.shortcut}
              onClick={choose(() => openSearchPanel(view()))}
            >
              {text("find")}
            </ui-action>
          </ui-menu>
        </div>
      </ui-popup>
    </Show>
  )
}

/** Props for `<MenuPopup>`. */
type MenuPopupProps = {
  /** the editor right-clicked */
  editor: SpellCodeMirror
  /** where, on the page */
  at: { x: number; y: number }
  /** the language service's code actions for its selection */
  actions: CodeAction[]
  /** the language the rows are in */
  lang: string
  /** the popup is going */
  onClose: () => void
}
