import { For, Match, Show, Switch, createSignal } from "solid-js"
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
import { on } from "./on"

import "./ChangeThis.css"

/****************
 * ### `ChangeThis`
 * Select something in the app, say what should change, and a Claude session on this machine changes the code
 * (epic `editor` P18):  the flow, from the selection to the result.
 * - The selection gives the place;  `POST /api/changes` writes it to the inbox, with no Claude needed for that;
 *   a session takes it with `spell app changes wait`.
 * - The result arrives as any other edit does:  one step of `editor.history`, compiled with the running app left up.
 * - One request at a time.
 * - Never in the public preview, which has no server (`isStaticBuild`).
 ****************/
export class ChangeThis {
  /** Can anything be asked here?  Not in the public preview. */
  static get isAvailable(): boolean {
    return !isStaticBuild
  }

  /**
   * Open the box on what's selected, or on the request under way.
   * - Nothing selected, or nothing written:  nothing to ask about, so nothing opens.
   */
  static open(): void {
    if (!ChangeThis.isAvailable) return
    const element = selectedElement()
    placeAsked = element && ChangeThis.placeFor(element)
    if (request() || placeAsked) setBoxAt(ChangeThis.whereFor(element))
  }

  /** Where the box opens:  under `element`, inside the window. */
  private static whereFor(element: Element | undefined): BoxPlace {
    const box = element?.getBoundingClientRect()
    return box ? { x: box.left, y: box.bottom } : { x: innerWidth / 2, y: innerHeight / 3 }
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
      setRequest(answer)
      void ChangeThis.followUntilDone(project, answer.id)
    } catch (error) {
      const isRefused = (error as { status?: number }).status === REFUSED_STATUS
      editor.showError(isRefused ? appTexts.text("changeThisRefused") : (error as Error))
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
        setRequest(answer)
        if (answer.status === "done") {
          await ChangeThis.showResult(project, answer)
          break
        }
        if (answer.status === "failed") {
          editor.showError(appTexts.text("changeThisFailed", { summary: answer.summary ?? "" }))
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

/****************
 * ### `<ChangeThisBox>`
 * The small box on what's selected:  a `<ui-popup>` at it, with what to change, then how the request is getting on.
 * - A popup, not a panel:  it covers nothing but the place it's about.
 * - Enter sends, shift+Enter starts a new line, Esc closes it, and a request under way goes on without it.
 * - A picture pasted or dropped into it goes with the words, a thumbnail under them, its ✕ taking it out (epic `editor` T62).
 * - `ChangeThis.open()` opens it.
 ****************/
export function ChangeThisBox(): JSX.Element {
  return (
    <Show when={boxAt()}>
      {(where) => (
        <ui-popup
          at={where()}
          open-on="manual"
          visible=""
          class="BarMenuPopup ChangeThisPopup"
          aria-label={appTexts.text("menuChangeThis")}
          ref={on("ui-closing", () => setBoxAt(undefined))}
        >
          <div
            class="ChangeThisBox"
            onPaste={(event: ClipboardEvent) => takePictures(event, event.clipboardData)}
            onDragOver={(event: DragEvent) => {
              // a file dragged over:  it may be dropped here
              if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
            }}
            onDrop={(event: DragEvent) => takePictures(event, event.dataTransfer)}
          >
            <label class="ChangeThisHeader">{appTexts.text("changeThisHeader")}</label>
            <ui-textarea
              grow=""
              fluid=""
              rows="3"
              max-rows="6"
              autofocus=""
              readonly={!!request()}
              aria-label={appTexts.text("changeThisPrompt")}
              placeholder={appTexts.text("changeThisPrompt")}
              value={words()}
              ref={on<{ value: string }>("ui-typed", (event) => setWords(event.detail.value))}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key !== "Enter" || event.shiftKey || event.isComposing || request()) return
                event.preventDefault()
                void ChangeThis.send(words())
              }}
            />
            <Show when={pictures().length}>
              <div class="ChangeThisPictures">
                <For each={pictures()}>
                  {(picture, index) => (
                    <span class="ChangeThisPicture">
                      <img src={picture.url} alt={appTexts.text("changeThisPicture")} />
                      <Show when={!request()}>
                        <ui-icon
                          name="close"
                          link=""
                          label={appTexts.text("changeThisRemovePicture")}
                          title={appTexts.text("changeThisRemovePicture")}
                          onClick={() => ChangeThis.removePictures(index())}
                        />
                      </Show>
                    </span>
                  )}
                </For>
              </div>
            </Show>
            <Switch>
              <Match when={request()?.status === "waiting" && !request()!.listening}>
                <p>{appTexts.text("changeThisNobody")}</p>
                <ui-code language="sh">{LISTEN_COMMAND}</ui-code>
              </Match>
              <Match when={request()}>
                <p class="ChangeThisWorking">
                  <ui-loader visible="" inline="" size="tiny" />
                  {appTexts.text("changeThisWorking")}
                </p>
              </Match>
            </Switch>
          </div>
        </ui-popup>
      )}
    </Show>
  )
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
type BoxPlace = { x: number; y: number }

/** Where the box is open:  `undefined` while it's shut. */
const [boxAt, setBoxAt] = createSignal<BoxPlace>()

/** What's typed in the box:  it stays, read only, while the request is under way. */
const [words, setWords] = createSignal("")

/** What the box is about. */
let placeAsked: SPACES.ChangePlace | undefined

/** The request under way, as last heard. */
const [request, setRequest] = createSignal<SPACES.ChangeAnswer>()

/** A picture in the box:  what's sent, and a URL of it for its thumbnail. */
type BoxPicture = SPACES.ChangePicture & {
  /** an object URL of its bytes, revoked as it leaves the box */
  url: string
}

/** The pictures pasted or dropped into the box, in order (epic `editor` T62). */
const [pictures, setPictures] = createSignal<BoxPicture[]>([])

/** The pictures the server takes, by type:  `ChangeRequests`' too. */
const PICTURE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

/**
 * The box's paste or drop:  its pictures are taken, and nothing else of it happens;  words go in as ever.
 * - `data`:  the clipboard's, or the drop's
 */
function takePictures(event: Event, data: DataTransfer | null): void {
  const files = [...(data?.files ?? [])].filter((file) => PICTURE_TYPES.includes(file.type))
  if (!files.length) return
  event.preventDefault()
  void ChangeThis.addPictures(files).catch((error: unknown) => editor.showError(error as Error))
}

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

/** The attribute the compiler's mark is on a drawn element:  `SourceMarks`'. */
const DRAWN_AT = "data-spell-at"

/** What the local site answers when Change This is asked from another machine than the one running Spell (I120). */
const REFUSED_STATUS = 403

/** The route. */
const CHANGES_URL = "/api/changes"

/** What a session runs to listen. */
const LISTEN_COMMAND = "spell app changes wait"

/** How many lines of code a request quotes. */
const EXCERPT_LINES = 5

/** The longest a compile's drawing takes to land, in msec. */
const REDRAW_MS = 1000

/** How often the editor looks at the request, in msec. */
const LOOK_EVERY_MS = 1000
