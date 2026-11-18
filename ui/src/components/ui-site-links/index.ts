/**
 * The site links family:  defines `<ui-site-links>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the buttons it draws its links with.
 * - Also the library's `spell/ui/ui-site-links` entry.
 */

import { UISiteLinks } from "./UISiteLinks"

import "spell/ui/components/ui-button"

UISiteLinks.define()

export { UISiteLinks, type SiteLinksPage } from "./UISiteLinks"
