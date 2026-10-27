/**
 * The theme bench family:  defines `<ui-docs-theme-bench>` and exports its component, `UIDocsThemeBench`,
 * and its helpers (`BenchBridge`, `BenchColor`, `BenchEdits`, `BenchTokens`).
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry.
 *   `<ui-root>` loads it on first use;  its page is the docs site's `theme-bench.html`.
 * - SIDE EFFECT:  importing it defines the tag, and the widgets its shadow DOM is built of:
 *   a `<ui-root>` only loads what's in the page's light DOM, so a family built of other widgets imports them itself.
 * - The editor app imports `BenchBridge` alone, by its file (`spell/ui/docs-components/ui-docs-theme-bench/BenchBridge`):
 *   the bench's messages, taken in development.
 */

import { UIDocsThemeBench } from "./UIDocsThemeBench"
import { BenchBridge } from "./BenchBridge"
import { BenchColor } from "./BenchColor"
import { BenchEdits } from "./BenchEdits"
import { BenchTokens } from "./BenchTokens"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-code"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-menu"
import "spell/ui/components/ui-section"
import "spell/ui/components/ui-slider"
import "spell/ui/components/ui-theme-menu"

UIDocsThemeBench.define()

export { UIDocsThemeBench, BenchBridge, BenchColor, BenchEdits, BenchTokens }
