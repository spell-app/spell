/****************
 * ### `Alignment`
 * Finds rows and columns on a page whose items don't line up (epic `epic-engine` P83, T166):
 * - in a ROW, an item drawn more than half a pixel above or below the others
 * - in a COLUMN, an item drawn more than half a pixel left or right of the column's middle
 * - Owen, 2026-11-23:  "Would love to never have to tell you to fix vertical alignment again."
 *   And 2026-11-24, of the editor's add bar, its icons left of its middle:  "Need to do it for horizontals as well".
 * - A ROW:  an element that lays its children out side by side
 *   (a flex row centring them or left at the default, a grid centring them):
 *   a toolbar, a pill row, a card's header, an icon by its label.
 *   - shadow roots and slots included
 *   - a group inside a row (a toolbar's start, a logo and its menus) is lined up by the middle its own items share
 * - A COLUMN:  an element that stacks its items and centres them across
 *   - a flex column centring them (`align-items: center`), a one-column grid centring them (`justify-items: center`)
 *   - a RAIL:  a painted strip no wider than 80px and at least twice as tall as it is wide (an icon bar down a side),
 *     whatever its layout:  what's in it belongs in its middle
 *   - a PAINTED column's items are held to its own middle line (its content box, less a scrollbar), not to each other:
 *     a stack of buttons all left of a rail's middle is off, though they agree with each other
 *   - an unpainted one's to the middle they share, as a row's:  nobody sees where its own middle is
 *     (a search field's icon in a box with room after it for the words)
 * - Each item is measured by what's DRAWN, never its outer box:
 *   - an element with a background, border or shadow:  that shape
 *   - an icon:  its glyph's own paths, not the `<svg>`'s box
 *   - text:  from its capitals' top to its baseline, where a reader sees it;
 *     worked out from its font's numbers, so a row with text may be off by a pixel, not half
 *   - anything else:  what's drawn inside it, through its shadow root
 *   - a painted item also by its label:  a button among plain words is lined up when its label is on their line
 * - Compared to the nearest half pixel:  a screen draws no less, so a quarter pixel between a glyph and a circle
 *   is never seen
 * - Left alone:
 *   - rows laid out on a text baseline (`align-items: baseline`, plain inline text):  they're not centred rows
 *   - rows of big blocks, an item over 80px tall (a hero's words beside its picture):  rows of panels, not controls;
 *     columns of big blocks the same way, an item over 80px wide (a centred page's paragraphs)
 *   - hidden items, items taken out of the flow (`position: absolute`), items with an `align-self` of their own
 *   - anything inside an element marked as meant:  `data-align="free: <the reason>"`, e.g. `free: raised badge`
 * - Its users:  the page checker (`check-spell.js`), the designer's screenshots (`designer-shots.js`),
 *   every editor test (`runningEditor.ts`), and any component test (`Alignment.scan()`, in its own page).
 * - Its position:  imports nothing, so plain `node` loads it (`spell/test-helpers/Alignment.ts`), and the scan,
 *   `scanLines()`, runs in any page as it is:  every helper it needs is inside it.
 ****************/
export class Alignment {
  /** How far, in CSS px, an item's drawn middle may be from its row's and still count as lined up. */
  static readonly TOLERANCE_PX = 0.5

  /** Every misaligned row or column item in THIS page (a component test's), in document order. */
  static scan(options: AlignmentOptions = {}): AlignmentFinding[] {
    return scanLines({ tolerance: Alignment.TOLERANCE_PX, ...options })
  }

  /**
   * Every misaligned row or column item in a Playwright `page`, in document order.
   * - Sent as text, with a stand-in for `__name`:  `tsx` and Vite may wrap the scan's inner functions in it,
   *   a helper only their compiled file has.
   * - throws when the page can't run it (closed, navigated away mid-scan)
   */
  static async scanPage(page: ScriptPage, options: AlignmentOptions = {}): Promise<AlignmentFinding[]> {
    const script = `(() => { var __name = globalThis.__name ?? ((fn) => fn);  return (${scanLines.toString()})(${JSON.stringify({ tolerance: Alignment.TOLERANCE_PX, ...options })}) })()`
    return (await page.evaluate(script)) as AlignmentFinding[]
  }

