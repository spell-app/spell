/**
 * The search family:  defines `<ui-search>`, and exports its component.
 * - Also the `search` lib entry (`spell/ui/ui-search`), measured in `notes/report.md`.
 * - SIDE EFFECT:  importing it defines the tag, `<ui-button>`:  its clear button and a `collapsed`
 *   search's button;  and `<ui-keys>`:  its `shortcut`'s keys.
 * - Exports `SearchMatcher` too:  Fomantic's local matching, pure data, usable on its own.
 */

import { UISearch } from "./UISearch"
import { SearchMatcher } from "./SearchMatcher"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-keys"

UISearch.define()

export { SearchMatcher, UISearch }
