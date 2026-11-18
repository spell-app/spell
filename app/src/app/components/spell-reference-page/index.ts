/**
 * The `spell-reference-page` family:  defines `<spell-reference-page>` and exports its component,
 * `SpellReferencePage` (epic `data` P53).
 * - SIDE EFFECTS:  importing it defines the tag (nothing, if something already has), and the Spell UI families it
 *   draws with:  `ui-section`, `ui-label`, `ui-table`, `ui-button`.
 * - Also the entry of `spell-reference-page.js` (`yarn build:element`, `vite.code.config.ts`),
 *   which a page loads by itself, or through the component pack, `spell.pack.js`:
 *
 *       <script type="module" src="/element/spell-reference-page.js"></script>
 *       <spell-reference-page src="@spell/examples/StarWars/StarWars.api.json5"></spell-reference-page>
 *
 * - NEVER imports the parser or the editor:  a place's words are read as plain text (`PlaceWords`).
 */

import { SpellReferencePage, REFERENCE_EDIT_EVENT } from "./SpellReferencePage"

import "spell/app/spaces/models/projectGroups"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-label"
import "spell/ui/components/ui-section"
import "spell/ui/components/ui-table"

SpellReferencePage.define()

export { SpellReferencePage, REFERENCE_EDIT_EVENT }
export { PlaceReferenceSource, type PlaceOnServer } from "./PlaceReferenceSource"
export type * from "./SpellReferencePage.types"
