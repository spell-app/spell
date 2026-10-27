/**
 * The breadcrumb family:  defines `<ui-breadcrumbs>` and `<ui-breadcrumb>`,
 * and exports their components, `UIBreadcrumbs` and `UIBreadcrumb`.
 * - SIDE EFFECT:  importing it defines the tags.
 * - Also the library's `spell/ui/ui-breadcrumbs` entry (its size is in `notes/report.md`).
 */

import { UIBreadcrumbs } from "./UIBreadcrumbs"
import { UIBreadcrumb } from "./UIBreadcrumb"

UIBreadcrumbs.define()
UIBreadcrumb.define()

export { UIBreadcrumbs, UIBreadcrumb }
