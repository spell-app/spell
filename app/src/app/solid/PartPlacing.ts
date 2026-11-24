import { setDebugGlobal } from "spell/util"

import type { SP } from "spell/parser/spell"
import { PartEdits, type ShownPlace } from "./PartEdits"

import "./PartPlacing.css"

/**
 * CLICK TO PLACE (epic `editor` T153):  a part picked up from the add rail with a click, and put in the app with the
 * next one, no mouse held down.
 * - Picked up (`pickUp()`):  a small ghost of it follows the pointer, and its rail icon stays lit (`isPicked()`,
 *   told through `watch()`).
 * - Over the app or the Views tree, the same drop line and empty-slot zones a drag shows (`PartEdits.placeAt()`):
 *   so placing and dragging never disagree.
 * - A click there puts it in, in the program's text (a draft, as every edit), and selects it;
 *   Shift-click puts one in and keeps it picked up for another.
 * - Escape, a click on its rail icon again (`pickUp()` of the same part), or a click with no place under it:
 *   put it down, nothing added.
 * - By keyboard:  `pickUp(..., { keyboard: true })` from Enter on a rail item;  the arrow keys move the drop line
 *   through the places it can go (`PartEdits.keyPlaces()`), and Enter puts it there.
 * - Holding the mouse down still drags, as before:  that's the rail's `PartEdits.startPaletteDrag()`.
 * - Plain DOM, no Solid:  the rail calls it, and lights its icon through `watch()`.
 */
export class PartPlacing {
  /**
   * Pick up `part` to place it:  what was picked up before is put down.
   * - The same part picked up again puts it down:  a second click on its rail icon.
   */
  static pickUp(part: PickedPart, { keyboard = false } = {}): void {
    const same = PartPlacing.picked?.label === part.label
    PartPlacing.putDown()
    if (same) return
    PartPlacing.picked = part
    const ghost = document.createElement("div")
    ghost.className = "PartPlaceGhost"
    ghost.textContent = part.label
    ghost.hidden = true
    document.body.append(ghost)
    const stop = new AbortController()
    const options = { capture: true, signal: stop.signal }
    window.addEventListener("pointermove", (event) => PartPlacing.aimAt(event.clientX, event.clientY), options)
    window.addEventListener("pointerdown", (event) => PartPlacing.onPress(event), options)
    window.addEventListener("keydown", (event) => PartPlacing.onKey(event), options)
    PartPlacing.ending = () => {
      stop.abort()
      ghost.remove()
    }
    PartPlacing.ghost = ghost
    if (keyboard) PartPlacing.step(1)
    PartPlacing.tell()
  }

  /** Put down what's picked up, adding nothing.  Nothing picked up:  nothing happens. */
  static putDown(): void {
    if (!PartPlacing.picked) return
    PartPlacing.picked = undefined
    PartPlacing.ending?.()
    PartPlacing.ending = undefined
    PartPlacing.ghost = undefined
    PartPlacing.keyIndex = -1
    PartEdits.showPlace(undefined)
    PartPlacing.tell()
  }

  /** Is `label`'s part the one picked up?  For its rail icon, lit while it is. */
  static isPicked(label: string): boolean {
    return PartPlacing.picked?.label === label
  }

  /** Tell `listener` whenever something is picked up or put down;  answers how to stop. */
  static watch(listener: () => void): () => void {
    PartPlacing.listeners.add(listener)
    return () => PartPlacing.listeners.delete(listener)
  }

  ////////////////
  // ## Aiming and placing
  ////////////////

  /** The pointer is at (`x`, `y`):  the ghost follows, and the place under it shows. */
  private static aimAt(x: number, y: number): void {
    const ghost = PartPlacing.ghost
    if (ghost) {
      ghost.hidden = false
      ghost.style.left = `${x + GHOST_GAP}px`
      ghost.style.top = `${y + GHOST_GAP}px`
    }
    PartPlacing.keyIndex = -1
    PartEdits.showPlace(PartEdits.placeAt(x, y, []))
  }

