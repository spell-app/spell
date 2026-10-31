import { createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import fileTabs from "spell/app/app/layout/FileTabs/FileTabs.spellml"
import { fileIconFor } from "./chrome"
import { trackProjectFiles } from "./FileDropdown"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code:  the tabs themselves are Spell, `FileTabs.spellml`.
 * This is the editor's side of them, which Spell can't reach yet (epic `editor`'s Backing In Spell):
 * - which files there are, and which is showing (`trackProjectFiles()`), kept in the bar's files as they change
 * - what showing one does:  `editor.showEditor()`
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
      setBar(() => new loaded.exports.FileTabBar() as FileTabBar)
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

  return <div class="FileTabs">{piece()?.draw(bar()) as JSX.Element}</div>
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
type FileTabBar = { files: { items: TabFile[]; getValues: () => TabFile[] } }
