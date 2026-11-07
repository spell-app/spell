import { For, Show } from "solid-js"

import { editor } from "spell/app/app/editor"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { on } from "spell/app/app/solid/on"
import { NEW_CELL_KINDS, type NewCellKind, type NotebookController } from "./NotebookController"

import "./NotebookCellTools.css"

/****************
 * ### `<NotebookMenu>`
 * The notebook's ⋯ menu, at the right end of the program pane's header (epic `elemental-spell` P18):
 * Add below (each kind), Move up, Move down, Delete, acting on the SELECTED cell, the one last clicked.
 * - Each is greyed out while nothing's selected, or it can't (a move past the page's end).
 * - Locked and tried out:  Reset, the editor's own (`editor.resetApp()`):  the page put back as the file has it.
 * - The cells' own row of tools, on each example and section, went with the notebook's own renderer (epic `notebook`
 *   P3);  P4 takes this menu too, for drag and drop and the Inspector.
 * - A plain `<ui-dropdown>`, its icon the bar's `⋯`:  NOT `<MoreMenu>`, whose file brings the editor's actions in
 *   (the page's tests stand the editor in).
 ****************/
export function NotebookMenu(props: { controller: NotebookController }) {
  const { controller } = props
  const selected = () => controller.selected()
  const none = () => !selected()
  const disabled = (isDisabled: boolean) => (isDisabled ? "" : undefined)
  return (
    <ui-dropdown
      class="NotebookMenu"
      direction="left"
      title={appTexts.text(none() ? "notebookPageMoreNone" : "notebookPageMore")}
      aria-label={appTexts.text("notebookPageMore")}
      ref={on<{ value: string }>("ui-changed", (event) => {
        const value = event.detail.value
        const key = selected()
        if (value === "reset") void editor.resetApp()
        else if (key && value.startsWith(ADD_PREFIX)) controller.add(key, value.slice(ADD_PREFIX.length) as NewCellKind)
        else if (key && (value === "up" || value === "down")) controller.move(key, value)
        else if (key && value === "delete") controller.remove(key)
        // picked again next time:  a dropdown tells only of a new value
        const dropdown = event.currentTarget as HTMLElement & { value: string }
        queueMicrotask(() => (dropdown.value = ""))
      })}
    >
      <ui-icon slot="icon" name="ellipsis horizontal" />
      <ui-item kind="header">{appTexts.text("notebookPageAdd")}</ui-item>
      <For each={NEW_CELL_KINDS}>
        {(kind) => (
          <ui-item value={`${ADD_PREFIX}${kind}`} icon={KIND_ICONS[kind]} disabled={disabled(none())}>
            {appTexts.text(KIND_TEXTS[kind])}
          </ui-item>
        )}
      </For>
      <ui-item kind="divider" />
      <ui-item value="up" icon="arrow up" disabled={disabled(none() || !controller.canMove(selected()!, "up"))}>
        {appTexts.text("notebookPageMoveUpTip")}
      </ui-item>
      <ui-item value="down" icon="arrow down" disabled={disabled(none() || !controller.canMove(selected()!, "down"))}>
        {appTexts.text("notebookPageMoveDownTip")}
      </ui-item>
      <ui-item value="delete" icon="trash alternate outline" disabled={disabled(none())}>
        {appTexts.text("notebookPageDelete")}
      </ui-item>
      <Show when={controller.isTriedOut()}>
        <ui-item kind="divider" />
        <ui-item value="reset" icon="undo">
          {appTexts.text("notebookPageResetTryOut")}
        </ui-item>
      </Show>
    </ui-dropdown>
  )
}

/** The ⋯ menu's Add below items' values:  `add-example` ... */
const ADD_PREFIX = "add-"

/** Each kind's icon, in Add below's menus. */
const KIND_ICONS: Record<NewCellKind, string> = {
  example: "code",
  text: "paragraph",
  section: "heading",
  template: "cube"
}

/** Each kind's words. */
const KIND_TEXTS: Record<NewCellKind, AppTextKey> = {
  example: "notebookPageAddExample",
  text: "notebookPageAddText",
  section: "notebookPageAddSection",
  template: "notebookPageAddTemplate"
}
