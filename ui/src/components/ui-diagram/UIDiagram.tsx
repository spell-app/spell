import { For, Match, Show, Switch, type Accessor } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { Dragging } from "spell/util/Dragging"
import { E } from "spell/ui/core"
// Import directly:  a leaf of the JSON family, what it takes to read a child (WWOD §4 › "The barrel")
import { JSON_CHANGED, JsonChild } from "spell/ui/components/ui-json/JsonChild"
// Import directly:  the tree diagram's text measuring, shared by both drawings (one canvas a page)
import { TreeMeasure } from "spell/ui/components/ui-tree-diagram/TreeMeasure"
import { diagramVocabulary } from "./UIDiagram.en"
import { DiagramLayout } from "./DiagramLayout"
import { DiagramSVG } from "./DiagramSVG"
import { DIAGRAM_NODE_RESIZED, UIDiagramNode, type DOMDiagramNodeElement } from "./UIDiagramNode"
import type {
  DiagramDrawing,
  DiagramMeasure,
  DiagramMove,
  DiagramShape,
  DiagramSpec,
  DiagramWords
} from "./UIDiagram.types"

import diagramCSS from "./UIDiagram.css?inline"

/****************
 * ### `DOMDiagramElement`
 * The DOM element of `<ui-diagram>`:  it adds the diagram's script API, `putBack()`, `toSVG()` and `saveSVG()`,
 * which its component does.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMDiagramElement extends E.DOMElement<UIDiagram> {
  /** Put every dragged box back where the layout puts it, and forget where it was dragged. */
  putBack(): void {
    this.component?.putBack()
  }

  /** The diagram as an SVG file's text, as drawn now;  `undefined` with nothing to draw. */
  toSVG(): string | undefined {
    return this.component?.toSVG()
  }

  /** Download the diagram as an SVG file, named `name` (default its `remember`, else `diagram`). */
  saveSVG(name?: string): void {
    this.component?.saveSVG(name)
  }
}

/****************
 * ### `<ui-diagram>`
 * The component behind `<ui-diagram>`:  boxes in columns and the links between them, drawn as an SVG.
 * - What it draws is the NERD skill's drawing (Owen's, epic `mockup` P10), laid out by `DiagramLayout`:
 *   coloured headers, tinted groups, solid `contains` and dashed `ref` lines, routed by the skill's rules.
 * - The spec, first match wins:
 *   1. the `spec` property (`spec={spec}` in Solid)
 *   2. the JSON of a `<ui-json>` child, or a `<script type="application/json">` child, followed as it changes
 *   - Invalid JSON, or an edge naming a box that isn't there, draws nothing and warns once.
 * - Drag a box to move it:  its lines follow (`Dragging`, the kit's, its owner placing the box).
 *   - `remember` keeps where each person put them (`PrefStore`, `ui-diagram:<remember>`);  Put back forgets.
 *   - A click that doesn't move is a click:  `ui-node-clicked`.
 * - A `<ui-diagram-node name>` child fills its box:  the box takes its size, measured again when it changes
 *   (a `<ui-shape>` flipping), and its lines follow.
 * - Text is measured in the diagram's real font (`TreeMeasure`, the canvas the tree diagram measures with);
 *   a static server render estimates, as the skill's script does.
 * - Size:  its natural width in pixels, a user unit each, shrinking to fit a narrow container.
 * - Accessibility:  the `<svg>` is `role="img"`, named by a summary ("Diagram:  9 boxes, 11 links");
 *   each box's name is its own text.  Dragging is by pointer only (a limit, on the epic page).
 * - NEVER knows where its spec came from:  the ingester's NERD (P11) and a hand-written spec look the same to it.
 ****************/
