import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
// Import directly:  the tree diagram's text measuring, shared by every drawing (one canvas a page)
import { TreeMeasure } from "spell/ui/components/ui-tree-diagram/TreeMeasure"
import { graphVocabulary } from "./UIGraph.en"
import { GraphLayout } from "./GraphLayout"
import {
  GRAPH_METRICS,
  GraphChildViews,
  type GraphChildView,
  type GraphData,
  type GraphEdge,
  type GraphLayoutResult,
  type GraphNode,
  type GraphPlacedEdge,
  type GraphPlacedNode,
  type GraphPlacedPin,
  type GraphPlacedPort,
  type GraphPort,
  type GraphSelection
} from "./UIGraph.types"

import graphCSS from "./UIGraph.css?inline"

/****************
 * ### `DOMGraphElement`
 * `<ui-graph>` itself:  its script API, over its component.
 ****************/
export class DOMGraphElement extends E.DOMElement<UIGraph> {
  /** Fit the drawing to the view. */
  fit() {
    this.component?.fit()
  }

  /** Open the node at `path` (its ids from the top, joined by `/`), as `view`, else as its own or the graph's. */
  open(path: string, view?: GraphChildView): Promise<void> {
    return this.component?.openNode(path, view) ?? Promise.resolve()
  }

  /** Close the node at `path`, opened in place;  or, drilled into, go back above it. */
  close(path: string) {
    this.component?.closeNode(path)
  }

  /** Show the graph at `path` instead of the top (drill);  none:  back to the top. */
  drillTo(path?: string): Promise<void> {
    return this.component?.drillTo(path) ?? Promise.resolve()
  }

  /** The graph as it's drawn now:  every box and edge, in user units. */
  get layout(): GraphLayoutResult | undefined {
    return this.component?.layout
  }
}

/****************
 * ### `<ui-graph>`
 * The component behind `<ui-graph>`:  a node / edge graph drawn as an SVG, laid out left to right in layers
 * (`GraphLayout`), with ports on the nodes' sides, smooth edges, pan, zoom and fit.
 *
 * - GENERIC:  any graph from plain data (`GraphData`).  A subclass restyles and relabels it through the hooks below
 *   (`nodeLabel()`, `nodeClass()`, `renderNode()`, `edgeClass()` ...), its parts and its `--ui-graph-*` tokens.
 * - A node with `children` has a toggle;  opened, they show by `child-view` (or the node's `childView`):
 *   - `inline`:  the node grows into a container, its graph laid out inside it, recursively
 *   - `modal`:  a `<ui-modal>` holding another graph of the same tag
 *   - `drill`:  the drawing shows them instead, with `<ui-breadcrumbs>` back
 *   - `children` given as a function (or a promise of a graph) is called the first time it opens.
 * - Paths:  a node is known by its ids from the top graph, joined by `/` (`cpu/alu`);  a port by its node's path, `:`
 *   and its id;  an edge by its graph's path, `#` and its id.  So ids should hold none of `/`, `:` or `#`.
 * - Pan:  drag;  zoom:  the wheel, round the pointer;  fit:  the toolbar's button, and by itself on a new graph.
 * - `path` (`a/b`):  the node drilled to.  Set it to drill there;  a drill (double-click a node with children, or
 *   its toggle with `child-view="drill"`) or a breadcrumb sets it back and sends `ui-changed` `{ kind: 'path', path }`.
 * - Click a node, an edge or a port to select it:  `ui-selecting` (cancelable), then `ui-changed`.
 *   Hovering an edge lights it and its two ends;  hovering a node lights its edges.
 * - Text is measured in the graph's real font (`TreeMeasure`, the canvas the tree diagram measures with);
 *   a static server render estimates from character counts.
 * - Spell UI's other drawings of boxes and lines, so nobody builds a fourth:
 *   - `<ui-tree-diagram>`:  a TREE, each node's children under (or beside) it
 *   - `<ui-diagram>`:  boxes in COLUMNS and the links between them, the NERD drawing, boxes dragged by hand
 *   - this one:  any GRAPH, cycles too, in layers left to right, with ports on the boxes' sides, wires between
 *     them and nested graphs, panned and zoomed
 ****************/
export class UIGraph extends E.UIComponent<typeof graphVocabulary> {
  @E.proto static vocabulary = graphVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { graph: graphCSS },
    delegatesFocus: false,
    DOMElement: DOMGraphElement
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Hooks:  a subclass overrides these to restyle and relabel
  ////////////////

  /** A node's text. */
  nodeLabel(node: GraphNode): string {
    return node.label ?? node.id
  }

  /** Extra classes on a node's `<g>`;  `kind-<kind>` is there already. */
  nodeClass(_node: GraphNode): string | undefined {
    return undefined
  }

