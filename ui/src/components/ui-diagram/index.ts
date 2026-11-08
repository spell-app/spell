/**
 * The diagram family:  defines `<ui-diagram>` and `<ui-diagram-node>`, and exports their components.
 * - SIDE EFFECT:  importing it defines the tags, `<ui-json>` (where a spec may come from) and `<ui-button>`
 *   (its Put back and Save as SVG).
 * - Also the library's `spell/ui/ui-diagram` entry.
 * - `DiagramLayout` (the pure layout, the NERD skill's), `DiagramColumns` and `DiagramSVG` are exported too,
 *   for a page or a tool that wants the drawing alone;  `DiagramSpec` is the data contract.
 */

import { DiagramColumns } from "./DiagramColumns"
import { DiagramLayout } from "./DiagramLayout"
import { DiagramSVG } from "./DiagramSVG"
import { UIDiagram } from "./UIDiagram"
import { UIDiagramNode } from "./UIDiagramNode"

import "spell/ui/components/ui-json"
import "spell/ui/components/ui-button"

UIDiagram.define()
UIDiagramNode.define()

export { DiagramColumns, DiagramLayout, DiagramSVG, UIDiagram, UIDiagramNode }
export type { DiagramLayoutOptions } from "./DiagramLayout"
export type {
  DiagramBox,
  DiagramColumnSpec,
  DiagramDrawing,
  DiagramEdgeKind,
  DiagramEdgeSpec,
  DiagramFieldSpec,
  DiagramGroupSpec,
  DiagramMove,
  DiagramNodeSpec,
  DiagramShape,
  DiagramSpec,
  DiagramWords
} from "./UIDiagram.types"
