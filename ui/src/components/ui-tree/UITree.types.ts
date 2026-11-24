/**
 * The data a `<ui-tree appearance="columns">` takes as its `items` property, and the parts a row can `show`.
 * - Pure data:  the vocabulary and `UITree.tsx` both read it.
 */

/****************
 * ### `TreeItemData`
 * One item of a tree given as data:  a row of a column, and, with `children`, the column it opens.
 * - `children`:  a list, or a function that makes it.
 *   - The function runs once, the first time the item opens, and its list is kept:  for big trees, made as they're browsed.
 *   - It may return a promise:  the column shows a spinner until the list comes.
 *   - Before it has run, its row shows a chevron;  once its list comes back empty, the chevron goes.
 * - `kind: "header"`:  not a row, but the label line over the rows after it, up to the next header:  its group
 *   ("Connections", say), as `<ui-item kind="header">` is in a menu.
 *   - It's never picked, selected, counted, or a step of `path`;  the arrow keys skip it.
 *   - A `filter` keeps it only while a row under it shows.
 *   - It draws its `label`, its `icon`, and its `count`, else how many rows its group holds;
 *     its `children` are never read.
 *   - It sticks as its column scrolls;  with `groups="accordion"`, it's the button that opens its group.
 ****************/
export interface TreeItemData {
  /** Which item it is among its siblings:  what `path` holds. */
  id: string
  /** A row, the default, or a `header`:  a label line over the rows after it. */
  kind?: TreeItemKind
  /** What the row says. */
  label: string
  /** The icon before the label. */
  icon?: string
  /** Which one it is, quieter, after its label. */
  which?: string
  /** The count its row shows, when `show` names `count`.  None:  how many rows its `children` hold, once known. */
  count?: number
  /** The items inside it. */
  children?: readonly TreeItemData[] | (() => readonly TreeItemData[] | Promise<readonly TreeItemData[]>)
  /** The page's own, handed back in the events. */
  data?: unknown
}

/** What an item of `items` is:  a row, or a `header` over the rows after it (`TreeItemData.kind`). */
export type TreeItemKind = "item" | "header"

/** The parts of a column's row that `show` can name:  the label always shows. */
export const ROW_PARTS = ["icon", "which", "count", "chevron"] as const

/** One of `ROW_PARTS`. */
export type RowPart = (typeof ROW_PARTS)[number]

/** What a column's row shows without `show`:  everything but the count. */
export const DEFAULT_ROW_PARTS: readonly RowPart[] = ["icon", "which", "chevron"]
