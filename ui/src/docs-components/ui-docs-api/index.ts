/**
 * The docs API reference family:  defines `<ui-docs-api>` and exports its component, `UIDocsApi`,
 * and its helpers (`ApiModel`, `InlineCode`).
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry;  `<ui-root>` loads it on first use.
 * - SIDE EFFECT:  importing it names the tag a shadow host of the page's table of contents
 *   (`TocIndex.addShadowHost()`:  `<ui-toc>` lists its rows), and defines the tag, and the widgets its shadow DOM is
 *   built of:
 *   `<ui-header>` (`ui-parts`), `<ui-table>`, `<ui-label>` / `<ui-labels>`, `<ui-message>`.
 *   A `<ui-root>` only loads what's in the page's light DOM, so a family that is built of other widgets
 *   imports them itself.
 */

import { UIDocsApi } from "./UIDocsApi"
import { ApiModel } from "./ApiModel"
import { InlineCode } from "./InlineCode"
// A leaf, not the barrel, which would define `<ui-toc>`
import { TocIndex } from "spell/ui/components/ui-toc/TocIndex"

import "spell/ui/components/ui-parts"
import "spell/ui/components/ui-table"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-message"

TocIndex.addShadowHost(UIDocsApi.vocabulary.tag)
UIDocsApi.define()

export { UIDocsApi, ApiModel, InlineCode }
