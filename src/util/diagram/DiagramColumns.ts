import type { DiagramColumnSpec, DiagramNodeSpec, DiagramSpec } from "./diagram.types"

/****************
 * ### `DiagramColumns`
 * A flat spec's boxes put in columns, so it can be laid out as the NERD skill lays out its own:
 * - the boxes nothing links to first, then each box one column right of the furthest box linking to it
 * - at most `maxColumns` columns (the skill's rule is three):  what would go further stacks in the last
 * - a link back (a cycle, or a box linking to itself) doesn't push a box right
 * - each column one group, with no label and no background, its boxes in the spec's order
 * - PURE:  no DOM.  `DiagramLayout` calls it for a spec with no `columns`.
 ****************/
export class DiagramColumns {
  /** `spec`'s nodes in at most `maxColumns` columns (1 at least). */
  static of(spec: DiagramSpec, maxColumns: number): DiagramColumnSpec[] {
    const nodes = spec.nodes ?? []
    const most = Math.max(1, Math.floor(maxColumns))
    const pointsAt = new Map<string, string[]>(nodes.map((node) => [node.name, []]))
    for (const edge of spec.edges ?? []) {
      const from = edge.from.split(".", 1)[0]!
      if (from !== edge.to) pointsAt.get(from)?.push(edge.to)
    }
    const depth = new Map<string, number>()
    const visiting = new Set<string>()
    /** How far right `name` goes:  one past every box that links to it, cycles cut where they close. */
    const linkedTo = new Map<string, string[]>(nodes.map((node) => [node.name, []]))
    for (const [from, targets] of pointsAt) for (const to of targets) linkedTo.get(to)?.push(from)
    const depthOf = (name: string): number => {
      const known = depth.get(name)
      if (known !== undefined) return known
      if (visiting.has(name)) return 0
      visiting.add(name)
      const sources = linkedTo.get(name) ?? []
      const value = sources.length ? Math.max(...sources.map((source) => depthOf(source) + 1)) : 0
      visiting.delete(name)
      depth.set(name, value)
      return value
    }
    const columns: DiagramNodeSpec[][] = []
    for (const node of nodes) {
      const column = Math.min(depthOf(node.name), most - 1)
      ;(columns[column] ??= []).push(node)
    }
    return columns.filter((column) => column?.length).map((column) => ({ groups: [{ bg: "none", nodes: column }] }))
  }
}
