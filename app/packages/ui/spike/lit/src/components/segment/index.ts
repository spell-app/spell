/**
 * Barrel + side-effect entry for the spike's segment family:  defines `<ui-segment>` and `<ui-segments>`.
 */

import { UISegment } from "./UISegment"
import { UISegments } from "./UISegments"

export { UISegment, UISegments }

// SIDE EFFECT:  registration under the vocabulary tags
UISegment.define()
UISegments.define()
