/**
 * The table of contents family:  defines `<ui-toc>` and exports its component, `UIToc`,
 * and its plain-DOM helpers:  the page's sections and the one in view (`TocIndex`, on `PageOutline`),
 * landing on a link's target (`HashLanding`).
 * - The docs site's `<ui-toc>` until epic `ui-gaps` P14 made it a component:
 *   a lib entry, in the component list, loaded by any `<ui-root>`.
 * - SIDE EFFECT:  importing it defines the tag, and the widgets its shadow DOM is built of:
 *   `<ui-menu>` + `<ui-item>` (`ui-menu`, `ui-item`), `<ui-header>` (`ui-parts`).
 *   A `<ui-root>` only loads what's in the page's light DOM, so a family that is built of other widgets
 *   imports them itself.
 * - Code that only reads a page or lands a link (the docs site's sections and search, the epic pages' runtime,
 *   the site's node scripts) imports the helpers by their files (`spell/ui/components/ui-toc/TocIndex`,
 *   `.../HashLanding`, `.../PageOutline`):  this barrel would define the tag too.
 */

import { UIToc } from "./UIToc"
import { TocIndex } from "./TocIndex"
import { HashLanding } from "./HashLanding"
import { PageOutline } from "./PageOutline"

import "spell/ui/components/ui-menu"
import "spell/ui/components/ui-item"
import "spell/ui/components/ui-parts"

UIToc.define()

export { UIToc, TocIndex, HashLanding, PageOutline }
export type { OutlineSection, TocEntry, TocSection } from "./UIToc.types"
