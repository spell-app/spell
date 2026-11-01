import type { TreeDiagramNode } from "./UITreeDiagram.types"

/****************
 * ### `TreeData`
 * Where a `<ui-tree-diagram>`'s tree comes from, made safe to lay out:
 * the `tree` property, or the JSON in a `<ui-json>` or `<script type="application/json">` child (`JsonChild`).
 * - STATIC, plain DOM, no Solid:  the component reads the tree through it, and names the diagram with `summary()`;
 *   tests drive it directly.
 * - Lenient:  data from a page is checked, not trusted.
 *   - Anything that isn't an object is no node.
 *   - A missing `label` is `""`;  a `detail` / `slot` / `title` that isn't a string is dropped.
 *   - `children` keeps only nodes.
 ****************/
export class TreeData {
  /**
   * `value` as a tree to draw, or `undefined` when it isn't one.
   * - Always a NEW tree:  the caller's objects are never handed on, nor changed.
   * - A node met twice on the way down (a cycle, or one object shared by two parents) is drawn once:
   *   where it's met first.
   * - NEVER throws.
   */
  static node(value: unknown, seen = new Set<object>()): TreeDiagramNode | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value) || seen.has(value)) return undefined
    seen.add(value)
    const raw = value as Record<string, unknown>
    const node: TreeDiagramNode = { label: TreeData.text(raw.label) ?? "" }
    const detail = TreeData.text(raw.detail)
    const slot = TreeData.text(raw.slot)
    const title = TreeData.text(raw.title)
    if (detail) node.detail = detail
    if (slot) node.slot = slot
    if (title) node.title = title
    if (Array.isArray(raw.children)) {
      const children = raw.children.flatMap((child) => TreeData.node(child, seen) ?? [])
      if (children.length) node.children = children
    }
    return node
  }

  /**
   * Name of a diagram of `tree`, through `text` (the component's translated texts):
   * "Tree:  If, with 3 children".
   */
  static summary(
    tree: TreeDiagramNode,
    text: (key: TreeDiagramSummaryKey, params: Record<string, string | number>) => string
  ): string {
    const count = tree.children?.length ?? 0
    const key = count === 0 ? "summaryLeaf" : count === 1 ? "summaryOne" : "summary"
    return text(key, { label: tree.label, count })
  }

  /** `value` as text:  a string as is, a number or boolean written out, anything else `undefined`. */
  private static text(value: unknown): string | undefined {
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    return undefined
  }
}

/** Keys of the texts that name a diagram:  its root has children, one child, none. */
export type TreeDiagramSummaryKey = "summary" | "summaryOne" | "summaryLeaf"
