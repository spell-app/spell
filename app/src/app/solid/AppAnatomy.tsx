import { Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { barTooltip } from "./chrome"
import { Inspector } from "./Inspector"
import { LazyPiece } from "./LazyPiece"

import "./AppAnatomy.css"

/****************
 * ### `AppAnatomy`
 * The running app pulled apart into floors, in 3D (epic `editor` P34, after React Anatomy):
 * each view it draws lifted over the view that holds it, labelled with its type.
 * - Its switch is beside Inspect app in the top bar (`<AnatomyButton>`), and View › Anatomy (⌥⌘A).
 * - The app itself turns and lifts (Q42 A):  the game keeps running on its floors, a live edit shows at once.
 *   - Turned off, every style it set is put back as it was (`AnatomyStyles`).
 * - Views | Named | Outlines, a switch in its bar (T121):  the layers alone, the layers with their types' tags,
 *   or (Q42's B) each view an empty labelled frame, the app hidden under them.
 * - In the app pane, where the app already is (Q43 A);  Full Window lifts the pane over the whole editor (Q43 C).
 * - A floor per part the program draws, as the Views tree lists them (Q44 A;  Spell UI's too since I261),
 *   down to `DEPTH` floors deep.
 * - A floor's hover rings it as Inspect app's hover does, and a click selects it as a click on the app does:
 *   the tree's row, the properties and the code follow (`Inspector.clicked()`).
 * - A double-click (or F, what's selected) shows one floor and what's inside it alone;  Esc goes back to the whole
 *   app, then folds it flat (both keys in `EDITOR_HOTKEYS`).
 * - The app's own clicks and drags wait while it shows (Inspect):  ⌥ held, or Play, passes them on, so the game can
 *   still be played;  in Play a drag where the app takes none still turns it.
 * - The state is the page's, one Anatomy at a time:  STATIC and instance-free on purpose, as `Inspector` is.
 * - What draws it, `<AnatomyStack>`, is in `AppAnatomyStack.tsx`, loaded the first time it shows
 *   (`AppAnatomy.views`, a `LazyPiece`):  here is its state, in the editor's first load.
 ****************/
export class AppAnatomy {
  /** What draws Anatomy, loaded the first time it shows:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./AppAnatomyStack"))

  /** Is the app pulled apart (reactive)? */
  static get isShowing(): boolean {
    return isShowing()
  }

  /** Pull the app apart, or put it back. */
  static toggle(): void {
    if (isShowing()) AppAnatomy.hide()
    else AppAnatomy.show()
  }

  /**
   * Pull the app apart, the whole app shown:  face on for half a second, then turning to its resting angle (`turnOpen()`).
   * - SIDE EFFECT:  stops inspecting:  a click on a floor selects already.
   */
  static show(): void {
    if (isShowing()) return
    AppAnatomy.views.loadSoon()
    Inspector.stopInspecting()
    setFocus(undefined)
    setZoom(START_ZOOM)
    turnOpen()
    setShowing(true)
  }

  /** Fold the app back flat, as it was. */
  static hide(): void {
    stopTurning()
    setShowing(false)
    setFocus(undefined)
    setFullWindow(false)
  }

  /** Esc:  from one floor shown alone, back to the whole app;  else fold it back.  `false` when not showing. */
  static back(): boolean {
    if (!isShowing()) return false
    if (focus()) setFocus(undefined)
    else AppAnatomy.hide()
    return true
  }

  /** Show `element`'s floor and what's inside it alone (`undefined`:  the whole app). */
  static focusOn(element: Element | undefined): void {
    setFocus(() => element)
  }

  /** The floor shown alone, if any (reactive). */
  static get focus(): Element | undefined {
    return focus()
  }

  /** F:  show what's selected alone.  `false` when not showing, or nothing's selected. */
  static focusSelected(): boolean {
    const element = Inspector.selected?.element
    if (!isShowing() || !element) return false
    AppAnatomy.focusOn(element)
    return true
  }

  /** Look at it straight on again, at its starting size. */
  static front(): void {
    stopTurning()
    setTurn(FRONT)
    setZoom(START_ZOOM)
  }

  /** How the floors are drawn (reactive):  your views lifted apart, the same with their tags, or outlines of them. */
  static get look(): AnatomyLook {
    return look()
  }

  /** Show your views, with or without their tags, or outlines of them;  remembered. */
  static setLook(next: AnatomyLook): void {
    setLook(next)
    editorPrefs.set(LOOK_PREF, next)
  }

  /** What a click does while it shows (reactive):  plays the app, or picks a floor;  Option held does the other. */
  static get clicks(): AnatomyClicks {
    return clicks()
  }

  /** Let clicks through to the app (`play`), or pick floors with them (`inspect`). */
  static setClicks(next: AnatomyClicks): void {
    setClicks(next)
  }

  /** How far apart the floors are, px (reactive). */
  static get spacing(): number {
    return spacing()
  }

  /** Set how far apart the floors are, px;  remembered. */
  static setSpacing(px: number): void {
    setSpacing(px)
    editorPrefs.set(SPACING_PREF, px)
  }

  /** Does the pane cover the whole editor (reactive)? */
  static get isFullWindow(): boolean {
    return isFullWindow()
  }

  /** Cover the whole editor with the pane, or put it back in its place. */
  static toggleFullWindow(): void {
    setFullWindow(!isFullWindow())
  }

  /** The turn, degrees, and zoom, a scale (reactive). */
  static get view(): { tilt: number; spin: number; zoom: number } {
    return { ...turn(), zoom: zoom() }
  }
}

/**
 * How Anatomy draws its floors (T121):
 * - `views`:  the live app lifted apart, no tags (Owen:  "Labels are distracting")
 * - `named`:  the same, each floor tagged with its type
 * - `outlines`:  empty labelled frames
 */
export type AnatomyLook = "views" | "named" | "outlines"

/** What a click does while Anatomy shows:  goes to the app, or picks a floor. */
export type AnatomyClicks = "play" | "inspect"

/** The prefs it remembers:  the look and the spacing. */
const LOOK_PREF = "anatomy:look"
const SPACING_PREF = "anatomy:spacing"
// `live` was Views with their tags, before T121 parted them
editorPrefs.declare(LOOK_PREF, { oneOf: ["views", "named", "outlines"], renamed: { live: "views" } })
editorPrefs.declare(SPACING_PREF, { type: "number", default: 48 })

/** How many floors deep it comes apart:  a floor below that sits flat on the one above it. */
export const DEPTH = 8

/**
 * The turn it rests at once open:  its bottom tipped away a little and turned a little, still mostly facing you.
 * - Bottom away, not top:  the layers lift down the screen, so the app's own top bar stays in view (Owen, I256).
 */
const RESTING = { tilt: -14, spin: -24 }
/** Front:  straight on, where it opens. */
const FRONT = { tilt: 0, spin: 0 }
/** How long it opens face on before turning, and how long the turn takes, msec. */
const OPEN_HOLD_MS = 500
const OPEN_TURN_MS = 700
/** The size it starts at, so the turned stack fits the pane. */
const START_ZOOM = 0.72
/** The least and most it zooms. */
export const ZOOMS = { least: 0.2, most: 4 }
/** How soon a second click on a floor makes a double-click, msec. */
export const DOUBLE_CLICK_MS = 400
/** Degrees a pixel of drag turns it. */
export const TURN_PER_PX = 0.4
/** How far away the eye is, px:  the stack's perspective. */
export const EYE_DISTANCE = 2400
/** The slider ranges. */
export const SPACINGS = { least: 0, most: 160, step: 4 }

const [isShowing, setShowing] = createSignal(false)
export const [look, setLook] = createSignal<AnatomyLook>(editorPrefs.get(LOOK_PREF) as AnatomyLook)
export const [spacing, setSpacing] = createSignal(editorPrefs.get(SPACING_PREF) as number)
export const [focus, setFocus] = createSignal<Element>()
export const [turn, setTurn] = createSignal(FRONT)
export const [zoom, setZoom] = createSignal(START_ZOOM)
export const [isFullWindow, setFullWindow] = createSignal(false)
export const [clicks, setClicks] = createSignal<AnatomyClicks>("inspect")

/** The opening turn while it runs:  the wait before it, then its frame. */
let opening: { timer: ReturnType<typeof setTimeout>; frame: number } | undefined

/**
 * Open face on, wait `OPEN_HOLD_MS`, then turn to `RESTING` over `OPEN_TURN_MS`, easing in and out:
 * so it's seen to come apart from the app as it was.
 * - Asked for less motion (`prefers-reduced-motion`):  straight to `RESTING`, no wait, no turn.
 * - Front, a drag or closing stops it where it is (`stopTurning()`).
 */
function turnOpen(): void {
  stopTurning()
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void setTurn(RESTING)
  setTurn(FRONT)
  const turning = {
    timer: setTimeout(() => (turning.frame = requestAnimationFrame(turnFrom(performance.now()))), OPEN_HOLD_MS),
    frame: 0
  }
  opening = turning
  // each frame of the turn, from `start`
  function turnFrom(start: number) {
    const step = (now: number): void => {
      const done = Math.min(1, (now - start) / OPEN_TURN_MS)
      const eased = done < 0.5 ? 2 * done * done : 1 - (-2 * done + 2) ** 2 / 2
      setTurn({ tilt: RESTING.tilt * eased, spin: RESTING.spin * eased })
      if (done < 1) turning.frame = requestAnimationFrame(step)
      else if (opening === turning) opening = undefined
    }
    return step
  }
}

/** Stop the opening turn where it is, if it's running. */
export function stopTurning(): void {
  if (!opening) return
  clearTimeout(opening.timer)
  cancelAnimationFrame(opening.frame)
  opening = undefined
}

/****************
 * ### `<AnatomyButton>`
 * Anatomy's switch, in the top bar's Run | Edit group right after Inspect app (Q43 A):  pressed while it shows.
 * - A circled item, as Inspect app's is.
 ****************/
export function AnatomyButton(): JSX.Element {
  return (
    <ui-item
      icon={ANATOMY_ICON}
      appearance="circular"
      class={["AnatomyButton", { showing: AppAnatomy.isShowing }]}
      data-tour="anatomy"
      label={appTexts.text("anatomy")}
      aria-pressed={AppAnatomy.isShowing ? "true" : "false"}
      {...barTooltip(appTexts.text(AppAnatomy.isShowing ? "anatomyStopTip" : "anatomyTip"))}
      onClick={() => AppAnatomy.toggle()}
      ref={(button: Element) => AppAnatomy.views.ahead(button)}
    />
  )
}

/** Anatomy's icon:  floors stacked. */
export const ANATOMY_ICON = "layer group"

/****************
 * ### `<AppAnatomyView>`
 * Anatomy over the app pane, while it shows:  its bar, the floors' tags, the outlines, and the app turned and lifted.
 * - `pane`:  the app pane, which Full Window lifts over the editor.
 * - `body`:  where the app draws, the stack's room (its perspective).
 * - `program`:  what's turned:  the app, with the editor's few wrappers round it.
 * - The app's elements are restyled while it shows, and put back as it closes (`AnatomyStyles`).
 * - Worked out again when the app draws something new (a card moved, a live edit), keeping the turn and focus.
 * - SEE:  its App UI components page, `app/docs/AppAnatomyView.html` (`/components/app/AppAnatomyView.html`).
 ****************/
export function AppAnatomyView(props: {
  pane: () => HTMLElement | undefined
  body: () => HTMLElement | undefined
  program: () => HTMLElement | undefined
}): JSX.Element {
  return (
    <Show when={AppAnatomy.isShowing}>
      <AnatomyStack pane={props.pane()!} body={props.body()!} program={props.program()!} />
    </Show>
  )
}

/** Anatomy while it shows, loaded on first use:  see `AppAnatomyStack.tsx`. */
const AnatomyStack = AppAnatomy.views.view("AnatomyStack")
