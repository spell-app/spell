/**
 * The terms family:  defines `<ui-terms>` and `<ui-term>`, and exports their components, `UITerms` and `UITerm`.
 * - SIDE EFFECT:  importing it defines the tags.
 * - Also the library's `spell-ui/ui-terms` entry (its size is in `notes/report.md`).
 * - The group is defined FIRST:  a group already in the page then has its component when its terms look it up.
 */

import { UITerms } from "./UITerms"
import { UITerm } from "./UITerm"

UITerms.define()
UITerm.define()

export { UITerms, UITerm }
