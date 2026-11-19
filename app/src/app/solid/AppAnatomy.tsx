import { For, Show, createEffect, createMemo, createSignal, onCleanup, onSettled, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { setDebugGlobal } from "spell/util"
import { DRAG_START_PX } from "spell/util/Dragging"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { AnatomyFloors, type Floor } from "./AppAnatomyFloors"
import { barTooltip } from "./chrome"
import { Inspector } from "./Inspector"
import { on } from "./on"

import "./AppAnatomy.css"

/****************
 * ### `AppAnatomy`
 * The running app pulled apart into floors, in 3D (epic `editor` P34, after React Anatomy):
 * each view it draws lifted over the view that holds it, labelled with its type.
 * - Its switch is beside Inspect app in the top bar (`<AnatomyButton>`), and View › Anatomy (⌥⌘A).
 * - The app itself turns and lifts (Q42 A):  the game keeps running on its floors, a live edit shows at once.
 *   - Turned off, every style it set is put back as it was (`AnatomyStyles`).
 * - Or Outlines (Q42's B, a switch in its bar):  each view an empty labelled frame, the app hidden under them.
 * - In the app pane, where the app already is (Q43 A);  Full Window lifts the pane over the whole editor (Q43 C).
 * - A floor per view the program draws (Q44 A);  Parts adds Spell UI's parts inside them, remembered per project.
 * - A floor's hover rings it as Inspect app's hover does, and a click selects it as a click on the app does:
 *   the tree's row, the properties and the code follow (`Inspector.clicked()`).
 * - A double-click (or F, what's selected) shows one floor and what's inside it alone;  Esc goes back to the whole
 *   app, then folds it flat (both keys in `EDITOR_HOTKEYS`).
 * - The app's own clicks and drags wait while it shows:  ⌥ held passes them on, so the game can still be played.
 * - The state is the page's, one Anatomy at a time:  STATIC and instance-free on purpose, as `Inspector` is.
 ****************/
export class AppAnatomy {
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
   * Pull the app apart, the whole app shown:  face on for a second, then turning to its resting angle (`turnOpen()`).
   * - SIDE EFFECT:  stops inspecting:  a click on a floor selects already.
   */
  static show(): void {
    if (isShowing()) return
    Inspector.stopInspecting()
    setPartsShown(!!editorPrefs.get(Inspector.projectPref(PARTS_PREF)))
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

  /** Are Spell UI's parts floors of their own too (reactive)? */
  static get showsParts(): boolean {
    return partsShown()
  }

  /** How the floors are drawn (reactive):  the live app, or outlines. */
  static get look(): AnatomyLook {
    return look()
  }

  /**
   * What it shows as floors (reactive):  your views (`top`), every part inside them too (`parts`), or outlines.
   * - Outlines frame your views alone:  All Parts is the live look's.
   */
  static get shows(): AnatomyShows {
    return look() === "outlines" ? "outlines" : partsShown() ? "parts" : "top"
  }

  /** Show your views, every part too, or outlines;  remembered, the parts with the project. */
  static setShows(next: AnatomyShows): void {
    const [nextLook, parts]: [AnatomyLook, boolean] =
      next === "outlines" ? ["outlines", false] : ["live", next === "parts"]
    setLook(nextLook)
    editorPrefs.set(LOOK_PREF, nextLook)
    setPartsShown(parts)
    editorPrefs.set(Inspector.projectPref(PARTS_PREF), parts || undefined)
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

  /** How many floors deep it comes apart (reactive):  a floor below that sits flat on the one above it. */
  static get depth(): number {
    return depth()
  }

  /** Set how many floors deep it comes apart;  remembered. */
  static setDepth(levels: number): void {
    setDepth(levels)
    editorPrefs.set(DEPTH_PREF, levels)
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

/** How Anatomy draws its floors:  the live app lifted apart, or empty labelled outlines. */
export type AnatomyLook = "live" | "outlines"

/** What Anatomy shows as floors:  your views, every part inside them too, or outlines of your views. */
export type AnatomyShows = "top" | "parts" | "outlines"

/** What a click does while Anatomy shows:  goes to the app, or picks a floor. */
export type AnatomyClicks = "play" | "inspect"

/** The prefs it remembers:  the look, the spacing and depth;  the Parts switch, each project's own. */
const LOOK_PREF = "anatomy:look"
const SPACING_PREF = "anatomy:spacing"
const DEPTH_PREF = "anatomy:depth"
const PARTS_PREF = "anatomy:parts"
editorPrefs.declare(LOOK_PREF, { oneOf: ["live", "outlines"] })
editorPrefs.declare(SPACING_PREF, { type: "number", default: 48 })
editorPrefs.declare(DEPTH_PREF, { type: "number", default: 8 })

/**
 * The turn it rests at once open:  its bottom tipped away a little and turned a little, still mostly facing you.
 * - Bottom away, not top:  the layers lift down the screen, so the app's own top bar stays in view (Owen, I256).
 */
const RESTING = { tilt: -14, spin: -24 }
/** Front:  straight on, where it opens. */
const FRONT = { tilt: 0, spin: 0 }
/** How long it opens face on before turning, and how long the turn takes, msec. */
const OPEN_HOLD_MS = 1000
const OPEN_TURN_MS = 700
/** The size it starts at, so the turned stack fits the pane. */
const START_ZOOM = 0.72
/** The least and most it zooms. */
const ZOOMS = { least: 0.2, most: 4 }
/** How soon a second click on a floor makes a double-click, msec. */
const DOUBLE_CLICK_MS = 400
/** Degrees a pixel of drag turns it. */
const TURN_PER_PX = 0.4
/** How far away the eye is, px:  the stack's perspective. */
const EYE_DISTANCE = 2400
/** The slider ranges. */
const SPACINGS = { least: 0, most: 160, step: 4 }

const [isShowing, setShowing] = createSignal(false)
const [look, setLook] = createSignal<AnatomyLook>(editorPrefs.get(LOOK_PREF) as AnatomyLook)
const [spacing, setSpacing] = createSignal(editorPrefs.get(SPACING_PREF) as number)
const [depth, setDepth] = createSignal(editorPrefs.get(DEPTH_PREF) as number)
const [partsShown, setPartsShown] = createSignal(false)
const [focus, setFocus] = createSignal<Element>()
const [turn, setTurn] = createSignal(FRONT)
const [zoom, setZoom] = createSignal(START_ZOOM)
const [isFullWindow, setFullWindow] = createSignal(false)
const [clicks, setClicks] = createSignal<AnatomyClicks>("inspect")

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
function stopTurning(): void {
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
      label={appTexts.text("anatomy")}
      aria-pressed={AppAnatomy.isShowing ? "true" : "false"}
      {...barTooltip(appTexts.text(AppAnatomy.isShowing ? "anatomyStopTip" : "anatomyTip"))}
      onClick={() => AppAnatomy.toggle()}
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

/** Anatomy while it shows:  see `<AppAnatomyView>`. */
function AnatomyStack(props: { pane: HTMLElement; body: HTMLElement; program: HTMLElement }): JSX.Element {
  const { pane, body, program } = props
  const styles = new AnatomyStyles()
  const redrawn = watchRedraws(program)
  const floors = createMemo(() => {
    redrawn()
    return AnatomyFloors.in(program, { parts: partsShown(), isPart: Inspector.isPart })
  })
  const deepest = createMemo(() => Math.max(1, ...floors().map((floor) => floor.depth)))
  const [tags, setTags] = createSignal<FloorTag[]>([])
  const [frames, setFrames] = createSignal<FloorFrame[]>([])
  const [hovered, setHovered] = createSignal<Element>()

  // what's shown as a floor of its own now:  within the depth, inside the focus, and liftable in the live look
  const shown = (floor: Floor, state: StackState) =>
    floor.depth <= state.depth &&
    (state.look === "outlines" || !floor.isFlat) &&
    (!state.focus || state.focus === floor.element || isInside(floor, state.focus))

  createEffect(
    (): StackState => ({
      floors: floors(),
      look: look(),
      spacing: spacing(),
      depth: depth(),
      focus: focus(),
      turn: turn(),
      zoom: zoom(),
      selected: Inspector.allSelected.map((part) => part.element),
      hovered: hovered()
    }),
    (state) => {
      styles.apply({ state, body, program, shown })
      const paneBox = pane.getBoundingClientRect()
      if (state.look === "live") {
        setFrames([])
        setTags(
          tagsFor(
            state.floors.filter((floor) => shown(floor, state)),
            paneBox
          )
        )
      } else {
        setTags([])
        setFrames(framesFor(state, program, shown))
      }
    }
  )
  document.body.classList.add(SHOWING_CLASS)
  onCleanup(() => {
    styles.putBack()
    document.body.classList.remove(SHOWING_CLASS)
  })

  // a floor under the pointer:  the first along its path that shows as a floor
  const floorAt = (event: Event): Element | undefined => {
    const state = { look: look(), depth: depth(), focus: focus() } as StackState
    const byElement = new Map(floors().map((floor) => [floor.element as Element, floor]))
    for (const target of event.composedPath()) {
      if (!(target instanceof Element)) continue
      const framed = frameFloors.get(target)
      if (framed) return framed
      const floor = byElement.get(target)
      if (floor && shown(floor, state)) return clickedFloor(floor, (each) => shown(each, state))
    }
    return undefined
  }
  usePointer({ body, pane, floorAt, setHovered })

  return (
    <>
      <AnatomyFullWindow pane={pane} />
      <Show when={AppAnatomy.isFullWindow}>
        <span class="AnatomyEscHint">{appTexts.text("anatomyEscToClose")}</span>
      </Show>
      <Show when={frames().length}>
        <div class="AnatomyOutlines" style={{ perspective: `${EYE_DISTANCE}px` }}>
          <div class="AnatomyOutlinesStage" style={frameStageStyle(program, pane)}>
            <For each={frames()} keyed={(frame) => frame.element}>
              {(frame) => (
                <div
                  class={["AnatomyFrame", frame().kind, { hovered: hovered() === frame().element }]}
                  style={{
                    left: `${frame().left}px`,
                    top: `${frame().top}px`,
                    width: `${frame().width}px`,
                    height: `${frame().height}px`,
                    transform: `translateZ(${frame().z}px)`
                  }}
                  ref={(div: HTMLDivElement) => frameFloors.set(div, untrack(frame).element)}
                >
                  <span class={["AnatomyTag", frame().kind]}>{frame().label}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
      <div class="AnatomyTags">
        <For each={tags()} keyed={(tag) => tag.element}>
          {(tag) => (
            <span
              class={[
                "AnatomyTag",
                tag().kind,
                { hovered: hovered() === tag().element, selected: Inspector.isSelected(tag().element) }
              ]}
              style={{ left: `${tag().left}px`, top: `${tag().top}px` }}
              title={tag().clips ? appTexts.text("anatomyFlatTip") : undefined}
            >
              {tag().label}
              <Show when={tag().clips}>
                <span class="AnatomyFlat">{appTexts.text("anatomyFlat")}</span>
              </Show>
            </span>
          )}
        </For>
      </div>
      <AnatomyBar deepest={deepest()} floors={floors()} />
    </>
  )
}

/** What the stack is drawn from:  the effect's whole input. */
type StackState = {
  floors: Floor[]
  look: AnatomyLook
  spacing: number
  depth: number
  focus: Element | undefined
  turn: { tilt: number; spin: number }
  zoom: number
  /** what's selected:  outlined on its floor, as the Inspector's own outline can't follow a turned floor */
  selected: Element[]
  /** the floor under the pointer:  ringed on its floor, turned with it, as the Inspector's hover ring can't be (I258) */
  hovered: Element | undefined
}

/** On `<body>` while Anatomy shows:  the Inspector's flat outline round what's selected gives way to the floor's. */
const SHOWING_CLASS = "AnatomyShowing"

/** Each outline frame's floor's element, for a click on the frame. */
const frameFloors = new WeakMap<Element, Element>()

/**
 * The floor a click on `floor` picks (I259):  a floor that fills the floor holding it (a pile's picture) is that
 * floor's face, so the click picks the floor under it;  clicked again, once that's selected, it picks the one on top.
 * - Down a chain of such floors, the outermost not selected yet, else the one just above what's selected.
 * - `isShown`:  whether a floor shows as a floor of its own now.
 */
function clickedFloor(floor: Floor, isShown: (floor: Floor) => boolean): Element {
  const chain = [floor]
  for (let top = floor; top.parent && isShown(top.parent) && AnatomyFloors.fillsParent(top); top = top.parent)
    chain.push(top.parent)
  const selectedAt = chain.findIndex((each, index) => index > 0 && Inspector.isSelected(each.element))
  return (selectedAt > 0 ? chain[selectedAt - 1]! : chain.at(-1)!).element
}

/** Is `floor` inside `focus`'s floor? */
function isInside(floor: Floor, focus: Element): boolean {
  for (let parent = floor.parent; parent; parent = parent.parent) if (parent.element === focus) return true
  return false
}

/** A floor's tag:  its type, at its top left corner on screen. */
type FloorTag = { element: Element; kind: Floor["kind"]; label: string; clips: boolean; left: number; top: number }

/**
 * The tags of `floors`, placed at each one's turned top left, in the pane's own pixels.
 * - Shallow floors first;  one that would sit on a tag already placed is left out, so they never pile up.
 */
function tagsFor(floors: Floor[], paneBox: DOMRect): FloorTag[] {
  const placed: DOMRect[] = []
  const tags: FloorTag[] = []
  const byDepth = [...floors].sort((one, other) => one.depth - other.depth)
  for (const floor of byDepth) {
    const box = floor.element.getBoundingClientRect()
    if (!box.width || !box.height) continue
    const label = Inspector.typeWordsOf(floor.element)
    const left = box.left - paneBox.left
    const top = box.top - paneBox.top
    const room = new DOMRect(left, top, label.length * TAG_LETTER_WIDTH + TAG_PADDING, TAG_HEIGHT)
    if (placed.some((other) => overlaps(room, other))) continue
    placed.push(room)
    tags.push({ element: floor.element, kind: floor.kind, label, clips: !!floor.clips, left, top })
  }
  return tags
}

/** About how wide a tag's letter is, its padding, and its height, px:  to keep tags off each other. */
const TAG_LETTER_WIDTH = 6.5
const TAG_PADDING = 12
const TAG_HEIGHT = 18

/** Do boxes `one` and `other` overlap? */
function overlaps(one: DOMRect, other: DOMRect): boolean {
  return one.left < other.right && other.left < one.right && one.top < other.bottom && other.top < one.bottom
}

/** An outline:  a floor's flat box, in the app's own pixels, lifted `z`. */
type FloorFrame = {
  element: Element
  kind: Floor["kind"]
  label: string
  left: number
  top: number
  width: number
  height: number
  z: number
}

/**
 * How far `floor` is lifted over the floor holding it, px:  `spacing`, and a step more for each card under it in a pile.
 * - A pile's step is a share of the spacing, smaller in a tall pile, so a 20-card pile stays near its column.
 */
function liftOf(floor: Floor, spacing: number): number {
  if (!floor.step) return spacing
  return spacing + floor.step * spacing * Math.min(PILE_STEP, PILE_MOST / floor.steps)
}

/** A pile's step, as a share of the spacing;  and the most a whole pile rises, in spacings. */
const PILE_STEP = 0.25
const PILE_MOST = 2

/**
 * The outlines:  each floor shown, measured flat where the app draws it, lifted by its depth and its pile.
 * - Measured with the app untouched:  the outlines look never turns it.
 */
function framesFor(state: StackState, program: HTMLElement, shown: (floor: Floor, state: StackState) => boolean) {
  const origin = program.getBoundingClientRect()
  // how high a floor is over the focus (or the app):  each floor's lift, from it down
  const heightOf = (floor: Floor): number =>
    !floor.parent || floor.element === state.focus ? 0 : liftOf(floor, state.spacing) + heightOf(floor.parent)
  return state.floors
    .filter((floor) => shown(floor, state))
    .map((floor): FloorFrame => {
      const box = floor.element.getBoundingClientRect()
      return {
        element: floor.element,
        kind: floor.kind,
        label: Inspector.typeWordsOf(floor.element),
        left: box.left - origin.left,
        top: box.top - origin.top,
        width: box.width,
        height: box.height,
        z: heightOf(floor)
      }
    })
}

/** Where the outlines' turned stage sits over the app, and its turn. */
function frameStageStyle(program: HTMLElement, pane: HTMLElement): JSX.CSSProperties {
  const [box, paneBox] = [program.getBoundingClientRect(), pane.getBoundingClientRect()]
  return {
    left: `${box.left - paneBox.left}px`,
    top: `${box.top - paneBox.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    transform: stageTurn(turn(), zoom())
  }
}

/** The stack's turn, as a CSS transform:  spun, then tilted back, then sized, then moved down clear of the bar. */
function stageTurn(turned: { tilt: number; spin: number }, size: number): string {
  return `translateY(${BAR_ROOM}px) scale(${size}) rotateX(${turned.tilt}deg) rotateY(${turned.spin}deg)`
}

/** How far down the stack is moved, px, so the bar over the pane's top hides less of it. */
const BAR_ROOM = 40

/**
 * A signal bumped once a frame at most while the app draws something new:  its children change, in its document or
 * any shadow root, or an element's style or class (a card turned over).
 * - Its own writes come back once:  `AnatomyStyles` writes only what differs, so the second pass writes nothing.
 */
function watchRedraws(program: HTMLElement): () => number {
  const [redrawn, setRedrawn] = createSignal(0)
  onSettled(() => {
    let frame = 0
    const observer = new MutationObserver(() => {
      frame ||= requestAnimationFrame(() => {
        frame = 0
        observeShadowRoots(program)
        setRedrawn((count) => count + 1)
      })
    })
    const options = { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] }
    // a drawn thing draws in its own shadow root, which a watch on the page never sees into:  each is watched too
    const observeShadowRoots = (root: ParentNode): void => {
      for (const element of root.querySelectorAll("*")) {
        if (!element.shadowRoot) continue
        observer.observe(element.shadowRoot, options)
        observeShadowRoots(element.shadowRoot)
      }
    }
    observer.observe(program, options)
    observeShadowRoots(program)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  })
  return redrawn
}

/**
 * The pointer while Anatomy shows, taken before the app sees it:
 * - a drag turns the stack;  the wheel zooms
 * - a hover rings the floor under it, drawn on the floor itself;  a click selects it, as a click on the app does
 * - a double-click shows that floor alone
 * - Play (`AppAnatomy.clicks`):  every press goes on to the app, so the game can be played;  ⌥ held flips it
 */
function usePointer(props: {
  body: HTMLElement
  pane: HTMLElement
  floorAt: (event: Event) => Element | undefined
  setHovered: (element: Element | undefined) => void
}): void {
  const { body, pane, floorAt, setHovered } = props
  onSettled(() => {
    let press: { x: number; y: number; turn: { tilt: number; spin: number }; isTurning: boolean } | undefined
    // the last click:  its floor and when, so a second on it soon after is a double-click
    // (the first may move the floors, the Inspector opening;  and the browser sends no dblclick once its press is taken)
    let lastClick: { floor: Element | undefined; at: number } | undefined
    const isOver = (event: Event) => {
      const path = event.composedPath()
      return path.includes(body) || (path.includes(pane) && !path.some(isBar))
    }
    // Play, or Inspect with ⌥ held:  the press goes on to the app
    const passesOn = (event: MouseEvent) => event.altKey !== (clicks() === "play")
    const swallow = (event: Event) => {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
    const down = (event: PointerEvent) => {
      if (!isOver(event) || passesOn(event) || event.button !== 0) return
      swallow(event)
      press = { x: event.clientX, y: event.clientY, turn: turn(), isTurning: false }
    }
    const moved = (event: PointerEvent) => {
      if (press) {
        const [dx, dy] = [event.clientX - press.x, event.clientY - press.y]
        press.isTurning ||= Math.hypot(dx, dy) >= DRAG_START_PX
        if (press.isTurning) {
          stopTurning()
          setTurn({ tilt: press.turn.tilt - dy * TURN_PER_PX, spin: press.turn.spin + dx * TURN_PER_PX })
          setHovered(undefined)
        }
        swallow(event)
        return
      }
      if (!isOver(event)) return
      setHovered(passesOn(event) ? undefined : floorAt(event))
    }
    const up = (event: PointerEvent) => {
      if (!press) return
      swallow(event)
      const wasTurning = press.isTurning
      press = undefined
      if (wasTurning) return
      const isDouble = !!lastClick && event.timeStamp - lastClick.at < DOUBLE_CLICK_MS
      const floor = isDouble ? lastClick!.floor : floorAt(event)
      lastClick = isDouble ? undefined : { floor, at: event.timeStamp }
      if (isDouble) return AppAnatomy.focusOn(floor)
      if (!floor) return Inspector.letGo()
      Inspector.open()
      Inspector.clicked(floor, Inspector.listAround(floor), event)
    }
    // the app's own click, double-click and presses never reach it:  the pointer's up is the click here
    const clicked = (event: MouseEvent) => {
      if (isOver(event) && !passesOn(event)) swallow(event)
    }
    const zoomed = (event: WheelEvent) => {
      event.preventDefault()
      setZoom((size) => Math.min(ZOOMS.most, Math.max(ZOOMS.least, size * Math.exp(-event.deltaY * 0.002))))
    }
    const left = () => setHovered(undefined)
    const listeners: [string, EventListener][] = [
      ["pointerdown", down as EventListener],
      ["pointermove", moved as EventListener],
      ["pointerup", up as EventListener],
      ["pointercancel", () => (press = undefined)],
      ["mousedown", clicked as EventListener],
      ["mouseup", clicked as EventListener],
      ["click", clicked as EventListener],
      ["dblclick", clicked as EventListener]
    ]
    for (const [type, listener] of listeners) window.addEventListener(type, listener, true)
    body.addEventListener("wheel", zoomed, { passive: false })
    body.addEventListener("pointerleave", left)
    return () => {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener, true)
      body.removeEventListener("wheel", zoomed)
      body.removeEventListener("pointerleave", left)
      Inspector.ring(undefined)
    }
  })
}

/** Is `target` Anatomy's own bar, whose clicks are its controls'? */
function isBar(target: EventTarget): boolean {
  return target instanceof Element && target.classList.contains("AnatomyBar")
}

/****************
 * ### `<AnatomyBar>`
 * Anatomy's bar, across the top of the app pane:  where it's looking, and how.
 * - Left:  "Solitaire in 3D", then the floors down to the one shown alone, each a link back to it (breadcrumbs);
 *   then Play | Inspect, what a click does (T117).
 * - Then Front, Spacing and Depth (sliders), and Top Level | All Parts | Outlines, what it shows (I257).
 * - At the right end, icons alone:  how to use it, Full Window, Close, each with the browser's own tooltip.
 * - `deepest`:  the deepest floor, Depth's most.
 ****************/
function AnatomyBar(props: { deepest: number; floors: Floor[] }): JSX.Element {
  const crumbs = () => {
    const shown = focus()
    const floor = shown && props.floors.find((each) => each.element === shown)
    const chain: Floor[] = []
    for (let each = floor; each; each = each.parent) chain.unshift(each)
    return chain
  }
  const appName = () => {
    const app = props.floors[0]?.element
    return app ? Inspector.typeWordsOf(app) : appTexts.text("anatomy")
  }
  return (
    <div class="AnatomyBar" role="toolbar" aria-label={appTexts.text("anatomy")}>
      <span class="AnatomyCrumbs">
        <ui-icon name={ANATOMY_ICON} />
        <a class={["AnatomyCrumb", { current: !focus() }]} onClick={() => AppAnatomy.focusOn(undefined)}>
          {appTexts.text("anatomyWholeApp", { app: appName() })}
        </a>
        <For each={crumbs()}>
          {(floor) => (
            <>
              <span class="AnatomyCrumbGap">›</span>
              <a
                class={["AnatomyCrumb", { current: floor.element === focus() }]}
                onClick={() => AppAnatomy.focusOn(floor.element)}
              >
                {Inspector.typeWordsOf(floor.element)}
              </a>
            </>
          )}
        </For>
      </span>
      {/* each segmented menu has a `name`:  only then does a choice send `ui-changed` */}
      <ui-menu
        appearance="segmented link"
        size="small"
        class="AnatomyClicks"
        name="anatomy-clicks"
        aria-label={appTexts.text("anatomyClicks")}
        value={AppAnatomy.clicks}
        ref={on<{ value: string }>("ui-changed", (event) => AppAnatomy.setClicks(event.detail.value as AnatomyClicks))}
      >
        <ui-item value="play" title={appTexts.text("anatomyPlayTip")}>
          {appTexts.text("anatomyPlay")}
        </ui-item>
        <ui-item value="inspect" title={appTexts.text("anatomyInspectTip")}>
          {appTexts.text("anatomyInspect")}
        </ui-item>
      </ui-menu>
      <span class="AnatomyControls">
        <ui-button size="tiny" {...barTooltip(appTexts.text("anatomyFrontTip"))} onClick={() => AppAnatomy.front()}>
          {appTexts.text("anatomyFront")}
        </ui-button>
        <label class="AnatomySlider">
          {appTexts.text("anatomySpacing")}
          <ui-slider
            size="mini"
            min={SPACINGS.least}
            max={SPACINGS.most}
            step={SPACINGS.step}
            value={AppAnatomy.spacing}
            aria-label={appTexts.text("anatomySpacing")}
            ref={on<{ value: number }>("ui-moved", (event) => AppAnatomy.setSpacing(event.detail.value))}
          />
        </label>
        <label class="AnatomySlider">
          {appTexts.text("anatomyDepth")}
          <ui-slider
            size="mini"
            min={1}
            max={props.deepest}
            step={1}
            value={Math.min(AppAnatomy.depth, props.deepest)}
            aria-label={appTexts.text("anatomyDepth")}
            ref={on<{ value: number }>("ui-moved", (event) => AppAnatomy.setDepth(event.detail.value))}
          />
        </label>
      </span>
      <ui-menu
        appearance="segmented link"
        size="small"
        class="AnatomyShows"
        name="anatomy-shows"
        aria-label={appTexts.text("anatomyShows")}
        value={AppAnatomy.shows}
        ref={on<{ value: string }>("ui-changed", (event) => AppAnatomy.setShows(event.detail.value as AnatomyShows))}
      >
        <ui-item value="top" title={appTexts.text("anatomyTopLevelTip")}>
          {appTexts.text("anatomyTopLevel")}
        </ui-item>
        <ui-item value="parts" title={appTexts.text("anatomyAllPartsTip")}>
          {appTexts.text("anatomyAllParts")}
        </ui-item>
        <ui-item value="outlines" title={appTexts.text("anatomyOutlinesTip")}>
          {appTexts.text("anatomyOutlines")}
        </ui-item>
      </ui-menu>
      {/* icons alone at the right end:  how to use it (its tooltip), Full Window, Close */}
      <span class="AnatomyEnd">
        <ui-icon name="question circle outline" class="AnatomyHelp" title={appTexts.text("anatomyHelp")} />
        <ui-icon
          name={AppAnatomy.isFullWindow ? "compress" : "expand"}
          link=""
          class="AnatomyFullWindowToggle"
          role="button"
          aria-pressed={AppAnatomy.isFullWindow ? "true" : "false"}
          label={appTexts.text("anatomyFullWindow")}
          title={appTexts.text("anatomyFullWindowTip")}
          onClick={() => AppAnatomy.toggleFullWindow()}
        />
        <ui-icon
          name="close"
          link=""
          class="AnatomyClose"
          role="button"
          label={appTexts.text("anatomyClose")}
          title={appTexts.text("anatomyStopTip")}
          onClick={() => AppAnatomy.hide()}
        />
      </span>
    </div>
  )
}

/** Full Window:  the pane's own class while it's on (Q43 C), and Esc's place in it, taken back as it ends. */
function AnatomyFullWindow(props: { pane: HTMLElement }): JSX.Element {
  createEffect(isFullWindow, (isOn) => {
    props.pane.classList.toggle("AnatomyFullWindow", isOn)
  })
  onCleanup(() => props.pane.classList.remove("AnatomyFullWindow"))
  return null
}

/****************
 * ### `AnatomyStyles`
 * The inline styles Anatomy sets on the app's elements while it shows, and puts back as they were.
 * - Lifted floors:  `translate`'s depth, which adds to an element's own `transform` (a card flipped) rather than
 *   replacing it.
 * - Every box between a lifted floor and the turned `program`:  `transform-style: preserve-3d`, so it lifts off.
 * - The editor's own wrappers round the app:  `overflow: visible`, so the turned stack isn't cut at their edges.
 * - The focus:  the rest hidden (`visibility`), the floor shown and what's inside it.
 * - `apply()` writes only what differs, so its own writes, seen by the watch on the app, settle in one pass.
 ****************/
class AnatomyStyles {
  /**
   * Restyle the app for `state`:  set what it asks for, and put back what it no longer does.
   * - `shown`:  which floors show as floors of their own.
   */
  apply({
    state,
    body,
    program,
    shown
  }: {
    state: StackState
    body: HTMLElement
    program: HTMLElement
    shown: (floor: Floor, state: StackState) => boolean
  }): void {
    const wanted = new Map<HTMLElement, Record<string, string>>()
    const want = (element: HTMLElement, property: string, value: string) => {
      const props = wanted.get(element) ?? {}
      props[property] = value
      wanted.set(element, props)
    }
    if (state.look === "outlines") want(program, "visibility", "hidden")
    else {
      want(body, "perspective", `${EYE_DISTANCE}px`)
      want(program, "transform", stageTurn(state.turn, state.zoom))
      want(program, "transform-style", "preserve-3d")
      const app = state.floors[0]?.element
      for (const floor of state.floors) {
        if (!floor.parent || !shown(floor, state)) continue
        want(
          floor.element,
          "translate",
          liftedBy(this.ownStyle(floor.element, "translate"), liftOf(floor, state.spacing))
        )
        for (const box of AnatomyFloors.boxesBetween(floor.element, program)) {
          want(box, "transform-style", "preserve-3d")
          if (app && !app.contains(box) && !isInShadowOf(box, app)) want(box, "overflow", "visible")
        }
      }
      if (state.hovered instanceof HTMLElement && !state.selected.includes(state.hovered)) {
        want(state.hovered, "outline", HOVERED_OUTLINE)
        want(state.hovered, "outline-offset", "2px")
      }
      for (const element of state.selected) {
        if (!(element instanceof HTMLElement)) continue
        want(element, "outline", SELECTED_OUTLINE)
        want(element, "outline-offset", "2px")
      }
      if (state.focus instanceof HTMLElement) {
        want(program, "visibility", "hidden")
        want(state.focus, "visibility", "visible")
      }
    }
    for (const [element, props] of this.set) {
      for (const property of Object.keys(props)) {
        if (wanted.get(element)?.[property] === undefined) this.putBackOne(element, property)
      }
    }
    for (const [element, props] of wanted) {
      for (const [property, value] of Object.entries(props)) this.setOne(element, property, value)
    }
  }

  /** Put every style it set back as it was. */
  putBack(): void {
    for (const [element, props] of this.set)
      for (const property of Object.keys(props)) this.putBackOne(element, property)
  }

  /** Set `property` on `element` to `value`, remembering what it was. */
  private setOne(element: HTMLElement, property: string, value: string): void {
    const kept = this.set.get(element) ?? {}
    if (!(property in kept)) {
      kept[property] = element.style.getPropertyValue(property)
      this.set.set(element, kept)
    }
    if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value)
  }

  /** Put `property` back on `element` as it was before Anatomy. */
  private putBackOne(element: HTMLElement, property: string): void {
    const kept = this.set.get(element)
    if (!kept || !(property in kept)) return
    const was = kept[property]!
    delete kept[property]
    if (!Object.keys(kept).length) this.set.delete(element)
    if (was) element.style.setProperty(property, was)
    else element.style.removeProperty(property)
  }

  /** `element`'s own inline `property`, before Anatomy set it. */
  ownStyle(element: HTMLElement, property: string): string {
    const kept = this.set.get(element)
    return kept && property in kept ? kept[property]! : element.style.getPropertyValue(property)
  }

  /** Each element's inline styles before Anatomy set them:  `""` for none. */
  private set = new Map<HTMLElement, Record<string, string>>()
}

/** What's selected, outlined on its floor:  the views' colour, as its tag. */
const SELECTED_OUTLINE = "2px solid var(--bubbly-thing, #7c5cd6)"
/** The floor under the pointer, ringed on its floor:  dashed, as Inspect app's hover ring. */
const HOVERED_OUTLINE = "2px dashed var(--bubbly-thing, #7c5cd6)"

/** An element's own `translate` (`own`, inline), lifted `by` px toward the eye. */
function liftedBy(own: string, by: number): string {
  const [x = "0px", y = "0px"] = own && own !== "none" ? own.split(/\s+/) : []
  return `${x} ${y} ${by}px`
}

/** Is `element` inside `host`'s drawing:  in a shadow root under it? */
function isInShadowOf(element: Element, host: Element): boolean {
  for (let root = element.getRootNode(); root instanceof ShadowRoot; root = root.host.getRootNode()) {
    if (root.host === host || host.contains(root.host)) return true
  }
  return false
}

// for a look in the console, and the browser tests:  `AppAnatomy.view`
setDebugGlobal({ AppAnatomy })
