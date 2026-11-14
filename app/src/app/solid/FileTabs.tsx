import { createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import { Dragging } from "spell/util/Dragging"

import { editor } from "spell/app/app/editor"
import type { EditorSpell } from "spell/app/app/layout/layoutSpell"
import type { EditorThing } from "spell/app/app/layout/editorNames"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { CodeMoreMenu } from "./CodeOutput"
import { editorSpellWithActions } from "./MenuBar"
import { fileIconFor } from "./chrome"
import { trackProjectFiles } from "./FileDropdown"
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
 * - the bar's ⋯ (`<CodeMoreMenu>`)
 * - A tab's right-click menu is the Spell's too, a `<context-menu>` inside each tab:  Duplicate, Rename, Delete,
 *   the app's actions, which the editor does (`editorSpellWithActions()`);  the page's right click on the bar finds it.
 *   - The right click shows that file first, so its actions are about it.
 * - Too many for the row, it scrolls;  too narrow for that, it's one dropdown (its `<ui-toolbar>`'s `scroll-first`).
 * - A tab dragged along the row moves its file there:  the project's file order, saved in its project file
 *   (`editor.moveFile()`;  Owen, epic `mockup`).
 * - More than eight files:  the ones opened lately, and a button listing every file (its `max-visible`),
 *   the same ones after a reload, per project (its `remember`).
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
      Object.assign(made, loaded.parts({ more: { draw: () => <CodeMoreMenu /> } }))
      setBar(() => made)
    },
    // no tabs:  the code still shows, and File > Open is a way round
    (problem: unknown) => console.error("<FileTabs>:  can't load its Spell", problem)
  )

  const tipWords = tracked(() => ({
    note: appTexts.text("updatedInYourDraft"),
    discard: appTexts.text("discardChanges")
  }))

  createEffect(
    () => [bar(), state(), drafted(), spell(), tipWords()] as const,
    ([it, { files, path }, drafts, loaded, words]) => {
      if (!it || !loaded) return
      it.rememberAs = `file-tabs:${editor.project?.path ?? ""}`
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
        // a click in the tab's tip (Discard changes) is the tip's alone:  it doesn't show the tab's file too
        file.show = () => {
          if (!clickedInTip) editor.showEditor(file.path)
        }
        file.discard = () => void editor.discardDraftOf(file.path)
        return file
      })
    }
  )

  /**
   * Was the click going on now in a tab's tip (`<ui-popup>`), not the tab itself?  Noted as it starts down the page.
   * - The tip is inside its tab, so its click reaches the tab:  it neither shows the tab's file nor chooses the tab.
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
    // by its place among the TABS:  the bar's ⋯ (a `<ui-dropdown>`) sits among them too (epic `editor` T50)
    const tabs = [...tab.parentElement.children].filter((each) => each.localName === "ui-item") as HTMLElement[]
    const files = bar()?.files.getValues() ?? []
    const file = files[tabs.indexOf(tab)]
    return file && { tab, tabs, files, file }
  }

  // a tab dragged along the row:  its file moves to where it's dropped
  const startDrag = (event: PointerEvent) => {
    const pressed = event.button === 0 && tabOf(event)
    if (!pressed) return
    const { tab, tabs, files, file } = pressed
    const from = tabs.indexOf(tab)
    let target: { tab: HTMLElement; file: TabFile } | undefined
    const mark = (next: typeof target) => {
      target?.tab.removeAttribute(DROP_MARK)
      target = next
      if (target) target.tab.setAttribute(DROP_MARK, tabs.indexOf(target.tab) > from ? "after" : "before")
    }
    new Dragging(tab, event, {
      carried: [tab],
      follows: false,
      placing: (x) => {
        tab.setAttribute(DRAGGED, "")
        // the tab under the pointer, among those showing (the ones over the row's limit aren't drawn)
        const over = tabs.findIndex((each) => {
          // a `<ui-item>` draws in its shadow, its own box empty
          const box = (each.shadowRoot?.querySelector("[part~='item']") ?? each).getBoundingClientRect()
          return box.width > 0 && x >= box.left && x < box.right
        })
        mark(over < 0 || over === from ? undefined : { tab: tabs[over], file: files[over] })
      },
      onDrop: () => {
        const landed = target
        mark(undefined)
        tab.removeAttribute(DRAGGED)
        if (landed) void editor.moveFile(file.path, landed.file.path)
      },
      onCancel: () => {
        mark(undefined)
        tab.removeAttribute(DRAGGED)
      }
    })
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
      }}
      onContextMenu={showTabFile}
      onPointerDown={startDrag}
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
  }
>

/** Is `event` in a tab's tip, the `<ui-popup>` by its pen? */
function isInTip(event: Event): boolean {
  return event.composedPath().some((at) => (at as Element).localName === "ui-popup")
}

/** On a tab being dragged. */
const DRAGGED = "dragged"
/** On the tab a dragged one would land beside:  `before` or `after` it. */
const DROP_MARK = "drop"
