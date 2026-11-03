import { For, Show, type Accessor } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
// Import directly:  a leaf of the JSON family, what it takes to read a child (WWOD §4 › "The barrel")
import { JSON_CHANGED, JsonChild } from "spell/ui/components/ui-json/JsonChild"
import { treeDiagramVocabulary } from "./UITreeDiagram.en"
import { TreeData } from "./TreeData"
import { TreeLayout } from "./TreeLayout"
import { TreeMeasure, type TreeMeasureSamples } from "./TreeMeasure"
import { TREE_NODE_RESIZED, UITreeNode, type DOMTreeNodeElement } from "./UITreeNode"
import {
  TREE_DIAGRAM_METRICS,
  type TreeDiagramBox,
  type TreeDiagramEdge,
  type TreeDiagramLayout,
  type TreeDiagramNode,
  type TreeDiagramNodeSize
} from "./UITreeDiagram.types"

import treeDiagramCSS from "./UITreeDiagram.css?inline"

/****************
 * ### `UITreeDiagram`
 * The component behind `<ui-tree-diagram>`:  a tree drawn as an SVG, top-down or left to right,
 * with a box per node, a line from each parent to each child, and a label on the line.
 *
 * - GENERIC:  it draws any tree from plain data (`TreeDiagramNode`).
 *   It was first drawn for spell's parse trees, but `ui` never imports spell or the parser.
 * - The tree, first match wins:
 *   1. the `tree` property (`tree={tree}` in Solid)
 *   2. a `<ui-tree-node>` child, with the nodes nested inside it, followed as it changes
 *   3. the JSON of a `<ui-json>` child, or a `<script type="application/json">` child (static pages, `file://` too),
 *      followed as it changes;  a `<ui-json source>` once it loads
 *   - Invalid JSON draws nothing, and warns once.
 *   - It redraws when `tree` is set again:  set a NEW tree (one changed in place isn't seen).
 * - The steps from tree to drawing:
 *   1. `TreeMeasure`:  each text's real width in its real font, and the size of what a node holds
 *   2. `TreeLayout` (pure):  those numbers in, boxes and lines out
 *   3. this class draws them;  what a node holds is placed over its box by the node (`placement`)
 *   - Measured again when a web font arrives, when the fonts' tokens change, and when what a node holds changes size.
 *   - A static server render has nothing to measure with:  `TreeLayout` estimates from character counts.
 * - Size:  drawn at its natural size in em (`--_ui-tree-diagram-natural-width`),
 *   shrinking to fit its container down to `--ui-tree-diagram-min-scale`, and scrolling sideways below that.
 * - Nothing to draw:  the `<svg>` is `ui empty tree diagram`, hidden;  the DOM element has no height.
 * - Accessibility:  the `<svg>` is `role="img"`, named by a summary ("Tree:  If, with 3 children");
 *   each node's `title` is its box's `<title>` (hover text).
 *   - `foldable` or `clickable` make it `role="group"` under the same name, with real buttons to Tab to.
 ****************/
