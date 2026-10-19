/**
 * `epic-thread` family barrel:  defines `<epic-threads>`, `<epic-thread>` and `<epic-thread-message>` (SIDE EFFECT)
 * and exports their components, `EpicThreads`, `EpicThread` and `EpicThreadMessage`, and the thread's DOM element,
 * `DOMThreadElement`:  a comment's thread, as the docs runtime's comments draw it on every page.
 * - Defines the family a thread draws in its shadow root first:  `<epic-review>` (its answer pills).
 */
import "$/epics/components/epic-review"

import { DOMThreadElement, EpicThread } from "./EpicThread"
import { EpicThreadMessage } from "./EpicThreadMessage"
import { EpicThreads } from "./EpicThreads"

EpicThreadMessage.define()
EpicThread.define()
EpicThreads.define()

export { DOMThreadElement, EpicThread, EpicThreadMessage, EpicThreads }
