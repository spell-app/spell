/**
 * The tree diagram family:  defines `<ui-tree-diagram>` and `<ui-tree-node>`, and exports their components.
 * - SIDE EFFECT:  importing it defines the tag, and `<ui-json>` (where its tree may come from).
 * - Also the library's `spell/ui/ui-tree-diagram` entry (its size is in `notes/report.md`).
 * - `TreeLayout` (the pure layout), `TreeMeasure` (its numbers) and `TreeData` (reading and checking a tree) are exported too,
 *   for a page that wants the numbers alone;  `TreeDiagramNode` is the data contract.
 */

import { TreeData } from "./TreeData"
import { TreeLayout } from "./TreeLayout"
import { TreeMeasure } from "./TreeMeasure"
import { UITreeDiagram } from "./UITreeDiagram"
import { UITreeNode } from "./UITreeNode"

import "spell/ui/components/ui-json"

UITreeDiagram.define()
UITreeNode.define()

export { TreeData, TreeLayout, TreeMeasure, UITreeDiagram, UITreeNode }
export type {
  TreeDiagramBox,
  TreeDiagramDirection,
  TreeDiagramEdge,
  TreeDiagramEdgeLabel,
  TreeDiagramLayout,
  TreeDiagramLayoutOptions,
  TreeDiagramMetrics,
  TreeDiagramNode,
  TreeDiagramNodeSize,
  TreeDiagramPoint
} from "./UITreeDiagram.types"
