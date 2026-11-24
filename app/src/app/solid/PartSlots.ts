import type { E } from "spell/element"
import { EDITOR_OWN } from "spell/app/app/ui/ui.types"

import "./PartSlots.css"

/**
 * A part's EMPTY SLOTS, as somewhere to drop or place something (epic `editor` T150):
 * the content parts its Spell UI element owns but doesn't have yet, a modal's `<actions>` or `<header>`.
 * - While something is dragged or placed, the slots of what's under the pointer show as dashed drop zones,
 *   each labelled like the editor's tag pills, `⟨actions⟩`, gone once it's let go (`show()`, `clear()`).
 * - The Views tree lists them as greyed rows, for a part that isn't drawn (a closed modal):  `<InspectorParts>`.
 * - What a slot can be is the element's vocabulary, its `ownsParts`:  only the generic content parts (`SLOT_ORDER`),
 *   never the ones it repeats (a menu's items, a group's cards), which any drop inside it already lands among.
 * - Plain DOM, no Solid and nothing of the source:  `PartEdits` turns a slot into a place in the program's text.
 */
export class PartSlots {
  /**
   * The slots `element` owns and doesn't fill yet, in the order they're drawn:  `["header", "actions"]`.
   * - Filled:  a child that is that part (`<ui-actions>`), or an attribute that draws it (`heading`, `content`).
   */
  static emptyOf(element: Element): string[] {
    const vocabulary = vocabularyOf(element)
    const owned = vocabulary?.ownsParts
    if (!Array.isArray(owned)) return []
    const filled = new Set([...element.children].map((child) => partOf(child)).filter(Boolean))
    return SLOT_ORDER.filter(
      (part) =>
        owned.includes(part) &&
        !filled.has(part) &&
        !element.hasAttribute(part) &&
        !(part === "header" && element.hasAttribute(HEADING))
    )
  }

  /** The content part `element` is, `"actions"` for `<ui-actions>`:  `undefined` for anything else. */
  static partOf(element: Element): string | undefined {
    return partOf(element)
  }

  /** Does `part` draw before the body, at the top (a header), rather than after it (actions)? */
  static isAtTop(part: string): boolean {
    return SLOT_ORDER.indexOf(part) < SLOT_ORDER.indexOf(BODY_PART)
  }

  /** `part` drawn after `other`? */
  static comesAfter(part: string, other: string): boolean {
    return SLOT_ORDER.indexOf(part) > SLOT_ORDER.indexOf(other)
  }

  /**
   * Show `holder`'s empty `slots` as drop zones by `box`, its box, and answer each zone's box:
   * the top ones in a row just above it, the rest in a row just below it.
   * - Outside it, never over it:  inside, they covered its own words (a card's heading and body).
   * - Shown again only when the holder or its slots change:  a drag calls this on every move.
   */
  static show(holder: Element, slots: readonly string[], box: DOMRect): SlotZone[] {
    const key = `${slots.join(",")}@${box.left},${box.top},${box.width},${box.height}`
    if (PartSlots.shown?.holder === holder && PartSlots.shownKey === key) return PartSlots.shown.zones
    PartSlots.clear()
    const top = slots.filter((part) => PartSlots.isAtTop(part))
    const bottom = slots.filter((part) => !PartSlots.isAtTop(part))
    const zones = [
      ...rowOf(top, box, box.top - ZONE_INSET - ZONE_HEIGHT),
      ...rowOf(bottom, box, box.bottom + ZONE_INSET)
    ]
    for (const zone of zones) document.body.append(zone.drawn)
    PartSlots.shown = { holder, zones }
    PartSlots.shownKey = key
    return zones
  }

