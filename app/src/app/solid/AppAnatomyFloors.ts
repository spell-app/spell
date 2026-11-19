import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { SpellElement } from "spell/app/app/runner/SpellElement"

/**
 * The floors of the running app, for Anatomy (`<AppAnatomy>`, epic `editor` P34):
 * each part it draws, a floor over the part that holds it.
 * - A part:  what the Inspector's Views tree shows a row for (`isPart`, `Inspector.isPart`):
 *   - a view, an element drawing one of the program's things (`<solitaire-card>`):  the app, a pile, a card, a card's
 *     picture
 *   - a Spell UI element the drawing writes (`<ui-toolbar>`, `<ui-text>`), or another tag it writes (`<spacer />`):
 *     so a toolbar comes apart into its title, buttons and score (I261)
 * - Each floor is lifted by its LAYER BOX (`layerBoxOf()`):  the element itself, or, for a tag that draws no box of its
 *   own (`display: contents`, most Spell UI elements), the first box drawn in its shadow root.
 *   - SEE:  T119, which would make the layer box each Spell UI part's own contract, in UIComponent's base.
 * - Through a view's shadow root:  a card's pictures are drawn inside the card's.
 *   Never a Spell UI element's:  its shadow root is its own drawing, not parts of the program.
 * - A floor whose drawing FLATTENS what's inside it (faded, filtered, clipped to a shape) can't lift its insides:
 *   the browser draws them flat into it.  It's marked `clips`, and the floors inside it `isFlat`.
 *   - Not one that only hides its overflow (a rounded box, a scrolling list), blurs what's behind it (glass),
 *     isolates its blending or masks its edges (a toolbar's scroll fade):  Anatomy turns those off while it shows, so what's inside comes apart
 *     (`liftingStylesFor()`, which `AnatomyStyles` sets;  I261).
 * - Floors side by side over the same floor that overlap (a pile of cards) step up one by one, in the order they're
 *   drawn:  each one's `step` is one more than the highest step of a sibling drawn before it that it covers.
 * - Plain DOM, no Solid:  it reads the page, and changes nothing.
 */
