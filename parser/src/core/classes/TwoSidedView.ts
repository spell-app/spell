// Import directly to avoid circular import
import { View } from "./View"

/**
 * `TwoSidedView`:  a `View` with a front and a back, face up or face down -- what `a card is a two sided view` extends.
 * - Its own words are spell's, written in spell:  each type made straight from it gets them compiled into its own
 *   class, in its file's language (epic `elemental-spell` P5, J8) -- see spell's `templatePreludes`:
 *   - its parts `front` and `back`, `drawFront()` / `drawBack()`, which the type draws
 *   - `direction`, up or down (a new one starts up), `isFaceDirection()`, `turnFaceUp()`, `turnFaceDown()`, `turnOver()`
 *   - `draw()`, its back face down, else its front
 * - So this class adds nothing:  it says what the thing is, for `isA` and its element.
 * - Everything else as a `View`.
 */
export class TwoSidedView extends View {}
