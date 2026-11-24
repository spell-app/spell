// By file, as `Dragging`:  the page's ONE long-press detector
import { LongPress, LONG_PRESS_EVENT } from "spell/util/LongPress"

import { isRunningApp } from "spell/app/app/pages/editorHotkeys"
import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { Inspector } from "./Inspector"
import { PartEdits } from "./PartEdits"

/****************
 * ### `PartLongPress`
 * In Edit, a LONG PRESS on any part of the app lifts it, selected, and starts the editor's drag that rearranges it
 * (epic `editor` I330;  Owen:  "Keep cards the way they work now, drag to rearrange in the editor should be a
 * long-press").
 * - A plain press and move is still the running app's:  a card drags as a card, a text selects its words.
 * - Held still on a part (the page's ONE detector, `LongPress`:  500ms, under 8px), then moved:  it moves where it's
 *   dropped, into your draft, as any drag in Edit does (`PartEdits.startDrag()`).
 * - Any pointer:  a mouse, a pen or a finger.
 * - Never while inspecting (a click there selects), nor in Run, nor on the editor's own boxes there (`EDITOR_OWN`,
 *   Design's picker):  their clicks stay theirs.
 * - Its own file, so `PartEdits` (whose drag it starts) needn't know about long presses.
 * - SIDE EFFECT:  `watch()` adds the editor's owner to the page's detector, once.
 ****************/
export class PartLongPress {
  /** Long presses lift parts;  off for now (editor T161), so a press in Edit is the app's alone */
  static isOn = false

  /**
   * Lift parts of the app drawn in `area` on a long press;  `partAt` finds the part an event is on.
   * - Returns the cleanup.
   */
  static watch(area: HTMLElement, partAt: (event: Event) => Element | undefined): () => void {
    // OFF for now (Owen, 2026-11-24, editor T161):  the long press wasn't right for selecting
    if (!PartLongPress.isOn) return () => {}
    watched = area
    LongPress.listen(isTheEditors)
    const stop = new AbortController()
    // the last press in the app:  the long press goes on as it, so the drag follows that pointer
    let press: { pointerId: number; pointerType: string } | undefined
    area.addEventListener(
      "pointerdown",
      ({ pointerId, pointerType }) => {
        press = { pointerId, pointerType }
      },
      { capture: true, signal: stop.signal }
    )
    area.addEventListener(
      LONG_PRESS_EVENT,
      (event) => {
        if (!isEditing() || !press) return
        const part = partAt(event)
        if (!part) return
        // the editor's, in Edit:  never the program's own `on long press` too
        event.preventDefault()
        event.stopPropagation()
        Inspector.select(part)
        const { clientX, clientY } = event as MouseEvent
        const down = new PointerEvent("pointerdown", { ...press, clientX, clientY, button: 0, isPrimary: true })
        // after the detector's `pointercancel`, which ends whatever was watching the press, a drag started now too
        queueMicrotask(() => PartEdits.startDrag(part, down))
      },
      { capture: true, signal: stop.signal }
    )
    return () => {
      stop.abort()
      if (watched === area) watched = undefined
    }
  }
}

/** The app's area being watched now:  where a press is the editor's. */
let watched: HTMLElement | undefined

/** Is the editor in Edit, neither inspecting nor running the app? */
function isEditing(): boolean {
  return !Inspector.isInspecting && !isRunningApp()
}

/** The editor's presses, any pointer:  in Edit, on a part of the app in the watched area, never on the editor's own. */
function isTheEditors(path: readonly EventTarget[]): boolean {
  const area = watched
  if (!area || !isEditing() || !path.includes(area)) return false
  const elements = path.filter((target): target is Element => target instanceof Element)
  if (elements.some((element) => element.hasAttribute(EDITOR_OWN))) return false
  return elements.some((element) => element !== area && Inspector.isPart(element))
}