  /**
   * Each kind of finding once, with how many times it showed:  a section header off by the same amount
   * in 30 sections is one line, its first one's message, `(x30)`.
   */
  static report(findings: AlignmentFinding[]): string[] {
    const kinds = new Map<string, { message: string; count: number }>()
    for (const { line, item, offset, message } of findings) {
      const kind = `${line}|${item}|${offset}`
      const seen = kinds.get(kind)
      if (seen) seen.count++
      else kinds.set(kind, { message, count: 1 })
    }
    return [...kinds.values()].map(({ message, count }) => (count > 1 ? `${message}  (x${count})` : message))
  }
}

/** What `Alignment.scan()` takes. */
export interface AlignmentOptions {
  /** only rows and columns inside the first element matching this selector, found through shadow roots;  default the whole page */
  within?: string
  /** how far off counts, in CSS px;  default `Alignment.TOLERANCE_PX` */
  tolerance?: number
}

/** One row or column item drawn off its row's or column's middle. */
export interface AlignmentFinding {
  /** `"row"`:  the item is off up or down;  `"column"`:  off left or right */
  axis: AlignmentAxis
  /** the row or column, as a short path:  `ui-toolbar › div[part=row]` */
  line: string
  /** the item:  its tag, id, first class or part:  `ui-label.beta` */
  item: string
  /** what the item says, cut to 24 characters:  `beta`;  `""`:  nothing */
  text: string
  /** how far its drawn middle is from the line's, in CSS px, to 2 places;  more than 0:  lower in a row, right in a column */
  offset: number
  /**
   * what to say:
   * - `ui-toolbar › div:  ui-label.beta "beta" is drawn 2.00px lower than the rest of its row`
   * - `div.PaletteRail:  nav[part=menu] is drawn 4.00px left of its column's middle`
   */
  message: string
  /** where the row or column is drawn, in the page's coordinates (scrolled with it):  to picture it */
  lineBox: { x: number; y: number; width: number; height: number }
}

/** Which way a line runs:  a row's items side by side, a column's stacked. */
export type AlignmentAxis = "row" | "column"

/** Any page that runs a script and answers with its value:  Playwright's `Page`, or a `Locator`'s page. */
export interface ScriptPage {
  evaluate(script: string): Promise<unknown>
}

/**
 * The scan itself:  every misaligned row or column item in the page it runs in.
 * - ONE scan for both:  everything measured along an axis (`middleOf()`, `spanOf()`), so a column is checked exactly
 *   as a row is, but for the middle its items are held to (`checkLine()`)
 * - SELF-CONTAINED on purpose:  sent to a page as its text (`Alignment.scanPage()`), so it may use nothing from
 *   outside its own body, not even `Alignment`'s constants (repeated here, the one place they're copied).
 * - NEVER throws on what it measures:  an element it can't read is left out.
 */
