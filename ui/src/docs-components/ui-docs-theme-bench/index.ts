/**
 * The theme bench family:  defines `<ui-docs-theme-bench>` and exports its component, `UIDocsThemeBench`:
 * the theme editor full width, previewing Spell's real pages (`BenchPages`).
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry.
 *   `<ui-root>` loads it on first use;  its page is the docs site's `theme-bench.html`.
 * - SIDE EFFECT:  importing it defines the tag, and the theme editor its shadow DOM is built of:
 *   a `<ui-root>` only loads what's in the page's light DOM, so a family built of other widgets imports them itself.
 * - The editor app imports `BenchPages` alone, by its file:  the same four pages for its Theme page.
 */

import { UIDocsThemeBench } from "./UIDocsThemeBench"
import { BenchPages } from "./BenchPages"

import "spell/ui/components/ui-theme-editor"

UIDocsThemeBench.define()

export { UIDocsThemeBench, BenchPages }
