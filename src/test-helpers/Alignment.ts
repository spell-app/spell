/****************
 * ### `Alignment`
 * Finds rows on a page whose items don't line up:  an item drawn more than half a pixel above or below
 * the others in its row (epic `epic-engine` P83).
 * - Owen, 2026-11-23:  "Would love to never have to tell you to fix vertical alignment again."
 * - A ROW:  an element that lays its children out side by side
 *   (a flex row centring them or left at the default, a grid centring them):
 *   a toolbar, a pill row, a card's header, an icon by its label.
 *   - shadow roots and slots included
 *   - a group inside a row (a toolbar's start, a logo and its menus) is lined up by the middle its own items share
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
 *   - rows of big blocks, an item over 80px tall (a hero's words beside its picture):  rows of panels, not controls
 *   - hidden items, items taken out of the flow (`position: absolute`), items with an `align-self` of their own
 *   - anything inside an element marked as meant:  `data-align="free: <the reason>"`, e.g. `free: raised badge`
 * - Its users:  the page checker (`check-spell.js`), the designer's screenshots (`designer-shots.js`),
 *   every editor test (`runningEditor.ts`), and any component test (`Alignment.scan()`, in its own page).
 * - Its position:  imports nothing, so plain `node` loads it (`spell/test-helpers/Alignment.ts`), and the scan,
 *   `scanRows()`, runs in any page as it is:  every helper it needs is inside it.
 ****************/
export class Alignment {
  /** How far, in CSS px, an item's drawn middle may be from its row's and still count as lined up. */
  static readonly TOLERANCE_PX = 0.5

  /** Every misaligned row item in THIS page (a component test's), in document order. */
  static scan(options: AlignmentOptions = {}): AlignmentFinding[] {
    return scanRows({ tolerance: Alignment.TOLERANCE_PX, ...options })
  }

  /**
   * Every misaligned row item in a Playwright `page`, in document order.
   * - Sent as text, with a stand-in for `__name`:  `tsx` and Vite may wrap the scan's inner functions in it,
   *   a helper only their compiled file has.
   * - throws when the page can't run it (closed, navigated away mid-scan)
   */
  static async scanPage(page: ScriptPage, options: AlignmentOptions = {}): Promise<AlignmentFinding[]> {
    const script = `(() => { var __name = globalThis.__name ?? ((fn) => fn);  return (${scanRows.toString()})(${JSON.stringify({ tolerance: Alignment.TOLERANCE_PX, ...options })}) })()`
    return (await page.evaluate(script)) as AlignmentFinding[]
  }

  /**
   * Each kind of finding once, with how many times it showed:  a section header off by the same amount
   * in 30 sections is one line, its first one's message, `(x30)`.
   */
  static report(findings: AlignmentFinding[]): string[] {
    const kinds = new Map<string, { message: string; count: number }>()
    for (const { row, item, offset, message } of findings) {
      const kind = `${row}|${item}|${offset}`
      const seen = kinds.get(kind)
      if (seen) seen.count++
      else kinds.set(kind, { message, count: 1 })
    }
    return [...kinds.values()].map(({ message, count }) => (count > 1 ? `${message}  (x${count})` : message))
  }
}

/** What `Alignment.scan()` takes. */
export interface AlignmentOptions {
  /** only rows inside the first element matching this selector, found through shadow roots;  default the whole page */
  within?: string
  /** how far off counts, in CSS px;  default `Alignment.TOLERANCE_PX` */
  tolerance?: number
}

/** One row item drawn off its row's middle. */
export interface AlignmentFinding {
  /** the row, as a short path:  `ui-toolbar › div[part=row]` */
  row: string
  /** the item:  its tag, id, first class or part:  `ui-label.beta` */
  item: string
  /** what the item says, cut to 24 characters:  `beta`;  `""`:  nothing */
  text: string
  /** how far its drawn middle is from the row's, in CSS px, to 2 places;  more than 0:  lower */
  offset: number
  /** what to say:  `ui-toolbar › div:  ui-label.beta "beta" is drawn 2.00px lower than the rest of its row` */
  message: string
  /** where the row is drawn, in the page's coordinates (scrolled with it):  to picture it */
  rowBox: { x: number; y: number; width: number; height: number }
}