  /** An edge's text, at its middle;  none:  no text. */
  edgeLabel(edge: GraphEdge): string | undefined {
    return edge.label
  }

  /** Extra classes on an edge's `<path>`. */
  edgeClass(_edge: GraphEdge): string | undefined {
    return undefined
  }

  /** A port's text, beside it inside its node. */
  portLabel(port: GraphPort, _node: GraphNode): string | undefined {
    return port.label
  }

  /** Extra classes on a port's `<g>`. */
  portClass(_port: GraphPort, _node: GraphNode): string | undefined {
    return undefined
  }

  /** The sizes the layout works in;  a subclass may make its boxes taller, its layers wider apart ... */
  get metrics(): typeof GRAPH_METRICS {
    return GRAPH_METRICS
  }

  /**
   * The breadcrumbs, top first:  each one's text, and what picking it does.  None (or one):  no breadcrumbs.
   * - Default:  the top, then each node drilled into.  A subclass that shows its own levels gives its own trail.
   */
  trail(): { label: string; pick: () => void }[] {
    if (!this.drillPaths.length) return []
    return [
      { label: this.translationForKey("graphTop"), pick: () => this.goToDrill(0) },
      ...this.drillPaths.map((path, index) => {
        const node = this.nodeAt(path)
        return { label: node ? this.nodeLabel(node) : path, pick: () => this.goToDrill(index + 1) }
      })
    ]
  }

  /** The least zoom Fit goes to:  a graph bigger than that shows its start, the rest a pan away.  `0`:  no least. */
  get minFitZoom(): number {
    return 0
  }

  /** More buttons in the toolbar, before Fit. */
  toolButtons(): JSX.Element {
    return undefined
  }

  /** Something drawn over the canvas (a legend ...), positioned by the subclass's own sheet. */
  overlay(): JSX.Element {
    return undefined
  }

  /** A node was double-clicked:  drilled into, when it has children. */
  nodeDoubleClicked(placed: GraphPlacedNode, event: MouseEvent) {
    if (placed.hasChildren) void this.openNode(placed.path, "drill", event)
  }

  /** The detail of the `ui-changed` a selection sends. */
  changedDetail(selection: GraphSelection, item: object, originalEvent: Event): object {
    return { value: selection, ...selection, item, originalEvent }
  }

  /**
   * What a node's `<g>` holds:  its box and label;  the ports and toggle are drawn after it.
   * - Override to draw a node another way;  stay inside `placed`'s box, as the layout sized it.
   */
  renderNode(placed: GraphPlacedNode): JSX.Element {
    const { fontSize } = GRAPH_METRICS
    const { x, y, width, height, isOpen } = placed
    const label = this.nodeLabel(placed.node)
    return (
      <>
        <rect class={BOX_CLASS} x={x} y={y} width={width} height={height} />
        <text
          class={LABEL_CLASS}
          x={
            isOpen
              ? x + GRAPH_METRICS.paddingX
              : x + width / 2 - (placed.hasChildren ? GRAPH_METRICS.toggleWidth / 2 : 0)
          }
          y={isOpen ? y + GRAPH_METRICS.headerHeight / 2 : y + height / 2}
          text-anchor={isOpen ? "start" : "middle"}
          font-size={String(fontSize)}
        >
          {placed.isLoading ? `${label}  ${this.translationForKey("graphLoading")}` : label}
        </text>
      </>
    )
  }

  ////////////////
  // ## The graph shown
  ////////////////

  /** Children loaded from a function or promise, by the node's path. */
  @E.state accessor loadedChildren: ReadonlyMap<string, GraphData> = new Map()
  /** Paths whose children are loading. */
  @E.state accessor loadingPaths: ReadonlySet<string> = new Set()
  /** Paths of nodes open in place. */
  @E.state accessor openPaths: ReadonlySet<string> = new Set()
  /** The nodes drilled into, outermost first. */
  @E.state accessor drillPaths: readonly string[] = []
  /** The node whose children the modal shows. */
  @E.state accessor modalPath: string | undefined = undefined

  /** The `graph` property, checked;  `undefined`:  nothing to draw. */
  get topGraph(): GraphData | undefined {
    return UIGraph.graphFrom(this.graph)
  }

  /** The node at `path`, from the top;  `undefined` when there's none, or its graph isn't loaded. */
  nodeAt(path: string): GraphNode | undefined {
    let graph = this.topGraph
    let at = ""
    let node: GraphNode | undefined
    for (const id of path.split("/")) {
      if (!graph) return undefined
      node = graph.nodes.find((each) => each?.id === id)
      if (!node) return undefined
      at = at ? `${at}/${id}` : id
      graph = this.childrenOf(node, at)
    }
    return node
  }

