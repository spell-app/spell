import type { BenchGroup } from "./BenchTokens"

/****************
 * ### `BenchTree`
 * The theme bench's tokens as a TREE, the way a theme file nests them (Owen:  "Instead of the --spell-accent-x, can
 * we show this as a tree?"):  each group a branch, its tokens under it by their name's parts.
 * - A token's path in its group (`pathOf()`, from `BenchTokens.placeOf()`):
 *   - `components.menu.segmented-background` in `components.menu`:  `segmented › background`
 *   - `own.glass-blur` in `own`:  `glass › blur`
 *   - the editor's own `--spell-accent-x`, which no theme file places:  `accent › x`
 * - A branch with one child and no token of its own is folded into it, so no level holds a single row:
 *   `segmented › item › padding` with nothing else under `item` is `segmented › item-padding`.
 * - A node can be a token AND a branch (`--ui-menu-segmented` beside `--ui-menu-segmented-background`).
 * - Ids are paths, `components.menu/segmented`:  stable across reports, so a fold is kept by its id.
 * - Data, no DOM:  `UIDocsThemeBench` draws it.
 ****************/
export class BenchTree {
  /** Every node, by id. */
  readonly nodes: ReadonlyMap<string, BenchTreeNode>

  /** The groups' nodes, in order. */
  readonly roots: readonly BenchTreeNode[]

  /**
   * The tree of `groups`, each token's path in its group from `pathOf(token, group.place)`;
   * `labelOf(place)`:  a group's name.
   */
  constructor({
    groups,
    pathOf,
    labelOf
  }: {
    groups: readonly BenchGroup[]
    pathOf: (token: string, place: string) => readonly string[]
    labelOf: (place: string) => string
  }) {
    const nodes = new Map<string, BenchTreeNode>()
    this.roots = groups.map((group) => {
      const root: Building = { id: group.place, name: labelOf(group.place), children: new Map() }
      for (const token of group.tokens) {
        let node = root
        for (const part of pathOf(token, group.place)) {
          let child = node.children.get(part)
          if (!child) node.children.set(part, (child = { id: `${node.id}/${part}`, name: part, children: new Map() }))
          node = child
        }
        node.token = token
      }
      return BenchTree.finish(root, nodes, true)
    })
    this.nodes = nodes
  }

  /** The tree with only the tokens `keep` says yes to, and the branches that hold them. */
  filtered(keep: (node: BenchTreeNode) => boolean): BenchTreeNode[] {
    const prune = (node: BenchTreeNode): BenchTreeNode | undefined => {
      const children = node.children.map(prune).filter((child): child is BenchTreeNode => !!child)
      const token = node.token !== undefined && keep(node) ? node.token : undefined
      if (!children.length && token === undefined) return undefined
      return { ...node, token, children }
    }
    return this.roots.map(prune).filter((node): node is BenchTreeNode => !!node)
  }

  /**
   * The node `building` finished:  its children in order, a branch of one child and no token folded into that child
   * (never a group's own node), each kept in `nodes` by id.
   */
  private static finish(building: Building, nodes: Map<string, BenchTreeNode>, isRoot = false): BenchTreeNode {
    let { id, name } = building
    let current = building
    while (!isRoot && current.token === undefined && current.children.size === 1) {
      const only = [...current.children.values()][0]!
      name = `${name}-${only.name}`
      id = only.id
      current = only
    }
    const node: BenchTreeNode = {
      id,
      name,
      token: current.token,
      children: [...current.children.values()].map((child) => BenchTree.finish(child, nodes))
    }
    nodes.set(id, node)
    return node
  }
}

/** One node of the tree:  a token, a branch, or both. */
export type BenchTreeNode = {
  /** Its path, `components.menu/segmented`:  the same for the same token or branch in every report */
  id: string
  /** Its short name:  `color`, `segmented`, `item-padding`;  a group's, its title */
  name: string
  /** The CSS name, when it's a token */
  token?: string
  /** The nodes under it, in the group's order */
  children: readonly BenchTreeNode[]
}

/** A node while the tree's being built. */
type Building = { id: string; name: string; token?: string; children: Map<string, Building> }
