/**
 * `epic-phase` family barrel:  defines `<epic-phase>`, `<epic-field>`, `<epic-updated>` (SIDE EFFECT),
 * and exports their classes.
 * - Defines the family `<epic-phase>` draws in its shadow root first:  `<epic-review>`;
 *   and `<epic-zoom>`, which a request's thumbnails open in.
 */
import "spell-epic/components/epic-review"
import "spell-epic/components/epic-zoom"

import { EpicPhase } from "./EpicPhase"
import { EpicField } from "./EpicField"
import { EpicUpdated } from "./EpicUpdated"

EpicPhase.define()
EpicField.define()
EpicUpdated.define()

export { EpicPhase, EpicField, EpicUpdated }
