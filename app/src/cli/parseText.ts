/**
 * A line of Spell read on its own, for `spell parse` and `spell repl`, as a terminal shows it.
 * - The reading itself is Spell's, `SP.parseLine()` in a `SP.lineScope()`:  the editor's Spell Console reads a line
 *   the same way (epic `editor` P32).  Only the colouring is here.
 */
import chalk from "chalk"

import type { P } from "spell/parser/parser"

/** `spellTree` as indented lines, one per box:  `slot: label  detail`, the slot and detail dim. */
export function spellTreeLines(spellTree: P.TreeNode, depth = 0): string[] {
  const slot = spellTree.slot ? chalk.dim(`${spellTree.slot}: `) : ""
  const detail = spellTree.detail ? `  ${chalk.dim(spellTree.detail)}` : ""
  const lines = [`${"  ".repeat(depth)}${slot}${spellTree.label}${detail}`]
  for (const child of spellTree.children ?? []) lines.push(...spellTreeLines(child, depth + 1))
  return lines
}

/**
 * `spellTree` as a `<ui-tree-diagram>` for a docs page:  its data in a JSON `<script>` child, so it draws from
 * `file://` too.  `<\/` escaped, so the text can't end the script early.
 */
export function spellTreeHTML(spellTree: P.TreeNode): string {
  const json = JSON.stringify(spellTree, null, 2).replace(/<\//g, "<\\/")
  return `<ui-tree-diagram>\n<script type="application/json">\n${json}\n</script>\n</ui-tree-diagram>`
}

/** `SP.matchTree()` lines coloured for a terminal:  the text each matched, dim. */
export function colorTree(tree: string[]): string[] {
  return tree.map((line) => {
    const split = line.indexOf("  ", line.search(/\S/))
    return split === -1 ? line : `${line.slice(0, split)}  ${chalk.dim(line.slice(split + 2))}`
  })
}
