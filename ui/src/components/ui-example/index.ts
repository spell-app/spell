/**
 * The example family:  defines `<ui-example>` and exports its component, `UIExample`,
 * and its helpers (`ExampleSource`, `HtmlFormatter`).
 * - The docs site's `<ui-example>` until epic `ui-gaps` P14 made it a component:
 *   a lib entry, in the component list, loaded by any `<ui-root>`, so the guides show examples too.
 * - SIDE EFFECT:  importing it defines the tag, and the widgets its shadow DOM is built of:
 *   `<ui-segment>`, `<ui-header>` (`ui-parts`), `<ui-button>`, `<ui-code>`.
 *   A `<ui-root>` only loads what's in the page's light DOM, so a family that is built of other widgets
 *   imports them itself.
 * - A page that only keeps the examples' markup before they upgrade (the site's first import) imports
 *   `ExampleSource` by its file, `spell/ui/components/ui-example/ExampleSource`:  this barrel would define the tag too.
 */

import { UIExample } from "./UIExample"
import { ExampleSource } from "./ExampleSource"
import { HtmlFormatter } from "./HtmlFormatter"

import "spell/ui/components/ui-segment"
import "spell/ui/components/ui-parts"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-code"

UIExample.define()

export { UIExample, ExampleSource, HtmlFormatter }
