import type { TreeDiagramNode, TreeDiagramNodeSize } from "./UITreeDiagram.types"

/****************
 * ### `TreeMeasure`
 * The measuring pass before a tree's layout:  each label's, detail's and edge label's real width, in its real font.
 * - So `TreeLayout` needs no monospace font, and stays pure:  it gets these numbers.
 * - By canvas, from each text's computed font:  that works inside a closed section or a hidden tab, where the browser
 *   has laid nothing out and an SVG text measures 0.
 * - STATIC, plain DOM, no Solid.  Browser only:  a static server render estimates (`TreeLayout`).
 * - Widths are in the font's own size, which IS user units:  each text's `font-size` is an attribute in user units.
 * - `widthOf()` and `fontOf()` measure any text, for another drawing that sizes boxes to their words (`<ui-diagram>`).
 ****************/
export class TreeMeasure {
  /** One `<canvas>` for the page:  it only ever measures. */
  private static context: CanvasRenderingContext2D | null | undefined

  /**
   * Every node's sizes under `tree`, folded ones included;  `undefined` without a canvas (nothing is measured).
   * - `contentOf`:  the size of what a node holds besides its text, in user units.
   */
  static sizes(
    tree: TreeDiagramNode,
    samples: TreeMeasureSamples,
    contentOf: (node: TreeDiagramNode) => { width: number; height: number } | undefined
  ): Map<TreeDiagramNode, TreeDiagramNodeSize> | undefined {
    if (!TreeMeasure.canvas) return undefined
    const fonts = {
      root: TreeMeasure.fontOf(samples.rootLabel),
      label: TreeMeasure.fontOf(samples.label),
      detail: TreeMeasure.fontOf(samples.detail),
      edgeLabel: TreeMeasure.fontOf(samples.edgeLabel)
    }
    const width = (text: string, font: string) => TreeMeasure.widthOf(text, font) ?? 0
    const sizes = new Map<TreeDiagramNode, TreeDiagramNodeSize>()
    const visit = (node: TreeDiagramNode, font: string) => {
      const content = contentOf(node)
      sizes.set(node, {
        labelWidth: width(node.label, font),
        ...(node.detail && { detailWidth: width(node.detail, fonts.detail) }),
        ...(node.edgeLabel && { edgeLabelWidth: width(node.edgeLabel, fonts.edgeLabel) }),
        ...(content && { contentWidth: content.width, contentHeight: content.height })
      })
      for (const child of node.children ?? []) visit(child, fonts.label)
    }
    visit(tree, fonts.root)
    return sizes
  }

  /** `text`'s width in `font` (a canvas's `font`, `"600 13px Inter"`);  `undefined` without a canvas. */
  static widthOf(text: string, font: string): number | undefined {
    const context = TreeMeasure.canvas
    if (!context) return undefined
    context.font = font
    return context.measureText(text).width
  }

  /** The page's one measuring canvas;  `undefined` where there's none (a server). */
  private static get canvas(): CanvasRenderingContext2D | null | undefined {
    if (typeof document === "undefined") return undefined
    return (TreeMeasure.context ??= document.createElement("canvas").getContext("2d"))
  }

  /** `element`'s computed font, as a canvas takes it. */
  static fontOf(element: Element): string {
    const { fontStyle, fontWeight, fontSize, fontFamily } = getComputedStyle(element)
    return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`
  }
}

/** A text of each kind, in the diagram's own sheet:  what a real one's font comes to. */
export type TreeMeasureSamples = {
  rootLabel: Element
  label: Element
  detail: Element
  edgeLabel: Element
}
