/**
 * The tree family:  defines `<ui-tree>` and `<ui-tree-item>`, and exports their components and `<ui-tree>`'s DOM
 * element, `DOMTreeElement` (`openTo()`, `closeAll()`).
 * - SIDE EFFECT:  importing it defines the tags, `<ui-icon>` through the icon barrel,
 *   so a page never has to import the icons its rows show;  `<ui-label>`, a row's `count` and `badge`;
 *   `<ui-loader>`, a column's spinner while its rows come;  and `<ui-button>`, `tools`' buttons.
 * - Also the library's `spell/ui/ui-tree` entry.
 */

import { DOMTreeElement, UITree } from "./UITree"
import { UITreeItem } from "./UITreeItem"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-loader"

UITree.define()
UITreeItem.define()

export { UITree, UITreeItem, DOMTreeElement }
export type { TreeItemData, TreeItemKind } from "./UITree.types"