  /** `node`'s child graph, when it's there:  given as a graph, or loaded. */
  childrenOf(node: GraphNode, path: string): GraphData | undefined {
    const children = node.children
    if (children && typeof children === "object") return UIGraph.graphFrom(children)
    return this.loadedChildren.get(path)
  }

  /** The node drilled into last;  `undefined` at the top. */
  get drillPath(): string | undefined {
    return this.drillPaths.at(-1)
  }

  /** The graph drawn:  the top's, or the children of the node drilled into. */
  @E.derived
  get shownGraph(): GraphData | undefined {
    const path = this.drillPath
    if (path === undefined) return this.topGraph
    const node = this.nodeAt(path)
    return node && this.childrenOf(node, path)
  }

  /** The ports drawn as pins round the graph shown. */
  get shownBoundary(): readonly GraphPort[] {
    const path = this.drillPath
    if (path !== undefined) return this.nodeAt(path)?.ports ?? []
    return Array.isArray(this.boundary) ? (this.boundary as GraphPort[]) : []
  }

  /** The graph laid out;  `undefined` with nothing to draw.  `@derived`:  lays out every node. */
  @E.derived
  get layout(): GraphLayoutResult | undefined {
    const graph = this.shownGraph
    if (!graph) return undefined
    const openChildren = new Map<string, GraphData>()
    for (const path of this.openPaths) {
      const node = this.nodeAt(path)
      const children = node && this.childrenOf(node, path)
      if (children) openChildren.set(path, children)
    }
    return GraphLayout.of(graph, {
      metrics: this.metrics,
      prefix: this.drillPath ?? "",
      openChildren,
      loading: this.loadingPaths,
      boundary: this.shownBoundary,
      label: (node) => this.nodeLabel(node),
      textWidth: isServer ? undefined : (text, size) => UIGraph.measure(text, size, this.fontFamily)
    })
  }

  /** The font the labels are drawn in, read once:  what they're measured in. */
  @E.lazy
  private get fontFamily(): string {
    return getComputedStyle(this.domElement).fontFamily || "sans-serif"
  }

  /** The containers first (they're behind), then the boxes. */
  private get containers(): readonly GraphPlacedNode[] {
    return this.layout?.nodes.filter((placed) => placed.isOpen) ?? []
  }

  private get leaves(): readonly GraphPlacedNode[] {
    return this.layout?.nodes.filter((placed) => !placed.isOpen) ?? []
  }

  ////////////////
  // ## Opening and closing
  ////////////////

  /** Open the node at `path`:  its children loaded first, then shown as `view`. */
  async openNode(path: string, view?: GraphChildView, originalEvent?: Event): Promise<void> {
    const node = this.nodeAt(path)
    if (!node?.children) return
    const how = view ?? UIGraph.viewFrom(node.childView) ?? UIGraph.viewFrom(this.childView) ?? "inline"
    if (!(await this.load(node, path))) return
    if (how === "inline") this.openPaths = new Set(this.openPaths).add(path)
    else if (how === "modal") this.modalPath = path
    else {
      this.drillPaths = [...this.drillPaths, path]
      this.needsFit = true
      this.drilled(originalEvent)
    }
    this.send("ui-node-toggled", { node, path, open: true, view: how, originalEvent })
  }

  /** Close the node at `path`:  in place, with every node open inside it;  drilled into, back above it. */
  closeNode(path: string, originalEvent?: Event) {
    const node = this.nodeAt(path)
    const drilled = this.drillPaths.indexOf(path)
    if (drilled >= 0) {
      this.drillPaths = this.drillPaths.slice(0, drilled)
      this.needsFit = true
      this.drilled(originalEvent)
    } else {
      this.openPaths = new Set([...this.openPaths].filter((each) => each !== path && !each.startsWith(`${path}/`)))
    }
    if (node)
      this.send("ui-node-toggled", { node, path, open: false, view: drilled >= 0 ? "drill" : "inline", originalEvent })
  }

  /** Show the graph inside the node at `path`;  none:  the top. */
  async drillTo(path?: string): Promise<void> {
    if (!path) {
      this.goToDrill(0)
      return
    }
    await this.openNode(path, "drill")
  }

  /** Back up to `depth` nodes drilled into (`0`:  the top). */
  goToDrill(depth: number, originalEvent?: Event) {
    if (depth >= this.drillPaths.length) return
    this.drillPaths = this.drillPaths.slice(0, depth)
    this.needsFit = true
    this.drilled(originalEvent)
  }

  /** The graph shown changed by a drill:  `path` follows, and `ui-changed` `{ kind: 'path', path }` says so. */
  private drilled(originalEvent?: Event) {
    const path = this.drillPath ?? ""
    if (path === (this.path ?? "")) return
    this.path = path as never
    this.send("ui-changed", { kind: "path", path, originalEvent })
  }

