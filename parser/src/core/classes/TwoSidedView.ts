// Import directly to avoid circular import
import { View } from "./View"

/**
 * `TwoSidedView`:  a `View` with a front and a back, face up or face down -- what `a card is a two sided view` extends.
 * - NOTE:  empty for now.  Its own words (`its direction`, `it is face up`, `turn it over`) and its front and back,
 *   as parts to draw, come with parts (epic `elemental-spell` P4);  until then a type built on it says them itself.
 * - Everything else as a `View`.
 */
export class TwoSidedView extends View {}
