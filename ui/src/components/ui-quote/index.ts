/**
 * The quote family:  defines `<ui-quote>` and exports its component, `UIQuote`.
 * - SIDE EFFECT:  importing it defines the tag.
 * - Also the library's `spell-ui/ui-quote` entry (its size is in `notes/report.md`).
 */

import { UIQuote } from "./UIQuote"

UIQuote.define()

export { UIQuote }
