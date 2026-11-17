import { createSignal, For, Show } from "solid-js"
import { render } from "@solidjs/web"

import { after } from "spell/util/timing"
import { RUNTIME_KEY, UI, UIT } from "spell/ui/core"
import { uiReady } from "spell/app/app/solid/loadUI"
import { on } from "spell/app/app/solid/on"
import { appTexts } from "spell/app/app/ui/AppTexts"

import "./AppSnapshot.css"

/****************
 * ### `<AppSnapshot>`
 * A dialog to update a project's card picture (epic `mockup` T47, T49):  a phone floating over the dimmed page, its app
 * running on its screen;  a snapshot of it, then that cropped to the card's shape.
 * - No dialog box round it:  the phone is all there is, its buttons in its thick bottom edge (`basic` modal).
 * - Playing:  the app runs on the phone's screen, the runner on its own (`runnerUrl`), for as long as the person likes.
 *   - Its screen is a phone's, 390 by 844 (less, in a short window);  Rotate turns it on its side, 844 by 390
 *     (narrower, in a narrow window), and the app draws itself again at that width.
 *   - Change theme:  the app in another of Spell's themes, light or dark, at once.
 *     Only for the picture:  the project and the editor keep theirs (`wearTheme()`).
 *   - The app sits on its theme's page colour (`APP_ALONE_CSS`), so the picture has the theme's background, not white.
 *   - "Snapshot" takes it.
 * - Cropping:  the snapshot in the screen's place, a frame of the card's shape (16 by 9) over it, the rest dimmed.
 *   - Dragged, or moved with the arrow keys (Shift for bigger steps).
 *   - Resized by its corners, or `+` / `-`:  always 16 by 9, never bigger than the snapshot, and never so small the
 *     picture would be blown up past `SOFTEST` (`smallestWidth()`).
 *   - "Save" keeps it;  "Retake" goes back to the app, as it was.
 * - What to do is said in a message over the phone, one per step:  dismissable, and gone once the person starts.
 * - The picture is the framed part alone, the card's size (`PICTURE_WIDTH`), as the home page's other pictures are
 *   (`yarn examples:readme --thumbnails`).
 * - Cancel or Escape, at any step:  nothing is saved.
 * - HOW IT SNAPSHOTS:  the browser's own screen capture of this tab (`captureOf()`), cut to the phone's screen;
 *   the browser asks the person first, each time.
 *   - Faithful:  it's the pixels on screen, every shadow root and style sheet as drawn.
 *   - Nothing in the kit draws a page into a picture in the browser;  the headless screenshot the README's pictures
 *     use runs on the server, which can't see the state the person set up here.
 * - Open one with `openAppSnapshot()`;  the editor's `updateSnapshot()` saves what it answers.
 ****************/
