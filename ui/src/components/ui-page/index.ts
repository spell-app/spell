/**
 * The page family:  defines `<ui-page>` and exports its component, `UIPage`.
 * - SIDE EFFECT:  importing it defines the tag (and `<ui-root>`'s family, which a page is built on).
 * - Also the library's `spell-ui/ui-page` entry (its size is in `notes/report.md`).
 */

import { UIPage } from "./UIPage"

UIPage.define()

export { UIPage }