  /** `path` was set:  drill to it. */
  @E.onChange("path")
  protected onPathChanged(path: string | undefined) {
    void this.applyPath(path ?? "")
  }

  /**
   * Show the graph inside the node at `path` (`a/b`;  `""`:  the top), drilling through each node on the way and
   * loading lazy children.  Sends nothing:  the page asked for it.  A subclass with a path of its own overrides it.
   */
  async applyPath(path: string): Promise<void> {
    if (path === (this.drillPath ?? "")) return
    const ids = path ? path.split("/") : []
    const trail: string[] = []
    for (let at = 0; at < ids.length; at++) {
      const prefix = ids.slice(0, at + 1).join("/")
      const node = this.nodeAt(prefix)
      if (!node?.children) break
      if (!(await this.load(node, prefix))) break
      trail.push(prefix)
    }
    this.drillPaths = trail
    this.needsFit = true
  }

  /** `node`'s children, loaded if they're a function or a promise;  false when they failed. */
  protected async load(node: GraphNode, path: string): Promise<boolean> {
    if (typeof node.children !== "function" || this.loadedChildren.has(path)) return true
    this.loadingPaths = new Set(this.loadingPaths).add(path)
    try {
      const graph = UIGraph.graphFrom(await node.children())
      if (!graph) return false
      this.loadedChildren = new Map(this.loadedChildren).set(path, graph)
      return true
    } catch (error) {
      E.Warnings.warn(`<${this.domElement.localName}>`, `${path}'s children failed to load`, error)
      return false
    } finally {
      const loading = new Set(this.loadingPaths)
      loading.delete(path)
      this.loadingPaths = loading
    }
  }

  /** A toggle was pressed. */
  @E.untracked
  private toggle(placed: GraphPlacedNode, event: Event) {
    event.stopPropagation()
    if (placed.isOpen) this.closeNode(placed.path, event)
    else void this.openNode(placed.path, undefined, event)
  }

  /** `drilled`:  it shows a node's children. */
  @E.cssState("drilled")
  get isDrilled(): boolean {
    return this.drillPaths.length > 0
  }

  ////////////////
  // ## Selection and hover
  ////////////////

  /** The path hovered:  a node's, an edge's or a port's. */
  @E.state accessor hovered: { kind: GraphSelection["kind"]; path: string } | undefined = undefined

  /** The paths lit:  the hovered edge and its ends, or the hovered node and its edges.  `@derived`:  walks the edges. */
  @E.derived
  get lit(): ReadonlySet<string> {
    const lit = new Set<string>()
    const hovered = this.hovered
    const layout = this.layout
    if (!hovered || !layout) return lit
    lit.add(hovered.path)
    const nodeOf = (path: string) => path.split(":")[0]
    for (const edge of layout.edges) {
      const isIt =
        hovered.kind === "edge"
          ? edge.path === hovered.path
          : hovered.kind === "port"
            ? edge.fromPath === hovered.path || edge.toPath === hovered.path
            : nodeOf(edge.fromPath) === hovered.path || nodeOf(edge.toPath) === hovered.path
      if (!isIt) continue
      lit.add(edge.path)
      for (const end of [edge.fromPath, edge.toPath]) {
        lit.add(end)
        lit.add(nodeOf(end))
      }
    }
    return lit
  }

  /** The selected path;  `undefined`:  nothing. */
  get selectedPath(): string | undefined {
    const selected = this.selected as GraphSelection | undefined
    return selected && typeof selected === "object" ? selected.path : undefined
  }

  /** Select `selection`:  `ui-selecting` (a page may cancel it), then `selected`, then `ui-changed`. */
  @E.untracked
  protected choose(selection: GraphSelection, item: object, originalEvent: Event) {
    originalEvent.stopPropagation()
    if (this.wasDragged) return
    if (!this.send("ui-selecting", { ...selection, item, originalEvent })) return
    this.selected = selection as never
    this.send("ui-changed", this.changedDetail(selection, item, originalEvent))
  }

  ////////////////
  // ## Pan, zoom and fit
  ////////////////

  /** The view:  a shift in pixels, then a scale. */
  @E.state accessor view = { x: 0, y: 0, k: 1 }
  /** A drag is moving the view. */
  @E.state accessor isPanning = false
  /** The next layout is fitted to the view:  a new graph, or a drill. */
  protected needsFit = true
  /** The view was last set by a fit, not by a person:  a change of size fits again. */
  private isFitted = false
  /** The last pointer press moved far enough to be a drag:  its click selects nothing. */
  private wasDragged = false
  /** The `<svg>`.  Set as it draws. */
  private svg: SVGSVGElement | undefined

  @E.cssState("panning")
  get isPanningNow(): boolean {
    return this.isPanning
  }

