/**
 * `epic-list` family barrel:  defines `<epic-list>`, `<epic-card>` and `<epic-sort>` (SIDE EFFECT) and exports their
 * components, `EpicList`, `EpicCard` and `EpicSort`:  the Epics page's list, its cards and its sort buttons.
 */
import { EpicCard } from "./EpicCard"
import { EpicList } from "./EpicList"
import { EpicSort } from "./EpicSort"

EpicList.define()
EpicCard.define()
EpicSort.define()

export { EpicCard, EpicList, EpicSort }
