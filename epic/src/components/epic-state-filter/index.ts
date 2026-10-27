/**
 * `epic-state-filter` family barrel:  defines `<epic-state-filter>` and `<epic-hidden-note>` (SIDE EFFECT) and exports
 * their components, `EpicStateFilter` and `EpicHiddenNote`:  the state filter's chips, and the line under a list it
 * hides items of;  drawn by `<epic-section>`, `<epic-page>` and the docs runtime.
 */
import { EpicHiddenNote } from "./EpicHiddenNote"
import { EpicStateFilter } from "./EpicStateFilter"

EpicStateFilter.define()
EpicHiddenNote.define()

export { EpicHiddenNote, EpicStateFilter }
