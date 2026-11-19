import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { SpellElement } from "spell/app/app/runner/SpellElement"

/**
 * The floors of the running app, for Anatomy (`<AppAnatomy>`, epic `editor` P34):
 * each view it draws, a floor over the view that holds it.
 * - A view:  an element drawing one of the program's things (`<solitaire-card>`):  the app, a pile, a card, a card's
 *   picture.
 * - With `parts`, Spell UI's elements inside them too (`<ui-toolbar>`), each a floor of its own:  Q44's Parts switch.
 * - Only what draws a box of its own:  a `display: contents` element (most `<ui-text>`s) has nothing to lift.
 * - Through every shadow root:  a card's pictures are drawn inside the card's.
 * - A floor whose drawing CLIPS what's inside it (a scrolling list, a rounded box that hides its overflow) can't lift
 *   its insides:  the browser draws them flat into it.  It's marked `clips`, and the floors inside it `isFlat`.
 * - Floors side by side over the same floor that overlap (a pile of cards) step up one by one, in the order they're
 *   drawn:  each one's `step` is one more than the highest step of a sibling drawn before it that it covers.
 * - Plain DOM, no Solid:  it reads the page, and changes nothing.
 */
export class AnatomyFloors {
  /**
   * The floors of the app drawn in `stage`, in document order, the app's own first.
   * - `isPart`:  is an element a part the Inspector shows (`Inspector.isPart`):  a Spell UI element, say.
   * - Never the editor's own, round the program (`EDITOR_OWN`).
   */
  static in(stage: Element, { parts, isPart }: { parts: boolean; isPart: (element: Element) => boolean }): Floor[] {
    const floors: Floor[] = []
    const walk = (root: Element | ShadowRoot, parent: Floor | undefined) => {
      for (const element of root.children) {
        if (element.hasAttribute(EDITOR_OWN)) continue
        const kind = kindOf(element, { parts, isPart })
        let floor: Floor | undefined
        if (kind && hasBox(element)) {
          floor = {
            element: element as HTMLElement,
            kind,
            depth: parent ? parent.depth + 1 : 0,
            parent,
            step: 0,
            steps: 0
          }
          floor.isFlat = !!parent && (parent.isFlat || AnatomyFloors.clipsBetween(floor.element, parent.element))
          if (floor.isFlat && parent && !parent.isFlat) parent.clips = true
          floors.push(floor)
        }
        if (element.shadowRoot) walk(element.shadowRoot, floor ?? parent)
        walk(element, floor ?? parent)
      }
    }
    walk(stage, undefined)
    AnatomyFloors.stepPiles(floors)
    return floors
  }

  /**
   * Step up each pile in `floors`:  siblings over the same floor that overlap, as a pile of cards does.
   * - Each one's `step` is one more than the highest of the siblings drawn before it that it covers;  0 on none.
   * - Each sibling's `steps` is its siblings' highest `step`, so a tall pile can take smaller steps.
   * - Measured where the page lays them out (`offsetLeft` ...), never their drawn boxes:
   *   Anatomy's own turn and lift would move those, and turned boxes side by side overlap.
   */
  static stepPiles(floors: Floor[]): void {
    const siblings = new Map<Floor | undefined, { floor: Floor; box: DOMRect }[]>()
    for (const floor of floors) {
      const pile = siblings.get(floor.parent) ?? []
      const box = layoutBoxOf(floor.element)
      for (const below of pile) if (overlaps(box, below.box)) floor.step = Math.max(floor.step, below.floor.step + 1)
      pile.push({ floor, box })
      siblings.set(floor.parent, pile)
    }
    for (const pile of siblings.values()) {
      const steps = Math.max(...pile.map((each) => each.floor.step))
      for (const each of pile) each.floor.steps = steps
    }
  }