  /** The zone shown under (`x`, `y`), and the part whose slot it is. */
  static zoneAt(x: number, y: number): { holder: Element; zone: SlotZone } | undefined {
    const shown = PartSlots.shown
    const zone = shown?.zones.find(({ box }) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
    return shown && zone && { holder: shown.holder, zone }
  }

  /** Mark `zone` as where a drop would land, the others not. */
  static mark(zone: SlotZone | undefined): void {
    for (const each of PartSlots.shown?.zones ?? []) each.drawn.classList.toggle("landing", each === zone)
  }

  /** Take the zones away:  the drag is over, or the pointer left their holder. */
  static clear(): void {
    for (const zone of PartSlots.shown?.zones ?? []) zone.drawn.remove()
    PartSlots.shown = undefined
    PartSlots.shownKey = ""
  }

  /** The zones on the page, and whose. */
  private static shown: { holder: Element; zones: SlotZone[] } | undefined

  /** What they were drawn for:  the slots and the holder's box. */
  private static shownKey = ""
}

/** A slot's drop zone on the page:  its part, its box and what's drawn. */
export type SlotZone = {
  /** the slot:  `"actions"` */
  part: string
  /** where it's drawn */
  box: DOMRect
  /** the dashed box, its pill inside */
  drawn: HTMLElement
}

/**
 * The content parts that can be a slot, in the order a part draws them:  what's at the top, the body, then what's
 * at the bottom (Spell UI's 13 generic parts, `ui-parts`).
 */
const SLOT_ORDER = [
  "header",
  "title",
  "avatar",
  "author",
  "meta",
  "date",
  "summary",
  "value",
  "content",
  "description",
  "detail",
  "extra",
  "actions"
]

/** The body:  the slots before it go at the top. */
const BODY_PART = "content"

/** The attribute that draws a header:  `<ui-modal heading="About">`. */
const HEADING = "heading"

/** A part's tag:  `ui-`, then the part. */
const PART_PREFIX = "ui-"

/** A zone's height:  a tag pill's, and the 4px around it. */
const ZONE_HEIGHT = 28

/** A zone's gap from its holder's edge, and from the next zone in its row. */
const ZONE_INSET = 4

/** A zone's least width:  room for its pill. */
const ZONE_MIN_WIDTH = 96

/** `parts`' zones in a row at `top`, across `box`'s width, sharing it;  never narrower than a pill needs. */
function rowOf(parts: readonly string[], box: DOMRect, top: number): SlotZone[] {
  if (!parts.length) return []
  const room = box.width - (parts.length - 1) * ZONE_INSET
  const width = Math.max(room / parts.length, ZONE_MIN_WIDTH)
  return parts.map((part, index) => zoneAt(part, box.left + index * (width + ZONE_INSET), top, width))
}

/** The brackets round a slot's name:  the editor's tag pills' (`⟨actions⟩`). */
const [ANGLE_OPEN, ANGLE_CLOSE] = ["⟨", "⟩"]

/** The Spell UI vocabulary of `element`, if it's one of Spell UI's. */
function vocabularyOf(element: Element): E.ComponentVocabulary | undefined {
  return (element as E.DOMElement).component?.vocabulary as E.ComponentVocabulary | undefined
}

/** The content part `element` is, by its vocabulary's tag:  `<ui-actions>` (or a Spanish `<es-acciones>`) => `actions`. */
function partOf(element: Element): string | undefined {
  const tag = vocabularyOf(element)?.tag
  const part = tag?.startsWith(PART_PREFIX) ? tag.slice(PART_PREFIX.length) : undefined
  return part && SLOT_ORDER.includes(part) ? part : undefined
}

/** A zone for `part`, at (`left`, `top`), `width` wide:  a dashed box with its tag pill. */
function zoneAt(part: string, left: number, top: number, width: number): SlotZone {
  const drawn = document.createElement("div")
  drawn.className = "PartSlotZone"
  drawn.setAttribute(EDITOR_OWN, "")
  drawn.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${ZONE_HEIGHT}px`
  const pill = document.createElement("span")
  pill.className = "PartSlotPill"
  const [open, close] = [ANGLE_OPEN, ANGLE_CLOSE].map((angle) => {
    const mark = document.createElement("span")
    mark.className = "PartSlotAngle"
    mark.textContent = angle
    return mark
  })
  pill.append(open, part, close)
  drawn.append(pill)
  return { part, box: new DOMRect(left, top, width, ZONE_HEIGHT), drawn }
}
