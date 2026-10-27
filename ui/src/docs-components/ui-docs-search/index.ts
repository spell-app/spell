/**
 * The docs search family:  defines `<ui-docs-search>` and exports its component, `UIDocsSearch`,
 * its DOM element class, `DOMDocsSearchElement`, and its helpers (`SearchData`, `SearchIndex`).
 * - A page's sections are read by the table of contents' `PageOutline` (`spell-ui/components/ui-toc`).
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry.
 *   `<ui-root>` loads it on first use, or `<ui-docs-nav>` does (its header band holds one).
 * - SIDE EFFECT:  importing it defines the tag, and `<ui-icon>` and `<ui-keys>`, which its shadow DOM is built of.
 *   A `<ui-root>` only loads what's in the page's light DOM, so a family that is built of other widgets
 *   imports them itself.
 */

import { DOMDocsSearchElement, UIDocsSearch } from "./UIDocsSearch"
import { SearchData } from "./SearchData"
import { SearchIndex } from "./SearchIndex"

import "spell-ui/components/ui-icon"
import "spell-ui/components/ui-keys"

UIDocsSearch.define()

export { UIDocsSearch, DOMDocsSearchElement, SearchData, SearchIndex }
