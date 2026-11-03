import { Show, createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import fileTabs from "spell/app/app/layout/FileTabs/FileTabs.spellml"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { Actions } from "./Actions"
import { CodeMoreMenu } from "./CodeOutput"
import { SpellMenuRows, type SpellMenuAction } from "./MenuBar"
import { fileIconFor } from "./chrome"
import { trackProjectFiles } from "./FileDropdown"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code:  the tabs themselves are Spell, `FileTabs.spellml`.
 * This is the editor's side of them, which Spell can't reach yet (epic `editor`'s Backing In Spell):
 * - which files there are, and which is showing (`trackProjectFiles()`), kept in the bar's files as they change
 * - what showing one does:  `editor.showEditor()`
 * - the bar's ⋯ (`<CodeMoreMenu>`)
 * - what a tab's right-click menu's items do, and are called:  its items and their order are the Spell's `tab menu`
 * - Too many for the row, it scrolls;  too narrow for that, it's one dropdown (its `<ui-toolbar>`'s `scroll-first`).
 ****************/
export function FileTabs() {
  const state = trackProjectFiles()
  const [piece, setPiece] = createSignal<LayoutPiece>()
  const [bar, setBar] = createSignal<FileTabBar>()
  let isGone = false
  onCleanup(() => (isGone = true))
  void loadLayoutPiece(fileTabs).then(
    (loaded) => {
      if (isGone) return
      setPiece(() => loaded)
      const made = new loaded.exports.FileTabBar() as FileTabBar
      made.more = { draw: () => <CodeMoreMenu /> }
      setBar(() => made)
    },
    // no tabs:  the code still shows, and File > Open is a way round
    (problem: unknown) => console.error("<FileTabs>:  can't load its Spell", problem)
  )

  createEffect(
    () => [bar(), state()] as const,
    ([it, { files, path }]) => {
      if (!it) return
      const File = piece()!.exports.File as new () => TabFile
      const known = new Map(it.files.getValues().map((file) => [file.path, file]))
      it.files.items = files.map((each) => {
        const file = known.get(each.path) ?? new File()
        file.path = each.path
        file.name = each.name
        file.icon = fileIconFor(each.name)
        file.status = each.isDirty ? "changed" : "saved"
        file.place = each.path === path ? "chosen" : "other"
        file.show = () => editor.showEditor(file.path)
        return file
      })
    }
  )

  // a right click on a tab:  that file shown, and what can be done to it
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number }>()
  const openMenu = (event: MouseEvent) => {
    const tab = event.composedPath().find((at) => (at as Element).localName === "ui-item") as Element | undefined
    if (!tab?.parentElement) return
    const file = bar()?.files.getValues()[[...tab.parentElement.children].indexOf(tab)]
    if (!file) return
    event.preventDefault()
    editor.showEditor(file.path)
    setMenuAt({ x: event.clientX, y: event.clientY })
  }
  return (
    <div class="FileTabs" onContextMenu={openMenu}>
      {piece()?.draw(bar()) as JSX.Element}
      <Show when={menuAt()}>
        {(where) => (
          <ui-popup
            at={where()}
            open-on="manual"
            visible=""
            class="BarMenuPopup FileTabMenu"
            aria-label={appTexts.text("menuFile")}
            on-ui-closing={() => setMenuAt(undefined)}
          >
            <div class="BarMenuPanel" onClick={() => setMenuAt(undefined)}>
              <ui-menu direction="vertical" size="small" interactive="" class="BarMenuItems">
                <SpellMenuRows items={piece()!.menu(bar()!, "tab menu")} itemFor={tabMenuItem} />
              </ui-menu>
            </div>
          </ui-popup>
        )}
      </Show>
    </div>
  )
}

/** An item of a tab's right-click menu, by its name in `FileTabs.spellml`. */
function tabMenuItem(item: SpellMenuAction): JSX.Element {
  switch (item.name) {
    case "duplicateFile":
      return <Actions.duplicateFile menu />
    case "renameFile":
      return <Actions.renameFile menu />
    case "deleteFile":
      return <Actions.deleteFile menu />
    default:
      return null
  }
}

/** A file in `FileTabs.spellml`, as its compiled class has it. */
type TabFile = {
  path: string
  name: string
  icon: string
  status: "saved" | "changed"
  place: "chosen" | "other"
  /** Spell's `show it`, which the editor fills in. */
  show: () => void
}

/** The bar in `FileTabs.spellml`, as its compiled class has it. */
type FileTabBar = { files: { items: TabFile[]; getValues: () => TabFile[] }; more: { draw: () => JSX.Element } }
