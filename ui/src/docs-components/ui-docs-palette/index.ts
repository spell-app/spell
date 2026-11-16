/**
 * The palette groups family:  defines `<ui-docs-palette>` and exports its component, `UIDocsPalette`:
 * the editor palette's groups, to arrange and save (epic `editor` T81).
 * - A DOC-ONLY family (`src/docs-components/`):  no lib entry.
 *   `<ui-root>` loads it on first use;  its page is the docs site's `palette.html`.
 * - SIDE EFFECT:  importing it defines the tag, and the families its shadow DOM is built of:
 *   a `<ui-root>` only loads what's in the page's light DOM, so a family built of other widgets imports them itself.
 */

import { UIDocsPalette } from "./UIDocsPalette"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-icon-picker"
import "spell/ui/components/ui-input"

UIDocsPalette.define()

export { UIDocsPalette }
