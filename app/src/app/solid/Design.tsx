import { For, Show, createEffect, createMemo, createSignal, onSettled, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { setDebugGlobal } from "spell/util"
import { SP } from "spell/parser/spell"
import { editor, runtimeCore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { SiteEdits, type SitePart } from "spell/app/app/pages/SiteEdits"
import { SiteWrites } from "spell/app/app/pages/SiteWrites"
import { runSite } from "spell/app/app/pages/RunSite"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import { MenuHeader } from "./chrome"
import { DESIGNED, Inspector, OwnEditorPage, SCALED_UP } from "./Inspector"
import { Palette, type OwnView } from "./Palette"

import "./Design.css"

/****************
 * ### `Design`
 * The editor's Design mode (epic `editor` P37;  Q58, Q59, Q60, Q63, Q64):  pick a bit of a view, or a site's page,
 * and see it large on its own, to drag parts into it.
 * - Its tab is in the top bar, Run | Edit | Design | Site;  its address `/design/<file>` (`editor.isDesigning`).
 * - The bits, down the left of the app pane (`<DesignStage>`):
 *   - each `to draw ...` of the open file's view:  `to draw its front`, `to draw its back`
 *   - the view's property editor, when it has one (`Card.editor.spell`)
 *   - a site's pages, and the project's other views, which open their own files here
 * - What it shows first (Q63):  the bit the code's cursor is in;  else the one last picked for the file;
 *   else the view's first drawing.
 * - Plain state here;  `<DesignStage>` draws it in the app pane.
 * - It took the place of Card alone (`ViewAlone`, epic `editor` P35, T116), which showed the card itself when
 *   Owen wanted its property editor.
 ****************/
export class Design {
  /** Is the editor page in Design (reactive)? */
  static get isShowing(): boolean {
    return editor.isDesigning && editor.projectPage === "editor"
  }

  /** Has the project something to design (reactive):  a view of its own, or a site's pages?  Its tab shows then. */
  static get canShow(): boolean {
    return Palette.ownViews.length > 0 || !!SiteWrites.siteFile()
  }

  /** Show `path` (default:  the open file) in Design. */
  static show(path?: string): void {
    editor.showEditor(path, undefined, "design")
  }

  /**
   * Show site page `name` in Design, its own file open, so the app draws it (Q64 A):  Site's page form's Design.
   * - NEVER throws:  a page no file declares yet opens as Site's Open in Edit does, making its file.
   */
  static showPage(name: string): void {
    const file = SiteWrites.declaringFile(name)
    if (!file) return void SiteWrites.openPart(name).catch(editor.showError)
    remember(file.path, `page:${name}`)
    Design.show(file.path)
  }

  /**
   * The view the open file writes (reactive):  the one named like the file (`Card.spell`'s card), else its first;
   * `undefined` for a file that writes none, or off the editor page.
   */
  static get view(): OwnView | undefined {
    const file = editor.file
    if (!file || editor.projectPage !== "editor") return undefined
    const name = file.path.split("/").at(-1) ?? ""
    const own = Palette.ownViews.filter((view) => view.file === name)
    const named = name.split(".")[0]!.toLowerCase()
    return own.find((view) => view.classNames[0]!.toLowerCase() === named) ?? own[0]
  }

  /** The open view's drawings, each `to draw ...` of its type in its file, in order (reactive). */
  static get drawings(): DesignBit[] {
    const view = Design.view
    if (!view) return []
    return drawingsIn(editor.file?.contents ?? "", view)
  }

  /** The site's pages, in its order (reactive):  none for a project that isn't a site. */
  static get pages(): DesignBit[] {
    const parts = SiteWrites.parts() ?? []
    return SiteEdits.allParts(parts)
      .filter((part) => part.kind === "page")
      .map((part) => ({
        kind: "page",
        key: `page:${part.name}`,
        label: pageTitleOf(part),
        name: part.name,
        address: part.address
      }))
  }

  /** The project's views but the open file's, each opening its own file here (reactive). */
  static get otherViews(): OwnView[] {
    const view = Design.view
    return Palette.ownViews.filter((each) => each.file !== view?.file)
  }

  /**
   * The bit showing (reactive), as Q63 says:  the one picked for the open file, which the code's cursor picks as it
   * moves into a drawing;  else the view's first drawing.
   * - A page picked for the file (`showPage()`);  a site's page file:  its page.
   * - `editor` (its property editor) is picked only while the view has one (`<DesignStage>` knows).
   */
  static get picked(): DesignBit | undefined {
    const path = editor.file?.path
    const drawings = Design.drawings
    const key = path ? pickedKeys()[path] : undefined
    if (key === EDITOR_KEY && drawings.length) return EDITOR_BIT
    // a page picked, in a file that writes a view too:  the site's file, say
    const page = key?.startsWith("page:") ? Design.pages.find((each) => each.key === key) : undefined
    if (page) return page
    const found = drawings.find((bit) => bit.key === key)
    if (found ?? drawings[0]) return found ?? drawings[0]
    return Design.pages.find((page) => path && SiteWrites.declaringFile(page.name!)?.path === path)
  }

  /**
   * The drawing the code's cursor is in, in the open file (reactive):  `undefined` while it's in none.
   * - Lines from 0, as `editor.followed` has them.
   */
  static get atCursor(): DesignBit | undefined {
    const followed = editor.followed
    const file = editor.file
    if (!followed || !(file instanceof SP.SpellFile)) return undefined
    if (followed.path !== SP.SpellProject.sourceNameOf(file.path)) return undefined
    return Design.drawings.find(({ lines }) => lines && followed.line >= lines.start && followed.line <= lines.end)
  }

  /** Show `bit`:  one of the open view's, remembered for its file;  a page or another view opens its file. */
  static pick(bit: DesignBit): void {
    if (bit.kind === "page") return Design.showPage(bit.name!)
    if (bit.kind === "view") return Design.show(fileOfView(bit.name!))
    const path = editor.file?.path
    if (path) remember(path, bit.key)
  }
}

setDebugGlobal({ Design })

/** One bit Design can show, a row of its picker. */
export type DesignBit = {
  /**
   * What it is:
   * - `drawing`:  one `to draw ...` of the open view
   * - `editor`:  the view's property editor
   * - `page`:  a site's page, drawn by the app
   * - `view`:  another of the project's views:  picking it opens its file
   */
  kind: "drawing" | "editor" | "page" | "view"
  /** Who it is, the same each time, remembered for its file:  `drawing:to draw its front`, `editor`, `page:films page`. */
  key: string
  /** What its row says:  `Front`, `Property editor`, `Films`. */
  label: string
  /** A drawing:  its line as written, `to draw its front`, its row's tooltip. */
  written?: string
  /** A drawing:  its lines in its file, from 0, its first line and its last. */
  lines?: { start: number; end: number }
  /** A drawing of a two sided view's side:  `front` turns it face up, `back` face down. */
  side?: string
  /** A page's name (`films page`);  a view's type (`Card`). */
  name?: string
  /** A page's address in its site:  `/films/:film`. */
  address?: string
}

/** The property editor's key and row. */
const EDITOR_KEY = "editor"
const EDITOR_BIT: DesignBit = { kind: "editor", key: EDITOR_KEY, label: "" }

/** The pref remembering the bit picked for each file, by its path:  `{ "@spell/.../Card.spell": "editor" }`. */
const PICKED_PREF = "designPicked"
editorPrefs.declare(PICKED_PREF, { type: "object", default: {} })
// Card alone's, from epic `editor` P35:  gone with it
editorPrefs.forget("viewAlone")

/** The bit picked for each file, by its path (`PICKED_PREF`). */
const [pickedKeys, setPickedKeys] = createSignal<Readonly<Record<string, string>>>(
  (editorPrefs.get(PICKED_PREF) as Record<string, string> | undefined) ?? {}
)

/** Remember `key` as the bit picked for the file at `path`. */
function remember(path: string, key: string): void {
  const keys = { ...pickedKeys(), [path]: key }
  setPickedKeys(keys)
  editorPrefs.set(PICKED_PREF, keys)
}

/** The file `view` (a type's name) is written in, by its path in the project. */
function fileOfView(typeName: string): string | undefined {
  const view = Palette.ownViews.find((each) => each.classNames[0] === typeName)
  const project = editor.project
  return view && project?.files.find((file) => file.path.split("/").at(-1) === view.file)?.path
}

/** A page's row:  its title, else its name. */
function pageTitleOf(part: SitePart): string {
  return part.title ?? part.name
}

/**
 * The drawings of `view` in its file's `text`:  each `to draw ...` line of its type's block, with the lines under it.
 * - Its type's block:  from the top-level line naming it (`a "card" is a ...`) to the next top-level line;
 *   no such line, every `to draw ...` in the file.
 * - Read from the text, as the site's parts are (`SiteEdits`):  English only, as the palette's views are.
 */
function drawingsIn(text: string, view: OwnView): DesignBit[] {
  const lines = text.split("\n")
  const words = view.snippet.replace(/^\{draw an? new (.*)\}$/, "$1")
  const typeLine = new RegExp(`^(?:an?\\s+)?"?${escapeRegExp(words)}"?\\s+(?:\\(.*\\)\\s+)?is\\b`, "i")
  const isTop = (line: string) => /^\S/.test(line) && !/^(?:#|--|\/\/)/.test(line)
  const start = lines.findIndex((line) => isTop(line) && typeLine.test(line))
  const end = start < 0 ? lines.length : lines.findIndex((line, at) => at > start && isTop(line))
  const isTwoSided = view.classNames.includes(TWO_SIDED)
  const found: DesignBit[] = []
  for (let at = Math.max(start, 0); at < (end < 0 ? lines.length : end); at++) {
    const match = DRAW_LINE.exec(lines[at]!)
    if (!match) continue
    const indent = match[1]!.length
    let last = at
    for (let next = at + 1; next < lines.length; next++) {
      const line = lines[next]!
      if (!line.trim()) continue
      if (/^\s*/.exec(line)![0].length <= indent) break
      last = next
    }
    const written = `to draw ${match[2]!.trim()}`
    const side = /^its\s+(\w+)$/.exec(match[2]!.trim())?.[1]
    found.push({
      kind: "drawing",
      key: `drawing:${written}`,
      label: side ? upperFirst(side) : appTexts.text("designDrawing"),
      written,
      lines: { start: at, end: last },
      side: isTwoSided ? side : undefined,
      name: view.classNames[0]
    })
  }
  return found
}

/** A drawing's line:  its indent, then what it draws, `its front`;  any comment after it left out. */
const DRAW_LINE = /^(\s+)to draw\s+(.*?)\s*:?\s*(?:--.*|\/\/.*)?$/

/** The built-in a view with a front and a back extends. */
const TWO_SIDED = "TwoSidedView"

/** `words` with its first letter a capital. */
function upperFirst(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** `text` matching itself in a regular expression. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/****************
 * ### `<DesignStage>`
 * Design, in the app pane:  its picker down the left, the bit picked drawn large beside it.
 * - A drawing:  one thing of the view, drawn on its own, large, scaled to fit (`<FitInside>`), face up for its
 *   front and down for its back (Q59 A).
 * - The property editor:  drawn large, as the Inspector draws it (`<OwnEditorPage>`), the thing drawn small beside it,
 *   drawn again as it changes (Q58 C).
 * - A site's page:  the app itself, showing that page, as its own links would (`runSite`;  Q64 A);
 *   a page whose address takes a value shows the first one, `/films/1` for `/films/:film`.
 * - Drawn on the programs' runtime, as the editor's zones are (`runtimeCore()`):  a live edit draws it again in place,
 *   and the Inspector's changes to its thing redraw it.
 * - Its thing:  a new one, made with the settings of the one selected in the app, else with its starting values;
 *   never added to the app, so the game never sees it.  A new one again when the app restarts.
 * - The thing is selected in the Inspector as it's drawn, so its settings can be changed there.
 * - Its own drawing and its editor's elements are the Inspector's parts (`DESIGNED`, `<OwnEditorPage>`):
 *   the palette's drops and clicks, moves, cut, copy and paste write into the view's file and its editor's.
 * - `program`:  the app's own drawing, hidden while a view's bit shows, and none of the Inspector's parts (`EDITOR_OWN`).
 ****************/
export function DesignStage(props: { program: () => HTMLElement | undefined }): JSX.Element {
  const picked = createMemo(() => (Design.isShowing ? Design.picked : undefined))
  const showsView = createMemo(() => Design.isShowing && picked()?.kind !== "page")
  createEffect(showsView, (isHidden) => {
    props.program()?.toggleAttribute(EDITOR_OWN, isHidden)
  })
  // the code's cursor moving into a drawing picks it (Q63 B)
  const atCursor = createMemo(() => (Design.isShowing ? Design.atCursor?.key : undefined))
  createEffect(atCursor, (key) => {
    const bit = key && untrack(() => Design.drawings.find((each) => each.key === key))
    if (bit) Design.pick(bit)
  })
  // a page picked:  the running site shows it, as its own links would (Q64 A)
  const pageAddress = createMemo(() => {
    const bit = picked()
    if (bit?.kind !== "page" || !bit.address || !editor.isRunningSite) return undefined
    return `${addressToShow(bit.address)}#${editor.programRuns}`
  })
  createEffect(pageAddress, (shown) => {
    if (shown) runSite.heard(shown.replace(/#\d+$/, ""))
  })
  const [thing, setThing] = createSignal<object>()
  createEffect(
    () => ({
      className: showsView() ? Design.view?.classNames[0] : undefined,
      // the property editor's card, beside it, face up too (Q59 A)
      side: picked()?.side ?? (Design.view?.classNames.includes(TWO_SIDED) ? "front" : undefined),
      runs: editor.programRuns,
      core: runtimeCore()
    }),
    ({ className, side, core }) => {
      setThing(() => (className && core ? untrack(() => thingFor(className, side, core)) : undefined))
    }
  )
  const drawn = createMemo(() => {
    const shown = thing()
    const core = runtimeCore()
    if (!shown || !core) return undefined
    const element = untrack(() => core.drawThing(shown)) as unknown as Element | null
    element?.setAttribute(DESIGNED, "")
    return element ?? undefined
  })
  const hasEditor = createMemo(() => {
    void editor.edits
    const shown = thing()
    return !!shown && !!Inspector.ownEditorOf(shown)
  })
  // selected as it's drawn:  the Inspector changes its thing
  createEffect(drawn, (element) => {
    if (element) requestAnimationFrame(() => element.isConnected && Inspector.select(element))
  })
  const isEditorPicked = () => picked()?.kind === "editor" && hasEditor()
  return (
    <Show when={Design.isShowing}>
      <div class={["DesignStage", { page: !showsView() }]}>
        <DesignPicker picked={picked()} hasEditor={hasEditor()} />
        <Show when={showsView()}>
          <div class={["DesignCanvas", { editing: isEditorPicked() }]}>
            <Show
              when={Design.view && drawn()}
              fallback={<p class="DesignWaiting">{appTexts.text(Design.view ? "designWaiting" : "designNothing")}</p>}
            >
              {(element) => (
                <>
                  <Show when={isEditorPicked()}>
                    <div class="DesignEditor">
                      <OwnEditorPage element={element()} thing={thing()!} />
                    </div>
                  </Show>
                  {/* the same box either way:  the drawing never moves to another, so it's never out of the page */}
                  <div class="DesignDrawing">
                    <FitInside>
                      <div class="DesignView">{element()}</div>
                    </FitInside>
                  </div>
                </>
              )}
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}

/**
 * The address to show a page at:  its own, each value it takes filled with `1`, its first record's in most places.
 * - `/films/:film` => `/films/1`
 */
function addressToShow(address: string): string {
  return address.replace(/:[^/]+/g, "1")
}

/** The running program's core, as far as the stage uses it. */
type StageCore = NonNullable<ReturnType<typeof runtimeCore>>

/**
 * A thing of class `className` for Design to draw:  a new one, made with the settings of the one selected in the app,
 * else its starting values;  put in nothing, so the game never sees it.
 * - `side`:  a two sided view's, `front` face up, `back` face down.
 * - `undefined` while the program has no such class.
 */
function thingFor(className: string, side: string | undefined, core: StageCore): object | undefined {
  const Class = core.things.classNamed(className) as (new (settings?: Record<string, unknown>) => object) | undefined
  if (!Class) return undefined
  const selected = Inspector.allSelected
    .map((part) => part.element && part.element.isConnected && SpellElement.thingOf(part.element))
    .find((value): value is object => !!value && value instanceof Class)
  const settings = selected ? settingsOf(selected) : {}
  if (side === "front") settings.direction = "up"
  else if (side === "back") settings.direction = "down"
  return new Class(settings)
}

/** `thing`'s settings, each of its own keys and its value:  `{ rank: "queen", suit: "spades", direction: "down" }`. */
function settingsOf(thing: object): Record<string, unknown> {
  const keys = (thing as { keys?: () => string[] }).keys?.() ?? []
  return Object.fromEntries(keys.map((key) => [key, (thing as Record<string, unknown>)[key]]))
}

/****************
 * ### `<DesignPicker>`
 * Design's list of what can be designed, down the left of the app pane:  the bit showing is chosen.
 * - The open view's:  its drawings, then its property editor, when it has one (`hasEditor`).
 * - A site's pages;  the project's other views.
 * - The editor's own (`EDITOR_OWN`):  none of the Inspector's parts, so a click on a row picks it, inspecting or not.
 ****************/
function DesignPicker(props: { picked: DesignBit | undefined; hasEditor: boolean }): JSX.Element {
  const viewBits = createMemo((): DesignBit[] => {
    const drawings = Design.drawings
    if (!drawings.length || !props.hasEditor) return drawings
    return [...drawings, { ...EDITOR_BIT, label: appTexts.text("designPropertyEditor") }]
  })
  const others = createMemo((): DesignBit[] =>
    Design.otherViews.map((view) => ({
      kind: "view",
      key: `view:${view.classNames[0]}`,
      label: view.name,
      name: view.classNames[0]
    }))
  )
  return (
    <ui-menu
      direction="vertical"
      appearance="secondary pointing"
      size="small"
      class="DesignPicker"
      aria-label={appTexts.text("designPickerLabel")}
      {...{ [EDITOR_OWN]: "" }}
    >
      <Show when={Design.view}>
        {(view) => (
          <>
            <MenuHeader>{view().name}</MenuHeader>
            <PickerRows bits={viewBits()} picked={props.picked} />
          </>
        )}
      </Show>
      <Show when={Design.pages.length}>
        <MenuHeader>{appTexts.text("designPages")}</MenuHeader>
        <PickerRows bits={Design.pages} picked={props.picked} />
      </Show>
      <Show when={others().length}>
        <MenuHeader>{appTexts.text(Design.view ? "designOtherViews" : "designViews")}</MenuHeader>
        <PickerRows bits={others()} picked={props.picked} />
      </Show>
    </ui-menu>
  )
}

/** A group of the picker's rows:  a click shows its bit. */
function PickerRows(props: { bits: readonly DesignBit[]; picked: DesignBit | undefined }): JSX.Element {
  return (
    <For each={props.bits} keyed={(bit) => bit.key}>
      {(bit) => (
        <ui-item
          class="DesignBitRow"
          data-bit={bit().key}
          selected={props.picked?.key === bit().key}
          title={bit().written}
          onClick={() => Design.pick(bit())}
        >
          {bit().label}
        </ui-item>
      )}
    </For>
  )
}

/****************
 * ### `<FitInside>`
 * What it holds, scaled up to fit the box it's in, never smaller than it is:  a card one letter high drawn large.
 * - Measured as it's drawn and each time it or its box changes size.
 * - A CSS `scale`, not `zoom`:  with `zoom`, the Inspector's ants round a turned card were drawn half size in its
 *   corner;  a drop finds the parts under the pointer either way.
 * - Marked `SCALED_UP`, so the ants are a box of their own, not a ring the scale would thicken.
 ****************/
function FitInside(props: { children: JSX.Element }): JSX.Element {
  let box: HTMLDivElement | undefined
  let content: HTMLDivElement | undefined
  onSettled(() => {
    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!box || !content) return
        // its own size, as laid out:  a transform leaves it as it was
        const width = content.offsetWidth
        const height = content.offsetHeight
        if (!width || !height) return
        const room = box.getBoundingClientRect()
        const fits = Math.min((room.width - FIT_MARGIN) / width, (room.height - FIT_MARGIN) / height)
        const scale = Math.max(1, Math.min(MAX_SCALE, Math.floor(fits * 4) / 4))
        content.style.scale = String(scale)
      })
    }
    const watcher = new ResizeObserver(fit)
    watcher.observe(box!)
    watcher.observe(content!)
    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
    }
  })
  return (
    <div class="DesignFit" ref={(element: HTMLDivElement) => (box = element)}>
      <div class="DesignFitContent" {...{ [SCALED_UP]: "" }} ref={(element: HTMLDivElement) => (content = element)}>
        {props.children}
      </div>
    </div>
  )
}

/** The room `<FitInside>` leaves round what it holds, px. */
const FIT_MARGIN = 64

/** The most `<FitInside>` scales up. */
const MAX_SCALE = 12
