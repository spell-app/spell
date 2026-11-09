/**
 * The tree family:  defines `<ui-tree>` and `<ui-tree-item>`, and exports their components.
 * - SIDE EFFECT:  importing it defines the tags, `<ui-icon>` through the icon barrel,
 *   so a page never has to import the icons its rows show, and `<ui-label>`, a row's `count` and `badge`.
 * - Also the library's `spell/ui/ui-tree` entry.
 */

import { UITree } from "./UITree"
import { UITreeItem } from "./UITreeItem"

import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-label"

UITree.define()
UITreeItem.define()

export { UITree, UITreeItem }