export class UIDiagram extends E.UIComponent<typeof diagramVocabulary> {
  @E.proto static vocabulary = diagramVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { diagram: diagramCSS },
    delegatesFocus: false,
    DOMElement: DOMDiagramElement
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The spec
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
   * The spec drawn:  `spec` when it's one, else the JSON child's;  `undefined`:  nothing to draw.
   * - `@derived`:  parses JSON.
   */
  @E.derived
  get drawnSpec(): DiagramSpec | undefined {
    const own = UIDiagram.specOf(this.spec)
    if (own) return own
    const text = this.childText
    void this.childDataVersion
    if (text === undefined || isServer) return undefined
    try {
      return UIDiagram.specOf(JsonChild.valueOf(this.domElement))
    } catch (error) {
      this.warnOnce(`<${this.domElement.localName}>:  invalid JSON in its script child`, error)
      return undefined
    }
  }

  /** `value` when it looks like a spec (it has columns or nodes);  else `undefined`. */
  private static specOf(value: unknown): DiagramSpec | undefined {
    if (!value || typeof value !== "object") return undefined
    const { columns, nodes } = value as DiagramSpec
    return Array.isArray(columns) || Array.isArray(nodes) ? (value as DiagramSpec) : undefined
  }

  /** Warn of `message` once for each different message. */
  private warnOnce(message: string, error?: unknown) {
    if (this.warned.has(message)) return
    this.warned.add(message)
    console.warn(message, ...(error ? [error] : []))
  }

  /** What it has warned of already. */
  private readonly warned = new Set<string>()

  ////////////////
  // ## Measuring
  ////////////////

  /** The `<svg>`.  Set as it draws. */
  private svg: SVGSVGElement | undefined

  /** Bumped when what was measured may have changed:  it drew, a font arrived. */
  @E.state accessor measureVersion = 0

  /** Pixels on the page per user unit:  1 at its natural size, less once it shrinks to fit. */
  @E.state accessor drawnScale = 1

  /** While it's in the page:  measures again when a web font arrives;  follows its scale;  loads where boxes were put. */
  @E.whileConnected
  protected watchFontsAndSize() {
    this.measureVersion++
    this.moves = this.rememberedMoves()
    const remeasure = () => this.measureVersion++
    document.fonts?.addEventListener("loadingdone", remeasure)
    // a frame later:  a new scale moves what the boxes hold, which mustn't loop back into this observer
    const observer = new ResizeObserver(() => E.beforeNextPaint(() => (this.drawnScale = this.scaleNow())))
    if (this.svg) observer.observe(this.svg)
    return () => {
      document.fonts?.removeEventListener("loadingdone", remeasure)
      observer.disconnect()
    }
  }

  /** The drawing's width on the page per its natural width;  `1` when it isn't laid out. */
  private scaleNow(): number {
    const width = this.svg?.getBoundingClientRect().width
    const layout = this.layout
    if (!width || !layout) return 1
    const scale = width / layout.width
    return Math.abs(scale - this.drawnScale) < SCALE_STEP ? this.drawnScale : scale
  }

  /**
   * How it measures text:  in its real font, by canvas, once it's drawn;  the skill's estimate before (a server).
   * - Reads the DOM:  `measureVersion` says when that changed.
   */
  @E.derived
  get measure(): DiagramMeasure {
    void this.measureVersion
    if (isServer || !this.svg) return DiagramLayout.estimatedWidth
    const family = getComputedStyle(this.svg).fontFamily
    return (text, size, bold) =>
      TreeMeasure.widthOf(text, `${bold ? 600 : 400} ${size}px ${family}`) ??
      DiagramLayout.estimatedWidth(text, size, bold)
  }

  /** The words it draws, in its page's language. */
  get words(): DiagramWords {
    return {
      legend: this.translationForKey("legend"),
      contains: this.translationForKey("contains"),
      refersTo: this.translationForKey("refersTo"),
      derived: this.translationForKey("derived")
    }
  }

  ////////////////
  // ## What its boxes hold
  ////////////////

  /** Its `<ui-diagram-node>` children, each filling the box it names. */
  @E.watches({ childList: true })
  get contentNodes(): readonly DOMDiagramNodeElement[] {
    return [...this.domElement.children].filter((child): child is DOMDiagramNodeElement => UIDiagramNode.isNode(child))
  }