  /** Fit the drawing to the view:  all of it, at most one and a half times its size. */
  @E.untracked
  fit() {
    const layout = this.layout
    // Its own size, not its drawn one:  a modal opening scales it with a transform.
    const box = this.svg && { width: this.svg.clientWidth, height: this.svg.clientHeight }
    if (!layout || !box?.width || !box.height) return
    const k = Math.max(this.minFitZoom, Math.min(box.width / layout.width, box.height / layout.height, 1.5))
    // Centred, too big or not:  too big at the least zoom, its middle shows (where the nodes are;  its edges are often
    // empty pins and margins), the rest a pan away.
    const along = (room: number, size: number) => (room - size * k) / 2
    this.view = { x: along(box.width, layout.width), y: along(box.height, layout.height), k }
    this.isFitted = true
  }

  /** A new graph:  fit it. */
  @E.onChange("graph")
  protected onGraphChanged() {
    this.needsFit = true
    this.drillPaths = []
    this.openPaths = new Set(UIGraph.startOpen(this.topGraph))
    if (this.path) void this.applyPath(String(this.path))
  }

  /** Fit when asked to, once the drawing's there. */
  @E.onChange("layout", "isReady")
  protected onLayoutChanged(layout: GraphLayoutResult | undefined, isReady: boolean) {
    if (!isReady || !layout || !this.needsFit || !this.svg?.getBoundingClientRect().width) return
    this.needsFit = false
    this.fit()
  }

  /** While it's in the page:  fit again when it first gets a size. */
  @E.whileConnected
  protected watchSize() {
    const observer = new ResizeObserver(() => {
      if (this.needsFit || this.isFitted) this.fit()
      if (this.svg?.getBoundingClientRect().width) this.needsFit = false
    })
    if (this.svg) observer.observe(this.svg)
    return () => observer.disconnect()
  }