  /**
   * A press while something's picked up:  over a place, it goes there (Shift:  and stays picked up);
   * else it's put down.
   * - A press on the rail (`[data-part-rail]`) is the rail's:  its icon picks up or puts down.
   * - Taken before anything else hears it:  the app's own click, or the selection, never sees it.
   */
  private static onPress(event: PointerEvent): void {
    if (event.button !== 0) return
    if (event.composedPath().some((target) => target instanceof Element && target.hasAttribute(RAIL_MARK))) return
    event.preventDefault()
    event.stopPropagation()
    swallowClick()
    PartPlacing.aimAt(event.clientX, event.clientY)
    PartPlacing.placeHere({ keepsIt: event.shiftKey })
  }

  /** Escape puts it down;  the arrows move the drop line, Enter places it there (Shift+Enter:  and keeps it). */
  private static onKey(event: KeyboardEvent): void {
    const move = KEY_STEPS[event.key]
    if (event.key === "Escape") PartPlacing.putDown()
    else if (move) PartPlacing.step(move)
    else if (event.key === "Enter") PartPlacing.placeHere({ keepsIt: event.shiftKey })
    else return
    event.preventDefault()
    event.stopPropagation()
  }

  /** Move the drop line `by` places along the app's (`PartEdits.keyPlaces()`), from where it is. */
  private static step(by: number): void {
    const places = PartEdits.keyPlaces()
    if (!places.length) return
    const index = PartPlacing.keyIndex < 0 ? (by > 0 ? 0 : places.length - 1) : PartPlacing.keyIndex + by
    PartPlacing.keyIndex = Math.max(0, Math.min(places.length - 1, index))
    const shown: ShownPlace = places[PartPlacing.keyIndex]!
    PartEdits.showPlace(shown)
    PartPlacing.ghost?.toggleAttribute("hidden", true)
  }

  /** Put what's picked up where the drop line is:  none shown, it's put down instead. */
  private static placeHere({ keepsIt }: { keepsIt: boolean }): void {
    const part = PartPlacing.picked
    const place = PartEdits.placeShown
    if (!part || !place) return PartPlacing.putDown()
    PartEdits.add(part.codesFor(place.file), part.title, place)
    if (!keepsIt) PartPlacing.putDown()
  }

  /** Tell those watching that what's picked up changed. */
  private static tell(): void {
    for (const listener of PartPlacing.listeners) listener()
  }

  /** What's picked up. */
  private static picked: PickedPart | undefined

  /** Its ghost, following the pointer. */
  private static ghost: HTMLElement | undefined

  /** Stop listening and take the ghost away:  set while something's picked up. */
  private static ending: (() => void) | undefined

  /** Where the arrow keys have the drop line:  an index of `PartEdits.keyPlaces()`, or -1 for the pointer's. */
  private static keyIndex = -1

  /** Those told when something's picked up or put down. */
  private static listeners = new Set<() => void>()
}

/** A part picked up from the add rail. */
export type PickedPart = {
  /** its name in the rail, which the ghost shows:  `Button` */
  label: string
  /** the undo step's title:  `Add Button` */
  title: string
  /** what it writes, as code for `file` (in its language) */
  codesFor: (file: SP.AnySpellFile) => string[]
}

/** What the rail marks itself with, so a press on it is its own while something's picked up. */
export const RAIL_MARK = "data-part-rail"

/** The ghost's gap from the pointer, as a drag's. */
const GHOST_GAP = 8

/** How far each arrow key moves the drop line. */
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/**
 * Swallow the click that follows a press that placed something:  the app's buttons never hear it.
 * - Only that one:  a press with no click after it (let go elsewhere) leaves nothing waiting for a later one.
 */
function swallowClick(): void {
  const stop = new AbortController()
  const swallow = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    stop.abort()
  }
  window.addEventListener("click", swallow, { capture: true, signal: stop.signal })
  setTimeout(() => stop.abort(), CLICK_WAIT_MS)
}

/** How long after a press its click can come. */
const CLICK_WAIT_MS = 1000

setDebugGlobal({ PartPlacing })
