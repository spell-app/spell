import { createSignal, Show } from "solid-js"
import { render } from "@solidjs/web"

import { after } from "spell/util/timing"
import { uiReady } from "spell/app/app/solid/loadUI"
import { appTexts } from "spell/app/app/ui/AppTexts"

import "./AppSnapshot.css"

/****************
 * ### `<AppSnapshot>`
 * A dialog to update a project's card picture (epic `mockup` T47):  its app running in a phone's screen,
 * a snapshot of it, then that cropped to the card's shape.
 * - Playing:  the app runs in the phone, the runner on its own (`runnerUrl`, in a frame 390px wide, as the home
 *   page's pictures are), for as long as the person likes;  "Snapshot" takes it.
 * - Cropping:  the snapshot in the phone's place, a frame of the card's shape (16 by 9) over it, the rest dimmed;
 *   dragged, or moved with the arrow keys (Shift for bigger steps), to what the card shows.  "Save" keeps it.
 * - The picture is the phone's screen alone, never its surround, at twice the pixels (`PICTURE_WIDTH`), as the
 *   home page's other pictures are (`yarn examples:readme --thumbnails`).
 * - Cancel, the ✕ or Escape, at any step:  nothing is saved.
 * - HOW IT SNAPSHOTS:  the browser's own screen capture of this tab (`captureOf()`), cut to the phone's screen;
 *   the browser asks the person first, each time.
 *   - Faithful:  it's the pixels on screen, every shadow root and style sheet as drawn.
 *   - Nothing in the kit draws a page into a picture in the browser;  the headless screenshot the README's pictures
 *     use runs on the server, which can't see the state the person set up here.
 * - Open one with `openAppSnapshot()`;  the editor's `updateSnapshot()` saves what it answers.
 * - Its own component, so the editor's menus can open it too.
 ****************/
