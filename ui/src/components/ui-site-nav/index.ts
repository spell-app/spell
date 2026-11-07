/**
 * The site nav family:  defines `<ui-site-nav>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the tree it draws its pages with.
 * - Also the library's `spell/ui/ui-site-nav` entry.
 */

import { UISiteNav } from "./UISiteNav"

import "spell/ui/components/ui-tree"

UISiteNav.define()

export { UISiteNav, type SiteNavPage } from "./UISiteNav"
