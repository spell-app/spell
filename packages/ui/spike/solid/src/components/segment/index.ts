/**
 * Barrel for the spike's segment components -- also the `segment` library entry measured in `REPORT.md`.
 * - SIDE EFFECT:  defines `<ui-segment>` and `<ui-segments>`.
 */

import { UISegment } from "./UISegment"
import { UISegments } from "./UISegments"

UISegment.define()
UISegments.define()

export { UISegment, UISegments }
