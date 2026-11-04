import { proto } from "spell/util"
import type { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { CreateListType } from "./CreateListType"

/**
 * `create_viewable_list_type` rule:  `a pile is a viewable list of cards` --
 * `create_list_type`, extending `ViewableList`.
 * - A list drawn as its own custom element, its items inside it (epic `drawable-thing`).
 * - Everything else as `create_list_type`:  its item type, a short name, an outline body.
 */
export class CreateViewableListType extends CreateListType {
  @proto static listType: P.Datatype = "viewable list"
}
