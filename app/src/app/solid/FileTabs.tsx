import { createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import fileTabs from "spell/app/app/layout/FileTabs/FileTabs.spellml"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { FileDropdown, trackProjectFiles } from "./FileDropdown"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code:  the tabs themselves are Spell, `FileTabs.spellml`.
 * This is the editor's side of them, which Spell can't reach yet (epic `editor`'s Backing In Spell):
 * - which files there are, and which is showing (`trackProjectFiles()`), kept in the bar's files as they change
 * - what showing one does:  `editor.showEditor()`
 * - Narrower than two tabs and a button:  the file dropdown instead (`<FileDropdown>`), by a container query
 *   (`FileTabs.css`).
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
      setBar(() => new loaded.exports.FileTabBar() as FileTabBar)
    },
    // no tabs, but the dropdown's still a way round:  a person can go on
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
        file.status = each.isDirty ? "changed" : "saved"
        file.place = each.path === path ? "chosen" : "other"
        file.show = () => editor.showEditor(file.path)
        return file
      })
    }
  )

  return (
    <div class="FileTabs">
      {piece()?.draw(bar()) as JSX.Element}
      <ui-menu size="small" class="FileTabsNarrow" aria-label={appTexts.text("fileTabs")}>
        <FileDropdown />
      </ui-menu>
    </div>
  )
}

/** A file in `FileTabs.spellml`, as its compiled class has it. */
type TabFile = {
  path: string
  name: string
  status: "saved" | "changed"
  place: "chosen" | "other"
  /** Spell's `show it`, which the editor fills in. */
  show: () => void
}

/** The bar in `FileTabs.spellml`, as its compiled class has it. */
type FileTabBar = { files: { items: TabFile[]; getValues: () => TabFile[] } }
