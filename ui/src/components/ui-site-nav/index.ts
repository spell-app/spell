/**
 * The site nav family:  defines `<ui-site-nav>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, the tree it draws its pages with, and the button of a page's star.
 * - Also the library's `spell/ui/ui-site-nav` entry.
 */

import { UISiteNav } from "./UISiteNav"

import "spell/ui/components/ui-tree"
import "spell/ui/components/ui-button"

UISiteNav.define()

export { UISiteNav, type SiteNavPage } from "./UISiteNav"
