/**
 * The ad family:  defines `<ui-ad>` and exports its component, `UIAd`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell-ui/ui-ad` entry (its size is in `notes/report.md`).
 */

import { UIAd } from "./UIAd"

UIAd.define()

export { UIAd }