export function AppSnapshot(props: AppSnapshotProps) {
  let modal!: HTMLElement & { visible: boolean }
  let screen!: HTMLIFrameElement
  let answer: Uint8Array | undefined
  /** The phone's screen's size on screen when the snapshot was taken, in CSS pixels:  the snapshot's, shown. */
  let shotSize = { width: 0, height: 0 }
  const [shot, setShot] = createSignal<HTMLCanvasElement>()
  const [frame, setFrame] = createSignal<CropFrame>({ left: 0, top: 0, width: 0 })
  const [isLandscape, setLandscape] = createSignal(false)
  const [look, setLook] = createSignal<AppLook>()
  const [themes, setThemes] = createSignal<readonly string[]>([])
  const [hint, setHint] = createSignal<"play" | "crop" | undefined>("play")
  const [isBusy, setBusy] = createSignal(false)
  /** The snapshot is being taken:  the screen's corners square, so the picture holds none of the phone round it. */
  const [isCapturing, setCapturing] = createSignal(false)
  const [problem, setProblem] = createSignal<string>()

  // un-awaited:  Change theme waits for it, disabled until then
  void startingLook()
    .then(({ look, themes }) => {
      setLook(look)
      setThemes(themes)
    })
    .catch((error) => console.error("AppSnapshot:  couldn't read the editor's theme", error))

  ////////////////
  // ## Playing
  ////////////////

  /** The app's page has loaded:  its app alone, in the look chosen;  the first touch on it ends the "play" hint. */
  const onScreenLoad = () => {
    showAppAlone(screen)
    const chosen = look()
    if (chosen) void wearTheme(screen, chosen)
    const page = screen.contentDocument
    const started = () => {
      if (hint() === "play") setHint(undefined)
    }
    page?.addEventListener("pointerdown", started, { once: true })
    page?.addEventListener("keydown", started, { once: true })
  }

  /** Change theme's menu:  a theme, or `light` / `dark`;  worn by the app at once. */
  const changeLook = (event: CustomEvent<{ value: string }>) => {
    const dropdown = event.currentTarget as HTMLElement & { value?: unknown }
    // keep the dropdown's own value empty:  the look is ours
    dropdown.value = ""
    const chosen = look()
    if (!chosen || !event.detail.value) return
    const value = event.detail.value
    const next = SCHEMES.includes(value as AppScheme)
      ? { ...chosen, scheme: value as AppScheme }
      : { ...chosen, theme: value }
    setLook(next)
    void wearTheme(screen, next)
  }

  /** "Snapshot":  the phone's screen as it is now;  then the frame, as big as it goes, at the top. */
  const takeSnapshot = async () => {
    setProblem(undefined)
    setHint(undefined)
    setBusy(true)
    setCapturing(true)
    try {
      const taken = await captureOf(screen)
      const box = screen.getBoundingClientRect()
      shotSize = { width: box.width, height: box.height }
      setShot(taken)
      const width = largestWidth()
      setFrame({ left: Math.round((shotSize.width - width) / 2), top: 0, width })
      setHint("crop")
    } catch (error) {
      // the person said no to the browser's question:  back to playing, nothing said
      if ((error as Error)?.name !== "NotAllowedError")
        setProblem(error instanceof SnapshotUnsupported ? appTexts.text("snapshotNoCapture") : String(error))
    } finally {
      setCapturing(false)
      setBusy(false)
    }
  }

  ////////////////
  // ## Cropping
  ////////////////

  /** The snapshot's pixels per CSS pixel of the screen it was taken of. */
  const shotScale = () => (shot()?.width ?? 0) / (shotSize.width || 1)
  /** The widest the frame can be:  the snapshot's width, or as wide as its height allows. */
  const largestWidth = () => Math.floor(Math.min(shotSize.width, shotSize.height / CARD_SHAPE))
  /** The narrowest:  where the picture would be blown up past `SOFTEST`;  never wider than the widest. */
  const smallestWidth = () => Math.min(largestWidth(), Math.ceil((PICTURE_WIDTH * SOFTEST) / (shotScale() || 1)))
  const heightOf = (width: number) => Math.round(width * CARD_SHAPE)

  /** Put the frame at `left` / `top`, `width` wide:  its size within the smallest and largest, then all of it inside. */
  const placeFrame = ({ left, top, width }: CropFrame) => {
    const fitted = Math.round(Math.min(Math.max(width, smallestWidth()), largestWidth()))
    setFrame({
      left: Math.round(Math.min(Math.max(0, left), shotSize.width - fitted)),
      top: Math.round(Math.min(Math.max(0, top), shotSize.height - heightOf(fitted))),
      width: fitted
    })
  }
  /** Resize the frame by `change` CSS pixels wide, about its middle. */
  const resizeFrameBy = (change: number) => {
    const { left, top, width } = frame()
    const fitted = Math.min(Math.max(width + change, smallestWidth()), largestWidth())
    placeFrame({
      left: left + (width - fitted) / 2,
      top: top + (heightOf(width) - heightOf(fitted)) / 2,
      width: fitted
    })
  }
  /** The frame's first move or resize ends the "crop" hint. */
  const cropStarted = () => {
    if (hint() === "crop") setHint(undefined)
  }

  /** Dragging the frame:  it follows the pointer. */
  const dragFrame = (event: PointerEvent) => {
    const box = event.currentTarget as HTMLElement
    const start = { x: event.clientX, y: event.clientY, ...frame() }
    cropStarted()
    follow(box, event, (moved) =>
      placeFrame({ ...start, left: start.left + moved.clientX - start.x, top: start.top + moved.clientY - start.y })
    )
  }

  /** Dragging one of the frame's corners:  it resizes, its opposite corner staying put, always 16 by 9. */
  const dragCorner = (event: PointerEvent, corner: Corner) => {
    event.stopPropagation()
    const handle = event.currentTarget as HTMLElement
    const crop = handle.closest(".AppSnapshotCrop")!.getBoundingClientRect()
    const { left, top, width } = frame()
    const isLeft = corner.endsWith("left")
    const isTop = corner.startsWith("top")
    // the corner that stays, in the snapshot's CSS pixels
    const anchorX = isLeft ? left + width : left
    const anchorY = isTop ? top + heightOf(width) : top
    // the most room there is from it, across and down
    const room = Math.min(
      isLeft ? anchorX : shotSize.width - anchorX,
      (isTop ? anchorY : shotSize.height - anchorY) / CARD_SHAPE
    )
    cropStarted()
    follow(handle, event, (moved) => {
      const x = moved.clientX - crop.left
      const y = moved.clientY - crop.top
      const wanted = Math.max(Math.abs(x - anchorX), Math.abs(y - anchorY) / CARD_SHAPE)
      const sized = Math.min(Math.max(wanted, smallestWidth()), largestWidth(), Math.max(room, smallestWidth()))
      placeFrame({
        left: isLeft ? anchorX - sized : anchorX,
        top: isTop ? anchorY - heightOf(sized) : anchorY,
        width: sized
      })
    })
  }

  /** The keys:  arrows move the frame (Shift, bigger steps);  `+` / `-` resize it;  Home and End to the top and bottom. */
  const frameKey = (event: KeyboardEvent) => {
    const step = event.shiftKey ? BIG_STEP : STEP
    const { left, top } = frame()
    const moves: Record<string, Partial<CropFrame>> = {
      ArrowUp: { top: top - step },
      ArrowDown: { top: top + step },
      ArrowLeft: { left: left - step },
      ArrowRight: { left: left + step },
      Home: { top: 0 },
      End: { top: shotSize.height }
    }
    const sizes: Record<string, number> = { "+": RESIZE_STEP, "=": RESIZE_STEP, "-": -RESIZE_STEP, _: -RESIZE_STEP }
    if (event.key in moves) placeFrame({ ...frame(), ...moves[event.key] })
    else if (event.key in sizes) resizeFrameBy(sizes[event.key]!)
    else return
    event.preventDefault()
    cropStarted()
  }

  /** "Retake":  back to the app, as it was left. */
  const retake = () => {
    setShot(undefined)
    setHint(undefined)
  }

  /** "Save":  the framed part of the snapshot, as a PNG, the card's size;  then close. */
  const save = async () => {
    const taken = shot()
    if (!taken) return
    setBusy(true)
    try {
      const scale = shotScale()
      const { left, top, width } = frame()
      const picture = document.createElement("canvas")
      picture.width = PICTURE_WIDTH
      picture.height = PICTURE_HEIGHT
      const pen = picture.getContext("2d")!
      pen.imageSmoothingQuality = "high"
      pen.drawImage(
        taken,
        left * scale,
        top * scale,
        width * scale,
        heightOf(width) * scale,
        0,
        0,
        PICTURE_WIDTH,
        PICTURE_HEIGHT
      )
      answer = await pngOf(picture)
      modal.visible = false
    } catch (error) {
      setProblem(String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ui-modal
      class="AppSnapshot"
      appearance="basic"
      closedby="closerequest"
      aria-label={appTexts.text("snapshotHeading", { title: props.title })}
      visible=""
      ref={(element: HTMLElement) => {
        modal = element as HTMLElement & { visible: boolean }
        element.addEventListener("ui-closed", () => props.onAnswer(answer), { once: true })
      }}
    >
      <ui-content>
        <div class={["AppSnapshotPhone", { landscape: isLandscape(), capturing: isCapturing() }]}>
          <div class="AppSnapshotScreen">
            <iframe
              ref={(element: HTMLIFrameElement) => (screen = element)}
              src={props.runnerUrl}
              title={props.title}
              hidden={!!shot()}
              onLoad={onScreenLoad}
            />
            <Show when={shot()}>{(taken) => crop(taken())}</Show>
          </div>
          <div class="AppSnapshotMessages">
            <Show when={hint()}>
              {(step) => (
                <ui-message
                  class="AppSnapshotHint"
                  floating=""
                  dismissible=""
                  size="small"
                  icon={step() === "play" ? "hand pointer outline" : "crop"}
                  ref={on("ui-closed", () => setHint(undefined))}
                >
                  {appTexts.text(step() === "play" ? "snapshotLine" : "snapshotCropLine")}
                </ui-message>
              )}
            </Show>
            <Show when={problem()}>
              <ui-message
                class="AppSnapshotProblem"
                floating=""
                state="error"
                size="small"
                dismissible=""
                role="alert"
                ref={on("ui-closed", () => setProblem(undefined))}
              >
                {problem()}
              </ui-message>
            </Show>
          </div>
          <div class="AppSnapshotBezel">{buttons()}</div>
        </div>
      </ui-content>
    </ui-modal>
  )

  /** The snapshot, the frame over it, its corners. */
  function crop(taken: HTMLCanvasElement) {
    return (
      <div class="AppSnapshotCrop">
        <img src={taken.toDataURL()} alt="" />
        <div
          class="AppSnapshotFrame"
          tabindex="0"
          role="slider"
          aria-orientation="vertical"
          aria-label={appTexts.text("snapshotFrame")}
          aria-valuemin="0"
          aria-valuemax={String(Math.round(shotSize.height - heightOf(frame().width)))}
          aria-valuenow={String(frame().top)}
          aria-valuetext={appTexts.text("snapshotFrameAt", frame())}
          data-left={frame().left}
          data-width={frame().width}
          style={{
            left: `${frame().left}px`,
            top: `${frame().top}px`,
            width: `${frame().width}px`,
            height: `${heightOf(frame().width)}px`
          }}
          onPointerDown={dragFrame}
          onKeyDown={frameKey}
        >
          <For each={CORNERS}>
            {(corner) => (
              <span class={`AppSnapshotCorner ${corner}`} onPointerDown={(event) => dragCorner(event, corner)} />
            )}
          </For>
        </div>
      </div>
    )
  }

  /** The bottom edge's buttons:  Cancel, then this step's. */
  function buttons() {
    return (
      <>
        <ui-button class="cancel" size="small" onClick={() => (modal.visible = false)}>
          {appTexts.text("cancel")}
        </ui-button>
        <span class="AppSnapshotGap" />
        <Show
          when={!shot()}
          fallback={
            <ui-button class="AppSnapshotRetake" size="small" icon="undo" onClick={retake}>
              {appTexts.text("snapshotRetake")}
            </ui-button>
          }
        >
          <ui-dropdown
            class="AppSnapshotTheme"
            button=""
            size="small"
            direction="upward"
            disabled={look() ? undefined : ""}
            aria-label={appTexts.text("snapshotTheme")}
            title={appTexts.text("snapshotTheme")}
            ref={on<{ value: string }>("ui-changed", changeLook)}
          >
            <span slot="trigger" class="AppSnapshotThemeTrigger">
              <ui-icon name="paint brush" />
              {appTexts.text("snapshotTheme")}
            </span>
            <For each={themes()}>
              {(name) => (
                <ui-item value={name} icon={look()?.theme === name ? "check" : undefined}>
                  {UIT.ThemeNames.titleOf(name)}
                </ui-item>
              )}
            </For>
            <ui-item kind="divider" />
            <For each={SCHEMES}>
              {(scheme) => (
                <ui-item value={scheme} icon={look()?.scheme === scheme ? "check" : undefined}>
                  {appTexts.text(scheme === "light" ? "snapshotLight" : "snapshotDark")}
                </ui-item>
              )}
            </For>
          </ui-dropdown>
          <ui-button
            class="AppSnapshotRotate"
            size="small"
            icon="redo"
            title={appTexts.text("snapshotRotate")}
            onClick={() => setLandscape(!isLandscape())}
          >
            {appTexts.text("snapshotRotate")}
          </ui-button>
        </Show>
        <ui-button
          class="AppSnapshotGo"
          size="small"
          color="primary"
          icon={shot() ? "check" : "camera"}
          loading={isBusy() ? "" : undefined}
          onClick={() => void (shot() ? save() : takeSnapshot())}
        >
          {appTexts.text(shot() ? "snapshotSave" : "snapshotTake")}
        </ui-button>
      </>
    )
  }
}

/** The card's shape, high by wide:  9 by 16, its banner. */
const CARD_SHAPE = 9 / 16

/** The saved picture's size, in pixels:  twice a phone's screen width, as the others are. */
const PICTURE_WIDTH = 780
const PICTURE_HEIGHT = Math.round(PICTURE_WIDTH * CARD_SHAPE)

/**
 * How far the frame's part of the snapshot may be blown up to fill the picture:  at least 2/3 of its pixels.
 * - On a phone's screen at twice the pixels (a Mac's), the frame can shrink to 2/3 of the screen's width.
 * - Never blown up at all would leave nothing to resize there:  the full width is exactly the picture's.
 */
const SOFTEST = 2 / 3

/** How far an arrow key moves the frame, in CSS pixels;  with Shift;  how much `+` / `-` resize it. */
const STEP = 4
const BIG_STEP = 40
const RESIZE_STEP = 16

/** The frame's corners, each a handle that resizes it. */
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const
type Corner = (typeof CORNERS)[number]

/** The schemes Change theme offers. */
const SCHEMES = ["light", "dark"] as const
type AppScheme = (typeof SCHEMES)[number]

/** Where the frame is over the snapshot, in CSS pixels;  its height is the card's shape of its width. */
type CropFrame = { left: number; top: number; width: number }

/** The app's look in the phone:  one of Spell's themes, light or dark. */
type AppLook = { theme: string; scheme: AppScheme }

/**
 * The look the app starts in:  the editor's own (the theme and scheme it shows), and the themes it may change to.
 * - A tinted theme or one of My themes starts as it is;  Change theme then offers Spell's own.
 */
async function startingLook(): Promise<{ look: AppLook; themes: readonly string[] }> {
  const { themes } = await UI.load()
  const root = document.documentElement
  const theme = root.dataset.spellTheme ?? themes.current ?? themes.own[0]!
  const scheme: AppScheme = root.classList.contains("ui-dark") ? "dark" : "light"
  return { look: { theme, scheme }, themes: themes.own }
}

/**
 * Follow the pointer from `event` until it's let go:  `onMove` for each move.
 * - The pointer is captured by `element`, so the drag goes on outside it.
 */
function follow(element: HTMLElement, event: PointerEvent, onMove: (moved: PointerEvent) => void): void {
  element.setPointerCapture(event.pointerId)
  element.addEventListener("pointermove", onMove)
  element.addEventListener("pointerup", () => element.removeEventListener("pointermove", onMove), { once: true })
}

/**
 * The runner, in the phone's screen, as its app alone:  the app over the runner's own bars, filling the screen.
 * - Same origin, so its page can be reached;  a page that won't load is left as it is.
 */
function showAppAlone(screen: HTMLIFrameElement): void {
  const page = screen.contentDocument
  if (!page?.head) return
  const style = page.createElement("style")
  style.textContent = APP_ALONE_CSS
  page.head.append(style)
}

/**
 * What makes the runner's page its app alone:  the app's box over everything, the page's full size,
 * on its theme's page colour and wallpaper, as the editor draws the page behind it.
 */
const APP_ALONE_CSS = `.AppRoot {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  overflow: auto !important;
  background-color: var(--ui-background, Canvas) !important;
  background-image: var(--ui-wallpaper, none) !important;
}`

/**
 * Dress the app in the phone in `look`:  its theme's sheets, and its scheme.
 * - Only that page, and only while it's open:  its runtime applies the theme (`UI.themes`), never the person's choice
 *   (`ThemePreference`), so the editor and the project keep theirs.
 * - The scheme is pinned, so another tab's switch doesn't take it back (`PageBridge.pinScheme()`).
 * - NEVER throws:  a page not ready keeps the look it has.
 */
async function wearTheme(screen: HTMLIFrameElement, look: AppLook): Promise<void> {
  try {
    const page = screen.contentDocument
    // the page's own runtime, found as Spell UI finds it:  its `UI`
    const runtime = (screen.contentWindow as (Window & { [RUNTIME_KEY]?: typeof UI }) | null)?.[RUNTIME_KEY]
    if (!page || !runtime) return
    const { PageBridge } = await import("spell/ui/components/ui-theme-editor/PageBridge")
    PageBridge.pinScheme(page, look.scheme)
    page.documentElement.dataset.spellTheme = look.theme
    const { themes } = await runtime.load()
    await themes.apply(look.theme)
  } catch (error) {
    console.error("AppSnapshot:  couldn't change the app's theme", error)
  }
}

/**
 * What's in `element`'s box on screen now, as a canvas, at the screen's pixels:  the browser's screen capture of this
 * tab, one frame, cut to the box.
 * - The browser asks the person first;  their no throws its `NotAllowedError`.
 * - Waits a moment after sharing starts:  the browser's "sharing this tab" bar can move the page as it shows.
 * - throws `SnapshotUnsupported` in a browser with no screen capture
 */
async function captureOf(element: HTMLElement): Promise<HTMLCanvasElement> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new SnapshotUnsupported("captureOf():  no getDisplayMedia()")
  const ratio = window.devicePixelRatio || 1
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "browser",
      width: { ideal: Math.round(window.innerWidth * ratio) },
      height: { ideal: Math.round(window.innerHeight * ratio) }
    },
    audio: false,
    // Chrome's:  offer this tab first, and only it
    preferCurrentTab: true,
    selfBrowserSurface: "include"
  } as DisplayMediaStreamOptions)
  try {
    const video = document.createElement("video")
    video.muted = true
    video.srcObject = stream
    await video.play()
    await after(SHARING_SETTLES)
    // a frame drawn after the wait:  the page as it is now
    await new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve()))
    const box = element.getBoundingClientRect()
    const scaleX = video.videoWidth / window.innerWidth
    const scaleY = video.videoHeight / window.innerHeight
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(box.width * scaleX)
    canvas.height = Math.round(box.height * scaleY)
    canvas
      .getContext("2d")!
      .drawImage(
        video,
        box.left * scaleX,
        box.top * scaleY,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
    return canvas
  } finally {
    for (const track of stream.getTracks()) track.stop()
  }
}