/** Any page that runs a script and answers with its value:  Playwright's `Page`, or a `Locator`'s page. */
export interface ScriptPage {
  evaluate(script: string): Promise<unknown>
}

/**
 * The scan itself:  every misaligned row item in the page it runs in.
 * - SELF-CONTAINED on purpose:  sent to a page as its text (`Alignment.scanPage()`), so it may use nothing from
 *   outside its own body, not even `Alignment`'s constants (repeated here, the one place they're copied).
 * - NEVER throws on what it measures:  an element it can't read is left out.
 */
export function scanRows(options: AlignmentOptions = {}): AlignmentFinding[] {
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
   * The tallest item a checked row may have, in px:  rows of controls, pills, icons and labels, not of panels.
   * - Two big blocks side by side (a page's hero:  its words beside a picture) are centred by their boxes,
   *   and what's drawn in them is rightly uneven.
   */
  const TALLEST_ITEM = 80
  /**
   * `at` to the nearest half pixel:  a screen draws whole pixels (half ones on a 2x screen), so a quarter of a pixel
   * between an icon's glyph and a painted circle beside it is never seen, and isn't a finding.
   */
  const toHalfPixel = (at: number) => Math.round(at * 2) / 2
  const findings: AlignmentFinding[] = []

  /** A box;  `isText`:  measured from text alone, by its font's numbers, so up to half a pixel out. */
  type Box = { top: number; bottom: number; left: number; right: number; isText?: boolean }
  /** A row's item:  its node, its box in the row, what it draws, and the middle it's lined up by. */
  /**
   * A row's item:  its node, its box in the row, what it draws, and the middle it's lined up by.
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
   * What `text` draws, from its first line's capitals to its last line's baseline:
   * where a reader sees it, and what an icon beside it is lined up with.
   * - Not its lines' full height:  that adds the font's room for accents and descenders, uneven above and below,
   *   so an icon that looks centred on the words measured up to a pixel off.
   */
  const textInk = (text: Text): Box | undefined => {
    const lines = textLines(text)
    const parent = text.parentElement
    if (!lines.length || !parent) return undefined
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

  /** A row's items:  its laid-out children, `display: contents` ones opened up, the ones left alone left out. */
  const itemsOf = (row: Element): Item[] => {
    const items: Item[] = []
    const add = (node: Node) => {
      if (node instanceof Text) {
        const [layout, drawn] = [textBox(node), textInk(node)]
        if (layout && drawn) items.push({ node, layout, drawn, middle: toHalfPixel((drawn.top + drawn.bottom) / 2) })
        return
      }
      if (!(node instanceof Element)) return
      const css = style(node)
      if (css.display === "none" || isFree(node)) return
      if (css.display === "contents") return flatChildren(node).forEach(add)
      if (/^(absolute|fixed)$/.test(css.position) || css.visibility === "hidden") return
      if (!/^(auto|center|normal|stretch)$/.test(css.alignSelf.replace(/^(safe|unsafe) /, ""))) return
      const layout = boxOf(node)
      const drawn = drawnBox(node)
      if (isEmpty(layout) || !drawn || isEmpty(drawn)) return
      const ink = drawn.isText ? undefined : drawnBox(node, 0, true)
      items.push({
        node,
        layout,
        drawn,
        middle: toHalfPixel(groupMiddle(node, css) ?? (drawn.top + drawn.bottom) / 2),
        inkMiddle: ink ? toHalfPixel((ink.top + ink.bottom) / 2) : undefined
      })
    }
    flatChildren(row).forEach(add)
    return items
  }

  /**
   * Does `css` lay its children out side by side, as a row whose items should share a middle?
   * - a flex row centring them, or left at the default (`stretch`):  a toolbar of pills packed at its top is a row
   *   whose items should share a middle too (epic `editor` I327's stand-ins sat so)
   * - a grid only when it centres them:  a grid left at the default is a layout, not a row
   * - never one that chose `flex-start`, `end` or `baseline`:  uneven on purpose
   */
  const isRow = (css: CSSStyleDeclaration) => {
    const align = css.alignItems.replace(/^(safe|unsafe) /, "")
    if (/^(inline-)?flex$/.test(css.display))
      return css.flexDirection.startsWith("row") && /^(center|normal|stretch)$/.test(align)
    if (/^(inline-)?grid$/.test(css.display)) return align === "center"
    return false
  }

  /** The row's items in lines:  one line unless it wraps, or is a grid;  then by their boxes overlapping. */
  const linesOf = (items: Item[], css: CSSStyleDeclaration): Item[][] => {
    if (/flex$/.test(css.display) && css.flexWrap === "nowrap") return [items]
    const lines: { bottom: number; items: Item[] }[] = []
    for (const item of [...items].sort((a, b) => a.layout.top - b.layout.top)) {
      const line = lines.find(({ bottom }) => item.layout.top < bottom - 1)
      if (line) {
        line.items.push(item)
        line.bottom = Math.max(line.bottom, item.layout.bottom)
      } else lines.push({ bottom: item.layout.bottom, items: [item] })
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
  /** The row's name:  it and two elements it's in, across shadow roots. */
  const rowName = (row: Element): string => {
    const names: string[] = []
    for (let at: Element | undefined = row; at && names.length < 3;) {
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
   * The middle of a GROUP inside a row (a toolbar's start, holding a logo and its menus):  the middle its own items
   * share, not its drawn box's, which a tall logo pulls off.  `undefined`:  not a group.
   * - a group:  a row of its own that paints nothing (so its shape isn't what's seen)
   */
  const groupMiddle = (element: Element, css: CSSStyleDeclaration): number | undefined => {
    if (!isRow(css) || isPainted(css)) return undefined
    const [line] = linesOf(itemsOf(element), css)
    return line?.length
      ? agreedMiddle(
          line.map(({ middle }) => middle),
          allowedFor(line)
        )
      : undefined
  }

  /** Check one line of a row:  the middle most of its items share, and each item off it. */
  const checkLine = (row: Element, line: Item[]) => {
    if (line.length < 2 || line.some(({ drawn }) => drawn.bottom - drawn.top > TALLEST_ITEM)) return
    const allowed = allowedFor(line)
    const middle = agreedMiddle(
      line.map(({ middle }) => middle),
      allowed
    )
    // the line's words and icons, painted shapes looked through:  where a reader's eye runs along it
    const inkAllowed = allowed + TEXT_SLACK
    const inkLine = agreedMiddle(
      line.map(({ middle, inkMiddle }) => inkMiddle ?? middle),
      inkAllowed
    )
    line.forEach((item) => {
      const offset = item.middle - middle
      if (Math.abs(toHalfPixel(offset)) <= allowed) return
      // a button among plain words:  its label on their line is lined up
      if (item.inkMiddle !== undefined && Math.abs(toHalfPixel(item.inkMiddle - inkLine)) <= inkAllowed) return
      const rounded = Math.round(offset * 100) / 100
      const [rowText, itemText, text] = [rowName(row), nameOf(item.node), textOf(item.node)]
      const how = `${Math.abs(rounded).toFixed(2)}px ${rounded > 0 ? "lower" : "higher"}`
      const said = text ? ` "${text}"` : ""
      const { top, bottom, left, right } = boxOf(row)
      findings.push({
        row: rowText,
        item: itemText,
        text,
        offset: rounded,
        message: `${rowText}:  ${itemText}${said} is drawn ${how} than the rest of its row`,
        rowBox: { x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top }
      })
    })
  }

  /** Visit `element` and everything laid out inside it, checking each centred row. */
  const visit = (element: Element) => {
    if (isFree(element)) return
    const css = style(element)
    if (css.display === "none") return
    if (isRow(css)) for (const line of linesOf(itemsOf(element), css)) checkLine(element, line)
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
