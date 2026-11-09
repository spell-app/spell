/**
 * The site index family:  defines `<ui-docs-index>` and exports its component, `UIDocsIndex`.
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry;  `<ui-root>` loads it on first use.
 * - SIDE EFFECT:  importing it defines the tag, and the widgets its shadow DOM is built of:
 *   `<ui-section>`, `<ui-card>`, `<ui-docs-search>`.  A `<ui-root>` only loads what's in the page's light DOM.
 */

import { UIDocsIndex } from "./UIDocsIndex"

import "spell/ui/components/ui-section"
import "spell/ui/components/ui-card"
import "spell/ui/docs-components/ui-docs-search"

UIDocsIndex.define()

export { UIDocsIndex }
