/**
 * The site nav button family:  defines `<ui-site-nav-button>` and exports its component.
 * - SIDE EFFECT:  importing it defines the tag.
 *   `UISiteNavButton` imports the item family first, which defines `<ui-item>`:  the button extends the item.
 *   And the button family:  outside a menu, it draws a `<ui-button>`.
 * - Also the library's `spell/ui/ui-site-nav-button` entry.
 */

import { UISiteNavButton } from "./UISiteNavButton"

import "spell/ui/components/ui-button"

UISiteNavButton.define()

export { UISiteNavButton } from "./UISiteNavButton"
