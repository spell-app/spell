import { Show, createEffect, createSignal, onCleanup } from "solid-js"
import type { JSX } from "@solidjs/web"

import { Dragging } from "spell/util/Dragging"

import { editor } from "spell/app/app/editor"
import { loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import fileTabs from "spell/app/spaces/@spell/editor/file-tabs/FileTabs.spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { Actions } from "./Actions"
import { CodeMoreMenu } from "./CodeOutput"
import { SpellMenuRows, titled, type SpellMenuAction } from "./MenuBar"
import { fileIconFor } from "./chrome"
import { trackProjectFiles } from "./FileDropdown"
import { tracked } from "./tracked"

import "./FileTabs.css"

/****************
 * ### `<FileTabs>`
 * Every file of the project as a tab over the code:  the tabs themselves are Spell, `FileTabs.spell`.
 * This is the editor's side of them, which Spell can't reach yet (epic `editor`'s Backing In Spell):
 * - which files there are, and which is showing (`trackProjectFiles()`), kept in the bar's files as they change
 * - what showing one does:  `editor.showEditor()`
 * - the bar's ⋯ (`<CodeMoreMenu>`)
 * - what a tab's right-click menu's items do, and are called:  its items and their order are the Spell's `tab menu`
 * - Too many for the row, it scrolls;  too narrow for that, it's one dropdown (its `<ui-toolbar>`'s `scroll-first`).
 * - A tab dragged along the row moves its file there:  the project's file order, saved in its project file
 *   (`editor.moveFile()`;  Owen, epic `mockup`).
 * - More than eight files:  the ones opened lately, and a button listing every file (its `max-visible`),
 *   the same ones after a reload, per project (its `remember`).
 ****************/
export function FileTabs() {
  const state = trackProjectFiles()
  const drafted = tracked(() => editor.draftedFiles ?? [])
  const [piece, setPiece] = createSignal<LayoutPiece>()
  const [bar, setBar] = createSignal<FileTabBar>()
  let isGone = false
  onCleanup(() => (isGone = true))
  void loadLayoutPiece(fileTabs, "file-tabs").then(
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
    () => [bar(), state(), drafted()] as const,
    ([it, { files, path }, drafts]) => {
      if (!it) return
      it.rememberAs = `file-tabs:${editor.project?.path ?? ""}`
      const File = piece()!.exports.File as new () => TabFile
      const known = new Map(it.files.getValues().map((file) => [file.path, file]))
      it.files.items = files.map((each) => {
        const file = known.get(each.path) ?? new File()
        file.path = each.path
        file.name = each.name
        file.icon = fileIconFor(each.path)
        // not saved beats a draft:  the dot, else the ring (epic `editor` I44)
        file.status = each.isDirty ? "changed" : drafts.includes(each.path) ? "drafted" : "saved"
        file.place = each.path === path ? "chosen" : "other"
        file.show = () => editor.showEditor(file.path)
        return file
      })
    }
  )

  /** The tab `event` happened on, and its file. */
  const tabOf = (event: Event) => {
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

  // a right click on a tab:  that file shown, and what can be done to it
  const [menuAt, setMenuAt] = createSignal<{ x: number; y: number }>()
  const openMenu = (event: MouseEvent) => {
    const file = tabOf(event)?.file
    if (!file) return
    event.preventDefault()
    editor.showEditor(file.path)
    setMenuAt({ x: event.clientX, y: event.clientY })
  }
  return (
    <div class="FileTabs" onContextMenu={openMenu} onPointerDown={startDrag}>
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
              <ui-menu direction="vertical" size="small" interactive="" icon-column="" class="BarMenuItems">
                <SpellMenuRows items={tabMenu(piece()!, bar()!)} itemFor={tabMenuItem} />
              </ui-menu>
            </div>
          </ui-popup>
        )}
      </Show>
    </div>
  )
}

/****************
 * ### `<YourDraftNote>`
 * "Your draft", with Discard beside it, under the file tabs while the file showing is your draft (epic `mockup` P20).
 * - A sibling of `<FileTabs>`, never inside it:  the tabs' box is the bar's height, and clips what's below.
 ****************/
export function YourDraftNote() {
  const state = trackProjectFiles()
  const drafted = tracked(() => editor.draftedFiles ?? [])
  const showsDraft = () => {
    const { path } = state()
    return !!path && drafted().includes(path)
  }
  return (
    <Show when={showsDraft()}>
      <div class="YourDraft" title={appTexts.text("yourDraftTip")}>
        <ui-label size="small" color="yellow" appearance="basic">
          {appTexts.text("yourDraft")}
        </ui-label>
        <ui-button size="mini" appearance="basic" onClick={() => void editor.discardChanges()}>
          {appTexts.text("discard")}
        </ui-button>
      </div>
    </Show>
  )
}

/** The tab menu's items, `FileTabs.spell`'s `tab menu` on `bar`, their titles in the page's language. */
function tabMenu(piece: LayoutPiece, bar: object) {
  piece.useTitles(appTexts.titles)
  return piece.menu(bar, "tab menu")
}

/** An item of a tab's right-click menu, by its name in `FileTabs.spell`:  its title the Spell's. */
function tabMenuItem(item: SpellMenuAction): JSX.Element {
  switch (item.name) {
    case "duplicateFile":
      return <Actions.duplicateFile {...titled(item)} />
    case "renameFile":
      return <Actions.renameFile {...titled(item)} />
    case "deleteFile":
      return <Actions.deleteFile {...titled(item)} />
    default:
      return null
  }
}

/** A file in `FileTabs.spell`, as its compiled class has it. */
type TabFile = {
  path: string
  name: string
  icon: string
  status: "saved" | "changed" | "drafted"
  place: "chosen" | "other"
  /** Spell's `show it`, which the editor fills in. */
  show: () => void
}

/** The bar in `FileTabs.spell`, as its compiled class has it. */
type FileTabBar = {
  files: { items: TabFile[]; getValues: () => TabFile[] }
  more: { draw: () => JSX.Element }
  rememberAs: string
}

/** On a tab being dragged. */
const DRAGGED = "dragged"
/** On the tab a dragged one would land beside:  `before` or `after` it. */
const DROP_MARK = "drop"
