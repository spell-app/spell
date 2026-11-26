import { Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { setDebugGlobal } from "spell/util"
import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { SiteEdits, type SitePart } from "spell/app/app/pages/SiteEdits"
import { SiteWrites } from "spell/app/app/pages/SiteWrites"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { DesignDrawings } from "./DesignDrawings"
import { Palette, type OwnView } from "./Palette"
import { LazyPiece } from "./LazyPiece"

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
 *   - It's in `DesignView.tsx`, loaded the first time Design shows (`Design.views`, a `LazyPiece`):
 *     `Design.canShow`, which the top bar reads, stays here, in the editor's first load.
 * - It took the place of Card alone (`ViewAlone`, epic `editor` P35, T116), which showed the card itself when
 *   Owen wanted its property editor.
 ****************/
export class Design {
  /** What draws Design, loaded the first time it shows:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./DesignView"), "waitDesign")

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
    Design.views.loadSoon()
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
    const file = editor.file
    if (!view || !file) return []
    const language = file instanceof SP.SpellFile ? file.language : SP.Language.default
    return DesignDrawings.in(file.contents ?? "", view, language, appTexts.text("designDrawing"))
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

  /** How the open file's view shows (reactive):  one drawing, or its gallery of samples (P38);  remembered for the file. */
  static get showing(): DesignShowing {
    const path = editor.file?.path
    return (path && showingByFile()[path]) || "one"
  }

  /** Show the open file's view as one drawing, or its gallery;  remembered for the file. */
  static setShowing(showing: DesignShowing): void {
    const path = editor.file?.path
    if (!path) return
    const next = { ...showingByFile(), [path]: showing }
    setShowingByFile(next)
    editorPrefs.set(SHOWING_PREF, next)
  }

  /** The size Design draws at (reactive, Q65 C):  to fit the pane, a device's, or a width typed;  remembered per file. */
  static get size(): DesignSize {
    const path = editor.file?.path
    return (path && sizeByFile()[path]) || FIT
  }

  /** Draw at `size`;  remembered for the open file. */
  static setSize(size: DesignSize): void {
    const path = editor.file?.path
    if (!path) return
    const next = { ...sizeByFile(), [path]: size }
    setSizeByFile(next)
    editorPrefs.set(SIZE_PREF, next)
  }

  /** The width `size` draws at, px:  a device's, turned on its side or not, or the width typed;  none to fit. */
  static widthOf(size: DesignSize): number | undefined {
    if (size.device === "fit") return size.width
    const { width, height } = DEVICE_SIZES[size.device]
    return size.isLandscape ? height : width
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

/** How Design shows a view:  one drawing, or its gallery of samples side by side (Q62:  "Gallery"). */
export type DesignShowing = "one" | "gallery"

/**
 * The size Design draws at (Q65 C):
 * - `device`:  `fit`, as large as the pane holds;  or a phone's, a tablet's, a desktop's, in Spell UI's `<ui-device>`
 * - `isLandscape`:  a device turned on its side, by its own Rotate
 * - `width`:  with `fit`, a width of your own, px, to see where a layout changes;  none:  the pane's
 */
export type DesignSize = {
  device: "fit" | "phone" | "tablet" | "desktop"
  isLandscape?: boolean
  width?: number
}

/** Drawn to fit the pane, the size Design starts at. */
export const FIT: DesignSize = { device: "fit" }

/** Each device's screen, upright, px:  `<ui-device>`'s own. */
const DEVICE_SIZES = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1280, height: 800 }
} as const

/** The prefs remembering, for each file by its path, how its view shows and at what size. */
const SHOWING_PREF = "designShowing"
const SIZE_PREF = "designSize"
editorPrefs.declare(SHOWING_PREF, { type: "object", default: {} })
editorPrefs.declare(SIZE_PREF, { type: "object", default: {} })
const [showingByFile, setShowingByFile] = createSignal<Readonly<Record<string, DesignShowing>>>(
  (editorPrefs.get(SHOWING_PREF) as Record<string, DesignShowing> | undefined) ?? {}
)
const [sizeByFile, setSizeByFile] = createSignal<Readonly<Record<string, DesignSize>>>(
  (editorPrefs.get(SIZE_PREF) as Record<string, DesignSize> | undefined) ?? {}
)

/** The sample last picked in the gallery, by its name:  one drawing shows it too.  Forgotten with its file. */
export const [chosenSample, setChosenSample] = createSignal<{ path: string; name: string }>()

/** The property editor's key and row. */
const EDITOR_KEY = "editor"
export const EDITOR_BIT: DesignBit = { kind: "editor", key: EDITOR_KEY, label: "" }

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

/** The built-in a view with a front and a back extends. */
export const TWO_SIDED = "TwoSidedView"

/** What draws Design, loaded on first use:  see `DesignView.tsx`. */
const DesignStageDrawn = Design.views.view("DesignStage")

/**
 * Design, in the app pane, while it shows:  `<DesignStage>`, from `DesignView.tsx`, loaded the first time.
 * - `program`:  the app's own drawing, hidden while a view's bit shows.
 */
export function DesignStage(props: { program: () => HTMLElement | undefined }): JSX.Element {
  return (
    <Show when={Design.isShowing}>
      <DesignStageDrawn program={props.program} />
    </Show>
  )
}