export class AnatomyFloors {
  /**
   * The floors of the app drawn in `stage`, in document order, the app's own first.
   * - `isPart`:  is an element a part, a row of the Views tree (`Inspector.isPart`);  by default, a view.
   * - Never the editor's own, round the program (`EDITOR_OWN`).
   * - Never a part that doesn't show:  inside a closed dialog, faded out to nothing.
   */
  static in(stage: Element, { isPart = isView }: { isPart?: (element: Element) => boolean } = {}): Floor[] {
    const floors: Floor[] = []
    const walk = (root: Element | ShadowRoot, parent: Floor | undefined) => {
      for (const element of root.children) {
        if (element.hasAttribute(EDITOR_OWN)) continue
        const isAPart = isPart(element)
        const box = isAPart ? layerBoxOf(element) : undefined
        let floor: Floor | undefined
        if (box?.checkVisibility({ opacityProperty: true })) {
          floor = {
            element: element as HTMLElement,
            box,
            depth: parent ? parent.depth + 1 : 0,
            parent,
            step: 0,
            steps: 0
          }
          floor.isFlat = !!parent && (parent.isFlat || AnatomyFloors.clipsBetween(floor.box, parent))
          if (floor.isFlat && parent && !parent.isFlat) parent.clips = true
          floors.push(floor)
        }
        // a Spell UI part's shadow root is its own drawing;  a view's holds parts (a card's pictures)
        if (element.shadowRoot && (!isAPart || isView(element))) walk(element.shadowRoot, floor ?? parent)
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
      const box = layoutBoxOf(floor.box)
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
   * Does `floor` cover (nearly) all of the floor holding it, as a pile's picture fills the pile?
   * - Then a click on it is first taken as a click on the floor under it:  the picture is that floor's face (I259).
   * - Measured where the page lays them out, as `stepPiles()` does.
   */
  static fillsParent(floor: Floor): boolean {
    if (!floor.parent) return false
    const [own, under] = [layoutBoxOf(floor.box), layoutBoxOf(floor.parent.box)]
    const width = Math.min(own.right, under.right) - Math.max(own.left, under.left)
    const height = Math.min(own.bottom, under.bottom) - Math.max(own.top, under.top)
    return width > 0 && height > 0 && width * height >= FILLS_SHARE * under.width * under.height
  }

  /**
   * Does anything from `element`'s box up to `floor`'s layer box, that box included, draw what's inside it flat:
   * fade it, filter it, mask it ...?  Then `element` can't be lifted off `floor`.
   * - Not what Anatomy turns off while it shows (`liftingStylesFor()`):  overflow, glass, isolation, a mask.
   */
  static clipsBetween(element: Element, floor: Floor): boolean {
    for (let node = AnatomyFloors.boxParentOf(element); node; node = AnatomyFloors.boxParentOf(node)) {
      // up to a tag that draws no box:  nothing of it draws what's inside flat
      if (node === floor.element && node !== floor.box) return false
      if (flattens(getComputedStyle(node))) return true
      if (node === floor.box) return false
    }
    return false
  }

  /**
   * The inline styles a box with `style` needs while Anatomy shows, so what's inside it can lift out of it:
   * its overflow shown, no glass blur, no isolation, no mask (a scrolling toolbar's faded edges).
   * Empty when it needs none.
   * - Each would draw the box's insides flat (the CSS Transforms spec's "grouping" properties).
   * - Anatomy sets them on the boxes between a floor and the app, and puts them back as it closes (I261).
   */
  static liftingStylesFor(style: CSSStyleDeclaration): Record<string, string> {
    const { overflow, "backdrop-filter": noBlur, isolation, "mask-image": noMask } = AnatomyFloors.liftingStyles
    const lifting: Record<string, string> = {}
    if (style.overflowX !== overflow || style.overflowY !== overflow) lifting.overflow = overflow
    if (style.backdropFilter !== "" && style.backdropFilter !== noBlur) lifting["backdrop-filter"] = noBlur
    if (style.isolation === "isolate") lifting.isolation = isolation
    if (style.maskImage !== "" && style.maskImage !== noMask) lifting["mask-image"] = noMask
    return lifting
  }

  /** Each style `liftingStylesFor()` may set, and its value. */
  static readonly liftingStyles = {
    overflow: "visible",
    "backdrop-filter": "none",
    isolation: "auto",
    "mask-image": "none"
  } as const

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
  /** the element:  `<solitaire-card>`, `<ui-text>` */
  element: HTMLElement
  /**
   * what's lifted and measured, its layer box (`layerBoxOf()`):  the element itself, or, for a tag that draws no box of
   * its own (`display: contents`, most Spell UI elements), the first box in its shadow root
   */
  box: HTMLElement
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

/** How much of the floor holding it a floor covers, at least, to fill it (`fillsParent()`). */
const FILLS_SHARE = 0.8

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

/** Is `element` a view:  does it draw one of the program's things? */
function isView(element: Element): boolean {
  return !!SpellElement.thingOf(element)
}

/**
 * What draws `element` as a floor, its layer box:  itself, when it draws a box;  else the first box at the top of its
 * shadow root, a `display: contents` tag's drawing (`<ui-text>`'s `<span part="text">`);  `undefined` for neither.
 * - SEE:  T119, which would make this each Spell UI part's own contract.
 */
function layerBoxOf(element: Element): HTMLElement | undefined {
  if (hasBox(element)) return element as HTMLElement
  for (const inner of element.shadowRoot?.children ?? []) {
    if (inner instanceof HTMLElement && !(inner instanceof HTMLStyleElement) && hasBox(inner)) return inner
  }
  return undefined
}

/** Does `element` draw a box of its own:  not `display: contents`, nor `none`? */
function hasBox(element: Element): boolean {
  const { display } = getComputedStyle(element)
  return display !== "contents" && display !== "none"
}

/**
 * Does a box with `style` draw its insides flat, whatever their own 3D, even while Anatomy shows:  the CSS that makes a
 * "grouping" box (the CSS Transforms spec's list), so `transform-style: preserve-3d` is ignored on it.
 * - Leaves out what Anatomy turns off while it shows (`AnatomyFloors.liftingStylesFor()`).
 */
function flattens(style: CSSStyleDeclaration): boolean {
  return (
    Number(style.opacity) < 1 ||
    style.filter !== "none" ||
    style.clipPath !== "none" ||
    style.mixBlendMode !== "normal" ||
    /paint|strict|content/.test(style.contain)
  )
}