export class UITreeDiagram extends E.UIComponent<typeof treeDiagramVocabulary> {
  @E.proto static vocabulary = treeDiagramVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "tree-diagram": treeDiagramCSS },
    delegatesFocus: false,
    slotAssignment: "manual" as const
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The tree
  ////////////////

  /**
   * Text of the JSON child, `<ui-json>` or `<script type="application/json">`;  `undefined` without one.
   * - Follows it as the page changes it.
   */
  @E.watches({ childList: true, characterData: true, subtree: true })
  get childText(): string | undefined {
    return isServer ? undefined : JsonChild.textOf(this.domElement)
  }

  /** Bumped when a `<ui-json>` child's data changes with no change in the page:  its `source` loaded. */
  @E.state accessor childDataVersion = 0

  /** A `<ui-json>` child says its data changed. */
  @E.on(JSON_CHANGED)
  protected onChildDataChanged() {
    this.childDataVersion++
  }

  /**
   * The JSON child's tree;  `undefined` without one, or when its JSON is invalid (warned once).
   * - `@derived`:  parses JSON.
   */
  @E.derived
  get childTree(): TreeDiagramNode | undefined {
    const text = this.childText
    void this.childDataVersion
    if (text === undefined || isServer) return undefined
    return this.readChild(text)
  }

  /**
   * The nested `<ui-tree-node>`s, written out to compare;  `undefined` without one.
   * - Follows them as the page changes them:  readers hear only when something a tree holds moved.
   */
  @E.watches({ childList: true, characterData: true, attributes: true, subtree: true })
  get nodesText(): string | undefined {
    const root = UITreeNode.firstNodeOf(this.domElement)
    return root && JSON.stringify(UITreeNode.nodeFrom(root), (key, value) => (key === "element" ? undefined : value))
  }

  /**
   * The nested `<ui-tree-node>`s' tree;  `undefined` without one.
   * - `@derived`:  walks every node.
   */
  @E.derived
  get nodesTree(): TreeDiagramNode | undefined {
    if (this.nodesText === undefined) return undefined
    const root = UITreeNode.firstNodeOf(this.domElement)
    return root && UITreeNode.nodeFrom(root)
  }

  /**
   * The tree drawn:  `tree` when it's a node, else the nested nodes', else the JSON child's;  `undefined`:  nothing
   * to draw.
   * - `@derived`:  `TreeData.node()` copies the tree, checking every node.
   */
  @E.derived
  get drawnTree(): TreeDiagramNode | undefined {
    return TreeData.node(this.tree) ?? this.nodesTree ?? this.childTree
  }

  /** The JSON child's tree;  invalid JSON warns (once per `text`, its text) and draws nothing. */
  private readChild(text: string): TreeDiagramNode | undefined {
    try {
      return TreeData.node(JsonChild.valueOf(this.domElement))
    } catch (error) {
      if (text !== this.warnedText)
        console.warn(`<${this.domElement.localName}>:  invalid JSON in its script child`, error)
      this.warnedText = text
      return undefined
    }
  }

  /** Invalid JSON already warned about:  a re-read of the same text stays quiet. */
  private warnedText: string | undefined

  ////////////////
  // ## Measuring
  ////////////////

  /** A text of each kind, in `<defs>`:  what a real one's font comes to.  Set as it draws. */
  private samples: Partial<TreeMeasureSamples> = {}
  /** The `<svg>`.  Set as it draws. */
  private svg: SVGSVGElement | undefined
  /** A hidden line of label text:  it changes size when the font does. */
  private fontSentinel: HTMLElement | undefined
  /** The `<slot>` the root `<ui-tree-node>` goes in.  Set as it draws. */
  private nodesSlot: HTMLSlotElement | undefined

  /** Bumped when what was measured may have changed:  it drew, a font arrived, what a node holds changed size. */
  @E.state accessor measureVersion = 0

  /** How far the drawing shrank to fit:  what a node holds shrinks with it. */
  @E.state accessor drawnScale = 1

  /** What a node holds changed size. */
  @E.on(TREE_NODE_RESIZED)
  protected onNodeResized() {
    this.measureVersion++
  }

  /** While it's in the page:  measures again when a web font arrives or the font changes;  follows the scale. */
  @E.whileConnected
  protected watchFontsAndSize() {
    this.measureVersion++
    const remeasure = () => this.measureVersion++
    document.fonts?.addEventListener("loadingdone", remeasure)
    const observer = new ResizeObserver(() => this.onDrawingResized())
    if (this.fontSentinel) observer.observe(this.fontSentinel)
    if (this.svg) observer.observe(this.svg)
    return () => {
      document.fonts?.removeEventListener("loadingdone", remeasure)
      observer.disconnect()
    }
  }

  /** The sentinel or the `<svg>` changed size. */
  private onDrawingResized() {
    const sentinelWidth = this.fontSentinel?.offsetWidth
    if (sentinelWidth !== this.lastSentinelWidth) {
      this.lastSentinelWidth = sentinelWidth
      this.measureVersion++
    }
    this.drawnScale = this.scaleNow()
  }

  /** The sentinel's width last seen. */
  private lastSentinelWidth: number | undefined

  /** The drawing's width on the page, per its natural width;  `1` when it isn't laid out. */
  private scaleNow(): number {
    const { svg, layout } = this
    const width = svg?.getBoundingClientRect().width
    if (!svg || !width || !layout) return 1
    return width / (layout.width * this.pixelsPerUnit() || width)
  }

  /** Pixels per user unit, at natural size:  one label `em` on the page is `fontSize` units. */
  private pixelsPerUnit(): number {
    return Number.parseFloat(getComputedStyle(this.svg!).fontSize) / TREE_DIAGRAM_METRICS.fontSize
  }

  /**
   * Every node's measured sizes;  `undefined` before it can measure (a server, or before it first draws).
   * - `@derived`:  measures every text.
   * - Reads the DOM:  `measureVersion` says when that changed.
   */
  @E.derived
  get sizes(): ReadonlyMap<TreeDiagramNode, TreeDiagramNodeSize> | undefined {
    const tree = this.drawnTree
    void this.measureVersion
    const { rootLabel, label, detail, edgeLabel } = this.samples
    if (isServer || !tree || !this.svg || !rootLabel || !label || !detail || !edgeLabel) return undefined
    return TreeMeasure.sizes(tree, { rootLabel, label, detail, edgeLabel }, (node) => this.contentSizeOf(node))
  }

  /** What `node` holds besides its text, in user units;  `undefined` when nothing. */
  private contentSizeOf(node: TreeDiagramNode): { width: number; height: number } | undefined {
    const size = (node.element as DOMTreeNodeElement | undefined)?.component?.contentSize
    if (!size) return undefined
    const perPixel = 1 / this.pixelsPerUnit()
    return { width: size.width * perPixel, height: size.height * perPixel }
  }

  ////////////////
  // ## Folding
  ////////////////

  /** Nodes folded or opened by a person, by `path`;  a tree that changes keeps them. */
  @E.state accessor foldChanges: ReadonlyMap<string, boolean> = new Map()

  /**
   * The nodes drawn as leaves:  `folded` in the tree, unless a person changed it.
   * - `@derived`:  walks every node.
   */
  @E.derived
  get foldedNodes(): ReadonlySet<TreeDiagramNode> {
    const folded = new Set<TreeDiagramNode>()
    const { drawnTree, foldChanges } = this
    const visit = (node: TreeDiagramNode, path: string) => {
      if (foldChanges.get(path) ?? node.folded) folded.add(node)
      node.children?.forEach((child, index) => visit(child, `${path}.${index}`))
    }
    if (drawnTree) visit(drawnTree, "0")
    return folded
  }

  /** Fold or open `box`'s node:  `ui-node-toggled`, then the drawing. */
  @E.untracked
  private toggle(box: TreeDiagramBox, originalEvent: Event) {
    const folded = !box.isFolded
    this.foldChanges = new Map(this.foldChanges).set(box.path, folded)
    this.send("ui-node-toggled", { node: box.node, path: box.path, folded, originalEvent })
  }

  ////////////////
  // ## Layout
  ////////////////

  /**
   * The tree laid out;  `undefined` with nothing to draw.
   * - `@derived`:  lays out every node.
   */
  @E.derived
  get layout(): TreeDiagramLayout | undefined {
    const tree = this.drawnTree
    if (!tree) return undefined
    return TreeLayout.of(tree, {
      direction: this.direction,
      sizes: this.sizes,
      folded: this.foldedNodes,
      metrics: this.foldable ? FOLDABLE_METRICS : TREE_DIAGRAM_METRICS
    })
  }

  /**
   * Tell each nested node where what it holds goes;  a folded-away node, nowhere.
   * - And hand the root `<ui-tree-node>` to its slot.
   */
  @E.onChange("layout", "nodesTree", "isReady")
  protected onLayoutChanged(
    layout: TreeDiagramLayout | undefined,
    tree: TreeDiagramNode | undefined,
    isReady: boolean
  ) {
    if (!isReady) return
    this.nodesSlot?.assign(...(tree?.element ? [tree.element] : []))
    this.drawnScale = this.scaleNow()
    const shown = new Map(layout?.boxes.map((box) => [box.node.element, box]))
    const place = (node: TreeDiagramNode) => {
      const component = (node.element as DOMTreeNodeElement | undefined)?.component
      const content = shown.get(node.element)?.content
      if (component) {
        component.placement =
          content && layout
            ? { left: (content.x / layout.width) * 100, top: (content.y / layout.height) * 100 }
            : undefined
      }
      node.children?.forEach(place)
    }
    if (tree) place(tree)
  }

  ////////////////
  // ## Clicks
  ////////////////

  /** A click on what a node holds:  it's outside the `<svg>`, in the page. */
  @E.on("click")
  protected onContentClick(event: MouseEvent) {
    const element = event
      .composedPath()
      .find((target) => target !== this.domElement && UITreeNode.isNode(target as Node)) as Element | undefined
    if (!element) return
    const box = this.layout?.boxes.find((each) => each.node.element === element)
    if (box) this.sendClick(box, event)
  }

  /** `ui-node-clicked`. */
  @E.untracked
  private sendClick(box: TreeDiagramBox, originalEvent: Event) {
    this.send("ui-node-clicked", { node: box.node, path: box.path, originalEvent })
  }

  /** Enter or Space on a focused node or fold button does `act`. */
  private onButtonKey(event: KeyboardEvent, act: (event: Event) => void) {
    if (event.key !== UIT.Key.enter && event.key !== UIT.Key.space) return
    event.preventDefault()
    event.stopPropagation()
    act(event)
  }

  ////////////////
  // ## Drawing
  ////////////////

  /**
   * `empty` with nothing to draw.
   * - Reads `tree` itself, not just `drawnTree`:  so the classes follow EVERY write to it,
   *   as `ElementFixture.breakRender()` needs (the only attribute is a non-class one).
   */
  protected override get extraClass(): string | undefined {
    return TreeData.node(this.tree) || this.nodesTree || this.childTree ? undefined : EMPTY
  }

  render(): JSX.Element {
    return (
      <div class={CANVAS_CLASS} style={this.canvasStyle()}>
        <svg
          ref={(svg: SVGSVGElement) => (this.svg = svg)}
          class={this.rootClass}
          part={this.partForName("diagram")}
          role={this.layout ? (this.foldable || this.clickable ? "group" : "img") : undefined}
          aria-label={this.summary()}
          viewBox={this.viewBox()}
          style={this.sizeStyle()}
        >
          {this.fontSamples()}
          <For each={this.layout?.edges ?? []} keyed={false}>
            {(edge) => this.edge(edge)}
          </For>
          <For each={this.layout?.boxes ?? []} keyed={false}>
            {(box) => this.box(box)}
          </For>
        </svg>
        <span ref={(span: HTMLElement) => (this.fontSentinel = span)} class={SENTINEL_CLASS} aria-hidden="true">
          Mg
        </span>
        <slot ref={(slot: HTMLSlotElement) => (this.nodesSlot = slot)} />
      </div>
    )
  }

  /** A text of each kind, never drawn:  what `TreeMeasure` reads each font from. */
  private fontSamples(): JSX.Element {
    const { fontSize, detailFontSize, edgeLabelFontSize } = TREE_DIAGRAM_METRICS
    return (
      <defs>
        <g class={[NODE_CLASS, ROOT_CLASS]}>
          <text
            ref={(text: SVGTextElement) => (this.samples.rootLabel = text)}
            class={LABEL_CLASS}
            font-size={String(fontSize)}
          />
        </g>
        <g class={NODE_CLASS}>
          <text
            ref={(text: SVGTextElement) => (this.samples.label = text)}
            class={LABEL_CLASS}
            font-size={String(fontSize)}
          />
          <text
            ref={(text: SVGTextElement) => (this.samples.detail = text)}
            class={DETAIL_CLASS}
            font-size={String(detailFontSize)}
          />
        </g>
        <text
          ref={(text: SVGTextElement) => (this.samples.edgeLabel = text)}
          class={EDGE_LABEL_CLASS}
          font-size={String(edgeLabelFontSize)}
        />
      </defs>
    )
  }

  /**
   * One node:  its `<g>` (part `node`, the root's also `root-node`), `<title>`, box, label, detail, fold button.
   * - `box` is the For's accessor (`keyed={false}`):  a redraw updates the same elements in place, by position.
   */
  private box(box: Accessor<TreeDiagramBox>): JSX.Element {
    const { fontSize, detailFontSize } = TREE_DIAGRAM_METRICS
    const isRoot = () => box().depth === 0
    const kind = () => UITreeDiagram.wordFor(box().node.kind)
    return (
      <g
        class={[
          NODE_CLASS,
          { [ROOT_CLASS]: isRoot(), [CLICKABLE_CLASS]: !!this.clickable },
          kind() && `kind-${kind()}`
        ]}
        part={[this.partForName("node"), isRoot() && this.partForName("root-node"), kind() && `kind-${kind()}`]
          .filter(Boolean)
          .join(" ")}
        style={UITreeDiagram.colorStyle(box().node.color)}
        role={this.clickable ? "button" : undefined}
        tabindex={this.clickable ? "0" : undefined}
        aria-label={this.clickable ? box().node.label : undefined}
        onClick={(event: MouseEvent) => this.sendClick(box(), event)}
        onKeyDown={(event: KeyboardEvent) => {
          if (this.clickable && event.target === event.currentTarget)
            this.onButtonKey(event, (original) => this.sendClick(box(), original))
        }}
      >
        <Show when={box().node.title}>{(title) => <title>{title()}</title>}</Show>
        <rect class={BOX_CLASS} x={box().x} y={box().y} width={box().width} height={box().height} />
        <Show when={box().node.label}>
          <text class={LABEL_CLASS} x={box().label.x} y={box().label.y} font-size={String(fontSize)}>
            {box().node.label}
          </text>
        </Show>
        <Show when={box().detail}>
          {(detail) => (
            <text class={DETAIL_CLASS} x={detail().x} y={detail().y} font-size={String(detailFontSize)}>
              {box().node.detail}
            </text>
          )}
        </Show>
        <Show when={this.foldable && box().childCount}>{this.foldButton(box)}</Show>
      </g>
    )
  }

  /** `box`'s fold button (part `toggle`), where its lines leave it:  a circle with a `+` or a `-`. */
  private foldButton(box: Accessor<TreeDiagramBox>): JSX.Element {
    const label = () => this.translationForKey(box().isFolded ? "unfoldNode" : "foldNode", { label: box().node.label })
    return (
      <g
        class={TOGGLE_CLASS}
        part={this.partForName("toggle")}
        role="button"
        tabindex="0"
        aria-expanded={box().isFolded ? "false" : "true"}
        aria-label={label()}
        transform={`translate(${box().exit.x} ${box().exit.y})`}
        onClick={(event: MouseEvent) => {
          event.stopPropagation()
          this.toggle(box(), event)
        }}
        onKeyDown={(event: KeyboardEvent) => this.onButtonKey(event, (original) => this.toggle(box(), original))}
      >
        <title>{label()}</title>
        <circle class={TOGGLE_TARGET_CLASS} r={TOGGLE_TARGET_RADIUS} />
        <circle class={TOGGLE_CIRCLE_CLASS} r={TOGGLE_RADIUS} />
        <path class={TOGGLE_MARK_CLASS} d={box().isFolded ? PLUS_MARK : MINUS_MARK} />
      </g>
    )
  }

  /** One edge:  its line (part `edge`), broken under its label (part `edge-label`).  `edge`:  as `box()`'s. */
  private edge(edge: Accessor<TreeDiagramEdge>): JSX.Element {
    return (
      <>
        <path class={EDGE_CLASS} part={this.partForName("edge")} d={UITreeDiagram.path(edge())} />
        <Show when={edge().label}>
          {(label) => (
            <text
              class={EDGE_LABEL_CLASS}
              part={this.partForName("edge-label")}
              x={label().x}
              y={label().y}
              font-size={String(TREE_DIAGRAM_METRICS.edgeLabelFontSize)}
            >
              {label().text}
            </text>
          )}
        </Show>
      </>
    )
  }

  /** `viewBox`:  the layout's natural size. */
  private viewBox(): string | undefined {
    const layout = this.layout
    return layout && `0 0 ${layout.width} ${layout.height}`
  }

  /** The natural width in label `em`s, for the sheet to size the `<svg>` with. */
  private sizeStyle(): JSX.CSSProperties | undefined {
    const layout = this.layout
    return layout && { [NATURAL_WIDTH]: (layout.width / TREE_DIAGRAM_METRICS.fontSize).toFixed(3) }
  }

  /** How far the drawing shrank, for what its nodes hold. */
  private canvasStyle(): JSX.CSSProperties {
    return { [DRAWN_SCALE]: this.drawnScale.toFixed(4) }
  }

  /** The `<svg>`'s name:  the root's label and how many children it has. */
  private summary(): string | undefined {
    const tree = this.drawnTree
    if (!tree) return undefined
    return TreeData.summary(tree, (key, params) => this.translationForKey(key, params))
  }

  /** `d` of an edge's `<path>`:  one line, or two around the label's gap. */
  private static path({ from, to, gap }: TreeDiagramEdge): string {
    if (!gap) return `M${from.x} ${from.y}L${to.x} ${to.y}`
    return `M${from.x} ${from.y}L${gap.from.x} ${gap.from.y}M${gap.to.x} ${gap.to.y}L${to.x} ${to.y}`
  }

  /** `word` when it's safe in a class and a part name;  else `undefined`. */
  private static wordFor(word: string | undefined): string | undefined {
    return word && /^[\w-]+$/.test(word) ? word : undefined
  }

  /** A node's `color`:  the node's tokens, set to that hue, on its `<g>`;  the sheet reads them. */
  private static colorStyle(color: string | undefined): JSX.CSSProperties | undefined {
    const hue = UITreeDiagram.wordFor(color)
    if (!hue) return undefined
    const background = `var(--ui-${hue}-background)`
    const border = `var(--ui-${hue})`
    return {
      "--ui-tree-diagram-node-background": background,
      "--ui-tree-diagram-node-border-color": border,
      "--ui-tree-diagram-root-background": background,
      "--ui-tree-diagram-root-border-color": border
    }
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UITreeDiagram extends E.AttributeValues<typeof treeDiagramVocabulary> {}

/** Class word before the noun when there's nothing to draw (`ui empty tree diagram`):  the `<svg>` hides. */
const EMPTY = "empty"

/** Class of the box around the drawing and its nodes' content, the content's containing block. */
const CANVAS_CLASS = "canvas"
/** Class of the hidden line that changes size when the font does. */
const SENTINEL_CLASS = "font-sentinel"

/** Class of each node's `<g>`, its box, its texts;  each edge;  each edge label. */
const NODE_CLASS = "node"
const ROOT_CLASS = "root"
const CLICKABLE_CLASS = "clickable"
const BOX_CLASS = "box"
const LABEL_CLASS = "label"
const DETAIL_CLASS = "detail"
const EDGE_CLASS = "edge"
const EDGE_LABEL_CLASS = "edge-label"

/** Class of a fold button's `<g>` and its pieces. */
const TOGGLE_CLASS = "toggle"
const TOGGLE_TARGET_CLASS = "toggle-target"
const TOGGLE_CIRCLE_CLASS = "toggle-circle"
const TOGGLE_MARK_CLASS = "toggle-mark"

/** A fold button's circle, in user units. */
const TOGGLE_RADIUS = 6
/** What a pointer can hit, around it. */
const TOGGLE_TARGET_RADIUS = 12
/** The button's `+` and `-`, drawn so they're centred in any font. */
const PLUS_MARK = "M-3 0H3M0 -3V3"
const MINUS_MARK = "M-3 0H3"

/** A foldable tree's room around the drawing:  a button sticks out below its last row. */
const FOLDABLE_METRICS = { ...TREE_DIAGRAM_METRICS, margin: TOGGLE_RADIUS + 2 }

/** Private custom property the sheet sizes the `<svg>` with:  the layout's natural width, in label `em`s. */
const NATURAL_WIDTH = "--_ui-tree-diagram-natural-width"
/** Private custom property what a node holds is scaled by:  how far the drawing shrank. */
const DRAWN_SCALE = "--_ui-tree-diagram-scale"
