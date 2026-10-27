/**
 * The rating family:  defines `<ui-rating>`, and exports its component
 * and its DOM element class, `DOMRatingElement`.
 * - Also the `rating` lib entry (`spell/ui/ui-rating`), measured in `notes/report.md`.
 * - SIDE EFFECT:  importing it defines the tag.
 */

import { DOMRatingElement, UIRating } from "./UIRating"

UIRating.define()

export { UIRating, DOMRatingElement }
