import { For, Show } from "solid-js"

import { appTexts, type AppTextKey } from "spell-app/app/ui/AppTexts"
import { on } from "spell-app/app/solid/on"
import { NEW_CELL_KINDS, type NewCellKind, type NotebookController } from "./NotebookController"

import "./NotebookCellTools.css"

/****************
 * ### `<CellTools>`
 * A cell's own tools, a row of small round buttons in the look of its example's `</>` (epic `elemental-spell` P18;
 * Owen's "Both", 2026-10-26):  Add below, Move up, Move down, Delete.
 * - On an example:  in its `tools` slot, just left of its `</>`, shown only while the pointer is over it or it has the
 *   focus (`NotebookCellTools.css`);  in the Tab order, before its `</>`.
 * - On a section's title bar:  at its right end, while the pointer's over the title (`<NotebookPage>`).
 * - Add below:  a small menu of the kinds (`NEW_CELL_KINDS`);  a section's adds first inside it.
 * - Each acts on cell `key`, and selects it;  ⌘Z undoes each.
 * - Locked:  each is a try-out, never saved, and its tooltip says so.
 ****************/
export function CellTools(props: { controller: NotebookController; key: string }) {
  const { controller } = props
  return (
    <div
      class="NotebookCellTools"
      role="toolbar"
      aria-label={appTexts.text("notebookPageMore")}
      onPointerDown={() => controller.select(props.key)}
    >
      <AddMenu
        controller={controller}
        title={toolTip(controller, "notebookPageAddTip")}
        onAdd={(kind) => controller.add(props.key, kind)}
      />
      {tool(
        "arrow up",
        "notebookPageMoveUpTip",
        () => controller.move(props.key, "up"),
        !controller.canMove(props.key, "up")
      )}
      {tool(
        "arrow down",
        "notebookPageMoveDownTip",
        () => controller.move(props.key, "down"),
        !controller.canMove(props.key, "down")
      )}
      {tool("trash alternate outline", "notebookPageDeleteTip", () => controller.remove(props.key))}
    </div>
  )

  /** One of the row's buttons:  `</>`'s look, its text the tooltip and its name;  greyed out while `disabled`. */
  function tool(icon: string, text: AppTextKey, run: () => void, disabled = false) {
    return (
      <ui-button
        size="tiny"
        appearance="circular basic"
        icon={icon}
        disabled={disabled ? "" : undefined}
        title={toolTip(controller, text)}
        aria-label={toolTip(controller, text)}
        onClick={(event: MouseEvent) => {
          event.stopPropagation()
          run()
        }}
      />
    )
  }
}

/****************
 * ### `<NotebookMenu>`
 * The notebook's ⋯ menu, at the right end of the program pane's header (epic `elemental-spell` P18):
 * Add below (each kind), Move up, Move down, Delete, acting on the SELECTED cell, the one last clicked.
 * - Each is greyed out while nothing's selected, or it can't (a move past the page's end).
 * - Locked and tried out:  Reset, the page put back as the file has it.
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
        if (value === "reset") controller.resetTryOut()
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

/**
 * Add below's small menu:  a round `+` (`</>`'s look, as its row's buttons), its items the kinds of cell.
 * - The `+` is the dropdown's trigger, its caret a blank:  the dropdown's own box is just the button.
 */
function AddMenu(props: { controller: NotebookController; title: string; onAdd: (kind: NewCellKind) => void }) {
  return (
    <ui-dropdown
      class="NotebookAddMenu"
      direction="left"
      title={props.title}
      aria-label={props.title}
      ref={on<{ value: string }>("ui-changed", (event) => {
        const kind = event.detail.value as NewCellKind
        if (kind) props.onAdd(kind)
        // picked again next time:  a dropdown tells only of a new value
        const dropdown = event.currentTarget as HTMLElement & { value: string }
        queueMicrotask(() => (dropdown.value = ""))
      })}
    >
      <ui-button slot="trigger" size="tiny" appearance="circular basic" icon="plus" tabindex="-1" />
      <span slot="icon" />
      <For each={NEW_CELL_KINDS}>
        {(kind) => (
          <ui-item value={kind} icon={KIND_ICONS[kind]}>
            {appTexts.text(KIND_TEXTS[kind])}
          </ui-item>
        )}
      </For>
    </ui-dropdown>
  )
}

/** A tool's tooltip:  its text, and, while the notebook's locked, that it's a try-out and how it's put back. */
function toolTip(controller: NotebookController, text: AppTextKey): string {
  const tip = appTexts.text(text)
  return controller.canSave() ? tip : appTexts.text("notebookPageTryOutTip", { tool: tip })
}

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