export function AppSnapshot(props: AppSnapshotProps) {
  let modal!: HTMLElement & { visible: boolean }
  let screen!: HTMLIFrameElement
  let answer: Uint8Array | undefined
  /** The phone's screen's height on screen when the snapshot was taken, in CSS pixels:  the snapshot's, shown. */
  let screenHeight = 0
  const [shot, setShot] = createSignal<HTMLCanvasElement>()
  const [frameTop, setFrameTop] = createSignal(0)
  const [isBusy, setBusy] = createSignal(false)
  const [problem, setProblem] = createSignal<string>()

  /** How far the frame can move down:  the snapshot's height on screen, less the frame's. */
  const lowestTop = () => Math.max(0, screenHeight - FRAME_HEIGHT)
  const moveFrameTo = (top: number) => setFrameTop(Math.round(Math.min(Math.max(0, top), lowestTop())))

  /** "Snapshot":  the phone's screen as it is now;  then the frame, at the top. */
  const takeSnapshot = async () => {
    setProblem(undefined)
    setBusy(true)
    try {
      const taken = await captureOf(screen)
      screenHeight = screen.getBoundingClientRect().height
      setShot(taken)
      setFrameTop(0)
    } catch (error) {
      // the person said no to the browser's question:  back to playing, nothing said
      if ((error as Error)?.name !== "NotAllowedError")
        setProblem(error instanceof SnapshotUnsupported ? appTexts.text("snapshotNoCapture") : String(error))
    } finally {
      setBusy(false)
    }
  }

  /** "Save":  the framed part of the snapshot, as a PNG, the card's size;  then close. */
  const save = async () => {
    const taken = shot()
    if (!taken) return
    setBusy(true)
    try {
      const scale = taken.height / screenHeight
      const picture = document.createElement("canvas")
      picture.width = PICTURE_WIDTH
      picture.height = PICTURE_HEIGHT
      picture
        .getContext("2d")!
        .drawImage(taken, 0, frameTop() * scale, taken.width, FRAME_HEIGHT * scale, 0, 0, PICTURE_WIDTH, PICTURE_HEIGHT)
      answer = await pngOf(picture)
      modal.visible = false
    } catch (error) {
      setProblem(String(error))
    } finally {
      setBusy(false)
    }
  }

  /** Dragging the frame:  it follows the pointer, up and down. */
  const dragFrame = (event: PointerEvent) => {
    const frame = event.currentTarget as HTMLElement
    const startY = event.clientY
    const startTop = frameTop()
    frame.setPointerCapture(event.pointerId)
    const move = (moved: PointerEvent) => moveFrameTo(startTop + moved.clientY - startY)
    frame.addEventListener("pointermove", move)
    frame.addEventListener("pointerup", () => frame.removeEventListener("pointermove", move), { once: true })
  }

  /** The arrow keys move the frame:  a step, or a big step with Shift;  Home and End to the ends. */
  const frameKey = (event: KeyboardEvent) => {
    const step = event.shiftKey ? BIG_STEP : STEP
    const to: Record<string, number> = {
      ArrowUp: frameTop() - step,
      ArrowDown: frameTop() + step,
      Home: 0,
      End: lowestTop()
    }
    if (!(event.key in to)) return
    event.preventDefault()
    moveFrameTo(to[event.key]!)
  }

  return (
    <ui-modal
      class="AppSnapshot"
      size="small"
      closable=""
      closedby="closerequest"
      heading={appTexts.text("snapshotHeading", { title: props.title })}
      visible=""
      ref={(element: HTMLElement) => {
        modal = element as HTMLElement & { visible: boolean }
        element.addEventListener("ui-closed", () => props.onAnswer(answer), { once: true })
      }}
    >
      <ui-content>
        <p class="AppSnapshotLine">{appTexts.text(shot() ? "snapshotCropLine" : "snapshotLine")}</p>
        <Show when={problem()}>
          <p class="AppSnapshotProblem" role="alert">
            {problem()}
          </p>
        </Show>
        <div class="AppSnapshotPhone">
          <div class="AppSnapshotScreen">
            <iframe
              ref={(element: HTMLIFrameElement) => (screen = element)}
              src={props.runnerUrl}
              title={props.title}
              hidden={!!shot()}
              onLoad={() => showAppAlone(screen)}
            />
            <Show when={shot()}>
              {(taken) => (
                <div class="AppSnapshotCrop">
                  <img src={taken().toDataURL()} alt="" />
                  <div
                    class="AppSnapshotFrame"
                    tabindex="0"
                    role="slider"
                    aria-orientation="vertical"
                    aria-label={appTexts.text("snapshotFrame")}
                    aria-valuemin="0"
                    aria-valuemax={String(Math.round(lowestTop()))}
                    aria-valuenow={String(frameTop())}
                    style={{ top: `${frameTop()}px`, height: `${FRAME_HEIGHT}px` }}
                    onPointerDown={dragFrame}
                    onKeyDown={frameKey}
                  />
                </div>
              )}
            </Show>
          </div>
        </div>
      </ui-content>
      <ui-actions>
        <ui-button class="cancel">{appTexts.text("cancel")}</ui-button>
        <ui-button
          class="AppSnapshotGo"
          color="primary"
          loading={isBusy() ? "" : undefined}
          onClick={() => void (shot() ? save() : takeSnapshot())}
        >
          {appTexts.text(shot() ? "snapshotSave" : "snapshotTake")}
        </ui-button>
      </ui-actions>
    </ui-modal>
  )
}

/** The phone's screen, wide, in CSS pixels:  a phone's, as the home page's pictures are taken in. */
export const SCREEN_WIDTH = 390

/** The card's shape, high by wide:  9 by 16, its banner. */
const CARD_SHAPE = 9 / 16

/** The frame over the snapshot, high, in CSS pixels:  the card's shape, the screen's width. */
const FRAME_HEIGHT = SCREEN_WIDTH * CARD_SHAPE

/** The saved picture's size, in pixels:  twice the screen's, as the others are (a phone's screen). */
const PICTURE_WIDTH = SCREEN_WIDTH * 2
const PICTURE_HEIGHT = Math.round(PICTURE_WIDTH * CARD_SHAPE)

/** How far an arrow key moves the frame, in CSS pixels;  with Shift. */
const STEP = 4
const BIG_STEP = 40

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

/** What makes the runner's page its app alone:  the app's box over everything, the page's full size. */
const APP_ALONE_CSS = `.AppRoot {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  overflow: auto !important;
  background: var(--spell-app-background, Canvas);
}`

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
  /** the project's title, in the heading */
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
