/**
 * `epic-test-run` family barrel:  defines `<epic-test-run>` (SIDE EFFECT) and exports its component, `EpicTestRun`.
 * - Defines the family it draws in its shadow root first:  `<epic-text-box>` (a failure's note).
 */
import "$/epics/components/epic-text-box"

import { EpicTestRun } from "./EpicTestRun"

EpicTestRun.define()

export { EpicTestRun }