  /** Each content node's size, by the box it fills, in user units (its own pixels, before it's scaled). */
  @E.state accessor contentSizes: ReadonlyMap<string, { width: number; height: number }> = new Map()

  /** What a content node holds changed size:  measure them all again. */
  @E.on(DIAGRAM_NODE_RESIZED)
  protected onContentResized() {
    const sizes = new Map<string, { width: number; height: number }>()
    for (const node of this.contentNodes) {
      const name = node.getAttribute("name")
      const size = node.component?.contentSize
      if (name && size) sizes.set(name, size)
    }
    this.contentSizes = sizes
  }

  ////////////////
  // ## Layout
  ////////////////

  /**
   * The spec laid out;  `undefined` with nothing to draw, or a spec that names a box it hasn't (warned once).
   * - `@derived`:  lays out every box and line.
   */
  @E.derived
  get layout(): DiagramDrawing | undefined {
    const spec = this.drawnSpec
    if (!spec) return undefined
    try {
      return DiagramLayout.of(spec, {
        measure: this.measure,
        words: this.words,
        moved: this.moves,
        sizes: this.contentSizes,
        maxColumns: this.columns
      })
    } catch (error) {
      if (!(error instanceof TypeError)) throw error
      this.warnOnce(`<${this.domElement.localName}>:  ${error.message}`)
      return undefined
    }
  }

  /** Tell each content node where its box is, in percent of the drawing. */
  @E.onChange("layout", "contentNodes", "isReady")
  protected onLayoutChanged(
    layout: DiagramDrawing | undefined,
    nodes: readonly DOMDiagramNodeElement[],
    isReady: boolean
  ) {
    if (!isReady) return
    this.drawnScale = this.scaleNow()
    for (const node of nodes) {
      const box = layout?.boxes.get(node.getAttribute("name") ?? "")
      const component = node.component
      if (!component) continue
      component.placement =
        box && layout
          ? { left: ((box.x - layout.x) / layout.width) * 100, top: ((box.y - layout.y) / layout.height) * 100 }
          : undefined
    }
  }

  ////////////////
  // ## Dragging
  ////////////////

  /** Where each dragged box is, from where the layout puts it, by name. */
  @E.state accessor moves: ReadonlyMap<string, DiagramMove> = new Map()

  /** A box has been dragged:  `:state(moved)`, and Put back shows. */
  @E.cssState("moved")
  get isMoved(): boolean {
    return [...this.moves.values()].some((move) => move.dx || move.dy)
  }

  /** A press on a box:  a drag once it moves, a click if it doesn't. */
  @E.on("pointerdown")
  protected onPress(event: PointerEvent) {
    if (this.fixed || event.button !== 0 || !this.layout) return
    const name = this.boxNameAt(event)
    if (!name) return
    const content = this.contentNodes.find((node) => node.getAttribute("name") === name)
    if (content?.component?.isOnResizeGrip(event.clientX, event.clientY)) return
    const target = event.composedPath()[0] as Element
    const before = this.moves
    const from = before.get(name) ?? { dx: 0, dy: 0 }
    const perPixel = 1 / this.drawnScale
    // NOTE: an SVG shape stands in for the element Dragging carries:  it stays put (`follows: false`), placing itself
    const element = target as unknown as HTMLElement
    new Dragging(element, event, {
      carried: [element],
      follows: false,
      placing: (x, y) => {
        const move = { dx: from.dx + (x - event.clientX) * perPixel, dy: from.dy + (y - event.clientY) * perPixel }
        this.moves = new Map(before).set(name, move)
      },
      onDrop: () => {
        this.keepMoves()
        const move = this.moves.get(name) ?? { dx: 0, dy: 0 }
        this.send("ui-node-moved", { name, dx: move.dx, dy: move.dy })
      },
      onCancel: () => (this.moves = before)
    })
  }

  /** A click on a box that didn't move:  `ui-node-clicked`.  (A real drag swallows its click.) */
  @E.on("click")
  protected onBoxClick(event: MouseEvent) {
    const name = this.boxNameAt(event)
    if (name) this.send("ui-node-clicked", { name, originalEvent: event })
  }