  /**
   * Does anything from `element`'s box up to `floor`'s, `floor` included, draw what's inside it flat:
   * clip it, fade it, filter it ...?  Then `element` can't be lifted off `floor`.
   */
  static clipsBetween(element: Element, floor: Element): boolean {
    for (let node = AnatomyFloors.boxParentOf(element); node; node = AnatomyFloors.boxParentOf(node)) {
      if (flattens(getComputedStyle(node))) return true
      if (node === floor) return false
    }
    return false
  }

  /**
   * The element whose box `element`'s box is drawn in:  the slot it's assigned to, its parent,
   * else its shadow root's host.
   */
  static boxParentOf(element: Element): Element | undefined {
    return element.assignedSlot ?? element.parentElement ?? ((element.getRootNode() as ShadowRoot).host || undefined)
  }

  /**
   * The elements whose boxes hold `element`'s, from its own box parent up to `top`, `top` left out:
   * each must keep its children in 3D for `element` to lift.
   * - `display: contents` ones are left out:  they draw no box.
   */
  static boxesBetween(element: Element, top: Element): HTMLElement[] {
    const boxes: HTMLElement[] = []
    for (let node = AnatomyFloors.boxParentOf(element); node && node !== top; node = AnatomyFloors.boxParentOf(node)) {
      if (hasBox(node)) boxes.push(node as HTMLElement)
    }
    return boxes
  }
}

/** One floor of the app:  an element it draws, lifted over the floor that holds it. */
export type Floor = {
  /** the element:  `<solitaire-card>` */
  element: HTMLElement
  /** a view of the program, or a Spell UI part inside one (with Parts on) */
  kind: FloorKind
  /** how many floors hold it:  0 for the app */
  depth: number
  /** the floor holding it;  none for the app */
  parent: Floor | undefined
  /** how many siblings drawn before it it sits on, in a pile (a card on the cards under it);  0 for none */
  step: number
  /** the highest `step` among its siblings:  its pile's height */
  steps: number
  /** its drawing clips the floors inside it, so they stay flat on it:  it's lifted whole */
  clips?: boolean
  /** inside a floor that clips:  drawn flat on it, never lifted */
  isFlat?: boolean
}

/** What a floor is:  a view the program draws, or a Spell UI part inside one. */
export type FloorKind = "view" | "part"

/** What `element` is as a floor, if it is one. */
function kindOf(
  element: Element,
  { parts, isPart }: { parts: boolean; isPart: (element: Element) => boolean }
): FloorKind | undefined {
  if (SpellElement.thingOf(element)) return "view"
  if (parts && isPart(element)) return "part"
  return undefined
}

/**
 * Where the page lays `element` out, in the page's pixels:  its offsets summed up its offset parents.
 * - Untouched by any transform, Anatomy's own turn and lift among them.
 */
function layoutBoxOf(element: HTMLElement): DOMRect {
  let [left, top] = [0, 0]
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft
    top += node.offsetTop
  }
  return new DOMRect(left, top, element.offsetWidth, element.offsetHeight)
}

/** Do boxes `one` and `other` overlap, by more than an edge? */
function overlaps(one: DOMRect, other: DOMRect): boolean {
  return one.left < other.right && other.left < one.right && one.top < other.bottom && other.top < one.bottom
}

/** Does `element` draw a box of its own:  not `display: contents`, nor `none`? */
function hasBox(element: Element): boolean {
  const { display } = getComputedStyle(element)
  return display !== "contents" && display !== "none"
}

/**
 * Does a box with `style` draw its insides flat, whatever their own 3D:  the CSS that makes a "grouping" box
 * (the CSS Transforms spec's list), so `transform-style: preserve-3d` is ignored on it.
 */
function flattens(style: CSSStyleDeclaration): boolean {
  return (
    style.overflowX !== "visible" ||
    style.overflowY !== "visible" ||
    Number(style.opacity) < 1 ||
    style.filter !== "none" ||
    style.clipPath !== "none" ||
    (style.maskImage !== "" && style.maskImage !== "none") ||
    style.mixBlendMode !== "normal" ||
    style.isolation === "isolate" ||
    /paint|strict|content/.test(style.contain) ||
    (style.backdropFilter !== "" && style.backdropFilter !== "none")
  )
}
