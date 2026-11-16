/**
 * The site breadcrumbs family:  defines `<ui-site-breadcrumbs>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the breadcrumbs it draws its trail with.
 * - Also the library's `spell/ui/ui-site-breadcrumbs` entry.
 */

import { UISiteBreadcrumbs } from "./UISiteBreadcrumbs"

import "spell/ui/components/ui-breadcrumbs"

UISiteBreadcrumbs.define()

export { UISiteBreadcrumbs, type SiteBreadcrumbsPage } from "./UISiteBreadcrumbs"