  /** The name of the box under `event`:  a shape of it in the `<svg>`, or its `<ui-diagram-node>`. */
  private boxNameAt(event: Event): string | undefined {
    for (const target of event.composedPath()) {
      if (!(target instanceof Element)) continue
      if (target === this.domElement) return undefined
      const name =
        target.getAttribute("data-node") ?? (UIDiagramNode.isNode(target) ? target.getAttribute("name") : null)
      if (name) return name
    }
    return undefined
  }

  /** Put every box back, and forget where they were dragged. */
  @E.untracked
  putBack() {
    this.moves = new Map()
    this.keepMoves()
  }

  /** Where boxes were put, as kept for this person under `remember`;  none without one. */
  private rememberedMoves(): ReadonlyMap<string, DiagramMove> {
    const kept = this.remember ? UIDiagram.store.get(this.remember) : undefined
    if (!kept || typeof kept !== "object") return new Map()
    const moves = new Map<string, DiagramMove>()
    for (const [name, value] of Object.entries(kept as Record<string, unknown>)) {
      if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") {
        moves.set(name, { dx: value[0], dy: value[1] })
      }
    }
    return moves
  }

  /** Keep where boxes are now, under `remember`;  nothing without one. */
  private keepMoves() {
    if (!this.remember) return
    const moved = [...this.moves].filter(([, move]) => move.dx || move.dy)
    if (!moved.length) return UIDiagram.store.forget(this.remember)
    const rounded = (value: number) => Math.round(value * 10) / 10
    UIDiagram.store.set(
      this.remember,
      Object.fromEntries(moved.map(([name, move]) => [name, [rounded(move.dx), rounded(move.dy)]]))
    )
  }

  /** Where every diagram keeps where its boxes were put:  `ui-diagram:<remember>`. */
  private static get store(): PrefStore {
    return (UIDiagram.prefs ??= new PrefStore(PREF_STORE))
  }
  private static prefs: PrefStore | undefined

  ////////////////
  // ## Saving
  ////////////////

  /** The diagram as an SVG file's text, as drawn now;  `undefined` with nothing to draw. */
  toSVG(): string | undefined {
    const layout = this.layout
    if (!layout) return undefined
    return DiagramSVG.of(layout, this.svg ? getComputedStyle(this.svg).fontFamily : undefined)
  }

  /** Download it as an SVG file:  `<name>.svg`. */
  saveSVG(name = this.remember || DEFAULT_FILE_NAME) {
    const text = this.toSVG()
    if (!text) return
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }))
    link.download = `${name}.svg`
    link.click()
    void E.after(REVOKE_AFTER_SECONDS, () => URL.revokeObjectURL(link.href)).catch((error: unknown) =>
      console.error(error)
    )
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** `empty` with nothing to draw. */
  protected override get extraClass(): string | undefined {
    return this.layout ? undefined : EMPTY
  }

  render(): JSX.Element {
    return (
      <div class={CANVAS_CLASS} style={{ [DRAWN_SCALE]: this.drawnScale.toFixed(4) }}>
        <svg
          ref={(svg: SVGSVGElement) => (this.svg = svg)}
          class={[this.rootClass, { [FIXED_CLASS]: !!this.fixed }]}
          part={this.partForName("diagram")}
          role={this.layout ? "img" : undefined}
          aria-label={this.summary()}
          viewBox={this.viewBox()}
          style={this.layout && { [NATURAL_WIDTH]: String(Math.round(this.layout.width)) }}
        >
          <For each={this.layout?.shapes ?? []} keyed={false}>
            {(shape) => this.shape(shape)}
          </For>
        </svg>
        <slot />
        <Show when={this.isMoved || this.downloadable}>
          <div class={TOOLBAR_CLASS} part={this.partForName("toolbar")}>
            <Show when={this.isMoved}>
              <ui-button size="mini" appearance="basic" onClick={() => this.putBack()}>
                {this.translationForKey("putBack")}
              </ui-button>
            </Show>
            <Show when={this.downloadable}>
              <ui-button size="mini" appearance="basic" onClick={() => this.saveSVG()}>
                {this.translationForKey("saveSVG")}
              </ui-button>
            </Show>
          </div>
        </Show>
      </div>
    )
  }

  /** One shape, its role its class, its box its `data-node`.  `shape`:  the For's accessor, by position. */
  private shape(shape: Accessor<DiagramShape>): JSX.Element {
    const paint = () => {
      const { fill, stroke, dash } = shape()
      return {
        fill: fill ?? "none",
        ...(stroke && { stroke, "stroke-width": shape().type === "path" ? "1.3" : "1.2" }),
        ...(dash && { "stroke-dasharray": dash })
      }
    }
    return (
      <Switch>
        <Match when={UIDiagram.as(shape(), "rect")}>
          {(rect) => (
            <rect
              class={rect().role}
              data-node={rect().node}
              x={rect().x}
              y={rect().y}
              width={rect().width}
              height={rect().height}
              rx={rect().rx}
              {...paint()}
            />
          )}
        </Match>
        <Match when={UIDiagram.as(shape(), "path")}>
          {(path) => <path class={path().role} data-node={path().node} d={path().d} {...paint()} />}
        </Match>
        <Match when={UIDiagram.as(shape(), "arrow")}>
          {(arrow) => (
            <polygon
              class={arrow().role}
              points={arrow()
                .points.map(([x, y]) => `${x},${y}`)
                .join(" ")}
              {...paint()}
            />
          )}
        </Match>
        <Match when={UIDiagram.as(shape(), "text")}>
          {(text) => (
            <text
              class={text().role}
              data-node={text().node}
              x={text().x}
              y={text().y}
              font-size={String(text().size)}
              font-weight={String(text().weight)}
              font-style={text().italic ? "italic" : undefined}
              fill={text().fill}
            >
              {text().text}
            </text>
          )}
        </Match>
      </Switch>
    )
  }

  /** `shape` when it's of `type`, narrowed;  else `undefined`. */
  private static as<Type extends DiagramShape["type"]>(
    shape: DiagramShape,
    type: Type
  ): Extract<DiagramShape, { type: Type }> | undefined {
    return shape.type === type ? (shape as Extract<DiagramShape, { type: Type }>) : undefined
  }

  /** `viewBox`:  the layout's natural box. */
  private viewBox(): string | undefined {
    const layout = this.layout
    return layout && `${layout.x} ${layout.y} ${layout.width} ${layout.height}`
  }

  /** The `<svg>`'s name:  how many boxes and links. */
  private summary(): string | undefined {
    const layout = this.layout
    if (!layout) return undefined
    return this.translationForKey("summary", { boxes: layout.boxes.size, links: layout.edgeCount })
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIDiagram extends E.AttributeValues<typeof diagramVocabulary> {}

/** Class word before the noun when there's nothing to draw (`ui empty diagram`):  the `<svg>` hides. */
const EMPTY = "empty"
/** Class of the box around the drawing and its boxes' content, the content's containing block. */
const CANVAS_CLASS = "canvas"
/** Class of the buttons over its top right corner. */
const TOOLBAR_CLASS = "toolbar"
/** Class on the `<svg>` when its boxes can't be dragged. */
const FIXED_CLASS = "fixed"

/** Private custom property the sheet sizes the `<svg>` with:  the layout's natural width, a pixel a unit. */
const NATURAL_WIDTH = "--_ui-diagram-natural-width"
/** Private custom property what a box holds is scaled by:  how far the drawing shrank. */
const DRAWN_SCALE = "--_ui-diagram-scale"

/** A change of scale too small to redraw for. */
const SCALE_STEP = 0.001

/** The store every diagram keeps its boxes' places in. */
const PREF_STORE = "ui-diagram"
/** A saved file's name, without `remember`. */
const DEFAULT_FILE_NAME = "diagram"
/** How long a saved file's address lives:  long enough for the download to start. */
const REVOKE_AFTER_SECONDS = 10
