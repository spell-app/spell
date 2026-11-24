/**
 * The shape of the editor palette's TABLE (its groups, as Owen arranged them), and the address it's saved at
 * (epic `editor` T81;  out of Spell UI since epic `editor` P42, Q81).
 * - The table itself is the editor's, `src/app/ui/paletteGroups.json` (epic `editor` J275, Owen, 2026-11-22):
 *   the editor ships with it, so it's code, in the checkout the page server runs
 *   (a worktree's server writes the worktree's).
 * - Saved by the editor's palette groups page (`<PaletteGroupsPage>`, at `/palette`) through spaces' route,
 *   `paletteRoutes`;  the palette (`<Palette>`) reads it through `PaletteGroups`, the rule that files every
 *   component into it.
 * - Types and one address only:  browser-safe, and node's route reads it too.
 */

import type { ComponentTopic } from "spell/ui/vocabulary"

/** Where the page server keeps the table:  `GET` reads it, `PUT` writes it (`paletteRoutes`). */
export const PALETTE_GROUPS_API = "/api/palette-groups"

/** The palette's groups, as Owen arranged them:  `paletteGroups.json`. */
export type PaletteTable = {
  /** The groups, in the palette's order. */
  groups: PaletteTableGroup[]
  /** Tags never offered, though today's rule would (`PaletteGroups.byTopic()`). */
  hidden?: string[]
}

/** One group of the palette's table. */
export type PaletteTableGroup = {
  /** Its topic:  names it in each language (`topicIn()`), and takes in a new component filed under it. */
  topic?: ComponentTopic
  /** Its own name, as written, in every language:  in place of its topic's word. */
  title?: string
  /** Its icon:  its button in the editor's add bar, down the left edge (`hand pointer`;  epic `editor` T86, T151). */
  icon?: string
  /** A divider under it in the add bar, between it and the next group (epic `editor` T151). */
  dividerAfter?: boolean
  /** Its components' tags, in order. */
  tags: string[]
}
