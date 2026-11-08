/**
 * The diagram family:  defines `<ui-diagram>` and `<ui-diagram-node>`, and exports their components.
 * - SIDE EFFECT:  importing it defines the tags, `<ui-json>` (where a spec may come from) and `<ui-menu>`
 *   (its right-click menu).
 * - Also the library's `spell/ui/ui-diagram` entry.
 * - `DiagramLayout` (the pure layout, the NERD skill's), `DiagramColumns` and `DiagramSVG` are exported too,
 *   for a page or a tool that wants the drawing alone;  `DiagramSpec` is the data contract.
 *   - They're the kit's util's (`spell/util/diagram/...`), so a command can write a diagram without Spell UI.
 */

import { DiagramColumns } from "spell/util/diagram/DiagramColumns"
import { DiagramLayout } from "spell/util/diagram/DiagramLayout"
import { DiagramSVG } from "spell/util/diagram/DiagramSVG"
import { UIDiagram } from "./UIDiagram"
import { UIDiagramNode } from "./UIDiagramNode"

import "spell/ui/components/ui-json"
import "spell/ui/components/ui-menu"

UIDiagram.define()
UIDiagramNode.define()

export { DiagramColumns, DiagramLayout, DiagramSVG, UIDiagram, UIDiagramNode }
export type { DiagramLayoutOptions } from "spell/util/diagram/DiagramLayout"
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
} from "spell/util/diagram/diagram.types"
