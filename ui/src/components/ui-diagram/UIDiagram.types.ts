/**
 * The diagram family's types:  what a diagram is given (`DiagramSpec`), and what its layout gives back
 * (`DiagramDrawing`).
 * - A spec is the NERD skill's JSON as it is (columns of groups, groups of lanes, nodes, edges), so a spec written
 *   for that skill's script opens here unchanged:  its keys are its own, `gap_before`, `node_gap` ...
 * - Or a flat one, `{ nodes, edges }`:  the layout puts its boxes in columns itself (`DiagramColumns`).
 * - Pure types and constants:  no DOM, no Solid.
 */

/** What a diagram draws:  the NERD skill's spec, or a flat list of nodes and edges. */
export type DiagramSpec = {
  /** Left to right, each a stack of groups;  none:  `nodes`, put in columns by the layout. */
  readonly columns?: readonly DiagramColumnSpec[]
  /** A flat spec's boxes, when there are no `columns`. */
  readonly nodes?: readonly DiagramNodeSpec[]
  /** The links between boxes, from a box's field to another box. */
  readonly edges?: readonly DiagramEdgeSpec[]
  /** Room between the boxes in a stack, between groups, between columns, between lanes;  user units. */
  readonly node_gap?: number
  readonly group_gap?: number
  readonly column_gap?: number
  readonly lane_gap?: number
  /** `false`:  no legend in the corner, when no group places one. */
  readonly legend?: boolean
}

/** One column:  its groups, stacked top to bottom. */
export type DiagramColumnSpec = {
  readonly groups: readonly DiagramGroupSpec[]
  /** The narrowest a lane of boxes in it may be;  default 150. */
  readonly min_width?: number
}

/** A group:  boxes on a tinted background, its label above;  or the legend. */
export type DiagramGroupSpec = {
  /** It's the legend:  the kinds of line the diagram uses. */
  readonly legend?: boolean
  readonly label?: string
  /** Its colour, and its boxes' headers', unless a box says its own:  a CSS colour, `#047857`. */
  readonly color?: string
  /** Its background;  default its colour at 12%.  `none`:  no background. */
  readonly bg?: string
  /** Room above it. */
  readonly gap_before?: number
  /** Its boxes, one stack. */
  readonly nodes?: readonly DiagramNodeSpec[]
  /** Its boxes, in stacks side by side, each lined up with the same lane of the column's other groups;  `legend`:  the legend there. */
  readonly lanes?: readonly (readonly DiagramNodeSpec[] | "legend")[]
}

/** One box. */
export type DiagramNodeSpec = {
  /** Its name, in its header:  how edges name it, so unique in the diagram. */
  readonly name: string
  /** One line under its name. */
  readonly note?: string
  /** The fields that link to other boxes, a row each. */
  readonly fields?: readonly (string | DiagramFieldSpec)[]
  /** Example rows, with no links. */
  readonly bullets?: readonly string[]
  /** Its header's colour;  default its group's. */
  readonly color?: string
  /** Room above it, to line it up with what links to it. */
  readonly gap_before?: number
}

/** A field, when it says more than its name. */
export type DiagramFieldSpec = {
  readonly name: string
  /** Worked out, not kept:  drawn italic, `name (derived)`, with a dashed line. */
  readonly derived?: boolean
}

/** A link from a box's field to another box. */
export type DiagramEdgeSpec = {
  /** `<box>.<field>`, e.g. `Entry.payload`. */
  readonly from: string
  /** The box it points at. */
  readonly to: string
  /** `contains`:  the box owns it (a solid line);  `ref`, the default:  it exists by itself (a dashed line). */
  readonly kind?: DiagramEdgeKind
}

/** The kinds of line, in the order a legend lists them. */
export const DiagramEdgeKinds = ["contains", "ref"] as const

/** One of `DiagramEdgeKinds`. */
export type DiagramEdgeKind = (typeof DiagramEdgeKinds)[number]

////////////////
// ## The drawing
////////////////

/** A diagram laid out:  what `<ui-diagram>` draws, and what its SVG says, in user units. */
export type DiagramDrawing = {
  /** The `viewBox`. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** Everything drawn, back to front. */
  readonly shapes: readonly DiagramShape[]
  /** Where each box is, by its name. */
  readonly boxes: ReadonlyMap<string, DiagramBox>
  /** How many links it draws. */
  readonly edgeCount: number
}

/** Where a box is. */
export type DiagramBox = {
  readonly name: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** Where its header ends, from its top. */
  readonly headerHeight: number
}

/**
 * One thing drawn:  a rectangle, a path, an arrowhead or a text.
 * - `role` says what it is, so a sheet can colour it (`ink`, `line` ...);  `fill` and `stroke` are what the NERD
 *   skill's script draws, and what a saved SVG says.
 * - `node`:  the box it belongs to, so a drag moves it.
 */
export type DiagramShape =
  | (DiagramShapeBase & {
      readonly type: "rect"
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
      readonly rx: number
    })
  | (DiagramShapeBase & { readonly type: "path"; readonly d: string })
  | (DiagramShapeBase & { readonly type: "arrow"; readonly points: readonly (readonly [number, number])[] })
  | (DiagramShapeBase & {
      readonly type: "text"
      readonly x: number
      readonly y: number
      readonly text: string
      readonly size: number
      readonly weight: number
      readonly italic?: boolean
    })

/** What every shape says. */
type DiagramShapeBase = {
  readonly role: DiagramShapeRole
  readonly fill?: string
  readonly stroke?: string
  /** `stroke-dasharray`, for a dashed line. */
  readonly dash?: string
  /** The box it belongs to. */
  readonly node?: string
}

/** What a shape is, as a class on it:  the sheet colours the ink ones by it. */
export type DiagramShapeRole =
  | "background"
  | "group"
  | "group-label"
  | "legend"
  | "legend-label"
  | "legend-text"
  | "line"
  | "arrow"
  | "box"
  | "header"
  | "outline"
  | "name"
  | "note"
  | "field"
  | "bullet"

/** The words a diagram draws, in its page's language. */
export type DiagramWords = {
  readonly legend: string
  readonly contains: string
  readonly refersTo: string
  readonly derived: string
}

/** A text's width in user units, at `size`, bold or not. */
export type DiagramMeasure = (text: string, size: number, bold: boolean) => number

/** Where a box was dragged, from where the layout put it. */
export type DiagramMove = { readonly dx: number; readonly dy: number }