export function scanLines(options: AlignmentOptions = {}): AlignmentFinding[] {
  const tolerance = options.tolerance ?? 0.5
  const FREE = "data-align"
  /** How deep to look inside an item for what it draws, before taking its own box. */
  const DEEPEST = 12
  /**
   * How much more a row with text in it may be off:  text's middle is worked out from its font's numbers
   * (capital height, baseline), which miss what's drawn by up to half a pixel;  shapes and icons are measured exactly.
   */
  const TEXT_SLACK = 0.5
  /**
   * The biggest an item of a checked line may be across it, in px (a row's tallest, a column's widest):
   * lines of controls, pills, icons and labels, not of panels.
   * - Two big blocks side by side (a page's hero:  its words beside a picture) are centred by their boxes,
   *   and what's drawn in them is rightly uneven;  so are a centred column's paragraphs.
   */
  const BIGGEST_ITEM = 80
  /**
   * The widest a RAIL may be, in px:  a painted strip down a side, its icons in its middle (the editor's add bar).
   * - And it's at least twice as tall as it's wide (`RAIL_SHAPE`):  so never a button or a badge.
   */
  const WIDEST_RAIL = 80
  const RAIL_SHAPE = 2
  /**
   * `at` to the nearest half pixel:  a screen draws whole pixels (half ones on a 2x screen), so a quarter of a pixel
   * between an icon's glyph and a painted circle beside it is never seen, and isn't a finding.
   */
  const toHalfPixel = (at: number) => Math.round(at * 2) / 2
  const findings: AlignmentFinding[] = []

  /** A box;  `isText`:  measured from text alone, by its font's numbers, so up to half a pixel out. */
  type Box = { top: number; bottom: number; left: number; right: number; isText?: boolean }
  /** Which way a line runs:  a row's items side by side, a column's stacked. */
  type Axis = "row" | "column"
  /**
   * A line's item:  its node, its box in the line, what it draws, and the middle it's lined up by, across the line
   * (up and down in a row, left and right in a column).
   * - `inkMiddle`:  a painted item's words or icon inside its shape:  a button beside plain text is lined up when
   *   its label is on the text's line, though its shape is taller
   */
  type Item = { node: Node; layout: Box; drawn: Box; middle: number; inkMiddle?: number }

  const style = (element: Element) => getComputedStyle(element)
  const isFree = (element: Element) => /^\s*free\b/i.test(element.getAttribute(FREE) ?? "")
  const isEmpty = (box: Box | undefined) => !box || box.bottom - box.top <= 0 || box.right - box.left <= 0
  const union = (boxes: (Box | undefined)[]): Box | undefined => {
    const shown = boxes.filter((box): box is Box => !isEmpty(box))
    if (!shown.length) return undefined
    return {
      top: Math.min(...shown.map((box) => box.top)),
      bottom: Math.max(...shown.map((box) => box.bottom)),
      left: Math.min(...shown.map((box) => box.left)),
      right: Math.max(...shown.map((box) => box.right)),
      isText: shown.every((box) => box.isText)
    }
  }
  const boxOf = (element: Element): Box => {
    const { top, bottom, left, right } = element.getBoundingClientRect()
    return { top, bottom, left, right }
  }
  /** Where `box` starts and ends across a line running along `axis`:  top and bottom in a row, left and right in a column. */
  const spanOf = (box: Box, axis: Axis): [number, number] =>
    axis === "row" ? [box.top, box.bottom] : [box.left, box.right]
  const middleOf = (box: Box, axis: Axis) => {
    const [start, end] = spanOf(box, axis)
    return (start + end) / 2
  }
  /** Where `element` lays its items out:  inside its border and padding, and its scrollbar. */
  const contentBoxOf = (element: Element, css: CSSStyleDeclaration): Box => {
    const { top, left } = element.getBoundingClientRect()
    const px = (value: string) => parseFloat(value) || 0
    const [innerTop, innerLeft] = [top + element.clientTop, left + element.clientLeft]
    return {
      top: innerTop + px(css.paddingTop),
      bottom: innerTop + element.clientHeight - px(css.paddingBottom),
      left: innerLeft + px(css.paddingLeft),
      right: innerLeft + element.clientWidth - px(css.paddingRight)
    }
  }
  /** The lines `text` is laid out in, each its font's full height:  where it sits in its row. */
  const textLines = (text: Text): Box[] => {
    if (!text.data.trim()) return []
    const range = document.createRange()
    range.selectNodeContents(text)
    return [...range.getClientRects()]
      .map(({ top, bottom, left, right }) => ({ top, bottom, left, right }))
      .filter((box) => !isEmpty(box))
  }
  const textBox = (text: Text): Box | undefined => union(textLines(text))
  /** Each font's ascent, descent and capital height, in px, measured once. */
  const fontMetrics = new Map<string, { ascent: number; descent: number; capHeight: number }>()
  const metricsOf = (css: CSSStyleDeclaration) => {
    const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`
    let metrics = fontMetrics.get(font)
    if (!metrics) {
      const context = document.createElement("canvas").getContext("2d")!
      context.font = font
      const measured = context.measureText("H")
      metrics = {
        ascent: measured.fontBoundingBoxAscent,
        descent: measured.fontBoundingBoxDescent,
        capHeight: measured.actualBoundingBoxAscent
      }
      fontMetrics.set(font, metrics)
    }
    return metrics
  }
  /**
   * The `lines` of text inside `element` a reader sees:  not those its nearest clipping box (`overflow: hidden`) cuts off
   * (a description clamped to two lines lays out the rest under it).
   * - So its last line's baseline is the last SHOWN line's, not the clipping box's bottom edge (I458:  each home page
   *   card's words measured 2.5px low, its tile beside them centred on what's drawn).
   */
  const shownLines = (lines: Box[], element: Element): Box[] => {
    for (let clip: Element | null = element; clip; clip = clip.parentElement) {
      const overflow = style(clip).overflowY
      if (overflow === "visible") continue
      // a scroller's lines out of view are still drawn, scrolled to:  only what's hidden for good is cut
      if (!/^(hidden|clip)$/.test(overflow)) return lines
      const { top, bottom } = boxOf(clip)
      const shown = lines.filter((line) => line.top >= top - tolerance && line.bottom <= bottom + tolerance)
      // none whole (one line in a box shorter than it, cut with an ellipsis):  all of it, as drawn
      return shown.length ? shown : lines
    }
    return lines
  }

  /**
   * What `text` draws, from its first line's capitals to its last line's baseline:
   * where a reader sees it, and what an icon beside it is lined up with.
   * - Not its lines' full height:  that adds the font's room for accents and descenders, uneven above and below,
   *   so an icon that looks centred on the words measured up to a pixel off.
   */
  const textInk = (text: Text): Box | undefined => {
    const parent = text.parentElement
    if (!parent) return undefined
    const lines = shownLines(textLines(text), parent)
    if (!lines.length) return undefined
    const { ascent, descent, capHeight } = metricsOf(style(parent))
    const baselineOf = (line: Box) => line.top + (line.bottom - line.top - (ascent + descent)) / 2 + ascent
    const [first, last] = [lines[0], lines[lines.length - 1]]
    return { ...union(lines)!, top: baselineOf(first) - capHeight, bottom: baselineOf(last), isText: true }
  }

  /** What's laid out inside `element`:  its shadow root's nodes, else its own;  a slot's assigned nodes, else its own. */
  const flatChildren = (element: Element): Node[] => {
    if (element instanceof HTMLSlotElement) {
      const assigned = element.assignedNodes({ flatten: true })
      return assigned.length ? assigned : [...element.childNodes]
    }
    return [...(element.shadowRoot ?? element).childNodes]
  }

  /** Is `color` drawn at all:  not `transparent`, not a zero alpha? */
  const isVisibleColor = (color: string) => color !== "transparent" && !/rgba?\([^)]*,\s*0\)$/.test(color)
  /** Does `element` paint a shape of its own:  a background, a border, a shadow? */
  const isPainted = (css: CSSStyleDeclaration) =>
    isVisibleColor(css.backgroundColor) ||
    css.backgroundImage !== "none" ||
    css.boxShadow !== "none" ||
    (["Top", "Right", "Bottom", "Left"] as const).some(
      (side) =>
        parseFloat(css[`border${side}Width`]) > 0 &&
        css[`border${side}Style`] !== "none" &&
        isVisibleColor(css[`border${side}Color`])
    )

  /**
   * What `node` draws, in the page's coordinates;  `undefined`:  nothing.
   * - `throughPaint`:  past painted shapes, to the words and icons inside them
   */
  const drawnBox = (node: Node, depth = 0, throughPaint = false): Box | undefined => {
    if (node instanceof Text) return textInk(node)
    if (!(node instanceof Element)) return undefined
    const css = style(node)
    if (css.display === "none" || css.visibility === "hidden" || parseFloat(css.opacity) === 0) return undefined
    if (node instanceof SVGSVGElement) {
      const glyph = union(
        [...node.querySelectorAll("path, circle, ellipse, rect, line, polyline, polygon, text, use, image")].map(boxOf)
      )
      return glyph ?? boxOf(node)
    }
    if (node instanceof SVGElement) return boxOf(node)
    if (/^(IMG|CANVAS|VIDEO|INPUT|TEXTAREA|SELECT|PROGRESS|METER)$/.test(node.tagName)) return boxOf(node)
    if (!throughPaint && css.display !== "contents" && isPainted(css)) return boxOf(node)
    if (depth >= DEEPEST) return boxOf(node)
    const inside = union(
      flatChildren(node)
        .filter((child) => !(child instanceof Element) || !/^(absolute|fixed)$/.test(style(child).position))
        .map((child) => drawnBox(child, depth + 1, throughPaint))
    )
    // what it clips (a description cut to two lines) isn't drawn
    if (!inside || (css.overflowX === "visible" && css.overflowY === "visible")) return inside
    const own = boxOf(node)
    const clipped = {
      ...inside,
      top: Math.max(inside.top, own.top),
      bottom: Math.min(inside.bottom, own.bottom),
      left: Math.max(inside.left, own.left),
      right: Math.min(inside.right, own.right)
    }
    return isEmpty(clipped) ? undefined : clipped
  }

  /** A line's items:  its laid-out children, `display: contents` ones opened up, the ones left alone left out. */
  const itemsOf = (line: Element, axis: Axis): Item[] => {
    const items: Item[] = []
    const add = (node: Node) => {
      if (node instanceof Text) {
        const [layout, drawn] = [textBox(node), textInk(node)]
        if (layout && drawn) items.push({ node, layout, drawn, middle: toHalfPixel(middleOf(drawn, axis)) })
        return
      }
      if (!(node instanceof Element)) return
      const css = style(node)
      if (css.display === "none" || isFree(node)) return
      if (css.display === "contents") return flatChildren(node).forEach(add)
      if (/^(absolute|fixed)$/.test(css.position) || css.visibility === "hidden") return
      if (!/^(auto|center|normal|stretch)$/.test(css.alignSelf.replace(/^(safe|unsafe) /, ""))) return
      // a column's item placed by itself across it (`justify-self` in a grid) is meant where it is
      if (axis === "column" && !/^(auto|center|normal|stretch)$/.test(css.justifySelf.replace(/^(safe|unsafe) /, "")))
        return
      const layout = boxOf(node)
      const drawn = drawnBox(node)
      if (isEmpty(layout) || !drawn || isEmpty(drawn)) return
      const ink = drawn.isText ? undefined : drawnBox(node, 0, true)
      items.push({
        node,
        layout,
        drawn,
        middle: toHalfPixel(groupMiddle(node, css, axis) ?? middleOf(drawn, axis)),
        inkMiddle: ink ? toHalfPixel(middleOf(ink, axis)) : undefined
      })
    }
    flatChildren(line).forEach(add)
    return items
  }

  /**
   * Which way `element` lines its items up, to share a middle;  `undefined`:  neither.
   * - a ROW:  a flex row centring them, or left at the default (`stretch`):  a toolbar of pills packed at its top is
   *   a row whose items should share a middle too (epic `editor` I327's stand-ins sat so);
   *   a grid only when it centres them:  a grid left at the default is a layout, not a row
   * - a COLUMN:  a flex column centring them, a one-column grid centring them, or a RAIL (`isRail()`)
   * - never one that chose `flex-start`, `end` or `baseline`:  uneven on purpose
   */
  const axisOf = (element: Element, css: CSSStyleDeclaration): Axis | undefined => {
    const align = css.alignItems.replace(/^(safe|unsafe) /, "")
    if (/^(inline-)?flex$/.test(css.display)) {
      if (css.flexDirection.startsWith("row")) return /^(center|normal|stretch)$/.test(align) ? "row" : undefined
      if (align === "center") return "column"
    } else if (/^(inline-)?grid$/.test(css.display)) {
      const oneColumn =
        css.gridTemplateColumns
          .replace(/\[[^\]]*\]/g, "")
          .trim()
          .split(/\s+/).length === 1
      if (oneColumn && css.justifyItems.replace(/^(safe|unsafe) /, "") === "center") return "column"
      if (align === "center") return "row"
    }
    return isRail(element, css) ? "column" : undefined
  }

  /** Is `element` a RAIL:  a painted strip down a side, no wider than `WIDEST_RAIL`, at least twice as tall as wide? */
  const isRail = (element: Element, css: CSSStyleDeclaration) => {
    if (!isPainted(css) || css.display === "contents" || /^inline$/.test(css.display)) return false
    const { width, height } = element.getBoundingClientRect()
    return width > 0 && width <= WIDEST_RAIL && height >= RAIL_SHAPE * width
  }

  /**
   * A row's or column's items in lines:  one line unless it wraps, or is a grid;
   * then by their boxes overlapping across the line (a row's by their tops and bottoms, a column's by their sides).
   */
  const linesOf = (items: Item[], css: CSSStyleDeclaration, axis: Axis): Item[][] => {
    if (/flex$/.test(css.display) && css.flexWrap === "nowrap") return [items]
    const lines: { end: number; items: Item[] }[] = []
    const startOf = (item: Item) => spanOf(item.layout, axis)[0]
    for (const item of [...items].sort((a, b) => startOf(a) - startOf(b))) {
      const [start, end] = spanOf(item.layout, axis)
      const line = lines.find((each) => start < each.end - 1)
      if (line) {
        line.items.push(item)
        line.end = Math.max(line.end, end)
      } else lines.push({ end, items: [item] })
    }
    return lines.map(({ items: line }) => line.sort((a, b) => items.indexOf(a) - items.indexOf(b)))
  }

  /** A short name for `node`, for a person to find it:  its tag, id, first class or part, and its text. */
  const nameOf = (node: Node): string => {
    if (!(node instanceof Element)) return "text"
    const part = node.getAttribute("part")
    return (
      node.localName +
      (node.id ? `#${node.id}` : "") +
      (node.classList[0] ? `.${node.classList[0]}` : "") +
      (part ? `[part=${part.split(" ")[0]}]` : "")
    )
  }
  /** What `node` says, cut to 24 characters. */
  const textOf = (node: Node): string => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim()
    return text.length > 24 ? text.slice(0, 23) + "…" : text
  }
  /** The row's or column's name:  it and two elements it's in, across shadow roots. */
  const lineName = (line: Element): string => {
    const names: string[] = []
    for (let at: Element | undefined = line; at && names.length < 3;) {
      names.unshift(nameOf(at))
      const root = at.getRootNode()
      at = at.parentElement ?? (root instanceof ShadowRoot ? root.host : undefined)
      if (at === document.body || at === document.documentElement) break
    }
    return names.join(" › ")
  }

  /** How far a line's middles may be apart:  the tolerance, and text's slack when any item is text. */
  const allowedFor = (line: Item[]) => tolerance + (line.some(({ drawn }) => drawn.isText) ? TEXT_SLACK : 0)

  /**
   * The middle most of `middles` share:  the most of them lying within `allowed` of each other, averaged;
   * a tie goes to the group holding the first.
   */
  const agreedMiddle = (middles: number[], allowed: number): number => {
    const sorted = [...middles].sort((a, b) => a - b)
    const holdsFirst = (from: number, to: number) => sorted[from] <= middles[0] && middles[0] <= sorted[to]
    let best = { from: 0, to: 0 }
    for (let from = 0, to = 0; from < sorted.length; from++) {
      while (to + 1 < sorted.length && sorted[to + 1] - sorted[from] <= allowed) to++
      const size = to - from
      const bestSize = best.to - best.from
      if (size > bestSize || (size === bestSize && holdsFirst(from, to) && !holdsFirst(best.from, best.to)))
        best = { from, to }
    }
    const agreed = sorted.slice(best.from, best.to + 1)
    return agreed.reduce((sum, at) => sum + at, 0) / agreed.length
  }

  /**
   * The middle of a GROUP inside a row or column (a toolbar's start, holding a logo and its menus):  the middle its own
   * items are lined up by, not its drawn box's, which a tall logo pulls off.  `undefined`:  not a group.
   * - a group:  a line of its own, the same way, that paints nothing (so its shape isn't what's seen)
   */
  const groupMiddle = (element: Element, css: CSSStyleDeclaration, axis: Axis): number | undefined => {
    if (axisOf(element, css) !== axis || isPainted(css)) return undefined
    const [line] = linesOf(itemsOf(element, axis), css, axis)
    return line?.length
      ? agreedMiddle(
          line.map(({ middle }) => middle),
          allowedFor(line)
        )
      : undefined
  }

  /**
   * Check one line of a row or column:  each item off the middle it's held to.
   * - a row's:  the middle most of its items share, as nothing else says where they belong
   * - a painted column's:  its own middle line, which is seen:  a stack all to one side is off, though its items agree
   * - an unpainted column's:  the middle its items share, as a row's
   */
  const checkLine = (element: Element, css: CSSStyleDeclaration, line: Item[], axis: Axis) => {
    // a painted column's middle line is seen, so one item can be off it;  anything else needs two to disagree
    const centre = axis === "column" && isPainted(css) ? middleOf(contentBoxOf(element, css), axis) : undefined
    if (line.length < (centre === undefined ? 2 : 1)) return
    if (line.some(({ drawn }) => spanOf(drawn, axis)[1] - spanOf(drawn, axis)[0] > BIGGEST_ITEM)) return
    const allowed = allowedFor(line)
    const middle =
      centre ??
      agreedMiddle(
        line.map(({ middle }) => middle),
        allowed
      )
    // the line's words and icons, painted shapes looked through:  where a reader's eye runs along it
    const inkAllowed = allowed + TEXT_SLACK
    const inkLine =
      centre ??
      agreedMiddle(
        line.map(({ middle, inkMiddle }) => inkMiddle ?? middle),
        inkAllowed
      )
    line.forEach((item) => {
      const offset = item.middle - middle
      if (Math.abs(toHalfPixel(offset)) <= allowed) return
      // a button among plain words:  its label on their line is lined up
      if (item.inkMiddle !== undefined && Math.abs(toHalfPixel(item.inkMiddle - inkLine)) <= inkAllowed) return
      const rounded = Math.round(offset * 100) / 100
      const [lineText, itemText, text] = [lineName(element), nameOf(item.node), textOf(item.node)]
      const distance = `${Math.abs(rounded).toFixed(2)}px`
      const how =
        axis === "row"
          ? `${distance} ${rounded > 0 ? "lower" : "higher"} than the rest of its row`
          : `${distance} ${rounded > 0 ? "right" : "left"} of its column's middle`
      const said = text ? ` "${text}"` : ""
      const { top, bottom, left, right } = boxOf(element)
      findings.push({
        axis,
        line: lineText,
        item: itemText,
        text,
        offset: rounded,
        message: `${lineText}:  ${itemText}${said} is drawn ${how}`,
        lineBox: { x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top }
      })
    })
  }

  /** Visit `element` and everything laid out inside it, checking each centred row and column. */
  const visit = (element: Element) => {
    if (isFree(element)) return
    const css = style(element)
    if (css.display === "none") return
    const axis = axisOf(element, css)
    if (axis) for (const line of linesOf(itemsOf(element, axis), css, axis)) checkLine(element, css, line, axis)
    for (const child of flatChildren(element)) if (child instanceof Element) visit(child)
  }

  /** The first element matching `selector`, looking inside shadow roots too. */
  const deepFind = (selector: string, root: ParentNode = document): Element | undefined => {
    const found = root.querySelector(selector)
    if (found) return found
    for (const element of root.querySelectorAll("*"))
      if (element.shadowRoot) {
        const inside = deepFind(selector, element.shadowRoot)
        if (inside) return inside
      }
    return undefined
  }

  const start = options.within ? deepFind(options.within) : document.body
  if (start) visit(start)
  return findings
}
