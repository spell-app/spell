import { Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { KnownFormat, LoadableFile } from "spell/util"
import { after, waitUntil } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import type { SPACES } from "spell/app/spaces"
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { editor } from "spell/app/app/editor"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { Inspector } from "./Inspector"
import { InspectorWrites } from "./InspectorWrites"
import { LazyPiece } from "./LazyPiece"
import { PartEdits } from "./PartEdits"

import "./ChangeThis.css"

/****************
 * ### `ChangeThis`
 * Select something in the app, say what should change, and a Claude session on this machine changes the code
 * (epic `editor` P18):  the flow, from the selection to the result.
 * - The selection gives the place;  `POST /api/changes` writes it to the inbox, with no Claude needed for that.
 * - A session takes it:  one listening (`spell app changes wait`), else one the page server starts itself,
 *   headless, when Claude Code is on this machine (`ClaudeStarter`, epic `editor` T66).
 * - The result arrives as any other edit does:  one step of `editor.history`, compiled with the running app left up.
 * - One request at a time.
 * - Never in the public preview, which has no server (`isStaticBuild`).
 * - Its box, `<ChangeThisBox>`, is in `ChangeThisView.tsx`, loaded the first time it opens
 *   (`ChangeThis.views`, a `LazyPiece`).
 ****************/
export class ChangeThis {
  /** The box, loaded the first time it opens:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./ChangeThisView"), "waitChangeThis")

  /**
   * Its icon, the magic wand, wherever Change This is drawn:  the part menu's row, its box's header
   * (epic `editor` T160;  the plain `magic` wand read as a pencil).
   */
  static readonly icon = "magic wand sparkles"

  /** Can anything be asked here?  Not in the public preview. */
  static get isAvailable(): boolean {
    return !isStaticBuild
  }

  /**
   * Open the box on what's selected, or on the request under way.
   * - Centred under the selected part, when it shows in the app (`boxPlaceFor()`)
   * - else `at`, where it was asked from:  a right click's point
   * - It stays inside the window (`<ui-popup at>`).
   * - Nothing selected, or nothing written:  nothing to ask about, so nothing opens.
   */
  static open(at?: BoxPlace): void {
    if (!ChangeThis.isAvailable) return
    const element = selectedElement()
    placeAsked = element && ChangeThis.placeFor(element)
    if (!request() && !placeAsked) return
    ChangeThis.views.loadSoon()
    setBoxAt(boxPlaceFor(element, at))
  }

  /** Close the box:  a request under way goes on without it. */
  static close(): void {
    setBoxAt(undefined)
  }

  /** The place of `element`, as a request says it:  `undefined` if it isn't written in a file of this project. */
  private static placeFor(element: Element): SPACES.ChangePlace | undefined {
    const place = Inspector.writtenPlaceOf(element)?.place
    const file = place && InspectorWrites.fileNamed(place.path)
    if (!place || !file?.filePath) return undefined
    const lines = (file.contents ?? "").split("\n").slice(place.line, place.line + EXCERPT_LINES)
    return {
      projectId: file.projectId,
      filePath: file.filePath,
      line: place.line,
      column: place.column,
      kind: element.localName,
      excerpt: lines.join("\n")
    }
  }

  /**
   * Ask for `text` to happen to what was selected when the box opened:  a click in the box may change the selection.
   * - Saves first:  the session reads the files on disk, so it must see what's on screen.
   * - NEVER throws:  a failure is said in the editor's error;  a refusal (403:  asked from another machine than the
   *   one running Spell, epic `editor` I120) says so plainly, not as an `AuthenticationError`.
   */
  static async send(text: string): Promise<void> {
    const place = placeAsked
    const { project } = editor
    if (!place || !project || !text.trim()) return
    try {
      for (const file of project.spellFiles) if (file.isDirty) await file.save(undefined)
      const sent = pictures().map(({ type, data }) => ({ type, data }))
      const asked: SPACES.ChangeAsked = { ...place, text: text.trim(), ...(sent.length ? { pictures: sent } : {}) }
      const answer = await ChangeThis.fetchAnswer({
        url: CHANGES_URL,
        contents: asked,
        requestFormat: KnownFormat.json
      })
      setNow(Date.now())
      setRequest(answer)
      void ChangeThis.followUntilDone(project, answer.id)
    } catch (error) {
      const isRefused = (error as { status?: number }).status === REFUSED_STATUS
      editor.showError(isRefused ? appTexts.text("changeThisRefused") : (error as Error))
    }
  }

  /**
   * Start a Claude session for the request under way, the box's Start Claude Code button:
   * for when the page server didn't start one by itself (epic `editor` T66).
   * - NEVER throws:  a failure is said in the editor's error
   */
  static async startClaude(): Promise<void> {
    const id = request()?.id
    if (!id) return
    try {
      setRequest(await ChangeThis.fetchAnswer({ url: `${CHANGES_URL}/start?id=${id}`, method: "POST" }))
    } catch (error) {
      editor.showError(error as Error)
    }
  }

  /** Ask the server, and hear a request back. */
  private static fetchAnswer(params: Parameters<typeof LoadableFile.fetch>[0]): Promise<SPACES.ChangeAnswer> {
    return LoadableFile.fetch<SPACES.ChangeAnswer>({ ...params, format: "json", cache: "no-store" })
  }

  /**
   * Look at the request until it's finished, then show what it did.
   * - Opening another project ends it:  the result would land in the wrong one, and its files are on disk anyway.
   * - NEVER throws.
   */
  private static async followUntilDone(project: SP.SpellProject, id: string): Promise<void> {
    try {
      while (editor.project === project) {
        await after(LOOK_EVERY_MS / 1000)
        const answer = await ChangeThis.fetchAnswer({ url: `${CHANGES_URL}?id=${id}` })
        setNow(Date.now())
        setRequest(answer)
        if (answer.status === "done") {
          await ChangeThis.showResult(project, answer)
          break
        }
        if (answer.status === "failed") {
          const { summary } = answer
          editor.showError(
            answer.failure === "stalled"
              ? appTexts.text("changeThisStalled")
              : summary
                ? appTexts.text("changeThisFailed", { summary })
                : appTexts.text("changeThisStopped")
          )
          break
        }
      }
    } catch (error) {
      editor.showError(error as Error)
    }
    setRequest(undefined)
    setWords("")
    ChangeThis.removePictures()
    setBoxAt(undefined)
  }

  /**
   * Add the pictures among `files` (pasted or dropped into the box, epic `editor` T62):  they go with the request.
   * - Only PNG, JPEG, GIF and WebP, what the server takes;  anything else is passed over.
   * - Nothing while a request is under way:  it has already gone.
   */
  static async addPictures(files: readonly File[]): Promise<void> {
    if (request()) return
    const added = await Promise.all(
      files.filter((file) => PICTURE_TYPES.includes(file.type)).map((file) => pictureOf(file))
    )
    setPictures((kept) => [...kept, ...added])
  }

  /** Take the picture at `index` out of the box;  none:  every one. */
  static removePictures(index?: number): void {
    const gone = index === undefined ? pictures() : pictures().slice(index, index + 1)
    for (const picture of gone) URL.revokeObjectURL(picture.url)
    setPictures((kept) => (index === undefined ? [] : kept.filter((_, at) => at !== index)))
  }

  /**
   * The session's changes, from disk, as edits:  each changed file one step of `editor.history`, so ⌘Z takes it back.
   * - Then the compile leaves the app running (`LiveEdit`), and what changed is selected (`editor.followed`).
   * - New files the session made aren't picked up:  they show when the project is opened again.
   */
  private static async showResult(project: SP.SpellProject, answer: SPACES.ChangeAnswer): Promise<void> {
    let changed: { path: string; line: number } | undefined
    const title = appTexts.text("menuChangeThis")
    const live = () => void editor.compileApp().catch(editor.showError)
    for (const file of project.spellFiles) {
      const before = file.contents ?? ""
      const after = await LoadableFile.fetch<string>({ url: file.url, cache: "no-store" })
      if (after === before) continue
      const { span, newText } = SourceEdits.editBetween(before, after)
      editor.history.change(
        { file, at: span.start, before: before.slice(span.start, span.end), after: newText },
        { title, live }
      )
      changed ??= {
        path: SP.SpellProject.sourceNameOf(file.path),
        line: before.slice(0, span.start).split("\n").length - 1
      }
    }
    if (changed) {
      editor.clearCompileAppSoon()
      await editor.compileApp()
      const selected = selectedElement()
      const drawnAt = selected?.getAttribute(DRAWN_AT)
      await ChangeThis.untilRedrawn(selected)
      editor.followed = { ...changed, from: "output" }
      // a part that's no row of the Views tree (a plain button):  `followed` can't find it, so find its new element
      const redrawn = drawnAt && !selected?.isConnected && Inspector.area && drawnElementIn(Inspector.area, drawnAt)
      if (redrawn) Inspector.select(redrawn)
    }
    editor.showNotice(answer.summary || appTexts.text(changed ? "changeThisDone" : "changeThisNoChange"))
  }

  /**
   * Wait for what a compile draws again to land, so what's selected next is the new element, not the one it replaced.
   * - A compile's promise ends before that, so:  until `element` has gone, or `REDRAW_MS` if it was left alone.
   */
  private static async untilRedrawn(element: Element | undefined): Promise<void> {
    // Until `element` has gone, looking every 0.05s;  gives up after `REDRAW_MS`
    await waitUntil(() => !element?.isConnected, { timeout: REDRAW_MS / 1000, every: 0.05 })
  }
}

/**
 * Where `request` has got to, as the box says it:
 * - `starting`:  the page server started a Claude session, which hasn't taken it yet
 * - `working`:  a session has it, or one listening will take it
 * - `no claude`:  nobody listens, and Claude Code isn't on this machine
 * - `nobody`:  nobody listens, and no session started:  the Start Claude Code button
 * - `undefined`:  no request
 */
export function stageOf(
  request: SPACES.ChangeAnswer | undefined
): "starting" | "working" | "no claude" | "nobody" | undefined {
  if (!request) return undefined
  if (request.status === "waiting" && request.session) return "starting"
  if (request.status !== "waiting" || request.listening) return "working"
  return request.hasClaude ? "nobody" : "no claude"
}

/**
 * Where the box opens for `element`, the selected part:
 * - centred under the part in the app, when it has a box on screen, so it covers none of it (Owen, I151)
 * - else `at`, where it was asked from:  a right click's point
 * - else the focus in the Inspector or its Views tree (⌘K there):  beside the row it's on, else under what has it
 * - else (a part scrolled away, or drawn by nothing):  beside its row in the Views tree
 * - else a third of the way down the window, in its middle
 * - `<ui-popup at>` keeps it inside the window, turning it to the point's left or top where there's no room
 */
function boxPlaceFor(element: Element | undefined, at?: BoxPlace): BoxPlace {
  const underPart = under(element && shownBoxOf(element))
  if (underPart) return underPart
  if (at) return at
  const focused = focusedElement()
  const inInspector = focused && closestAcross(focused, INSPECTOR_COLUMN)
  if (inInspector) {
    const place = besideRow(closestAcross(focused, TREE_ROW)) ?? under(shownBoxOf(focused))
    if (place) return place
  }
  return besideRow(element && PartEdits.rowOf(element)) ?? { x: innerWidth / 2, y: innerHeight / 3, isCentred: true }
}

/** Centred under `box`. */
function under(box: DOMRect | undefined): BoxPlace | undefined {
  return box && { x: box.left + box.width / 2, y: box.bottom + BOX_GAP_PX, isCentred: true }
}

/**
 * Beside a Views tree row's own line, level with it:  on the side with the most room, so it covers no row.
 * - The Inspector is a column at the window's right:  its rows' left, where the box turns to the left.
 */
function besideRow(row: Element | undefined): BoxPlace | undefined {
  const line = shownBoxOf(row?.shadowRoot?.querySelector(".row") ?? row)
  if (!line) return undefined
  const hasMoreRoomLeft = line.left > innerWidth - line.right
  return { x: hasMoreRoomLeft ? line.left - BOX_GAP_PX : line.right + BOX_GAP_PX, y: line.top }
}

/** `element`'s box in the window (`drawnBoxOf()`):  `undefined` when it has none, or none of it shows. */
function shownBoxOf(element: Element | undefined): DOMRect | undefined {
  const box = element?.isConnected ? drawnBoxOf(element) : undefined
  if (!box) return undefined
  const isInWindow = box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth
  return isInWindow ? box : undefined
}

/**
 * The box of what `element` draws:  its own, else, for a host with none (`display: contents`, many Spell UI hosts,
 * a toolbar's segment), the box round what's inside it, through its shadow root and slots;  `undefined`:  nothing drawn.
 * - Why:  such a host's own box is all zeros, at the window's top left, where the box opened (epic `editor` I133).
 */
function drawnBoxOf(element: Element, depth = 0): DOMRect | undefined {
  const own = element.getBoundingClientRect()
  if (own.width || own.height) return own
  if (depth > MOST_DRAWN_DEPTH) return undefined
  const inside =
    element instanceof HTMLSlotElement ? element.assignedElements() : [...(element.shadowRoot ?? element).children]
  const boxes = inside.flatMap((child) => drawnBoxOf(child, depth + 1) ?? [])
  if (!boxes.length) return undefined
  const left = Math.min(...boxes.map((box) => box.left))
  const top = Math.min(...boxes.map((box) => box.top))
  return new DOMRect(
    left,
    top,
    Math.max(...boxes.map((box) => box.right)) - left,
    Math.max(...boxes.map((box) => box.bottom)) - top
  )
}

/** The element with the focus, through shadow roots. */
function focusedElement(): Element | undefined {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active && active !== document.body ? active : undefined
}

/** The closest element around `element` matching `selector`, out through shadow roots. */
function closestAcross(element: Element, selector: string): Element | undefined {
  for (let at: Element | undefined = element; at;) {
    const found = at.closest(selector)
    if (found) return found
    const root = at.getRootNode()
    at = root instanceof ShadowRoot ? root.host : undefined
  }
  return undefined
}

/** The element in `root`, through shadow roots, drawn from the code at `drawnAt`. */
function drawnElementIn(root: ParentNode, drawnAt: string): Element | undefined {
  for (const element of root.querySelectorAll("*")) {
    if (element.getAttribute(DRAWN_AT) === drawnAt) return element
    const inside = element.shadowRoot && drawnElementIn(element.shadowRoot, drawnAt)
    if (inside) return inside
  }
  return undefined
}

/** The element selected last. */
function selectedElement(): Element | undefined {
  return Inspector.allSelected.at(-1)?.element ?? undefined
}

/** Where the box is, in the window. */
export type BoxPlace = {
  /** across the window, px */
  x: number
  /** down the window, px */
  y: number
  /** `x` is the box's middle, not its left */
  isCentred?: boolean
}

/** The box's width as last drawn, padding and all;  at first, what `ChangeThis.css` sets (420px, 12px padding). */
export const [boxWidth, setBoxWidth] = createSignal(446)

/** Where the box is open:  `undefined` while it's shut. */
export const [boxAt, setBoxAt] = createSignal<BoxPlace>()

/** What's typed in the box:  it stays, read only, while the request is under way. */
export const [words, setWords] = createSignal("")

/** What the box is about. */
let placeAsked: SPACES.ChangePlace | undefined

/** The request under way, as last heard. */
export const [request, setRequest] = createSignal<SPACES.ChangeAnswer>()

/** When the request was last heard, in msec:  the box's seconds count from it. */
export const [now, setNow] = createSignal(Date.now())

/** A picture in the box:  what's sent, and a URL of it for its thumbnail. */
type BoxPicture = SPACES.ChangePicture & {
  /** an object URL of its bytes, revoked as it leaves the box */
  url: string
}

/** The pictures pasted or dropped into the box, in order (epic `editor` T62). */
export const [pictures, setPictures] = createSignal<BoxPicture[]>([])

/** The attribute the compiler's mark is on a drawn element:  `SourceMarks`'. */
const DRAWN_AT = "data-spell-at"

/** What the local site answers when Change This is asked from another machine than the one running Spell (I120). */
const REFUSED_STATUS = 403

/** The route. */
const CHANGES_URL = "/api/changes"

/** The Inspector, and a row of its Views tree:  where ⌘K may be pressed, and the box opens by. */
const INSPECTOR_COLUMN = ".InspectorColumn"
const TREE_ROW = "ui-tree-item"

/** How deep `drawnBoxOf()` looks for what a box-less host draws. */
const MOST_DRAWN_DEPTH = 4

/** How far below what it's about the box opens, in px. */
const BOX_GAP_PX = 6

/** How many lines of code a request quotes. */
const EXCERPT_LINES = 5

/** The longest a compile's drawing takes to land, in msec. */
const REDRAW_MS = 1000

/** How often the editor looks at the request, in msec. */
const LOOK_EVERY_MS = 1000

/** `file` as a picture in the box:  its bytes as base64, and a URL for its thumbnail. */
async function pictureOf(file: File): Promise<BoxPicture> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    // read as a data URL:  its result is text
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error(`ChangeThis:  can't read the picture ${file.name}`))
    reader.readAsDataURL(file)
  })
  return { type: file.type, data: dataUrl.slice(dataUrl.indexOf(",") + 1), url: URL.createObjectURL(file) }
}

/** The pictures the server takes, by type:  `ChangeRequests`' too. */
export const PICTURE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

/** The box, loaded on first use:  see `ChangeThisView.tsx`. */
const ChangeThisBoxDrawn = ChangeThis.views.view("ChangeThisBox")

/** The small box next to what's selected, while it's open:  `<ChangeThisBox>`, from `ChangeThisView.tsx`. */
export function ChangeThisBox(): JSX.Element {
  return (
    <Show when={boxAt()}>
      <ChangeThisBoxDrawn />
    </Show>
  )
}