  private readonly onWheel = (event: WheelEvent) => {
    if (!this.svg) return
    event.preventDefault()
    const box = this.svg.getBoundingClientRect()
    const px = event.clientX - box.left
    const py = event.clientY - box.top
    const { x, y, k } = this.view
    const next = Math.min(4, Math.max(0.05, k * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015))))
    this.view = { x: px - ((px - x) * next) / k, y: py - ((py - y) * next) / k, k: next }
    this.isFitted = false
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.svg) return
    const svg = this.svg
    const start = { x: event.clientX, y: event.clientY, view: this.view }
    this.wasDragged = false
    const move = (moved: PointerEvent) => {
      const dx = moved.clientX - start.x
      const dy = moved.clientY - start.y
      if (!this.wasDragged && Math.hypot(dx, dy) < DRAG_DISTANCE) return
      if (!this.wasDragged) {
        this.wasDragged = true
        this.isFitted = false
        this.isPanning = true
        svg.setPointerCapture(event.pointerId)
      }
      this.view = { ...start.view, x: start.view.x + dx, y: start.view.y + dy }
    }
    const up = () => {
      svg.removeEventListener("pointermove", move)
      svg.removeEventListener("pointerup", up)
      svg.removeEventListener("pointercancel", up)
      this.isPanning = false
      // The click after a drag comes next:  forget the drag after it.
      E.soon(() => (this.wasDragged = false))
    }
    svg.addEventListener("pointermove", move)
    svg.addEventListener("pointerup", up)
    svg.addEventListener("pointercancel", up)
  }

  /** A click on the background clears the selection. */
  private readonly onBackgroundClick = (event: MouseEvent) => {
    if (this.wasDragged || !this.selected) return
    this.selected = undefined as never
    this.send("ui-changed", { value: undefined, originalEvent: event })
  }

  ////////////////
  // ## The modal
  ////////////////

  /** The modal's box the child graph goes in.  Set as it draws. */
  private modalBody: HTMLElement | undefined

  /** The modal shows the children of `modalPath`:  in a new graph of this same tag (so a subclass's look carries). */
  @E.onChange("modalPath", "isReady")
  protected onModalPathChanged(path: string | undefined, isReady: boolean) {
    if (!isReady || !this.modalBody) return
    if (path === undefined) {
      this.modalBody.replaceChildren()
      return
    }
    const node = this.nodeAt(path)
    const graph = node && this.childrenOf(node, path)
    const inner = document.createElement(this.domElement.localName) as HTMLElement & {
      graph?: GraphData
      boundary?: readonly GraphPort[]
    }
    inner.graph = graph
    inner.boundary = node?.ports ?? []
    if (this.childView) inner.setAttribute("child-view", String(this.childView))
    inner.classList.add(MODAL_GRAPH_CLASS)
    // Set on the element, as a page would:  a sheet here never declares a public token (Spell UI's AGENTS.md, "CSS")
    inner.style.setProperty("--ui-graph-height", MODAL_GRAPH_HEIGHT)
    this.modalBody.replaceChildren(inner)
  }

  /** The modal closed. */
  @E.on("ui-closed", { target: "renderRoot" })
  protected onModalClosed(event: Event) {
    if (event.target === this.modalElement) this.modalPath = undefined
  }

  private modalElement: HTMLElement | undefined

  ////////////////
  // ## Drawing
  ////////////////

  protected override get extraClass(): string | undefined {
    return this.topGraph ? undefined : EMPTY
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("graph")}>
        <Show when={this.trail().length > 1}>{this.breadcrumbs()}</Show>
        <div class={TOOLBAR_CLASS} part={this.partForName("toolbar")}>
          {this.toolButtons()}
          <button type="button" onClick={() => this.fit()}>
            {this.translationForKey("graphFit")}
          </button>
        </div>
        {this.overlay()}
        <svg
          ref={(svg: SVGSVGElement) => (this.svg = svg)}
          class={CANVAS_CLASS}
          part={this.partForName("canvas")}
          role="group"
          aria-label={this.translationForKey("graphSummary", { count: this.layout?.nodes.length ?? 0 })}
          onWheel={this.onWheel}
          onPointerDown={this.onPointerDown}
          onClick={this.onBackgroundClick}
        >
          <g transform={`translate(${this.view.x} ${this.view.y}) scale(${this.view.k})`}>
            <For each={this.containers}>{(placed) => this.node(placed)}</For>
            <For each={this.layout?.edges ?? []}>{(edge) => this.edge(edge)}</For>
            <For each={this.leaves}>{(placed) => this.node(placed)}</For>
            <For each={this.layout?.pins ?? []}>{(pin) => this.pin(pin)}</For>
          </g>
        </svg>
        <ui-modal
          ref={(element: HTMLElement) => (this.modalElement = element)}
          size="large"
          closable=""
          heading={this.modalHeading()}
          visible={this.modalPath !== undefined ? "" : undefined}
        >
          <div ref={(div: HTMLElement) => (this.modalBody = div)} class={MODAL_BODY_CLASS} />
        </ui-modal>
      </div>
    )
  }

  /** The modal's heading:  the node's label. */
  private modalHeading(): string | undefined {
    const path = this.modalPath
    const node = path === undefined ? undefined : this.nodeAt(path)
    return node && this.nodeLabel(node)
  }

  /** The trail back up (`trail()`), when there's one. */
  private breadcrumbs(): JSX.Element {
    return (
      <ui-breadcrumbs class={BREADCRUMBS_CLASS} part={this.partForName("breadcrumbs")} divider="›">
        <For each={this.trail()}>
          {(crumb, index) => (
            <ui-breadcrumb
              selected={index() === this.trail().length - 1 ? "" : undefined}
              onClick={() => {
                if (index() !== this.trail().length - 1) crumb.pick()
              }}
            >
              {crumb.label}
            </ui-breadcrumb>
          )}
        </For>
      </ui-breadcrumbs>
    )
  }

  /** One node:  its `<g>` (part `node`, a container's also `container`), what `renderNode()` draws, ports, toggle. */
  private node(placed: GraphPlacedNode): JSX.Element {
    const kind = UIGraph.wordFor(placed.node.kind)
    const path = placed.path
    return (
      <g
        class={[
          NODE_CLASS,
          kind && `kind-${kind}`,
          this.nodeClass(placed.node),
          {
            [CONTAINER_CLASS]: placed.isOpen,
            [LIT_CLASS]: this.lit.has(path),
            [SELECTED_CLASS]: this.selectedPath === path,
            [LOADING_CLASS]: !!placed.isLoading
          }
        ]}
        part={[this.partForName("node"), placed.isOpen && this.partForName("container"), kind && `kind-${kind}`]
          .filter(Boolean)
          .join(" ")}
        data-path={path}
        onClick={(event: MouseEvent) => this.choose({ kind: "node", id: placed.node.id, path }, placed.node, event)}
        onDblClick={(event: MouseEvent) => {
          event.stopPropagation()
          this.nodeDoubleClicked(placed, event)
        }}
        onPointerEnter={() => (this.hovered = { kind: "node", path })}
        onPointerLeave={() => this.unhover(path)}
      >
        <Show when={placed.node.title}>{(title) => <title>{title()}</title>}</Show>
        {this.renderNode(placed)}
        <For each={placed.ports}>{(port) => this.port(port, placed)}</For>
        <Show when={placed.hasChildren}>{this.toggleButton(placed)}</Show>
      </g>
    )
  }

  /** A node's open / close button (part `toggle`), at its top right. */
  private toggleButton(placed: GraphPlacedNode): JSX.Element {
    const label = () =>
      this.translationForKey(placed.isOpen ? "graphCloseNode" : "graphOpenNode", { label: this.nodeLabel(placed.node) })
    const cx = placed.x + placed.width - GRAPH_METRICS.toggleWidth / 2 - 4
    const cy = placed.isOpen ? placed.y + GRAPH_METRICS.headerHeight / 2 : placed.y + placed.height / 2
    return (
      <g
        class={TOGGLE_CLASS}
        part={this.partForName("toggle")}
        role="button"
        tabindex="0"
        aria-expanded={placed.isOpen ? "true" : "false"}
        aria-label={label()}
        transform={`translate(${cx} ${cy})`}
        onClick={(event: MouseEvent) => this.toggle(placed, event)}
        onDblClick={(event: MouseEvent) => event.stopPropagation()}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== UIT.Key.enter && event.key !== UIT.Key.space) return
          event.preventDefault()
          this.toggle(placed, event)
        }}
      >
        <title>{label()}</title>
        <circle class={TOGGLE_TARGET_CLASS} r={10} />
        <circle class={TOGGLE_CIRCLE_CLASS} r={6} />
        <path class={TOGGLE_MARK_CLASS} d={placed.isOpen ? MINUS_MARK : PLUS_MARK} />
      </g>
    )
  }

  /** A port:  its dot and label (part `port`). */
  private port(placed: GraphPlacedPort, owner: GraphPlacedNode): JSX.Element {
    const kind = UIGraph.wordFor(placed.port.kind)
    const label = this.portLabel(placed.port, owner.node)
    const r = GRAPH_METRICS.portRadius
    const labelAt =
      placed.side === "left"
        ? { x: placed.x + r + 3, y: placed.y, anchor: "start" as const }
        : placed.side === "right"
          ? { x: placed.x - r - 3, y: placed.y, anchor: "end" as const }
          : { x: placed.x, y: placed.side === "top" ? placed.y + r + 7 : placed.y - r - 7, anchor: "middle" as const }
    return (
      <g
        class={[
          PORT_CLASS,
          kind && `kind-${kind}`,
          this.portClass(placed.port, owner.node),
          { [LIT_CLASS]: this.lit.has(placed.path), [SELECTED_CLASS]: this.selectedPath === placed.path }
        ]}
        part={[this.partForName("port"), kind && `kind-${kind}`].filter(Boolean).join(" ")}
        onClick={(event: MouseEvent) =>
          this.choose({ kind: "port", id: placed.port.id, path: placed.path }, placed.port, event)
        }
        onPointerEnter={(event: PointerEvent) => {
          event.stopPropagation()
          this.hovered = { kind: "port", path: placed.path }
        }}
        onPointerLeave={() => (this.hovered = { kind: "node", path: owner.path })}
      >
        <circle class={PORT_DOT_CLASS} cx={placed.x} cy={placed.y} r={r} />
        <Show when={label && !(owner.isOpen && (placed.side === "left" || placed.side === "right"))}>
          <text
            class={PORT_LABEL_CLASS}
            x={labelAt.x}
            y={labelAt.y}
            text-anchor={labelAt.anchor}
            font-size={String(GRAPH_METRICS.portFontSize)}
          >
            {label}
          </text>
        </Show>
      </g>
    )
  }

  /** A pin:  the enclosing node's port, on the graph's side (part `pin`). */
  private pin(pin: GraphPlacedPin): JSX.Element {
    const label = pin.port.label ?? pin.port.id
    return (
      <g
        class={[PIN_CLASS, { [LIT_CLASS]: this.lit.has(pin.path) }]}
        part={this.partForName("pin")}
        onPointerEnter={() => (this.hovered = { kind: "port", path: pin.path })}
        onPointerLeave={() => this.unhover(pin.path)}
        onClick={(event: MouseEvent) => this.choose({ kind: "port", id: pin.port.id, path: pin.path }, pin.port, event)}
      >
        <path class={PIN_MARK_CLASS} d={`M${pin.x - 5} ${pin.y - 5}h10v10h-10z`} />
        <text
          class={PORT_LABEL_CLASS}
          x={pin.x}
          y={pin.y - 10}
          text-anchor="middle"
          font-size={String(GRAPH_METRICS.portFontSize)}
        >
          {label}
        </text>
      </g>
    )
  }

  /** One edge:  a wide unseen path to hit, the line (part `edge`), its label (part `edge-label`). */
  private edge(placed: GraphPlacedEdge): JSX.Element {
    const d = GraphLayout.pathFor(placed)
    const kind = UIGraph.wordFor(placed.edge.kind)
    const label = this.edgeLabel(placed.edge)
    const middle = GraphLayout.middleOf(placed)
    const select = (event: MouseEvent) =>
      this.choose({ kind: "edge", id: placed.id, path: placed.path }, placed.edge, event)
    return (
      <g
        class={[
          EDGE_GROUP_CLASS,
          kind && `kind-${kind}`,
          this.edgeClass(placed.edge),
          { [LIT_CLASS]: this.lit.has(placed.path), [SELECTED_CLASS]: this.selectedPath === placed.path }
        ]}
        onPointerEnter={() => (this.hovered = { kind: "edge", path: placed.path })}
        onPointerLeave={() => this.unhover(placed.path)}
        onClick={select}
      >
        <path class={EDGE_HIT_CLASS} d={d} />
        <path
          class={EDGE_CLASS}
          part={[this.partForName("edge"), kind && `kind-${kind}`].filter(Boolean).join(" ")}
          d={d}
        />
        <Show when={label}>
          <text
            class={EDGE_LABEL_CLASS}
            part={this.partForName("edge-label")}
            x={middle.x}
            y={middle.y - 4}
            text-anchor="middle"
            font-size={String(GRAPH_METRICS.portFontSize)}
          >
            {label}
          </text>
        </Show>
      </g>
    )
  }

  /** The pointer left `path`:  nothing's hovered, unless something else already is. */
  private unhover(path: string) {
    if (this.hovered?.path === path) this.hovered = undefined
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `value` when it's a graph (an object with a `nodes` list);  else `undefined`. */
  static graphFrom(value: unknown): GraphData | undefined {
    if (!value || typeof value !== "object" || !Array.isArray((value as GraphData).nodes)) return undefined
    const graph = value as GraphData
    return { nodes: graph.nodes, edges: Array.isArray(graph.edges) ? graph.edges : [] }
  }

  /** `value` when it's a child view's name. */
  private static viewFrom(value: unknown): GraphChildView | undefined {
    return GraphChildViews.includes(value as GraphChildView) ? (value as GraphChildView) : undefined
  }

  /** The paths of the nodes that start open (`open`), with given (not lazy) children, all the way down. */
  private static startOpen(graph: GraphData | undefined, prefix = ""): string[] {
    const paths: string[] = []
    for (const node of graph?.nodes ?? []) {
      const path = prefix ? `${prefix}/${node.id}` : node.id
      if (node.open && node.children && typeof node.children === "object") {
        paths.push(path, ...UIGraph.startOpen(UIGraph.graphFrom(node.children), path))
      }
    }
    return paths
  }

  /** `word` when it's safe in a class and a part name;  else `undefined`. */
  private static wordFor(word: string | undefined): string | undefined {
    return word && /^[\w-]+$/.test(word) ? word : undefined
  }

  /** `text`'s width at `size`, in `family`:  measured on the page's one canvas (`TreeMeasure`), else estimated. */
  private static measure(text: string, size: number, family: string): number {
    return TreeMeasure.widthOf(text, `${size}px ${family}`) ?? text.length * size * GRAPH_METRICS.charWidth
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIGraph extends E.AttributeValues<typeof graphVocabulary> {}

/** How far a press moves before it's a drag, in pixels. */
const DRAG_DISTANCE = 4

/** Class word before the noun when there's nothing to draw (`ui empty graph`). */
const EMPTY = "empty"

const TOOLBAR_CLASS = "toolbar"
const BREADCRUMBS_CLASS = "breadcrumbs"
const CANVAS_CLASS = "canvas"
const NODE_CLASS = "node"
const CONTAINER_CLASS = "container"
const BOX_CLASS = "box"
const LABEL_CLASS = "label"
const PORT_CLASS = "port"
const PORT_DOT_CLASS = "port-dot"
const PORT_LABEL_CLASS = "port-label"
const PIN_CLASS = "pin"
const PIN_MARK_CLASS = "pin-mark"
const EDGE_GROUP_CLASS = "edge-group"
const EDGE_CLASS = "edge"
const EDGE_HIT_CLASS = "edge-hit"
const EDGE_LABEL_CLASS = "edge-label"
const LIT_CLASS = "lit"
const SELECTED_CLASS = "selected"
const LOADING_CLASS = "loading"
const TOGGLE_CLASS = "toggle"
const TOGGLE_TARGET_CLASS = "toggle-target"
const TOGGLE_CIRCLE_CLASS = "toggle-circle"
const TOGGLE_MARK_CLASS = "toggle-mark"
const MODAL_BODY_CLASS = "modal-graph-box"
/** The class of the graph in the modal, for a page's or a subclass's own sheet. */
const MODAL_GRAPH_CLASS = "modal-graph"
/** How tall the graph in the modal is. */
const MODAL_GRAPH_HEIGHT = "70vh"

/** The toggle's `+` and `-`. */
const PLUS_MARK = "M-3 0H3M0 -3V3"
const MINUS_MARK = "M-3 0H3"
