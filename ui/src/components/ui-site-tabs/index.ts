/**
 * The site tabs family:  defines `<ui-site-tabs>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the menu and items it draws its tabs with.
 * - Also the library's `spell/ui/ui-site-tabs` entry.
 */

import { UISiteTabs } from "./UISiteTabs"

import "spell/ui/components/ui-menu"

UISiteTabs.define()

export { UISiteTabs, type SiteTabsPage } from "./UISiteTabs"
