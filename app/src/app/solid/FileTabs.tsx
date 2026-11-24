import { createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import type { E } from "spell/element"
import { SP } from "spell/parser/spell"
import type { UIToolbar } from "spell/ui/components/ui-toolbar"

import { editor } from "spell/app/app/editor"
import { SiteEdits } from "spell/app/app/pages/SiteEdits"
import type { EditorSpell } from "spell/app/app/layout/layoutSpell"
import type { EditorThing } from "spell/app/app/layout/editorNames"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { editorSpellWithActions } from "./MenuBar"
import { fileIconFor } from "./chrome"
import { CodeShown } from "./EditorMode"
import { tracked } from "./tracked"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code:  the tabs themselves are Spell, the `file tab bar` of
 * `SpellEditor.spell` (epic `editor` P29).
 * This is the editor's side of them, which Spell can't reach yet (epic `editor`'s Backing In Spell):
 * - which files there are, and which is showing (`trackProjectFiles()`), kept in the bar's files as they change
 * - what showing one does:  `editor.showEditor()`
 * - a drafted file's pen's tip, in the page's language:  "Updated in your draft.", and its link, Discard changes,
 *   which discards THAT file's draft (`editor.discardDraftOf()`;  epic `editor` I92)
 * - A tab's right-click menu is the Spell's too, a `<context-menu>` inside each tab:
 *   Duplicate, Rename, Delete, the app's actions, which the editor does (`editorSpellWithActions()`);
 *   the page's right click on the bar finds it.
 *   - The right click shows that file first, so its actions are about it.
 * - Too many for the row, it scrolls, however narrow:  never one dropdown (its `<ui-toolbar>`'s `scroll-only`).
 * - A tab dragged along the row moves its file there (its `<ui-toolbar>`'s `reorderable`, `ui-item-dropped`):
 *   the project's file order, saved in its project file (`editor.moveFile()`;  Owen, epic `mockup`).
 * - A button listing every file, at the bar's right end, while some files aren't tabs you can see:
 *   put away, or scrolled out of the row (its `max-visible`, `all-items-at-end`;  epic `editor` T82, T83);
 *   a file icon before its caret (`all-items-icon`, epic `editor` T76:  "The `More` dropdown is too subtle").
 * - A ✕ at the bar's far right hides the code, as the top bar's code icon does (`CodeShown`;  epic `editor` T83:
 *   "Add a close `x` to the far right of the file menu which hides the panel"):  its panel's own `closable`,
 *   heard here as `ui-dismissed` (T145).
 * - More than eight files:  the ones opened lately (its `max-visible`), the same ones after a reload,
 *   per project (its `remember`).
 *   - Then a tab's ✕, a middle click or Delete closes it (epic `editor` T77):  its `<ui-item closable="when-limited">`,
 *     the ✕ in the tab's file icon's place while it's hovered, taking no room of its own (T82, T145).
 *     The toolbar takes it out of the row, and the list still has it.
 *     Closing the chosen tab chooses its neighbour, which shows its file.
 *   - No key closes one:  ⌘W is the browser's, closing the page's own tab.
 *   - A site's own file (`Dashboard.site.spell`, `SiteEdits.isRoutingOnly()`) is always a tab, beside the file
 *     showing (epic `editor` I188:  "have the `.site.spell` file open and the 'more files' button on the right").
 * - SEE:  its page in App UI's guide, `/components/app/file-tabs`.
 ****************/
export function FileTabs() {
  const state = trackProjectFiles()
  const drafted = tracked(() => editor.draftedFiles ?? [])
  const [spell, setSpell] = createSignal<EditorSpell>()
  const [bar, setBar] = createSignal<FileTabBar>()
  let isGone = false
  onCleanup(() => (isGone = true))
  void editorSpellWithActions().then(
    (loaded) => {
      if (isGone) return
      const made = loaded.editor.fileTabBar as unknown as FileTabBar | undefined
      // the Spell without its file tab bar (renamed):  no tabs, and the load's notice says why
      if (!made) return
      setSpell(() => loaded)
      setBar(() => made)
    },
    // no tabs:  the code still shows, and File > Open is a way round
    (problem: unknown) => console.error("<FileTabs>:  can't load its Spell", problem)
  )

  const tipWords = tracked(() => ({
    note: appTexts.text("updatedInYourDraft"),
    discard: appTexts.text("discardChanges"),
    hide: appTexts.text("hideCode")
  }))

  createEffect(
    () => [bar(), state(), drafted(), spell(), tipWords()] as const,
    ([it, { files, path }, drafts, loaded, words]) => {
      if (!it || !loaded) return
      it.rememberAs = `file-tabs:${editor.project?.path ?? ""}`
      it.hideWords = words.hide
      const File = loaded.exports.File as new () => TabFile
      const known = new Map(it.files.getValues().map((file) => [file.path, file]))
      it.files.items = files.map((each) => {
        const file = known.get(each.path) ?? new File()
        file.path = each.path
        file.name = each.name
        file.icon = fileIconFor(each.path)
        // not saved beats a draft:  the dot, else the ring (epic `editor` I44)
        file.status = each.isDirty ? "changed" : drafts.includes(each.path) ? "drafted" : "saved"
        file.place = each.path === path ? "chosen" : "other"
        file.draftNote = words.note
        file.discardWords = words.discard
        // a click in the tab's tip (Discard changes) is its own:  it doesn't show the tab's file too
        file.show = () => {
          if (!clickedInTip) editor.showEditor(file.path)
        }
        file.discard = () => void editor.discardDraftOf(file.path)
        return file
      })
      // a site's own file always a tab, once the tabs are drawn (I188)
      const site = files.find((each) => SiteEdits.isRoutingOnly(each.path))
      if (site) requestAnimationFrame(() => keepTab(site.path))
    }
  )

  /** The bar's toolbar, holding the tabs:  in the view's shadow root, once drawn. */
  let tabRow: () => Element | undefined = () => undefined

  /** Keep the tab of the file at `path` in the row, without showing it (`UIToolbar.openItem()`). */
  const keepTab = (path: string) => {
    const row = tabRow()
    const files = bar()?.files.getValues() ?? []
    const tabs = row ? [...row.children].filter((each) => each.localName === "ui-item") : []
    const tab = tabs[files.findIndex((each) => each.path === path)]
    const toolbar = (row as E.DOMElement | undefined)?.component as UIToolbar | undefined
    if (tab) toolbar?.openItem(tab)
  }

  /**
   * Was the click going on now in a tab's tip (`<ui-popup>`), not the tab itself?
   * Noted as it starts down the page.
   * - It's inside the tab, so its click reaches it:  it neither shows the tab's file nor chooses the tab.
   */
  let clickedInTip = false
  const noteClick = (event: MouseEvent) => {
    clickedInTip = isInTip(event)
  }
  /** The bar choosing a tab (its `ui-choosing`) for a click in its tip:  it doesn't. */
  const keepChoice = (event: Event) => {
    const { originalEvent } = (event as CustomEvent<{ originalEvent?: Event }>).detail ?? {}
    if (originalEvent && isInTip(originalEvent)) event.preventDefault()
  }

  /** The tab `event` happened on, and its file;  none for an event in a tab's tip. */
  const tabOf = (event: Event) => {
    if (isInTip(event)) return undefined
    const tab = event.composedPath().find((at) => (at as Element).localName === "ui-item") as HTMLElement | undefined
    if (!tab?.parentElement) return undefined
    // by its place among the TABS, the bar's only items (its ⋯ sat among them until epic `editor` T76;  T50)
    const tabs = [...tab.parentElement.children].filter((each) => each.localName === "ui-item") as HTMLElement[]
    const files = bar()?.files.getValues() ?? []
    const file = files[tabs.indexOf(tab)]
    return file && { tab, tabs, files, file }
  }

  // a tab dragged along the row (`reorderable`):  its file moves to where it's dropped
  const moveDropped = (event: CustomEvent<{ item: Element; target: Element }>) => {
    const { item, target } = event.detail
    const tabs = [...item.parentElement!.children].filter((each) => each.localName === "ui-item")
    const files = bar()?.files.getValues() ?? []
    const [file, landed] = [files[tabs.indexOf(item)], files[tabs.indexOf(target)]]
    if (file && landed) void editor.moveFile(file.path, landed.path)
  }

  // a right click on a tab:  that file shown, so the Spell's menu there (its `<context-menu>`) is about it
  const showTabFile = (event: MouseEvent) => {
    const file = tabOf(event)?.file
    if (file) editor.showEditor(file.path)
  }

  return (
    <div
      class="FileTabs"
      ref={(div) => {
        div.addEventListener("click", noteClick, { capture: true })
        div.addEventListener("ui-choosing", keepChoice)
        div.addEventListener("ui-item-dropped", moveDropped as EventListener)
        // the bar's ✕, its panel's own (`closable`):  the code's column hides, as the top bar's code icon hides it (T83)
        div.addEventListener("ui-dismissed", () => CodeShown.set(editor.project?.path, false))
        tabRow = () => div.querySelector(":scope > :not(ui-menu)")?.shadowRoot?.querySelector("ui-toolbar") ?? undefined
      }}
      onContextMenu={showTabFile}
    >
      {(() => {
        const loaded = spell()
        if (!loaded) return null
        loaded.useTitles(appTexts.titles)
        return loaded.draw(bar()) as JSX.Element
      })()}
    </div>
  )
}

/** A `file` of `SpellEditor.spell`, as its compiled class has it:  its names `EDITOR_NAMES`' `File`. */
type TabFile = EditorThing<
  "File",
  {
    path: string
    name: string
    icon: string
    status: "saved" | "changed" | "drafted"
    place: "chosen" | "other"
    /** What its pen's tip says:  "Updated in your draft.", in the page's language. */
    draftNote: string
    /** Its tip's link:  "Discard changes", in the page's language. */
    discardWords: string
    /** Spell's `show it`, which the editor fills in. */
    show: () => void
    /** Spell's `discard it`, its tip's link:  your draft of it goes (`editor.discardDraftOf()`). */
    discard: () => void
  }
>

/** The `file tab bar` of `SpellEditor.spell`, as its compiled class has it:  its names `EDITOR_NAMES`' `FileTabBar`. */
type FileTabBar = EditorThing<
  "FileTabBar",
  {
    files: { items: TabFile[]; getValues: () => TabFile[] }
    /** The code pane's ⋯, an editor part (`EditorSpell.parts()`). */
    more: object
    rememberAs: string
    /** The ✕'s tooltip:  "Hide the code", in the page's language. */
    hideWords: string
  }
>

/** Is `event` in a tab's tip, the `<ui-popup>` by its pen? */
function isInTip(event: Event): boolean {
  return event.composedPath().some((at) => (at as Element).localName === "ui-popup")
}

/** What `<FileTabs>` shows of `editor`'s project:  its files, and the one shown. */
export type ProjectFilesState = {
  /** The project's loaded, and a file of it is shown. */
  ready: boolean
  /** The path of the file shown;  `""` before there's one. */
  path: string
  /** Every file, in the project's order. */
  files: ProjectFileRow[]
}

/** One file of `ProjectFilesState`. */
export type ProjectFileRow = {
  /** its address, as `editor.file.path` */
  path: string
  /** what a list of the whole project calls it:  `Card.spell`;  in a folder, `Button/Usage` */
  name: string
  /** the folder it's in, inside the project:  `Button`;  `""` for one at its top */
  folder: string
  /** what its folder's list calls it:  `Usage`;  at the project's top, its `name` */
  nameInFolder: string
  /** Has changes not saved. */
  isDirty: boolean
}

/**
 * `editor`'s project's files and the one shown, read in one go through `tracked()`.
 * - A file the project doesn't import (an extra file beside its imports) is listed after its imports, by its name.
 * - Call in a component body:  `tracked()` goes with the component.
 */
export function trackProjectFiles(): () => ProjectFilesState {
  return tracked(() => {
    const { project, file } = editor
    const ready = !!project?.isLoaded && !!file
    const files = ready
      ? project.imports.map(({ path, location, file: each }) => fileRowFor(path, location, each.isDirty))
      : []
    if (ready && !files.some((each) => each.path === file.path))
      files.push(fileRowFor(file.path, file.location, file.isDirty))
    return { ready, path: file?.path ?? "", files }
  })
}

/**
 * The row for the file at `path`, `location` its place.
 * - A file in a folder drops its spell ending, so its folder can name it:  `Button/Usage`, for `Button/Usage.spell`.
 *   Any other ending stays:  `Button/styles.css`.
 * - At the project's top it keeps its whole name, as `Card.spell`;  another project's import, its address.
 */
function fileRowFor(
  path: string,
  location: Pick<SP.SpellLocation, "file" | "folder">,
  isDirty: boolean
): ProjectFileRow {
  const name = location.file ?? path
  const folder = location.folder?.replace(/^\/|\/$/g, "") ?? ""
  if (!folder) return { path, name, folder, nameInFolder: name, isDirty }
  const nameInFolder = name.endsWith(SP.SPELL_SUFFIX) ? name.slice(0, -SP.SPELL_SUFFIX.length) : name
  return { path, name: `${folder}/${nameInFolder}`, folder, nameInFolder, isDirty }
}