/** How long, in seconds, the page gets to settle once sharing starts. */
const SHARING_SETTLES = 0.5

/** `canvas` as PNG bytes. */
async function pngOf(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("AppSnapshot:  the browser made no picture of the snapshot")
  return new Uint8Array(await blob.arrayBuffer())
}

/** Thrown by `captureOf()` in a browser with no screen capture. */
export class SnapshotUnsupported extends Error {}
SnapshotUnsupported.prototype.name = "SnapshotUnsupported"

/** Props for `<AppSnapshot>`. */
export type AppSnapshotProps = {
  /** the project's runner, its app alone:  `/run/owen@spell/my-app` */
  runnerUrl: string
  /** the project's title, the dialog's name for a screen reader */
  title: string
  /** Called once, after the dialog has hidden, with the picture as PNG bytes;  `undefined` for Cancel. */
  onAnswer: (picture: Uint8Array | undefined) => void
}

/**
 * Show an `<AppSnapshot>`;  resolves with the picture, PNG bytes, or `undefined` when cancelled.
 * - SIDE EFFECT:  a `<div class="AppSnapshotRoot">` in `<body>` holding the dialog, until it has hidden.
 */
export async function openAppSnapshot(props: Omit<AppSnapshotProps, "onAnswer">): Promise<Uint8Array | undefined> {
  await uiReady
  const root = document.createElement("div")
  root.className = "AppSnapshotRoot"
  document.body.append(root)
  return new Promise((resolve) => {
    const dispose = render(() => <AppSnapshot {...props} onAnswer={finish} />, root)

    /** Unmount, then resolve. */
    function finish(picture: Uint8Array | undefined) {
      dispose()
      root.remove()
      resolve(picture)
    }
  })
}
